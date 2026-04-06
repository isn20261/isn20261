"""Serverless full-stack application on AWS.

Architecture:
  Route53 -> CloudFront (HTTPS) -> API Gateway -> S3 (/) + Lambda (/api)
  Lambda -> DynamoDB for storage
"""

import json

import pulumi
import pulumi_aws as aws
import pulumi_aws_apigateway as apigateway

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
config = pulumi.Config()
domain_name = config.require("domainName")

# ---------------------------------------------------------------------------
# DynamoDB table
# ---------------------------------------------------------------------------
table = aws.dynamodb.Table(
    "items-table",
    attributes=[aws.dynamodb.TableAttributeArgs(name="id", type="S")],
    hash_key="id",
    billing_mode="PAY_PER_REQUEST",
    tags={"Project": "isn20261"},
)

# ---------------------------------------------------------------------------
# IAM role for Lambda
# ---------------------------------------------------------------------------
lambda_role = aws.iam.Role(
    "lambda-role",
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
    managed_policy_arns=[aws.iam.ManagedPolicy.AWS_LAMBDA_BASIC_EXECUTION_ROLE],
)

# Grant Lambda read/write access to the DynamoDB table.
aws.iam.RolePolicy(
    "lambda-dynamo-policy",
    role=lambda_role.id,
    policy=table.arn.apply(
        lambda arn: json.dumps(
            {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Action": [
                            "dynamodb:GetItem",
                            "dynamodb:PutItem",
                            "dynamodb:Scan",
                            "dynamodb:Query",
                            "dynamodb:UpdateItem",
                            "dynamodb:DeleteItem",
                        ],
                        "Resource": arn,
                    }
                ],
            }
        )
    ),
)

# ---------------------------------------------------------------------------
# Lambda function
# ---------------------------------------------------------------------------
fn = aws.lambda_.Function(
    "api-function",
    runtime="python3.13",
    handler="handler.handler",
    role=lambda_role.arn,
    code=pulumi.FileArchive("./function"),
    environment=aws.lambda_.FunctionEnvironmentArgs(
        variables={"TABLE_NAME": table.name},
    ),
    timeout=10,
    memory_size=128,
    tags={"Project": "isn20261"},
)

# ---------------------------------------------------------------------------
# S3 bucket for static website content
# ---------------------------------------------------------------------------
site_bucket = aws.s3.Bucket(
    "site-bucket",
    tags={"Project": "isn20261"},
)

# ---------------------------------------------------------------------------
# API Gateway: routes / -> S3 static content, /api -> Lambda
# ---------------------------------------------------------------------------
api = apigateway.RestAPI(
    "api",
    static_routes_bucket=site_bucket,
    routes=[
        # Serve static files from the www/ directory at the root path.
        apigateway.RouteArgs(path="/", local_path="www", index="index.html"),
        # Proxy all /api requests to the Lambda function.
        apigateway.RouteArgs(
            path="/api",
            method=apigateway.Method.ANY,
            event_handler=fn,
        ),
    ],
    tags={"Project": "isn20261"},
)

# ---------------------------------------------------------------------------
# Route53 hosted zone
# ---------------------------------------------------------------------------
zone = aws.route53.Zone("zone", name=domain_name, tags={"Project": "isn20261"})

# ---------------------------------------------------------------------------
# ACM certificate (must be in us-east-1 for CloudFront)
# ---------------------------------------------------------------------------
us_east_1 = aws.Provider("us-east-1", region="us-east-1")

certificate = aws.acm.Certificate(
    "certificate",
    domain_name=domain_name,
    validation_method="DNS",
    tags={"Project": "isn20261"},
    opts=pulumi.ResourceOptions(provider=us_east_1),
)

# Create the DNS validation record in Route53.
cert_validation_record = aws.route53.Record(
    "cert-validation-record",
    zone_id=zone.zone_id,
    name=certificate.domain_validation_options[0].resource_record_name,
    type=certificate.domain_validation_options[0].resource_record_type,
    records=[certificate.domain_validation_options[0].resource_record_value],
    ttl=300,
)

# Wait for the certificate to be validated.
cert_validation = aws.acm.CertificateValidation(
    "cert-validation",
    certificate_arn=certificate.arn,
    validation_record_fqdns=[cert_validation_record.fqdn],
    opts=pulumi.ResourceOptions(provider=us_east_1),
)

# ---------------------------------------------------------------------------
# CloudFront distribution fronting the API Gateway
# ---------------------------------------------------------------------------

# Extract the API Gateway domain and stage path from the invoke URL.
# The URL format is: https://{id}.execute-api.{region}.amazonaws.com/{stage}/
api_domain = api.url.apply(lambda url: url.replace("https://", "").split("/")[0])
api_stage_path = api.stage.stage_name.apply(lambda s: f"/{s}")

cdn = aws.cloudfront.Distribution(
    "cdn",
    enabled=True,
    aliases=[domain_name],
    # API Gateway origin.
    origins=[
        aws.cloudfront.DistributionOriginArgs(
            domain_name=api_domain,
            origin_id="apigateway",
            origin_path=api_stage_path,
            custom_origin_config=aws.cloudfront.DistributionOriginCustomOriginConfigArgs(
                http_port=80,
                https_port=443,
                origin_protocol_policy="https-only",
                origin_ssl_protocols=["TLSv1.2"],
            ),
        ),
    ],
    default_cache_behavior=aws.cloudfront.DistributionDefaultCacheBehaviorArgs(
        target_origin_id="apigateway",
        viewer_protocol_policy="redirect-to-https",
        allowed_methods=["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"],
        cached_methods=["GET", "HEAD"],
        forwarded_values=aws.cloudfront.DistributionDefaultCacheBehaviorForwardedValuesArgs(
            query_string=True,
            headers=["Accept", "Content-Type", "Authorization"],
            cookies=aws.cloudfront.DistributionDefaultCacheBehaviorForwardedValuesCookiesArgs(
                forward="none",
            ),
        ),
        min_ttl=0,
        default_ttl=0,
        max_ttl=0,
    ),
    # Use the validated ACM certificate for HTTPS.
    viewer_certificate=aws.cloudfront.DistributionViewerCertificateArgs(
        acm_certificate_arn=cert_validation.certificate_arn,
        ssl_support_method="sni-only",
        minimum_protocol_version="TLSv1.2_2021",
    ),
    restrictions=aws.cloudfront.DistributionRestrictionsArgs(
        geo_restriction=aws.cloudfront.DistributionRestrictionsGeoRestrictionArgs(
            restriction_type="none",
        ),
    ),
    # CloudFront serves content globally; price class covers all edge locations.
    price_class="PriceClass_100",
    is_ipv6_enabled=True,
    tags={"Project": "isn20261"},
)

# ---------------------------------------------------------------------------
# Route53 alias records pointing the domain to CloudFront
# ---------------------------------------------------------------------------
aws.route53.Record(
    "domain-a-record",
    zone_id=zone.zone_id,
    name=domain_name,
    type="A",
    aliases=[
        aws.route53.RecordAliasArgs(
            name=cdn.domain_name,
            zone_id=cdn.hosted_zone_id,
            evaluate_target_health=False,
        )
    ],
)

aws.route53.Record(
    "domain-aaaa-record",
    zone_id=zone.zone_id,
    name=domain_name,
    type="AAAA",
    aliases=[
        aws.route53.RecordAliasArgs(
            name=cdn.domain_name,
            zone_id=cdn.hosted_zone_id,
            evaluate_target_health=False,
        )
    ],
)

# ---------------------------------------------------------------------------
# Exports
# ---------------------------------------------------------------------------
pulumi.export("table_name", table.name)
pulumi.export("site_bucket_name", site_bucket.bucket)
pulumi.export("api_url", api.url)
pulumi.export("zone_id", zone.zone_id)
pulumi.export("name_servers", zone.name_servers)
pulumi.export("certificate_arn", certificate.arn)
pulumi.export("cdn_domain", cdn.domain_name)
pulumi.export("domain_url", pulumi.Output.concat("https://", domain_name))
