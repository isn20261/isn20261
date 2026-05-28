# Como Rodar os Testes Localmente

O projeto utiliza pytest para os testes automatizados das funções Lambda e módulos compartilhados.

---

## Instalação das dependências

Antes de executar os testes, instale as ferramentas e dependências do projeto:

```bash
make install   # instala AWS CLI, SAM CLI, Pulumi e uv
uv sync        # instala dependências Python (incluindo dependências de desenvolvimento)
```

As dependências de teste (`pytest`, `moto`, `pyjwt`, `cryptography`) são declaradas no grupo `[dependency-groups] dev` do `pyproject.toml` e são instaladas automaticamente por `uv sync`.

---

## Executando os testes com pytest

Com o ambiente configurado, rode os testes com:

```bash
# Executa todos os testes da pasta tests/ com saída detalhada
uv run pytest tests/ -v

# Executa os testes + mede cobertura da pasta functions/
# Mostra linhas não cobertas e falha se cobertura < 85%
uv run pytest -v --cov=functions --cov-report=term-missing --cov-fail-under=85
```

Isso descobre e executa todos os arquivos `test_*.py` dentro de `tests/`, cobrindo módulos compartilhados e handlers de cada Lambda.


### Rodando um arquivo de teste específico

Para rodar apenas os testes de um handler ou módulo:

```bash
uv run pytest tests/test_recommend.py -v
uv run pytest tests/test_auth.py -v
```

### Rodando um teste específico pelo nome

```bash
uv run pytest tests/ -v -k "test_recommend_anonymous"
```

---

## Executando os testes com AWS SAM

Com o ambiente configurado, rode os testes com:

```bash
make sam
```

### Esse comando executa automaticamente:

1. `docker compose up -d`
    * sobe os containers locais (ex.: DynamoDB local)
2. `sam local invoke`
    * executa a Lambda usando o `template.yaml`
    * utiliza o payload definido em `event.json`
3. `docker compose down`
    * encerra e remove os containers ao final da execução

### Fluxo equivalente manualmente

```bash
# sobe infraestrutura local
make sam-dynamodb

# executa a lambda localmente
make sam-lambda

# encerra containers locais
make sam-stop
```

Ou diretamente com o SAM CLI:

```bash
sam local invoke -t template.yaml -e event.json --docker-network sam-local
```

---

## Integração contínua

Os mesmos testes são executados automaticamente no CI a cada push na branch `main` e em todo pull request, via `.github/workflows/ci.yml`. O comando executado é idêntico ao local: `uv run pytest -v --cov=functions --cov-report=term-missing --cov-fail-under=85`.

---

# Relatório de Estrutura de Testes (Backend Cinedica)

Atualizado em: `28/05/2026`

## 1. Visão Geral do Framework de Testes

### Framework e ferramental

| Aspecto | Detalhe |
|---|---|
| **Runner** | `pytest` ≥8 |
| **Mock AWS** | `moto[cognitoidp,dynamodb]` ≥5 |
| **Dependências declaradas** | `pyproject.toml` (`[dependency-groups] dev`) |
| **Comando de execução** | `uv run pytest tests/ -v` |
| **Localização dos testes** | `tests/` na raiz do repositório, todos os `test_*.py` e o `conftest.py` em um único diretório plano, separados de `functions/` |
| **conftest.py** | `tests/conftest.py` configura variáveis de ambiente, cria as 6 tabelas DynamoDB via moto, expõe fixtures `seed_user` e `seed_movies` |
| **CI** | `.github/workflows/ci.yml`, executa `uv run pytest tests/ -v` em push para `main` e em todos os PRs |
| **Cobertura** | Configurada via `pytest-cov` ≥5, utilizando `uv run pytest -v --cov=functions --cov-report=term-missing --cov-fail-under=85`. O pipeline exige cobertura mínima global de 85%. |

### Contagem de testes

| Arquivo | Funções de teste | Camada |
|---|---|---|
| `tests/test_auth.py` | 18 | Unitário (Python puro, sem moto) |
| `tests/test_db.py` | 9 | Unitário (moto DynamoDB) |
| `tests/test_response.py` | 14 | Unitário (Python puro) |
| `tests/test_recommend.py` | 11 | Integração (moto DynamoDB + handler) |
| `tests/test_history.py` | 6 | Integração |
| `tests/test_preferences.py` | 18 | Integração |
| `tests/test_watch_later.py` | 18 | Integração |
| `tests/test_post_confirm.py` | 7 | Integração |
| `tests/test_openapi_contract.py` | 23 | Contrato (conformidade com `docs/openapi.yaml`) |
| **Total** | **124** | |

### Pipelines de CI/CD

1. **CI** (`.github/workflows/ci.yml`): disparado em `push: [main]` e `pull_request`. Executa apenas `uv run pytest tests/ -v`.
2. **Pulumi Preview** (`.github/workflows/pulumi-preview.yml`): disparado em PRs que tocam arquivos de infraestrutura (`__main__.py`, `Pulumi.*.yaml`, `pyproject.toml`, `uv.lock`, `functions/**`). Executa `pulumi preview --stack dev` e posta o resultado como comentário no PR. Ignorado em forks.
3. **Deploy prod** (`.github/workflows/deploy-prod.yml`): disparado em push para `main` e manualmente. Dois passes de `pulumi up` + build do Next.js + upload para S3 + invalidação do CloudFront. Nenhum teste é executado durante o deploy.

---

## 2. Detalhamento dos Testes Organizados por Endpoint de API

### 2.1 Módulos compartilhados `/tests/shared/` (sem rota de API; Lambda Layer)

**`tests/test_auth.py`**: testa `get_sub(event)` e `get_method(event)`, ambas funções puras.

| # | Teste | O que cobre |
|---|---|---|
| 1 | `test_returns_sub_from_claims` | Happy path: payload JWT do API Gateway v2 |
| 2 | `test_missing_request_context` | `{}` → `None` |
| 3 | `test_missing_authorizer` | `{"requestContext": {}}` → `None` |
| 4 | `test_missing_jwt` | Authorizer sem chave `jwt` |
| 5 | `test_missing_claims` | `jwt` sem `claims` |
| 6 | `test_missing_sub_claim` | Claims tem `email` mas não `sub` |
| 7 | `test_empty_sub_returns_none` | `sub: ""` → `None` |
| 8 | `test_null_request_context` | `requestContext: null` |
| 9 | `test_payload_format_v1_claims` | Formato REST API: `authorizer.claims` (não `.jwt.claims`) |
| 10–13 | `test_without_disable_auth_does_not_accept_*` | Fontes de auth de dev rejeitadas quando `DISABLE_AUTH` não está definido |
| 14–16 | `test_disable_auth_allows_*` | `sub` raiz, header `x-dev-sub`, query-string `sub` aceitos com `DISABLE_AUTH=1` |
| 17 | `test_disable_auth_without_sub_returns_none` | `DISABLE_AUTH=1` mas sem sub em lugar algum |
| 18 | `test_get_method_v2/v1/priority/default` | 4 subtestes: payload v2, `httpMethod` v1, prioridade v2 sobre v1, padrão `GET` |

**`tests/test_db.py`**: testa `get_user`, `get_sub_by_email`, `get_token`, `write_log`, `users_create_if_absent` contra moto DynamoDB.

| # | Teste | O que cobre |
|---|---|---|
| 1 | `test_get_user_found` | Usuário existente retorna item |
| 2 | `test_get_user_missing` | Usuário inexistente → `None` |
| 3 | `test_get_sub_by_email_found` | Mapeamento email→sub funciona |
| 4 | `test_get_sub_by_email_missing` | Email desconhecido → `None` |
| 5 | `test_get_token_found` | Recuperação de token funciona |
| 6 | `test_get_token_missing` | Token ausente → `None` |
| 7 | `test_write_log` | Item de log persistido com formato correto |
| 8 | `test_users_create_if_absent_returns_false_on_duplicate` | Segunda chamada retorna `False` sem lançar exceção |
| 9 | `test_users_create_if_absent_reraises_unexpected_error` | Erro não-condicional do DynamoDB é relançado |

**`tests/test_response.py`**: testa todos os helpers HTTP e serialização de `Decimal`.

| # | Teste | O que cobre |
|---|---|---|
| 1–2 | `test_ok_with_body` / `test_ok_empty_body` | 200 com e sem body; headers CORS e Content-Type presentes |
| 3–4 | `test_created_empty` / `test_created_with_body` | 201 com e sem body |
| 5–6 | `test_bad_request_default` / `test_bad_request_custom` | 400 com mensagem padrão e personalizada |
| 7–10 | `unauthorized` / `forbidden` / `not_found` / `server_error` | Cada código de status + body de erro |
| 11 | `test_decimal_serialization_float` | `Decimal("9.99")` → `9.99` float |
| 12 | `test_decimal_serialization_int` | `Decimal("10")` → `10` int |
| 13 | `test_non_serializable_type_raises` | Tipo não serializável (set) → `TypeError` |
| 14 | `test_error_responses_all_include_cors_header` | Todos os 5xx/4xx têm `Access-Control-Allow-Origin: *` e `Content-Type: application/json` |

---

### 2.2 GET `/api/v1/recommend`: `tests/test_recommend.py`

| # | Teste | O que cobre |
|---|---|---|
| 1 | `test_recommend_anonymous` | Usuário não autenticado recebe 200 com filme |
| 2 | `test_recommend_authenticated_with_genre_prefs` | Filtragem de gênero por preferências seleciona gênero correspondente |
| 3 | `test_recommend_authenticated_no_prefs` | Usuário sem preferências → aleatório do catálogo completo |
| 4 | `test_recommend_authenticated_user_not_found` | Sub desconhecido → 401 |
| 5 | `test_recommend_disable_auth_allows_user_not_found_and_saves_history` | `DISABLE_AUTH=1` ignora verificação de usuário inexistente, ainda grava histórico |
| 6 | `test_recommend_saves_to_historico` | Item do histórico criado com movieTitle/movieId/genre/timestamp corretos |
| 7 | `test_recommend_writes_audit_log` | Tabela de logs recebe entrada de ação `RECOMMEND` |
| 8 | `test_recommend_response_includes_all_fields` | 10 campos verificados: title, year, rated, genre, director, runtime, poster, imdbRating, streaming-services |
| 9 | `test_recommend_raises_when_movies_table_empty` | Tabela vazia → `RuntimeError("Movies table is empty")` |
| 10 | `test_recommend_genre_with_no_match_falls_back_to_all` | Gênero preferido sem match → fallback para catálogo completo |
| 11 | `test_recommend_reads_all_scan_pages` | Scan paginado consome todas as páginas via `LastEvaluatedKey` |

### 2.3 GET `/api/v1/history`: `tests/test_history.py`

| # | Teste | O que cobre |
|---|---|---|
| 1 | `test_history_no_auth` | Sem sub → 401 |
| 2 | `test_history_empty` | Usuário sem histórico → 200, `[]` |
| 3 | `test_history_returns_newest_first` | 3 itens ordenados do mais recente ao mais antigo |
| 4 | `test_history_response_shape` | Resposta tem apenas `title`, `genre`, `recommended-at` (sem `movieId` exposto) |
| 5 | `test_history_backward_compat_no_genre` | Entradas antigas sem `genre` → `genre: None` (sem crash) |
| 6 | `test_history_sub_without_user_record_returns_empty` | Sub válido sem linha em Users → 200 `[]` (history só depende do JWT, não do Users table) |

### 2.4 GET+POST `/api/v1/preferences`: `tests/test_preferences.py`

| # | Teste | O que cobre |
|---|---|---|
| 1 | `test_get_no_auth` | Sem sub → 401 |
| 2 | `test_get_user_not_found` | Sub desconhecido → 401 |
| 3 | `test_get_returns_prefs` | Preferências completas retornadas com mapeamento `ageRating→age-rating` |
| 4 | `test_get_returns_empty_prefs_for_new_user` | Usuário existe mas sem chave `preferences` → valores padrão |
| 5 | `test_post_single_field` | POST apenas `genres` → 200, DB atualizado |
| 6 | `test_post_all_fields` | POST todos os 4 campos → 200, DB atualizado + log de auditoria gravado |
| 7 | `test_post_no_fields` | POST `{}` → 400 |
| 8 | `test_post_genres_not_array` | POST `genres: "not-a-list"` → 400 |
| 9 | `test_post_invalid_json` | Body malformado → 400 |
| 10 | `test_post_creates_user_if_absent` | POST para usuário não existente → cria linha + armazena preferências |
| 11 | `test_unsupported_method` | `DELETE /preferences` → 400 `{"error": "Method not allowed"}` |
| 12 | `test_post_subscriptions_not_array` | POST `subscriptions: "Netflix"` → 400 |
| 13 | `test_post_age_rating_integer_coerced_to_string` | `age-rating: 18` (int) → armazenado como `"18"` (str) |
| 14 | `test_post_retry_race_put_conditional_then_update_succeeds` | update ConditionalFailed → put ConditionalFailed (concorrência) → segundo update ok; cobre o branch `continue` |
| 15 | `test_post_put_item_unexpected_error_reraises` | put lança erro não-condicional → re-raise |
| 16 | `test_post_update_item_unexpected_error_reraises` | update lança erro não-condicional → re-raise imediato |
| 17 | `test_post_exhausts_retries_returns_500` | Todos os `MAX_PREFERENCE_UPDATE_RETRIES` falharem → 500, sem crash do Lambda |
| 18 | `test_post_null_field_treated_as_absent` | Campo explicitamente `null` → campo existente no DB preservado |

### 2.5 GET+POST `/api/v1/watch-later`: `tests/test_watch_later.py`

| # | Teste | O que cobre |
|---|---|---|
| 1 | `test_get_no_auth` | Sem sub → 401 |
| 2 | `test_get_user_not_found` | Sub desconhecido → 401 |
| 3 | `test_get_returns_items` | 2 itens retornados com formato `title` + `added-at` |
| 4 | `test_get_returns_movieid_fallback` | Item sem `title` → `movieId` usado como fallback |
| 5 | `test_get_preserves_insertion_order` | Ordem de inserção preservada na listagem |
| 6 | `test_post_valid_movieid_in_catalogue` | movieId conhecido → 201, título resolvido do catálogo |
| 7 | `test_post_valid_movieid_unknown` | movieId desconhecido → 201, `movieId` usado como título |
| 8 | `test_post_missing_movieid` | Body vazio → 400 `{"error": "movieId is required"}` |
| 9 | `test_post_invalid_json` | Body malformado → 400 |
| 10 | `test_unsupported_method` | `DELETE /watch-later` → 400 |
| 11 | `test_post_empty_movieid` | `movieId: ""` → 400 |
| 12 | `test_post_whitespace_movieid` | `movieId: "   "` → 400 |
| 13 | `test_post_movieid_too_long` | `movieId` com 256 chars → 400 |
| 14 | `test_post_writes_audit_log` | Log `WATCH_LATER_ADDED` gravado com movieId e title corretos |
| 15 | `test_post_duplicate_movieid_appends_duplicate` | Dois POSTs com mesmo movieId → 2 entradas (sem dedup) |
| 16 | `test_get_response_shape` | Shape exato: apenas `title` e `added-at` |
| 17 | `test_post_movie_not_in_mock_catalogue_resolves_title_from_db` | movieId ausente do catálogo mock mas presente na tabela Movies → título real armazenado |
| 18 | `test_post_user_not_found_returns_401` | Sub JWT válido mas não registrado → 401, nenhum registro fantasma criado |

### 2.6 Trigger PostConfirmation do Cognito: `tests/test_post_confirm.py`

| # | Teste | O que cobre |
|---|---|---|
| 1 | `test_happy_path_without_name` | Seed completo: linha em Users + mapeamento EmailToSub + entrada REGISTER em Logs |
| 2 | `test_happy_path_with_name` | Atributo `name` é armazenado |
| 3 | `test_re_trigger_is_idempotent` | Segunda chamada não duplica log nem linha de usuário |
| 4 | `test_wrong_trigger_source_is_noop` | `PostConfirmation_ConfirmForgotPassword` ignorado |
| 5 | `test_missing_sub_is_noop` | Sem `sub` nos atributos → no-op |
| 6 | `test_missing_email_is_noop` | Sem `email` nos atributos → no-op |
| 7 | `test_name_empty_string_treated_as_absent` | `name: ""` coercido para `None` — chave `name` não gravada no item |

### 2.7 Testes de Contrato OpenAPI: `tests/test_openapi_contract.py`

Verifica que as respostas dos handlers estão em conformidade com `docs/openapi.yaml`: nomes de campos, tipos, valores de borda e regras de autenticação. Cada classe corresponde a um `path + operation` da spec.

**`TestRecommendContract`: GET /recommend**

| # | Teste | O que cobre |
|---|---|---|
| 1 | `test_200_has_all_spec_fields` | Todos os campos da spec presentes: title, year, rated, genre, director, runtime, poster, imdbRating, streaming-services |
| 2 | `test_imdbRating_is_numeric` | `imdbRating` é `number` (int ou float), não string |
| 3 | `test_streaming_services_items_have_spec_keys` | Cada item de `streaming-services` tem `name`, `image`, `url` |
| 4 | `test_anonymous_request_returns_200` | Segurança `{}` (sem auth) permitida na spec → anônimo deve retornar 200 |

**`TestHistoryContract`: GET /history**

| # | Teste | O que cobre |
|---|---|---|
| 5 | `test_200_returns_array` | Schema de resposta é `type: array` |
| 6 | `test_item_has_exactly_spec_fields` | Items têm exatamente `title`, `genre`, `recommended-at` — nada a mais |
| 7 | `test_recommended_at_is_datetime_string` | Campo `recommended-at` tem formato `date-time` (ISO 8601) |
| 8 | `test_401_when_unauthenticated` | Sem auth → 401 |

**`TestPreferencesGetContract`: GET /preferences**

| # | Teste | O que cobre |
|---|---|---|
| 9 | `test_200_has_all_spec_fields` | Campos `genres`, `subscriptions`, `age-rating`, `humor` presentes |
| 10 | `test_genres_and_subscriptions_are_arrays` | `genres` e `subscriptions` são `type: array` |
| 11 | `test_401_when_unauthenticated` | Sem auth → 401 |

**`TestPreferencesPostContract`: POST /preferences**

| # | Teste | O que cobre |
|---|---|---|
| 12 | `test_200_on_valid_body` | Body válido com ao menos um campo → 200 |
| 13 | `test_400_when_no_recognized_field` | `anyOf` na spec exige ao menos um campo — `{}` → 400 |
| 14 | `test_401_when_unauthenticated` | Sem auth → 401 |

**`TestWatchLaterGetContract`: GET /watch-later**

| # | Teste | O que cobre |
|---|---|---|
| 15 | `test_200_returns_array` | Schema de resposta é `type: array` |
| 16 | `test_item_has_exactly_spec_fields` | Items têm exatamente `title` e `added-at` — nada a mais |
| 17 | `test_added_at_is_datetime_string` | Campo `added-at` tem formato `date-time` (ISO 8601) |
| 18 | `test_401_when_unauthenticated` | Sem auth → 401 |

**`TestWatchLaterPostContract`: POST /watch-later**

| # | Teste | O que cobre |
|---|---|---|
| 19 | `test_201_on_valid_movieid` | movieId válido → 201 Created |
| 20 | `test_201_movieid_at_maxlength` | movieId com exatamente 255 chars → aceito (spec `maxLength: 255`) |
| 21 | `test_400_movieid_over_maxlength` | movieId com 256 chars → 400 (spec `maxLength: 255`) |
| 22 | `test_400_missing_movieid` | movieId ausente → 400 (spec `required`) |
| 23 | `test_401_when_unauthenticated` | Sem auth → 401 |
