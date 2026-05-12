# Postman

Importe a collection [recommend-a.postman_collection.json](recommend-a.postman_collection.json) e o environment [recommend-a.postman_environment.json](recommend-a.postman_environment.json).

Use `baseUrl` com a URL do API Gateway e `jwt` com um token válido do Cognito para testar os endpoints protegidos.

O trigger `post_confirm` não pode ser executado pelo Postman porque não é um endpoint HTTP; ele deve ser testado no Console da AWS ou por invocação direta do Lambda.