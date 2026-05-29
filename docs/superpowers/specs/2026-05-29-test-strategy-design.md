# Test Strategy Design — Cinedica

**Data:** 2026-05-29  
**Escopo:** Backend (Python/Lambda) + Frontend (Next.js/TypeScript)  
**Abordagem escolhida:** Consolidar backend + scaffolding leve de frontend agora + spec E2E documentado para implementação futura

---

## Contexto

O projeto Cinedica tem:

- **Backend:** 5 Lambda handlers (`recommend`, `history`, `preferences`, `watch_later`, `post_confirm`) + módulos `shared/` (auth, db, response, movies)
- **Frontend:** Next.js 14+ com App Router, 8 páginas, ~20 componentes, camada de API mockada em `lib/api/`
- **Estado dos testes hoje:** 124 testes de backend passando (100% de cobertura), 0 testes de frontend

---

## Seção 1 — Backend

### Estado atual

| Métrica | Valor |
|---|---|
| Testes | 124 (unit + contract) |
| Cobertura | 100% |
| Gate de CI | `--cov-fail-under=85` |
| Comando correto | `uv run pytest` |

Todos os 124 testes passam. A cobertura é 100% sobre todas as funções e módulos `shared/`.

### Tipos de teste existentes

- **Unitários** (`tests/shared/`, `tests/recommend/`, etc.): testam cada handler isolado com moto (DynamoDB mockado) e `monkeypatch` para auth
- **Contrato** (`tests/contracts/test_openapi_contract.py`): valida que respostas dos handlers conformam ao `docs/openapi.yaml` — campos, tipos, status codes, regras de auth

### Fix necessário

**Problema:** o sistema tem dois Pythons. O Python no PATH (`python` / `python3`, v3.12.1) tem `_cffi_backend` quebrado. O Python gerenciado pelo `uv` (v3.14.5) funciona corretamente.

**Impacto:** `python -m pytest` falha com `ModuleNotFoundError: No module named '_cffi_backend'`. `uv run pytest` roda os 124 testes sem erros.

**Fix:** o CI em `.github/workflows/ci.yml` já usa `uv run pytest` — está correto. O documento `docs/test-plan-layer1.md` referencia o diretório `functions/` como `testpaths`, mas o `pyproject.toml` já define `testpaths = ["tests"]` corretamente. Atualizar a documentação para refletir o estado real.

**Comando canônico (nunca usar outro):**
```bash
uv run pytest -v --cov=functions --cov-report=term-missing --cov-fail-under=85
```

### O que não mudar

A estrutura atual está bem desenhada:
- `tests/` separado de `functions/` — correto
- `conftest.py` centralizado com fixtures `autouse=True` para DynamoDB — correto
- `monkeypatch` para `get_sub` em vez de mockar Cognito/JWKS — correto (moto não expõe JWKS endpoint)

### Gaps identificados (registro, não prioridade imediata)

| Gap | Risco | Decisão |
|---|---|---|
| `post_confirm`: sem teste de concorrência (dois triggers simultâneos) | Baixo | Documentado, fora de escopo agora |
| Sem teste de performance/timeout em queries DynamoDB | Baixo | Fora de escopo nessa fase |
| Cognito JWKS não mockável via moto | Médio | Mitigado: `test_auth.py` usa JWT auto-assinado + monkeypatch |

---

## Seção 2 — Frontend (Testes leves agora)

### Framework

**Vitest + React Testing Library (RTL) + jsdom**

Motivo da escolha sobre Jest: integração nativa com Next.js + TypeScript sem configuração extra de transform, mesma API do Jest, mais rápido em projetos Vite/Next.

### Componentes e módulos a testar agora

| Alvo | Tipo | Razão |
|---|---|---|
| `components/MovieCard.tsx` | Render + props | Componente central do produto, interface estável |
| `components/RequireAuth.tsx` | Comportamento de auth | Redireciona não-autenticados — lógica crítica |
| `components/Navbar.tsx` | Render + links | Estrutura de navegação estável |
| `lib/api/recommend.ts` | Mock da API | Valida contrato do mock antes da integração real |
| `lib/api/auth.ts` | Mock auth + localStorage | Login/logout/session — estado crítico |
| `lib/utils.ts` | Unitário puro | Funções puras, zero custo de manutenção |
| `lib/time.ts` | Unitário puro | Formatação de datas usada em histórico e watch-later |

### O que NÃO testar agora

- Páginas inteiras (`app/**/page.tsx`) — mudam a cada fase do GSD, alto custo de manutenção
- Componentes visuais puros sem lógica (`HomeBackdrop`, `BrandMark`)
- `SnackRecipeModal` — em evolução ativa

### Estrutura de arquivos

```
frontend/web/
├── vitest.config.ts
├── vitest.setup.ts
└── src/
    └── __tests__/
        ├── components/
        │   ├── MovieCard.test.tsx
        │   ├── RequireAuth.test.tsx
        │   └── Navbar.test.tsx
        └── lib/
            ├── api.auth.test.ts
            ├── api.recommend.test.ts
            ├── utils.test.ts
            └── time.test.ts
```

### Meta de cobertura

Sem gate numérico por enquanto. Foco em qualidade dos casos de teste, não em porcentagem. Gate entra quando o frontend estabilizar (fase 9-10 do GSD).

### Dependências a instalar

```bash
pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom
```

---

## Seção 3 — E2E (Playwright) — Spec para implementação futura

**Framework:** Playwright (TypeScript)  
**Quando implementar:** após o frontend estabilizar (fase 9-10 do GSD)  
**Status:** spec aprovado, implementação pendente

### Fluxos mapeados

| Fluxo | Criticidade | Casos de teste |
|---|---|---|
| **Auth — Register** | Alta | cadastro válido → redirect; email duplicado → erro; senha fraca → erro inline |
| **Auth — Login** | Alta | login válido → home; credenciais erradas → erro; "esqueci senha" → email enviado |
| **Recomendação** | Alta | anônimo recebe recomendação; autenticado recebe por gênero; botão "assistir depois" adiciona à lista |
| **Watch Later** | Média | lista vazia → empty state; item adicionado aparece; item duplicado aparece duas vezes |
| **Histórico** | Média | lista vazia → empty state; recomendações anteriores aparecem em ordem cronológica inversa |
| **Preferências** | Média | salvar gêneros → reflete nas próximas recomendações; campo inválido → erro |
| **Smoke — deploy** | Alta | home carrega; login funciona; recomendação retorna algo — roda pós-deploy |

### Estrutura proposta

```
frontend/web/
└── e2e/
    ├── playwright.config.ts
    ├── fixtures/
    │   └── auth.ts           # helper de login reutilizável entre specs
    ├── auth/
    │   ├── register.spec.ts
    │   └── login.spec.ts
    ├── recommendation.spec.ts
    ├── watch-later.spec.ts
    ├── history.spec.ts
    ├── preferences.spec.ts
    └── smoke.spec.ts
```

### Decisões de design para quando implementar

- Usar `page.route()` para interceptar chamadas à API Gateway — evita dependência de ambiente AWS real
- `fixtures/auth.ts` centraliza o helper de login para todos os specs
- Smoke test roda em CI a cada deploy; demais specs sob demanda ou em schedule noturno
- Sem testes visuais (screenshot diff) nessa fase — adicionar após design system estabilizar

---

## Pirâmide de testes — visão alvo

```
         /\
        /E2E\          ← 7 specs Playwright (implementar na fase 9-10)
       /------\
      / Vitest \       ← 7 arquivos de teste (implementar agora)
     /  RTL     \
    /------------\
   /  pytest+moto \    ← 124 testes (estável, 100% cobertura)
  /-----------------\
```

---

## Ordem de implementação

1. **Fix documentação CI** — atualizar `docs/test-plan-layer1.md` com comando e diretório corretos
2. **Scaffold Vitest no frontend** — instalar dependências, criar `vitest.config.ts` e `vitest.setup.ts`
3. **Testes de componentes** — `MovieCard`, `RequireAuth`, `Navbar`
4. **Testes de lib** — `utils.ts`, `time.ts`, `lib/api/auth.ts`, `lib/api/recommend.ts`
5. **Spec E2E documentado** — criar arquivos `.spec.ts` vazios com os casos comentados (implementação futura)
