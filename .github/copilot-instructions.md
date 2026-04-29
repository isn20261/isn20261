# Project Guidelines

## Architecture
- Infra é definida em [__main__.py](__main__.py) via Pulumi.
- Código das Lambdas fica em `functions/<lambda>/` (ex.: `functions/register/register.py`).
- Cada Lambda inclui um pacote `shared/` com helpers (DB/auth/response).
- Dependências de terceiros (ex.: `jwt`/`PyJWT`) são fornecidas via **Lambda Layer** construída pelo Pulumi.

## Build and Test
- Instalar deps do Pulumi/IaC: `uv sync` (ou `uv sync --dev`).
- Preview/deploy (stacks): `pulumi preview -s dev` / `pulumi up -s dev` (ou `-s prod`).
- Local (SAM): `make sam` (sobe DynamoDB local via Docker e invoca a Lambda do template SAM).

## Dependencies (Lambda Layer)
- Arquivo fonte de deps da Layer: [functions/layer-requirements.txt](functions/layer-requirements.txt)
- A Layer é gerada em `.pulumi-build/` com estrutura `python/` e empacotada em ZIP.
- Regra prática: **não** adicione `boto3` na Layer (AWS já inclui no runtime).

## Conventions / Pitfalls
- Variáveis de ambiente esperadas pelas Lambdas: `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID` e as tabelas `*_TABLE` (ver `functions/**/shared/db.py`).
- Se uma dependência nativa (ex.: `cryptography`) quebrar em runtime, gere a Layer em ambiente compatível com Lambda (container `sam build`/imagem de build do runtime) antes de subir.

## Docs
- Setup AWS/Codespaces: [README.md](README.md)
- API: `docs/openapi.yaml`
