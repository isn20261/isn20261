# Testes — Cinedica

Documento de referência único sobre **tudo** relacionado a testes no projeto: backend, frontend, E2E, CI/CD, cobertura e gaps conhecidos.

> Última atualização: 2026-05-29

---

## Visão geral — a pirâmide

```
         /\
        /E2E\          ← 9 specs Playwright DOCUMENTADOS (não executáveis ainda)
       /------\
      / Vitest \       ← 41 testes (frontend: componentes + libs)
     /  + RTL   \
    /------------\
   / pytest+moto  \    ← 127 testes (backend: unit + contract), 99% cobertura
  /-----------------\
```

| Camada | Ferramenta | Qtd | Estado | Roda no CI? |
|---|---|---|---|---|
| Backend unit + contract | pytest + moto | 127 | ✅ Estável, 99% cobertura | ✅ Sim (`ci.yml`) |
| Frontend unit + componente | Vitest + RTL + jsdom | 41 | ✅ Estável | ✅ Sim (`ci.yml`) |
| E2E | Playwright | 9 specs | 📝 Documentado, não implementado | ❌ Não |

---

## 1. Backend — pytest + moto

### Como rodar

```bash
# Da raiz do repositório
uv run pytest -v --cov=functions --cov-report=term-missing --cov-fail-under=85
```

> ⚠️ **NUNCA use `python -m pytest`.** O ambiente tem dois Pythons:
> - `python` / `python3` no PATH (v3.12.1) — tem `_cffi_backend` quebrado, todos os testes falham
> - Python gerenciado pelo `uv` (v3.14.5) — funciona corretamente
>
> O `pyproject.toml` define `testpaths = ["tests"]`. O diretório de testes é `tests/`, não `functions/`.

### O que é testado

| Arquivo | Testes | Cobre |
|---|---|---|
| `tests/shared/test_auth.py` | 18 | Extração de `sub` do JWT (payload v1 e v2), `get_method`, modo `DISABLE_AUTH` |
| `tests/shared/test_db.py` | 9 | `get_user`, `get_sub_by_email`, `get_token`, `write_log`, `users_create_if_absent` |
| `tests/shared/test_response.py` | 14 | Helpers HTTP (`ok`/`created`/`bad_request`/... ), CORS, serialização de `Decimal` |
| `tests/recommend/test_recommend.py` | 11 | GET /recommend: anônimo, autenticado, prefs, paginação, **500 tabela vazia** |
| `tests/history/test_history.py` | 7 | GET /history: auth, ordenação, shape, **500 falha DynamoDB** |
| `tests/preferences/test_preferences.py` | 19 | GET/POST /preferences: validação, retry de concorrência, **500 falha DynamoDB** |
| `tests/watch_later/test_watch_later.py` | 19 | GET/POST /watch-later: validação de movieId, dedup, **500 falha DynamoDB** |
| `tests/post_confirm/test_post_confirm.py` | 7 | Trigger Cognito pós-confirmação: idempotência, no-ops |
| `tests/contracts/test_openapi_contract.py` | 23 | Conformidade das respostas com `docs/openapi.yaml` (campos, tipos, status, auth) |
| **Total** | **127** | **Cobertura: 99%** |

### Tipos de teste no backend

- **Unitário** — funções isoladas em `shared/` (auth, db, response) testadas diretamente.
- **Unitário de handler** — cada Lambda handler é invocado com um `event` mockado; o DynamoDB é simulado pelo **moto**; `get_sub` é substituído via `monkeypatch` (evita o problema de Cognito/JWKS não mockável).
- **Contrato** — `tests/contracts/test_openapi_contract.py` valida que as respostas dos handlers batem com o spec OpenAPI: nomes de campos, tipos, valores de fronteira (ex: movieId de 255 vs 256 chars) e regras de auth.

### Infraestrutura de teste (`tests/conftest.py`)

- Coloca `functions/` no `sys.path` (resolve imports `from shared.db import ...`).
- Fixture `autouse` que, dentro de `@mock_aws`, cria as 6 tabelas DynamoDB com schemas espelhando o Pulumi (`Users`, `EmailToSub`, `Tokens`, `Historico`, `Logs`, `Movies`).
- Helpers `seed_user()` e `seed_movies()` (catálogo de 6 filmes).
- Define as env vars das tabelas **antes** de qualquer import dos módulos `shared` (que leem env no nível de módulo).

### Cobertura de respostas por endpoint

| Endpoint | Respostas possíveis | Testadas |
|---|---|---|
| GET /recommend | 200, 401, 500 | ✅ 200, 401, 500 |
| GET /history | 200, 401, 500 | ✅ 200, 401, 500 |
| GET /preferences | 200, 401, 500 | ✅ 200, 401, 500 |
| POST /preferences | 200, 400, 401, 500 | ✅ todos |
| GET /watch-later | 200, 401, 500 | ✅ 200, 401, 500 |
| POST /watch-later | 201, 400, 401 | ✅ todos |
| post_confirm (trigger Cognito) | sem HTTP | ✅ idempotência + no-ops |

### Tratamento de erros 500 (adicionado em 2026-05-29)

`history`, `preferences GET`, `watch-later GET` e `recommend` agora têm `try/except` que retorna `server_error()` (HTTP 500 formatado) em vez de crashar a Lambda quando o DynamoDB falha. `recommend` retorna 500 (em vez de levantar `RuntimeError`) quando a tabela de filmes está vazia.

---

## 2. Frontend — Vitest + React Testing Library

### Como rodar

```bash
cd frontend/web
pnpm test          # roda uma vez (vitest run)
pnpm test:watch    # modo watch
```

### Stack

- **Vitest** — runner (API compatível com Jest, integração nativa com Vite/Next + TS).
- **React Testing Library** — render e queries de componentes.
- **jsdom** — DOM simulado.
- Config: `frontend/web/vitest.config.ts` (alias `@/` → raiz; `setupFiles` importa `@testing-library/jest-dom`; `exclude: ["node_modules", "dist", "e2e"]` para o Vitest não coletar os specs E2E).

### O que é testado

| Arquivo | Testes | Cobre |
|---|---|---|
| `__tests__/lib/utils.test.ts` | 6 | `cn()` — merge de classes Tailwind, valores falsy, conflitos |
| `__tests__/lib/time.test.ts` | 10 | `sameDay()`, `relativeTime()` ("Agora mesmo", "há Xm", "Ontem", etc.) |
| `__tests__/lib/api.recommend.test.ts` | 6 | `posterUrl()`, `backdropUrl()` — geração de URLs por seed |
| `__tests__/components/MovieCard.test.tsx` | 8 | Render, props, onClick, role/tabIndex, CSS vars de dimensão |
| `__tests__/components/RequireAuth.test.tsx` | 5 | Render condicional por estado de auth, redirect para `/login?from=` |
| `__tests__/components/Navbar.test.tsx` | 6 | Variantes home/mobile, estado guest vs autenticado, links |
| **Total** | **41** | — |

### Tipos de teste no frontend

- **Unitário puro** — funções de `lib/` (`utils`, `time`, `api/recommend`) sem DOM.
- **Componente** — `MovieCard`, `RequireAuth`, `Navbar` renderizados com RTL; dependências externas (Next router, AuthContext, BrandMark, AccountMenu) são mockadas via `vi.mock`.

### O que NÃO é testado (decisão consciente)

- **Páginas inteiras** (`app/**/page.tsx`) — mudam a cada fase do GSD; alto custo de manutenção agora.
- **`lib/api/auth.ts`** — usa o SDK `amazon-cognito-identity-js` diretamente; testá-lo unitariamente exigiria mockar todo o SDK. Cobertura virá via E2E. O `AuthContext` é verificado indiretamente em `RequireAuth` e `Navbar`.
- **Componentes visuais puros** (`HomeBackdrop`, `BrandMark`) — sem lógica.
- **Não há gate de cobertura no frontend** ainda — foco em qualidade dos casos. Gate numérico entra quando o frontend estabilizar (fase 9-10 do GSD).

---

## 3. E2E — Playwright (documentado, não implementado)

### Estado

Os arquivos existem em `frontend/web/e2e/` com **os casos de teste escritos como comentários**. Playwright **não está instalado**. A implementação acontece na **fase 9-10 do GSD**, quando o frontend estabilizar.

Para implementar no futuro:
```bash
cd frontend/web
pnpm add -D @playwright/test
pnpm exec playwright install
```

### Fluxos mapeados

| Spec | Casos | Criticidade |
|---|---|---|
| `e2e/smoke.spec.ts` | 3 — home carrega, login carrega, recomendação anônima | Alta (roda em CI a cada deploy) |
| `e2e/auth/login.spec.ts` | 5 — login válido, erro, não-confirmado, esqueci senha, validação | Alta |
| `e2e/auth/register.spec.ts` | 5 — cadastro, email duplicado, senha fraca, senhas diferentes, form vazio | Alta |
| `e2e/recommendation.spec.ts` | 6 — anônimo, por gênero, assistir-depois, nova sugestão, skeleton, erro | Alta |
| `e2e/watch-later.spec.ts` | 5 — vazio, item adicionado, duplicata, skeleton, sem-auth | Média |
| `e2e/history.spec.ts` | 5 — vazio, ordem, shape do item, skeleton, sem-auth | Média |
| `e2e/preferences.spec.ts` | 5 — persistência, reflexo na recomendação, validação, skeleton, sem-auth | Média |

### Decisões de design (para a implementação futura)

- `page.route()` intercepta chamadas à API Gateway — sem depender de ambiente AWS real.
- `e2e/fixtures/auth.ts` centraliza um helper `loginAs()` reutilizável entre specs.
- Smoke roda em CI a cada deploy; demais specs sob demanda ou em schedule noturno.
- Sem testes visuais (screenshot diff) nessa fase.

---

## 4. CI/CD — GitHub Actions

Três workflows em `.github/workflows/`:

### `ci.yml` — Testes (backend + frontend)

- **Gatilho:** push em `main` + qualquer pull request.
- **Job `tests` (Testes Python):** checkout → setup Python 3.13 → setup uv → `uv sync` → `uv run ruff check functions/ tests/` → `uv run pytest -v --cov=functions --cov-report=term-missing --cov-fail-under=85`.
  - **Gate:** cobertura backend ≥ 85% (atualmente 99%). Lint com ruff bloqueia.
- **Job `frontend` (Testes Frontend):** checkout → setup pnpm@10 → setup Node (via `frontend/web/.nvmrc`, cache pnpm) → `pnpm install --frozen-lockfile` → `pnpm test`.
  - Os dois jobs rodam em paralelo. Sem path filter (roda sempre). Sem gate de cobertura no frontend ainda.
  - **Nota:** `pnpm lint` foi avaliado e deixado de fora — falha por um erro pré-existente não relacionado em `components/SnackRecipeModal.tsx:28` (`react-hooks/set-state-in-effect`). Tratar à parte.

### `pulumi-preview.yml` — Preview de infra

- **Gatilho:** PR que toca `__main__.py`, `Pulumi.*.yaml`, `pyproject.toml`, `uv.lock` ou `functions/**`.
- **Ação:** roda `pulumi preview --stack dev` e posta o diff como comentário no PR.

### `deploy-prod.yml` — Deploy de produção

- **Gatilho:** push em `main` + `workflow_dispatch`.
- **Fluxo:** provisiona infra (Pulumi pass 1) → lê outputs (Cognito, API, CloudFront) → build do frontend Next.js (static export) → sincroniza bundle para S3 (Pulumi pass 2) → invalida cache do CloudFront.

---

## 5. Gaps conhecidos

| Gap | Severidade | Nota |
|---|---|---|
| `pnpm lint` fora do CI por erro pré-existente | 🟡 Média | `components/SnackRecipeModal.tsx:28` viola `react-hooks/set-state-in-effect`. Corrigir e então adicionar `pnpm lint` ao job `frontend`. |
| `recommend.py` linhas 68-69 (except do scan) sem cobertura | 🟡 Baixa | Cobertura geral 99%; gate de 85% folgado. |
| `lib/api/auth.ts` sem teste unitário | 🟡 Baixa | Intencional — coberto via E2E futuro. |
| E2E não implementado | 🟢 Planejado | Specs documentados; implementar na fase 9-10. |
| Sem gate de cobertura no frontend | 🟢 Planejado | Entra quando o frontend estabilizar. |
| `post_confirm` sem teste de concorrência | 🟢 Baixa | Dois triggers simultâneos não testados. |

> ✅ **Resolvido (2026-05-29):** os testes de frontend agora rodam no CI (job `frontend` em `ci.yml`). Era o gap de severidade alta.

---

## 6. Comandos rápidos

```bash
# Backend — suite completa com cobertura
uv run pytest -v --cov=functions --cov-report=term-missing --cov-fail-under=85

# Backend — um arquivo
uv run pytest tests/recommend/test_recommend.py -v

# Backend — lint
uv run ruff check functions/ tests/

# Frontend — suite completa
cd frontend/web && pnpm test

# Frontend — um arquivo
cd frontend/web && pnpm test __tests__/components/MovieCard.test.tsx

# Frontend — modo watch
cd frontend/web && pnpm test:watch
```

---

## Documentos relacionados

- `docs/test-plan-layer1.md` — plano original da camada 1 (backend unit).
- `docs/superpowers/specs/2026-05-29-test-strategy-design.md` — design da estratégia de testes.
- `docs/superpowers/plans/2026-05-29-test-strategy-implementation.md` — plano de implementação (executado).
- `docs/openapi.yaml` — spec da API, base dos testes de contrato.
