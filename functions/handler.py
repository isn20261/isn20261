from datetime import datetime

# lambda genérico pro teste sam
def handler(event, context):
    return {"statusCode": 200, "body": datetime.now().isoformat()}