import pulumi
import pulumi_aws as aws
import json
import os
import mimetypes

# --- 1. Configurações do Ambiente (12-Factor) ---

config = pulumi.Config()
env = config.require("environment")
is_prod = env == "prod"
domain_name = config.get("domainName") if is_prod else None

log_retention_days = 7

api_default_route_throttling_rate_limit = config.get_int(
    "apiDefaultRouteThrottlingRateLimit"
)
if api_default_route_throttling_rate_limit is None:
    api_default_route_throttling_rate_limit = 1000

api_default_route_throttling_burst_limit = config.get_int(
    "apiDefaultRouteThrottlingBurstLimit"
)
if api_default_route_throttling_burst_limit is None:
    api_default_route_throttling_burst_limit = 500

ses_from_email = config.require("sesFromEmail") if is_prod else config.get("sesFromEmail")
ses_from_name = config.get("sesFromName") or "App"
ses_reply_to_email = config.get("sesReplyToEmail") or ses_from_email

# --- 2. DynamoDB Tables ---

email_to_sub_table = aws.dynamodb.Table(
    f"email-to-sub-table-{env}",
    name=f"EmailToSub_{env}",
    billing_mode="PAY_PER_REQUEST",
    hash_key="email",
    attributes=[aws.dynamodb.TableAttributeArgs(name="email", type="S")],
)

users_table = aws.dynamodb.Table(
    f"users-table-{env}",
    name=f"Users_{env}",
    billing_mode="PAY_PER_REQUEST",
    hash_key="sub",
    attributes=[aws.dynamodb.TableAttributeArgs(name="sub", type="S")],
)

historico_table = aws.dynamodb.Table(
    f"historico-table-{env}",
    name=f"Historico_{env}",
    billing_mode="PAY_PER_REQUEST",
    hash_key="sub",
    range_key="timestamp",
    attributes=[
        aws.dynamodb.TableAttributeArgs(name="sub", type="S"),
        aws.dynamodb.TableAttributeArgs(name="timestamp", type="S"),
    ],
)

logs_table = aws.dynamodb.Table(
    f"logs-table-{env}",
    name=f"Logs_{env}",
    billing_mode="PAY_PER_REQUEST",
    hash_key="sub",
    range_key="timestamp",
    attributes=[
        aws.dynamodb.TableAttributeArgs(name="sub", type="S"),
        aws.dynamodb.TableAttributeArgs(name="timestamp", type="S"),
    ],
)

dynamodb_tables = {
    "email-to-sub": email_to_sub_table,
    "users": users_table,
    "historico": historico_table,
    "logs": logs_table,
}

for table_name, table in dynamodb_tables.items():
    aws.dynamodb.ContributorInsights(
        f"{table_name}-contributor-insights-{env}",
        table_name=table.name,
        mode="ACCESSED_AND_THROTTLED_KEYS",
    )

# --- 3. IAM Role para os Lambdas ---

lambda_role = aws.iam.Role(
    f"lambda-role-{env}",
    assume_role_policy=json.dumps(
        {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Action": "sts:AssumeRole",
                    "Effect": "Allow",
                    "Principal": {"Service": "lambda.amazonaws.com"},
                }
            ],
        }
    ),
)

aws.iam.RolePolicyAttachment(
    f"lambda-basic-execution-{env}",
    role=lambda_role.name,
    policy_arn="arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
)

aws.iam.RolePolicy(
    f"lambda-dynamodb-policy-{env}",
    role=lambda_role.name,
    policy=pulumi.Output.all(
        email_to_sub_table.arn,
        users_table.arn,
        historico_table.arn,
        logs_table.arn,
    ).apply(
        lambda arns: json.dumps(
            {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Action": [
                            "dynamodb:PutItem",
                            "dynamodb:GetItem",
                            "dynamodb:Query",
                            "dynamodb:Scan",
                            "dynamodb:UpdateItem",
                        ],
                        "Resource": arns,
                    },
                    {
                        "Effect": "Allow",
                        "Action": [
                            "logs:CreateLogGroup",
                            "logs:CreateLogStream",
                            "logs:PutLogEvents",
                            "logs:PutRetentionPolicy",
                            "logs:DescribeLogGroups",
                            "logs:DescribeLogStreams",
                        ],
                        "Resource": "*",
                    },
                ],
            }
        )
    ),
)

# --- 4. Lambda Layer compartilhada ---

shared_layer = aws.lambda_.LayerVersion(
    "shared",
    layer_name="shared",
    code=pulumi.AssetArchive(
        {
            "python/shared/__init__.py": pulumi.FileAsset(
                "./functions/shared/__init__.py"
            ),
            "python/shared/auth.py": pulumi.FileAsset("./functions/shared/auth.py"),
            "python/shared/db.py": pulumi.FileAsset("./functions/shared/db.py"),
            "python/shared/response.py": pulumi.FileAsset(
                "./functions/shared/response.py"
            ),
        }
    ),
    compatible_runtimes=["python3.13"],
    description="shared utilities (db, auth, response)",
)

# --- 5. Lambda post_confirm (Cognito PostConfirmation trigger) ---

post_confirm_env_vars = {
    "EMAIL_TO_SUB_TABLE": email_to_sub_table.name,
    "USERS_TABLE": users_table.name,
    "LOGS_TABLE": logs_table.name,
}

post_confirm_lambda = aws.lambda_.Function(
    f"post_confirm-{env}",
    runtime="python3.13",
    role=lambda_role.arn,
    handler="post_confirm.handler",
    code=pulumi.FileArchive("./functions/post_confirm"),
    environment=aws.lambda_.FunctionEnvironmentArgs(variables=post_confirm_env_vars),
    layers=[shared_layer.arn],
)

aws.cloudwatch.LogGroup(
    f"post_confirm-log-group-{env}",
    name=pulumi.Output.concat("/aws/lambda/", post_confirm_lambda.name),
    retention_in_days=log_retention_days,
)

# --- 5a. SES Domain Identity ---

ses_domain_identity = None
if is_prod and domain_name:
    ses_domain_identity = aws.ses.DomainIdentity(
        f"ses-domain-{env}",
        domain=domain_name,
    )

# --- 5b. SES IAM Configuration ---

region_obj = aws.get_region()
account_id = aws.get_caller_identity().account_id

ses_identity_arn = None
if ses_domain_identity:
    ses_identity_arn = pulumi.Output.all(
        region_obj.region, account_id, ses_domain_identity.domain
    ).apply(lambda args: f"arn:aws:ses:{args[0]}:{args[1]}:identity/{args[2]}")
else:
    ses_identity_arn = pulumi.Output.concat(
        "arn:aws:ses:", region_obj.region, ":", account_id, ":identity/", ses_from_email
    )

cognito_ses_policy = aws.iam.Policy(
    f"cognito-ses-policy-{env}",
    name=f"CognitoSESPolicy-{env}",
    description="Permite que o Cognito envie e-mails via SES",
    policy=ses_identity_arn.apply(
        lambda arn: json.dumps(
            {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Action": [
                            "ses:SendEmail",
                            "ses:SendRawEmail",
                        ],
                        # Restringe ao remetente verificado; evita uso
                        # acidental de outras identidades SES da conta.
                        "Resource": arn,
                    }
                ],
            }
        )
    ),
)

cognito_ses_role = aws.iam.Role(
    f"cognito-ses-role-{env}",
    name=f"CognitoSESRole-{env}",
    description="Role usada pelo Cognito para enviar e-mails via SES",
    assume_role_policy=json.dumps(
        {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {"Service": "cognito-idp.amazonaws.com"},
                    "Action": "sts:AssumeRole",
                }
            ],
        }
    ),
)

aws.iam.RolePolicyAttachment(
    f"cognito-ses-role-attachment-{env}",
    role=cognito_ses_role.name,
    policy_arn=cognito_ses_policy.arn,
)

# --- 5a. Route53 Zone (necessária para SES DNS records) ---

zone = None
if is_prod and domain_name:
    zone = aws.route53.get_zone(name=domain_name)

# --- 5b. SES Domain Configuration (registros DNS) ---

ses_dkim = None
if is_prod and domain_name and zone:
    # Verificação de domínio (TXT record)
    aws.route53.Record(
        f"ses-verification-record-{env}",
        zone_id=zone.zone_id,
        name=pulumi.Output.concat("_amazonses.", domain_name),
        type="TXT",
        ttl=300,
        records=[ses_domain_identity.verification_token],
    )

    # Aguarda a criação do domain identity
    aws.ses.DomainIdentityVerification(
        f"ses-domain-verification-{env}",
        domain=ses_domain_identity.id,
        opts=pulumi.ResourceOptions(depends_on=[ses_domain_identity]),
    )

    # DKIM records
    ses_dkim = aws.ses.DomainDkim(
        f"ses-dkim-{env}",
        domain=ses_domain_identity.domain,
    )

    for i in range(3):
        token = ses_dkim.dkim_tokens[i]
        aws.route53.Record(
            f"ses-dkim-record-{i}-{env}",
            zone_id=zone.zone_id,
            name=pulumi.Output.concat(token, f"._domainkey.{domain_name}"),
            type="CNAME",
            ttl=300,
            records=[pulumi.Output.concat(token, ".dkim.amazonses.com")],
        )

    # SPF record
    aws.route53.Record(
        f"ses-spf-record-{env}",
        zone_id=zone.zone_id,
        name=domain_name,
        type="TXT",
        ttl=300,
        records=["v=spf1 include:amazonses.com ~all"],
    )

from_email_address_formatted = f"{ses_from_name} <{ses_from_email}>"

if is_prod:
    user_pool_email_configuration = aws.cognito.UserPoolEmailConfigurationArgs(
        email_sending_account="DEVELOPER",
        source_arn=ses_identity_arn,
        from_email_address=from_email_address_formatted,
        reply_to_email_address=ses_reply_to_email,
    )
else:
    user_pool_email_configuration = aws.cognito.UserPoolEmailConfigurationArgs(
        email_sending_account="COGNITO_DEFAULT",
    )

# --- 6. Amazon Cognito ---

user_pool = aws.cognito.UserPool(
    f"app-user-pool-{env}",
    name=f"app-users-{env}",
    auto_verified_attributes=["email"],
    schemas=[
        aws.cognito.UserPoolSchemaArgs(
            name="name",
            attribute_data_type="String",
            mutable=True,
            required=False,
            string_attribute_constraints=aws.cognito.UserPoolSchemaStringAttributeConstraintsArgs(
                min_length="0",
                max_length="2048",
            ),
        ),
    ],
    lambda_config=aws.cognito.UserPoolLambdaConfigArgs(
        post_confirmation=post_confirm_lambda.arn,
    ),
    email_configuration=user_pool_email_configuration,
    verification_message_template=aws.cognito.UserPoolVerificationMessageTemplateArgs(
        default_email_option="CONFIRM_WITH_CODE",
        email_subject="Confirme seu cadastro",
        email_message=(
            "Olá! Seu código de confirmação é: <strong>{####}</strong>. "
            "Ele expira em 24 horas. Não compartilhe este código com ninguém."
        ),
    ),
    account_recovery_setting=aws.cognito.UserPoolAccountRecoverySettingArgs(
        recovery_mechanisms=[
            aws.cognito.UserPoolAccountRecoverySettingRecoveryMechanismArgs(
                name="verified_email",
                priority=1,
            ),
            aws.cognito.UserPoolAccountRecoverySettingRecoveryMechanismArgs(
                name="verified_phone_number",
                priority=2,
            ),
        ]
    ),
)

aws.lambda_.Permission(
    f"cognito-invoke-post-confirm-{env}",
    action="lambda:InvokeFunction",
    function=post_confirm_lambda.name,
    principal="cognito-idp.amazonaws.com",
    source_arn=user_pool.arn,
)

user_pool_client = aws.cognito.UserPoolClient(
    f"app-user-pool-client-{env}",
    user_pool_id=user_pool.id,
    explicit_auth_flows=["ALLOW_USER_PASSWORD_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"],
    generate_secret=False,
)

# --- 7. AWS Lambdas (protegidos por JWT) ---

env_vars = {
    "EMAIL_TO_SUB_TABLE": email_to_sub_table.name,
    "USERS_TABLE": users_table.name,
    "HISTORICO_TABLE": historico_table.name,
    "LOGS_TABLE": logs_table.name,
    "DISABLE_AUTH": "0",
}

disable_auth = config.get_bool("disableAuth")
if disable_auth:
    if is_prod:
        raise Exception("Config 'disableAuth' must not be enabled in production")
    env_vars["DISABLE_AUTH"] = "1"


def create_lambda(name, entry_point):
    function = aws.lambda_.Function(
        f"{name}-{env}",
        runtime="python3.13",
        role=lambda_role.arn,
        handler=entry_point,
        code=pulumi.FileArchive(f"./functions/{name}"),
        environment=aws.lambda_.FunctionEnvironmentArgs(variables=env_vars),
        layers=[arn for arn in [shared_layer.arn] if arn is not None],
        timeout=30,
    )

    aws.cloudwatch.LogGroup(
        f"{name}-log-group-{env}",
        name=pulumi.Output.concat("/aws/lambda/", function.name),
        retention_in_days=log_retention_days,
    )

    return function


history_lambda = create_lambda("history", "history.handler")
preferences_lambda = create_lambda("preferences", "preferences.handler")
recommend_lambda = create_lambda("recommend", "recommend.handler")
watch_later_lambda = create_lambda("watch_later", "watch_later.handler")

# --- 6. API Gateway v2 (HTTP API) ---

api = aws.apigatewayv2.Api(f"http-api-{env}", protocol_type="HTTP")

api_access_log_group = aws.cloudwatch.LogGroup(
    f"api-access-log-group-{env}",
    name=f"/aws/apigateway/recommend-a-{env}",
    retention_in_days=log_retention_days,
)

region = aws.get_region()

issuer_url = pulumi.Output.concat(
    "https://cognito-idp.", region.region, ".amazonaws.com/", user_pool.id
)

authorizer = aws.apigatewayv2.Authorizer(
    f"jwt-authorizer-{env}",
    api_id=api.id,
    authorizer_type="JWT",
    identity_sources=["$request.header.Authorization"],
    name=f"cognito-authorizer-{env}",
    jwt_configuration=aws.apigatewayv2.AuthorizerJwtConfigurationArgs(
        audiences=[user_pool_client.id], issuer=issuer_url
    ),
)


def create_route(path, method, lambda_func, auth_id=None):
    safe_path = path.replace("/", "")

    integration = aws.apigatewayv2.Integration(
        f"integration-{method}-{safe_path}-{env}",
        api_id=api.id,
        integration_type="AWS_PROXY",
        integration_method="POST",
        integration_uri=lambda_func.invoke_arn,
        payload_format_version="2.0",
    )

    aws.lambda_.Permission(
        f"api-gw-permission-{method}-{safe_path}-{env}",
        action="lambda:InvokeFunction",
        principal="apigateway.amazonaws.com",
        function=lambda_func.name,
        source_arn=pulumi.Output.concat(api.execution_arn, "/*/*"),
    )

    route_args = {
        "api_id": api.id,
        "route_key": f"{method} {path}",
        "target": pulumi.Output.concat("integrations/", integration.id),
    }

    if auth_id:
        route_args["authorization_type"] = "JWT"
        route_args["authorizer_id"] = auth_id

    aws.apigatewayv2.Route(f"route-{method}-{safe_path}-{env}", **route_args)


auth = authorizer.id if is_prod else None

create_route("/api/v1/history", "GET", history_lambda, auth_id=auth)
create_route("/api/v1/preferences", "GET", preferences_lambda, auth_id=auth)
create_route("/api/v1/preferences", "POST", preferences_lambda, auth_id=auth)
create_route("/api/v1/recommend", "GET", recommend_lambda, auth_id=auth)
create_route("/api/v1/watch-later", "GET", watch_later_lambda, auth_id=auth)
create_route("/api/v1/watch-later", "POST", watch_later_lambda, auth_id=auth)

stage = aws.apigatewayv2.Stage(
    f"api-stage-{env}",
    api_id=api.id,
    name="$default",
    auto_deploy=True,
    access_log_settings=aws.apigatewayv2.StageAccessLogSettingsArgs(
        destination_arn=api_access_log_group.arn,
        format=json.dumps(
            {
                "requestId": "$context.requestId",
                "ip": "$context.identity.sourceIp",
                "requestTime": "$context.requestTime",
                "httpMethod": "$context.httpMethod",
                "routeKey": "$context.routeKey",
                "status": "$context.status",
                "protocol": "$context.protocol",
                "responseLength": "$context.responseLength",
                "integrationError": "$context.integrationErrorMessage",
            }
        ),
    ),
    default_route_settings=aws.apigatewayv2.StageDefaultRouteSettingsArgs(
        detailed_metrics_enabled=True,
        throttling_rate_limit=api_default_route_throttling_rate_limit,
        throttling_burst_limit=api_default_route_throttling_burst_limit,
    ),
)

# --- 7. Frontend: S3, Automação de Upload e CloudFront ---

bucket = aws.s3.Bucket(f"frontend-bucket-{env}")

frontend_dir = "frontend/web/out"
for root, dirs, files in os.walk(frontend_dir, followlinks=True):
    for file in files:
        file_path = os.path.join(root, file)
        relative_path = os.path.relpath(file_path, frontend_dir)
        content_type, _ = mimetypes.guess_type(file_path)
        aws.s3.BucketObject(
            f"static-file-{relative_path}-{env}",
            bucket=bucket.id,
            key=relative_path.replace("\\", "/"),
            source=pulumi.FileAsset(file_path),
            content_type=content_type or "application/octet-stream",
        )

oac = aws.cloudfront.OriginAccessControl(
    f"frontend-oac-{env}",
    description="OAC para frontend",
    origin_access_control_origin_type="s3",
    signing_behavior="always",
    signing_protocol="sigv4",
)

aliases = []
viewer_cert = aws.cloudfront.DistributionViewerCertificateArgs(
    cloudfront_default_certificate=True
)

if is_prod and domain_name:
    provider_us_east_1 = aws.Provider("us-east-1", region="us-east-1")

    cert = aws.acm.Certificate(
        "cert",
        domain_name=domain_name,
        validation_method="DNS",
        opts=pulumi.ResourceOptions(provider=provider_us_east_1),
    )

    zone_cloudfront = aws.route53.get_zone(name=domain_name)

    validation_record = aws.route53.Record(
        "cert-validation",
        name=cert.domain_validation_options[0].resource_record_name,
        zone_id=zone_cloudfront.zone_id,
        type=cert.domain_validation_options[0].resource_record_type,
        records=[cert.domain_validation_options[0].resource_record_value],
        ttl=60,
    )

    cert_validation = aws.acm.CertificateValidation(
        "cert-val",
        certificate_arn=cert.arn,
        validation_record_fqdns=[validation_record.fqdn],
        opts=pulumi.ResourceOptions(provider=provider_us_east_1),
    )

    aliases = [domain_name]
    viewer_cert = aws.cloudfront.DistributionViewerCertificateArgs(
        acm_certificate_arn=cert_validation.certificate_arn,
        ssl_support_method="sni-only",
        minimum_protocol_version="TLSv1.2_2021",
    )

api_hostname = api.api_endpoint.apply(
    lambda endpoint: endpoint.replace("https://", "").split("/")[0]
)

# --- 1. Políticas Customizadas do CloudFront ---

s3_cache_policy = aws.cloudfront.CachePolicy(
    f"s3-cache-{env}",
    name=f"S3-Cache-Policy-{env}",
    default_ttl=86400,
    max_ttl=31536000,
    min_ttl=1,
    parameters_in_cache_key_and_forwarded_to_origin=aws.cloudfront.CachePolicyParametersInCacheKeyAndForwardedToOriginArgs(
        cookies_config=aws.cloudfront.CachePolicyParametersInCacheKeyAndForwardedToOriginCookiesConfigArgs(
            cookie_behavior="none"
        ),
        headers_config=aws.cloudfront.CachePolicyParametersInCacheKeyAndForwardedToOriginHeadersConfigArgs(
            header_behavior="none"
        ),
        query_strings_config=aws.cloudfront.CachePolicyParametersInCacheKeyAndForwardedToOriginQueryStringsConfigArgs(
            query_string_behavior="none"
        ),
    ),
)

api_cache_policy = aws.cloudfront.CachePolicy(
    f"api-cache-{env}",
    name=f"API-Cache-Policy-{env}",
    default_ttl=0,
    max_ttl=0,
    min_ttl=0,
    parameters_in_cache_key_and_forwarded_to_origin=aws.cloudfront.CachePolicyParametersInCacheKeyAndForwardedToOriginArgs(
        cookies_config=aws.cloudfront.CachePolicyParametersInCacheKeyAndForwardedToOriginCookiesConfigArgs(
            cookie_behavior="none"
        ),
        headers_config=aws.cloudfront.CachePolicyParametersInCacheKeyAndForwardedToOriginHeadersConfigArgs(
            header_behavior="none"
        ),
        query_strings_config=aws.cloudfront.CachePolicyParametersInCacheKeyAndForwardedToOriginQueryStringsConfigArgs(
            query_string_behavior="none"
        ),
    ),
)

api_origin_request_policy = aws.cloudfront.OriginRequestPolicy(
    f"api-req-policy-{env}",
    name=f"API-Origin-Request-Policy-{env}",
    cookies_config=aws.cloudfront.OriginRequestPolicyCookiesConfigArgs(
        cookie_behavior="all"
    ),
    headers_config=aws.cloudfront.OriginRequestPolicyHeadersConfigArgs(
        header_behavior="whitelist",
        headers=aws.cloudfront.OriginRequestPolicyHeadersConfigHeadersArgs(
            items=[
                "Authorization",
                "Origin",
                "Referer",
                "Accept",
            ]
        ),
    ),
    query_strings_config=aws.cloudfront.OriginRequestPolicyQueryStringsConfigArgs(
        query_string_behavior="all"
    ),
)

# --- 2. Distribuição do CloudFront ---

distribution = aws.cloudfront.Distribution(
    f"cdn-{env}",
    enabled=True,
    is_ipv6_enabled=True,
    http_version="http3",
    default_root_object="index.html",
    aliases=aliases,
    origins=[
        aws.cloudfront.DistributionOriginArgs(
            domain_name=bucket.bucket_regional_domain_name,
            origin_id="S3-frontend",
            origin_access_control_id=oac.id,
        ),
        aws.cloudfront.DistributionOriginArgs(
            domain_name=api_hostname,
            origin_id="APIGateway-backend",
            custom_origin_config=aws.cloudfront.DistributionOriginCustomOriginConfigArgs(
                http_port=80,
                https_port=443,
                origin_protocol_policy="https-only",
                origin_ssl_protocols=["TLSv1.2"],
            ),
        ),
    ],
    default_cache_behavior=aws.cloudfront.DistributionDefaultCacheBehaviorArgs(
        target_origin_id="S3-frontend",
        viewer_protocol_policy="redirect-to-https",
        allowed_methods=["GET", "HEAD"],
        cached_methods=["GET", "HEAD"],
        cache_policy_id=s3_cache_policy.id,
    ),
    ordered_cache_behaviors=[
        aws.cloudfront.DistributionOrderedCacheBehaviorArgs(
            path_pattern="/api/v1/*",
            target_origin_id="APIGateway-backend",
            viewer_protocol_policy="redirect-to-https",
            allowed_methods=[
                "GET",
                "HEAD",
                "OPTIONS",
                "PUT",
                "POST",
                "PATCH",
                "DELETE",
            ],
            cached_methods=["GET", "HEAD"],
            cache_policy_id=api_cache_policy.id,
            origin_request_policy_id=api_origin_request_policy.id,
        )
    ],
    viewer_certificate=viewer_cert,
    restrictions=aws.cloudfront.DistributionRestrictionsArgs(
        geo_restriction=aws.cloudfront.DistributionRestrictionsGeoRestrictionArgs(
            restriction_type="none"
        )
    ),
)

bucket_policy = aws.s3.BucketPolicy(
    f"bucket-policy-{env}",
    bucket=bucket.id,
    policy=pulumi.Output.all(bucket.arn, distribution.arn).apply(
        lambda args: json.dumps(
            {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": {"Service": "cloudfront.amazonaws.com"},
                        "Action": "s3:GetObject",
                        "Resource": f"{args[0]}/*",
                        "Condition": {"StringEquals": {"AWS:SourceArn": args[1]}},
                    }
                ],
            }
        )
    ),
)

if is_prod and domain_name:
    aws.route53.Record(
        "frontend-alias",
        zone_id=zone_cloudfront.zone_id,
        name=domain_name,
        type="A",
        aliases=[
            aws.route53.RecordAliasArgs(
                name=distribution.domain_name,
                zone_id=distribution.hosted_zone_id,
                evaluate_target_health=False,
            )
        ],
    )

# --- 8. Outputs ---


def format_url(args):
    dist_domain, prod_mode, custom_domain = args
    if prod_mode and custom_domain:
        return f"https://{custom_domain}"
    return f"https://{dist_domain}"


final_public_url = pulumi.Output.all(
    distribution.domain_name, is_prod, domain_name
).apply(format_url)

pulumi.export("api_internal_url", api.api_endpoint)
pulumi.export("public_url", final_public_url)
pulumi.export("cloudfront_id", distribution.id)

# ---------------------------------------------------------------------------
# NOVO — Outputs relacionados ao SES
# ---------------------------------------------------------------------------
if is_prod and domain_name:
    pulumi.export("ses_domain", ses_domain_identity.domain)
    pulumi.export("ses_identity_arn", ses_identity_arn)
    pulumi.export(
        "ses_verification_note",
        (
            "Domínio SES verificado para " + domain_name + ". "
            "Registros DNS (SPF, DKIM) foram adicionados ao Route53."
        ),
    )
else:
    pulumi.export("ses_from_email", ses_from_email)
    pulumi.export(
        "ses_note",
        "Em desenvolvimento, use o modo DEVELOPER para testar SES com endereços pré-verificados.",
    )
