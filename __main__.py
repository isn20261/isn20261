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

tokens_table = aws.dynamodb.Table(
    f"tokens-table-{env}",
    name=f"Tokens_{env}",
    billing_mode="PAY_PER_REQUEST",
    hash_key="token",
    attributes=[aws.dynamodb.TableAttributeArgs(name="token", type="S")],
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
    "tokens": tokens_table,
    "historico": historico_table,
    "logs": logs_table,
}

for table_name, table in dynamodb_tables.items():
    aws.dynamodb.ContributorInsights(
        f"{table_name}-contributor-insights-{env}",
        table_name=table.name,
        mode="ACCESSED_AND_THROTTLED_KEYS",
    )

# --- 3. Amazon Cognito ---
user_pool = aws.cognito.UserPool(
    f"app-user-pool-{env}", name=f"app-users-{env}", auto_verified_attributes=["email"]
)

user_pool_client = aws.cognito.UserPoolClient(
    f"app-user-pool-client-{env}",
    user_pool_id=user_pool.id,
    explicit_auth_flows=["ALLOW_USER_PASSWORD_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"],
    generate_secret=False,
)

# --- 4. IAM Role para os Lambdas ---
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
    f"lambda-dynamodb-cognito-policy-{env}",
    role=lambda_role.name,
    policy=pulumi.Output.all(
        email_to_sub_table.arn,
        users_table.arn,
        tokens_table.arn,
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
                        ],
                        "Resource": arns,
                    },
                    {
                        "Effect": "Allow",
                        "Action": [
                            "cognito-idp:AdminInitiateAuth",
                            "cognito-idp:SignUp",
                            "cognito-idp:AdminConfirmSignUp",
                        ],
                        "Resource": "*",
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

# --- 5. AWS Lambdas ---
env_vars = {
    "EMAIL_TO_SUB_TABLE": email_to_sub_table.name,
    "USERS_TABLE": users_table.name,
    "TOKENS_TABLE": tokens_table.name,
    "HISTORICO_TABLE": historico_table.name,
    "LOGS_TABLE": logs_table.name,
}

# Lambda Layers extract to /opt/, but Python only adds /opt/python/ to sys.path.
# AssetArchive places files at explicit paths so `from shared.X import Y` works.
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


def create_lambda(name, entry_point):
    function = aws.lambda_.Function(
        f"{name}-{env}",
        runtime="python3.13",
        role=lambda_role.arn,
        handler=entry_point,
        code=pulumi.FileArchive(f"./functions/{name}"),
        environment=aws.lambda_.FunctionEnvironmentArgs(variables=env_vars),
        layers=[arn for arn in [shared_layer.arn] if arn is not None],
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
    # Remove as barras para criar nomes seguros no Pulumi
    safe_path = path.replace("/", "")

    # Adicionamos o 'method' no nome do recurso para evitar conflitos no Pulumi
    integration = aws.apigatewayv2.Integration(
        f"integration-{method}-{safe_path}-{env}",
        api_id=api.id,
        integration_type="AWS_PROXY",
        integration_method="POST",  # ATENÇÃO: a integração com Lambda proxy no AWS é sempre POST, não mude isso.
        integration_uri=lambda_func.invoke_arn,
        payload_format_version="2.0",  # default is 1.0; v2.0 puts JWT claims at event.requestContext.authorizer.jwt.claims
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
        "route_key": f"{method} {path}",  # Define se a rota responderá a GET ou POST
        "target": pulumi.Output.concat("integrations/", integration.id),
    }
    if auth_id:
        route_args["authorization_type"] = "JWT"
        route_args["authorizer_id"] = auth_id

    aws.apigatewayv2.Route(f"route-{method}-{safe_path}-{env}", **route_args)


# Rotas com o prefixo /api/v1/
create_route("/api/v1/history", "GET", history_lambda, auth_id=authorizer.id)
create_route("/api/v1/preferences", "GET", preferences_lambda, auth_id=authorizer.id)
create_route("/api/v1/preferences", "POST", preferences_lambda, auth_id=authorizer.id)
create_route("/api/v1/recommend", "GET", recommend_lambda, auth_id=authorizer.id)
create_route("/api/v1/watch-later", "GET", watch_later_lambda, auth_id=authorizer.id)
create_route("/api/v1/watch-later", "POST", watch_later_lambda, auth_id=authorizer.id)


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

frontend_dir = "www"
for root, dirs, files in os.walk(frontend_dir, followlinks=True):
    for file in files:
        file_path = os.path.join(root, file)
        relative_path = os.path.relpath(file_path, frontend_dir)
        content_type, _ = mimetypes.guess_type(file_path)

        aws.s3.BucketObject(
            f"static-file-{relative_path}-{env}",
            bucket=bucket.id,
            key=relative_path.replace(
                "\\", "/"
            ),  # Garante compatibilidade caso execute no Windows
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

# Configuração condicional de domínio e certificado (Route53)
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
    zone = aws.route53.get_zone(name=domain_name)

    validation_record = aws.route53.Record(
        "cert-validation",
        name=cert.domain_validation_options[0].resource_record_name,
        zone_id=zone.zone_id,
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

# Política de Cache para o Frontend (Permite cache longo do S3)
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

# Política de Cache para a API (Desabilita o cache totalmente, vital para POST)
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

# Política de Request para a API (Envia Authorization e Query Strings, mas bloqueia o Host)
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
            ]  # 'Host' omitido intencionalmente
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
    # --- Frontend (S3) via Política Customizada ---
    default_cache_behavior=aws.cloudfront.DistributionDefaultCacheBehaviorArgs(
        target_origin_id="S3-frontend",
        viewer_protocol_policy="redirect-to-https",
        allowed_methods=["GET", "HEAD"],
        cached_methods=["GET", "HEAD"],
        cache_policy_id=s3_cache_policy.id,  # Referência direta à policy que acabamos de criar
    ),
    # --- Backend (API Gateway) via Políticas Customizadas ---
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
            cache_policy_id=api_cache_policy.id,  # Referência à policy sem cache
            origin_request_policy_id=api_origin_request_policy.id,  # Referência à policy de requisição
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
        zone_id=zone.zone_id,
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


# Função para formatar a URL final dependendo do ambiente
def format_url(args):
    dist_domain, prod_mode, custom_domain = args
    if prod_mode and custom_domain:
        return f"https://{custom_domain}"
    return f"https://{dist_domain}"


# Usamos Output.all para aguardar todos os valores serem resolvidos
final_public_url = pulumi.Output.all(
    distribution.domain_name, is_prod, domain_name
).apply(format_url)

pulumi.export("api_internal_url", api.api_endpoint)
pulumi.export("public_url", final_public_url)
pulumi.export("cloudfront_id", distribution.id)
