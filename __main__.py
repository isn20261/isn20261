import pulumi
import pulumi_aws as aws
import base64
import hashlib
import json
import os
import mimetypes
import shutil
import stat
import subprocess
import sys
import zipfile
from pathlib import Path

# --- 1. Configurações do Ambiente (12-Factor) ---
config = pulumi.Config()
env = config.require("environment")
is_prod = env == "prod"
domain_name = config.get("domainName") if is_prod else None

# --- 2. DynamoDB Tables ---
users_table = aws.dynamodb.Table(
    f"users-table-{env}",
    name=f"users_{env}",
    billing_mode="PAY_PER_REQUEST",
    hash_key="sub",
    attributes=[aws.dynamodb.TableAttributeArgs(name="sub", type="S")],
)

email_to_sub_table = aws.dynamodb.Table(
    f"email-to-sub-table-{env}",
    name=f"email_to_sub_{env}",
    billing_mode="PAY_PER_REQUEST",
    hash_key="email",
    attributes=[aws.dynamodb.TableAttributeArgs(name="email", type="S")],
)

tokens_table = aws.dynamodb.Table(
    f"tokens-table-{env}",
    name=f"tokens_{env}",
    billing_mode="PAY_PER_REQUEST",
    hash_key="token",
    attributes=[aws.dynamodb.TableAttributeArgs(name="token", type="S")],
    ttl=aws.dynamodb.TableTtlArgs(attribute_name="ttl", enabled=True),
)

historico_table = aws.dynamodb.Table(
    f"historico-table-{env}",
    name=f"historico_{env}",
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
    name=f"logs_{env}",
    billing_mode="PAY_PER_REQUEST",
    hash_key="sub",
    range_key="timestamp",
    attributes=[
        aws.dynamodb.TableAttributeArgs(name="sub", type="S"),
        aws.dynamodb.TableAttributeArgs(name="timestamp", type="S"),
    ],
)

# Mantida para uso futuro/compatibilidade.
recommendations_table = aws.dynamodb.Table(
    f"recommendations-table-{env}",
    name=f"recommendations_{env}",
    billing_mode="PAY_PER_REQUEST",
    hash_key="user_id",
    attributes=[aws.dynamodb.TableAttributeArgs(name="user_id", type="S")],
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
    f"lambda-basic-exec-{env}",
    role=lambda_role.name,
    policy_arn="arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
)


def _dynamo_resources(*table_arns: str) -> list[str]:
    resources: list[str] = []
    for arn in table_arns:
        resources.append(arn)
        resources.append(f"{arn}/index/*")
    return resources


aws.iam.RolePolicy(
    f"lambda-app-policy-{env}",
    role=lambda_role.id,
    policy=pulumi.Output.all(
        users_table.arn,
        email_to_sub_table.arn,
        tokens_table.arn,
        historico_table.arn,
        logs_table.arn,
        user_pool.arn,
    ).apply(
        lambda args: json.dumps(
            {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Action": [
                            "dynamodb:GetItem",
                            "dynamodb:PutItem",
                            "dynamodb:UpdateItem",
                            "dynamodb:DeleteItem",
                            "dynamodb:Query",
                            "dynamodb:Scan",
                        ],
                        "Resource": _dynamo_resources(
                            args[0],
                            args[1],
                            args[2],
                            args[3],
                            args[4],
                        ),
                    },
                    {
                        "Effect": "Allow",
                        "Action": [
                            "cognito-idp:AdminCreateUser",
                            "cognito-idp:AdminSetUserPassword",
                            "cognito-idp:InitiateAuth",
                            "cognito-idp:AdminUpdateUserAttributes",
                        ],
                        "Resource": args[5],
                    },
                ],
            }
        )
    ),
)
# --- 5. AWS Lambdas ---
env_vars = {
    "USERS_TABLE": users_table.name,
    "EMAIL_TO_SUB_TABLE": email_to_sub_table.name,
    "TOKENS_TABLE": tokens_table.name,
    "HISTORICO_TABLE": historico_table.name,
    "LOGS_TABLE": logs_table.name,
    "RECOMMENDATIONS_TABLE": recommendations_table.name,
    "COGNITO_USER_POOL_ID": user_pool.id,
    "COGNITO_CLIENT_ID": user_pool_client.id,
}


_ZIP_FIXED_DT = (1980, 1, 1, 0, 0, 0)


def _zip_dir_deterministic(src_dir: str, zip_path: str, arc_prefix: str | None = None) -> None:
    src = Path(src_dir)
    zip_file = Path(zip_path)
    zip_file.parent.mkdir(parents=True, exist_ok=True)

    if zip_file.exists():
        zip_file.unlink()

    with zipfile.ZipFile(zip_file, "w") as zf:
        for file_path in sorted(src.rglob("*")):
            if not file_path.is_file():
                continue
            rel = file_path.relative_to(src).as_posix()
            arcname = f"{arc_prefix}/{rel}" if arc_prefix else rel
            info = zipfile.ZipInfo(arcname, date_time=_ZIP_FIXED_DT)
            info.compress_type = zipfile.ZIP_DEFLATED
            mode = stat.S_IMODE(file_path.stat().st_mode)
            info.external_attr = (mode & 0xFFFF) << 16
            with open(file_path, "rb") as f:
                zf.writestr(info, f.read())


def _sha256_b64(file_path: str) -> str:
    h = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return base64.b64encode(h.digest()).decode("utf-8")


def build_python_deps_layer() -> aws.lambda_.LayerVersion:
    """Build a Lambda Layer containing Python dependencies.

    This project ships Lambda code as source-only. For third-party libs
    (e.g. PyJWT used by shared/auth.py), we provide them via a Layer.
    """

    build_root = ".pulumi-build"
    layer_name = f"python-deps-layer-{env}"
    layer_dir = os.path.join(build_root, layer_name)
    python_dir = os.path.join(layer_dir, "python")
    zip_path = os.path.join(build_root, f"{layer_name}.zip")
    wheelhouse_dir = os.path.join(layer_dir, ".wheelhouse")

    # Target do runtime do Lambda para seleção/instalação de wheels.
    target_platform = "manylinux2014_x86_64"
    target_python = "3.13"
    target_impl = "cp"
    target_abi = "cp313"

    req_file = os.path.join("functions", "layer-requirements.txt")
    if not os.path.exists(req_file):
        raise FileNotFoundError(
            f"Arquivo de dependências da Layer não encontrado: {req_file}"
        )

    with open(req_file, "rb") as f:
        req_hash = hashlib.sha256(f.read()).hexdigest()

    marker_file = os.path.join(layer_dir, f".deps-installed-{req_hash}")

    if not os.path.exists(marker_file) or not os.path.exists(zip_path):
        shutil.rmtree(layer_dir, ignore_errors=True)
        os.makedirs(python_dir, exist_ok=True)

        os.makedirs(wheelhouse_dir, exist_ok=True)

        # Baixa wheels compatíveis com o runtime do Lambda (Python 3.13, manylinux).
        # Isso evita instalar wheels de uma versão diferente do Python (ex.: Pulumi rodando em 3.14).
        subprocess.run(
            [
                sys.executable,
                "-m",
                "pip",
                "download",
                "--no-cache-dir",
                "--dest",
                wheelhouse_dir,
                "--platform",
                target_platform,
                "--implementation",
                target_impl,
                "--python-version",
                target_python,
                "--abi",
                target_abi,
                "--only-binary",
                ":all:",
                "-r",
                req_file,
            ],
            check=True,
        )

        subprocess.run(
            [
                sys.executable,
                "-m",
                "pip",
                "install",
                "--no-cache-dir",
                "--platform",
                target_platform,
                "--implementation",
                target_impl,
                "--python-version",
                target_python,
                "--abi",
                target_abi,
                "--only-binary",
                ":all:",
                "--no-index",
                "--find-links",
                wheelhouse_dir,
                "-r",
                req_file,
                "-t",
                python_dir,
            ],
            check=True,
        )

        for old in Path(layer_dir).glob(".deps-installed-*"):
            try:
                old.unlink()
            except OSError:
                pass

        with open(marker_file, "w", encoding="utf-8") as f:
            f.write(req_hash + "\n")

        _zip_dir_deterministic(python_dir, zip_path, arc_prefix="python")

    return aws.lambda_.LayerVersion(
        f"python-deps-layer-{env}",
        layer_name=f"python-deps-{env}",
        compatible_runtimes=["python3.13"],
        code=pulumi.FileArchive(zip_path),
        source_code_hash=_sha256_b64(zip_path),
    )


python_deps_layer = build_python_deps_layer()


def build_lambda_archive(name: str) -> pulumi.AssetArchive:

    lambda_dir = os.path.join("functions", name)
    assets: dict[str, pulumi.Asset] = {}

    for root, _dirs, files in os.walk(lambda_dir, followlinks=True):
        for file in files:
            file_path = os.path.join(root, file)
            rel_path = os.path.relpath(file_path, lambda_dir).replace("\\", "/")
            assets[rel_path] = pulumi.FileAsset(file_path)

    return pulumi.AssetArchive(assets)


def create_lambda(name, entry_point):
    return aws.lambda_.Function(
        f"{name}-{env}",
        runtime="python3.13",
        role=lambda_role.arn,
        handler=entry_point,
        code=build_lambda_archive(name),
        environment=aws.lambda_.FunctionEnvironmentArgs(variables=env_vars),
        layers=[python_deps_layer.arn],
    )


register_lambda = create_lambda("register", "register.handler")
login_lambda = create_lambda("login", "login.handler")
recommend_lambda = create_lambda("recommend", "recommend.handler")

# --- 6. API Gateway v2 (HTTP API) ---
api = aws.apigatewayv2.Api(f"http-api-{env}", protocol_type="HTTP")

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
    integration = aws.apigatewayv2.Integration(
        f"integration-{path.replace('/', '')}-{env}",
        api_id=api.id,
        integration_type="AWS_PROXY",
        integration_method="POST",
        integration_uri=lambda_func.invoke_arn,
    )

    aws.lambda_.Permission(
        f"api-gw-permission-{path.replace('/', '')}-{env}",
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

    aws.apigatewayv2.Route(f"route-{path.replace('/', '')}-{env}", **route_args)


# Rotas com o prefixo /api/v1/
create_route("/api/v1/register", "POST", register_lambda)
create_route("/api/v1/login", "POST", login_lambda)
create_route("/api/v1/recommend", "GET", recommend_lambda, auth_id=authorizer.id)

stage = aws.apigatewayv2.Stage(
    f"api-stage-{env}", api_id=api.id, name="$default", auto_deploy=True
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

# Política de Cache para a API (Desabilita o cache totalmente, vital para POST/Login)
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
