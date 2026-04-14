import json
import pulumi
import pulumi_aws as aws
import pulumi_aws_apigateway as apigateway

# ---------------------------------------------------------------------------
# DynamoDB Tables
# ---------------------------------------------------------------------------

email_sub_table = aws.dynamodb.Table("email-to-sub",
    billing_mode="PAY_PER_REQUEST",
    hash_key="email",
    attributes=[aws.dynamodb.TableAttributeArgs(name="email", type="S")])

users_table = aws.dynamodb.Table("users",
    billing_mode="PAY_PER_REQUEST",
    hash_key="sub",
    attributes=[aws.dynamodb.TableAttributeArgs(name="sub", type="S")])

tokens_table = aws.dynamodb.Table("tokens",
    billing_mode="PAY_PER_REQUEST",
    hash_key="token",
    attributes=[aws.dynamodb.TableAttributeArgs(name="token", type="S")],
    ttl=aws.dynamodb.TableTtlArgs(attribute_name="expiresAt", enabled=True))

history_table = aws.dynamodb.Table("history",
    billing_mode="PAY_PER_REQUEST",
    hash_key="sub",
    range_key="timestamp",
    attributes=[
        aws.dynamodb.TableAttributeArgs(name="sub", type="S"),
        aws.dynamodb.TableAttributeArgs(name="timestamp", type="S"),
    ])

logs_table = aws.dynamodb.Table("logs",
    billing_mode="PAY_PER_REQUEST",
    hash_key="sub",
    range_key="timestamp",
    attributes=[
        aws.dynamodb.TableAttributeArgs(name="sub", type="S"),
        aws.dynamodb.TableAttributeArgs(name="timestamp", type="S"),
    ])

# Table name map — use this when setting Lambda environment variables
db_table_names = {
    "DB_TABLE_EMAIL_SUB": email_sub_table.name,
    "DB_TABLE_USERS": users_table.name,
    "DB_TABLE_TOKENS": tokens_table.name,
    "DB_TABLE_HISTORY": history_table.name,
    "DB_TABLE_LOGS": logs_table.name,
}

# ---------------------------------------------------------------------------
# Lambda Layer (shared db module)
# ---------------------------------------------------------------------------

db_layer = aws.lambda_.LayerVersion("db-layer",
    layer_name="db",
    compatible_runtimes=["python3.9", "python3.10", "python3.11", "python3.12", "python3.13"],
    code=pulumi.FileArchive("./layer"))

# ---------------------------------------------------------------------------
# IAM Role
# ---------------------------------------------------------------------------

role = aws.iam.Role("role",
    assume_role_policy=json.dumps({
        "Version": "2012-10-17",
        "Statement": [{
            "Action": "sts:AssumeRole",
            "Effect": "Allow",
            "Principal": {
                "Service": "lambda.amazonaws.com",
            },
        }],
    }),
    managed_policy_arns=[aws.iam.ManagedPolicy.AWS_LAMBDA_BASIC_EXECUTION_ROLE])

# DynamoDB access policy for Lambda functions
dynamodb_policy = aws.iam.RolePolicy("dynamodb-policy",
    role=role.name,
    policy=pulumi.Output.all(
        email_sub_table.arn,
        users_table.arn,
        tokens_table.arn,
        history_table.arn,
        logs_table.arn,
    ).apply(lambda arns: json.dumps({
        "Version": "2012-10-17",
        "Statement": [{
            "Effect": "Allow",
            "Action": [
                "dynamodb:GetItem",
                "dynamodb:PutItem",
                "dynamodb:UpdateItem",
                "dynamodb:DeleteItem",
                "dynamodb:Query",
                "dynamodb:Scan",
            ],
            "Resource": list(arns),
        }],
    })))

# ---------------------------------------------------------------------------
# Example Lambda function (existing)
# ---------------------------------------------------------------------------

fn = aws.lambda_.Function("fn",
    runtime="python3.9",
    handler="handler.handler",
    role=role.arn,
    code=pulumi.FileArchive("./function"),
    layers=[db_layer.arn],
    environment=aws.lambda_.FunctionEnvironmentArgs(variables=db_table_names))

# A REST API to route requests to HTML content and the Lambda function
api = apigateway.RestAPI("api",
  routes=[
    apigateway.RouteArgs(path="/", local_path="www"),
    apigateway.RouteArgs(path="/date", method=apigateway.Method.GET, event_handler=fn)
  ])

# ---------------------------------------------------------------------------
# Exports
# ---------------------------------------------------------------------------

pulumi.export("url", api.url)
pulumi.export("db_layer_arn", db_layer.arn)
pulumi.export("db_table_email_sub", email_sub_table.name)
pulumi.export("db_table_users", users_table.name)
pulumi.export("db_table_tokens", tokens_table.name)
pulumi.export("db_table_history", history_table.name)
pulumi.export("db_table_logs", logs_table.name)
