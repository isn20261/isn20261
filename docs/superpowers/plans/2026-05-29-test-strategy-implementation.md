# Test Strategy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidar o backend (fix de documentação CI), instalar e escrever testes leves no frontend com Vitest + RTL, e criar spec E2E Playwright documentado para implementação futura.

**Architecture:** Backend já está estável com 124 testes e 100% de cobertura — só ajuste de documentação. Frontend recebe scaffold de Vitest + React Testing Library com testes de componentes críticos e funções utilitárias puras. Spec E2E é criado com casos documentados como comentários, prontos para implementação na fase 9-10 do GSD.

**Tech Stack:** Python/pytest/moto (backend, estável), Vitest + React Testing Library + jsdom (frontend novo), Playwright (E2E, spec somente)

**Spec de referência:** `docs/superpowers/specs/2026-05-29-test-strategy-design.md`

---

## Gap intencional — `lib/api/auth.ts`

O spec lista `lib/api/auth.ts` como alvo de teste, mas este plano **não inclui testes unitários para ele**. Motivo: o módulo usa diretamente o SDK `amazon-cognito-identity-js` (`CognitoUserPool`, `CognitoUser`, `AuthenticationDetails`) — testá-lo unitariamente exigiria mockar todo o SDK, gerando testes frágeis que não verificam comportamento real. A cobertura desse módulo é obtida de forma mais efetiva pelos testes E2E (Task 8) quando implementados. O `AuthContext` (que wrappa auth) é verificado indiretamente nos testes de `RequireAuth` e `Navbar`.

---

## Mapa de arquivos

### Criar
- `frontend/web/vitest.config.ts` — configuração do Vitest (plugin React, jsdom, alias `@/`)
- `frontend/web/vitest.setup.ts` — setup global (importa `@testing-library/jest-dom`)
- `frontend/web/__tests__/lib/utils.test.ts` — testes de `lib/utils.ts`
- `frontend/web/__tests__/lib/time.test.ts` — testes de `lib/time.ts`
- `frontend/web/__tests__/lib/api.recommend.test.ts` — testes de `lib/api/recommend.ts`
- `frontend/web/__tests__/components/MovieCard.test.tsx` — testes de `components/MovieCard.tsx`
- `frontend/web/__tests__/components/RequireAuth.test.tsx` — testes de `components/RequireAuth.tsx`
- `frontend/web/__tests__/components/Navbar.test.tsx` — testes de `components/Navbar.tsx`
- `frontend/web/e2e/playwright.config.ts` — config Playwright (documentado, não instalado)
- `frontend/web/e2e/fixtures/auth.ts` — helper de login E2E (documentado)
- `frontend/web/e2e/smoke.spec.ts` — spec E2E smoke (casos documentados)
- `frontend/web/e2e/auth/login.spec.ts` — spec E2E login (casos documentados)
- `frontend/web/e2e/auth/register.spec.ts` — spec E2E register (casos documentados)
- `frontend/web/e2e/recommendation.spec.ts` — spec E2E recomendação (casos documentados)
- `frontend/web/e2e/watch-later.spec.ts` — spec E2E watch-later (casos documentados)
- `frontend/web/e2e/history.spec.ts` — spec E2E histórico (casos documentados)
- `frontend/web/e2e/preferences.spec.ts` — spec E2E preferências (casos documentados)

### Modificar
- `docs/test-plan-layer1.md` — corrigir comando CI e diretório de testes
- `frontend/web/package.json` — adicionar devDependencies de teste
- `frontend/web/tsconfig.json` — adicionar types do jest-dom

---

## Task 0: Adicionar testes e tratamento de erros 500

**Contexto:** `history`, `preferences GET`, `watch-later GET` e `recommend` não têm try/except — falhas inesperadas de DynamoDB crasham o Lambda em vez de retornar HTTP 500. `recommend` levanta `RuntimeError` quando a tabela de filmes está vazia, também crashando.

**Files:**
- Modify: `functions/history/history.py` — importar `server_error`, adicionar try/except
- Modify: `functions/preferences/preferences.py` — adicionar try/except em `_get()`
- Modify: `functions/watch_later/watch_later.py` — importar `server_error`, adicionar try/except em `_get()`
- Modify: `functions/recommend/recommend.py` — importar `server_error`, retornar `server_error()` em vez de raise + try/except geral
- Modify: `tests/history/test_history.py` — adicionar teste 500
- Modify: `tests/preferences/test_preferences.py` — adicionar teste 500
- Modify: `tests/watch_later/test_watch_later.py` — adicionar teste 500
- Modify: `tests/recommend/test_recommend.py` — substituir `pytest.raises` por assert 500

- [ ] **Step 1: Escrever os 4 testes de falha (TDD — devem FALHAR agora)**

Adicionar ao final de `tests/history/test_history.py`:

```python
def test_history_returns_500_on_dynamodb_error(monkeypatch):
    from unittest.mock import MagicMock
    from botocore.exceptions import ClientError
    fake_table = MagicMock()
    fake_table.query.side_effect = ClientError(
        {"Error": {"Code": "InternalServerError", "Message": "DynamoDB failure"}},
        "Query",
    )
    monkeypatch.setattr("history.history.historico", lambda: fake_table)
    monkeypatch.setattr("history.history.get_sub", lambda event: "user-1")
    resp = handler({}, None)
    assert resp["statusCode"] == 500
```

Adicionar ao final de `tests/preferences/test_preferences.py`:

```python
def test_get_returns_500_on_dynamodb_error(monkeypatch):
    from unittest.mock import MagicMock
    from botocore.exceptions import ClientError
    fake_table = MagicMock()
    fake_table.get_item.side_effect = ClientError(
        {"Error": {"Code": "InternalServerError", "Message": "DynamoDB failure"}},
        "GetItem",
    )
    import shared.db as db_module
    monkeypatch.setattr(db_module, "users", lambda: fake_table)
    monkeypatch.setattr("preferences.preferences.get_sub", lambda e: "user-1")
    resp = handler({}, None)
    assert resp["statusCode"] == 500
```

Adicionar ao final de `tests/watch_later/test_watch_later.py`:

```python
def test_get_returns_500_on_dynamodb_error(monkeypatch):
    from unittest.mock import MagicMock
    from botocore.exceptions import ClientError
    fake_table = MagicMock()
    fake_table.get_item.side_effect = ClientError(
        {"Error": {"Code": "InternalServerError", "Message": "DynamoDB failure"}},
        "GetItem",
    )
    import shared.db as db_module
    monkeypatch.setattr(db_module, "users", lambda: fake_table)
    monkeypatch.setattr("watch_later.watch_later.get_sub", lambda event: "user-1")
    resp = handler({"httpMethod": "GET"}, None)
    assert resp["statusCode"] == 500
```

Substituir `test_recommend_raises_when_movies_table_empty` em `tests/recommend/test_recommend.py`:

```python
def test_recommend_returns_500_when_movies_table_empty(monkeypatch):
    monkeypatch.setattr("recommend.recommend.get_sub", lambda event: None)
    resp = handler({}, None)
    assert resp["statusCode"] == 500
```

- [ ] **Step 2: Verificar que os 4 novos testes FALHAM**

```bash
cd /workspaces/isn20261
uv run pytest tests/history/test_history.py::test_history_returns_500_on_dynamodb_error \
  tests/preferences/test_preferences.py::test_get_returns_500_on_dynamodb_error \
  tests/watch_later/test_watch_later.py::test_get_returns_500_on_dynamodb_error \
  tests/recommend/test_recommend.py::test_recommend_returns_500_when_movies_table_empty \
  -v --tb=short 2>&1 | tail -20
```

Saída esperada: 4 FAILs (os handlers ainda crasham em vez de retornar 500).

- [ ] **Step 3: Corrigir `functions/history/history.py`**

```python
"""GET /history — requires Bearer JWT auth.

Returns movie recommendation history sorted newest-first.
`genre` is intentionally absent from the response — see inconsistencias.md.

Environment variables: shared db/auth vars
"""
from boto3.dynamodb.conditions import Key

from shared.auth import get_sub
from shared.db import historico
from shared.response import ok, unauthorized, server_error


def handler(event, context):
    sub = get_sub(event)
    if not sub:
        return unauthorized()

    try:
        resp = historico().query(
            KeyConditionExpression=Key("sub").eq(sub),
            ScanIndexForward=False,  # newest first
        )
    except Exception:
        return server_error()

    items = [
        {
            "title":          item["movieTitle"],
            "genre":          item.get("genre"),
            "recommended-at": item["timestamp"],
        }
        for item in resp.get("Items", [])
    ]
    return ok(items)
```

- [ ] **Step 4: Corrigir `functions/preferences/preferences.py` — função `_get()`**

Substituir apenas a função `_get`:

```python
def _get(sub: str):
    try:
        user = get_user(sub)
    except Exception:
        return server_error()
    if not user:
        return unauthorized()
    return ok(_db_to_api(user.get("preferences") or {}))
```

- [ ] **Step 5: Corrigir `functions/watch_later/watch_later.py`**

Adicionar `server_error` ao import de `shared.response`:

```python
from shared.response import ok, created, bad_request, unauthorized, server_error
```

Substituir a função `_get`:

```python
def _get(sub: str):
    try:
        user = get_user(sub)
    except Exception:
        return server_error()
    if not user:
        return unauthorized()

    items = [
        {
            "title":    entry.get("title", entry.get("movieId")),
            "added-at": entry["addedAt"],
        }
        for entry in (user.get("watchLater") or [])
    ]
    return ok(items)
```

- [ ] **Step 6: Corrigir `functions/recommend/recommend.py`**

Adicionar `server_error` ao import de `shared.response`:

```python
from shared.response import ok, unauthorized, server_error
```

Substituir `_pick_movie` e a chamada no handler:

```python
def _pick_movie(preferences: dict) -> dict | None:
    """Return one movie matching user preferences, or a random one. Returns None if table empty."""
    genres = [g.lower() for g in (preferences.get("genres") or [])]
    all_movies = _scan_all_movies()
    if not all_movies:
        return None

    if genres:
        candidates = [m for m in all_movies if m.get("genre", "").lower() in genres]
        pool = candidates or all_movies
    else:
        pool = all_movies
    return random.choice(pool)
```

Substituir o bloco `movie = _pick_movie(prefs)` no handler:

```python
    try:
        movie = _pick_movie(prefs)
    except Exception:
        return server_error()

    if movie is None:
        return server_error()
```

- [ ] **Step 7: Verificar que os 4 testes PASSAM agora**

```bash
cd /workspaces/isn20261
uv run pytest tests/history/test_history.py::test_history_returns_500_on_dynamodb_error \
  tests/preferences/test_preferences.py::test_get_returns_500_on_dynamodb_error \
  tests/watch_later/test_watch_later.py::test_get_returns_500_on_dynamodb_error \
  tests/recommend/test_recommend.py::test_recommend_returns_500_when_movies_table_empty \
  -v --tb=short 2>&1 | tail -20
```

Saída esperada: 4 PASSes.

- [ ] **Step 8: Verificar que toda a suite ainda passa**

```bash
cd /workspaces/isn20261
uv run pytest -v --cov=functions --cov-report=term-missing --cov-fail-under=85 2>&1 | tail -8
```

Saída esperada: `≥124 passed | Total coverage ≥ 85%`

- [ ] **Step 9: Commit**

```bash
git add functions/history/history.py \
        functions/preferences/preferences.py \
        functions/watch_later/watch_later.py \
        functions/recommend/recommend.py \
        tests/history/test_history.py \
        tests/preferences/test_preferences.py \
        tests/watch_later/test_watch_later.py \
        tests/recommend/test_recommend.py
git commit -m "feat: return HTTP 500 on unexpected errors in history, preferences, watch-later, recommend"
```

---

## Task 1: Corrigir documentação do backend

**Files:**
- Modify: `docs/test-plan-layer1.md`

- [ ] **Step 1: Atualizar o comando canônico e o diretório de testes**

Abrir `docs/test-plan-layer1.md` e substituir a seção "CI command" por:

```markdown
## CI command

```bash
uv run pytest -v --cov=functions --cov-report=term-missing --cov-fail-under=85
```

> **IMPORTANTE:** Nunca use `python -m pytest`. O ambiente tem dois Pythons:
> - `python` / `python3` no PATH (v3.12.1) — tem `_cffi_backend` quebrado, todos os testes falham
> - Python gerenciado pelo `uv` (v3.14.5) — funciona corretamente
>
> O `pyproject.toml` já define `testpaths = ["tests"]`. O diretório correto é `tests/`, não `functions/`.
```

Também atualizar a seção "File structure" do documento para refletir que os testes estão em `tests/` (não `functions/`):

```markdown
## File structure

```
tests/
├── conftest.py                          # fixtures + sys.path fix
├── shared/
│   ├── test_response.py                 # 14 casos, puro Python
│   ├── test_db.py                       # 8 casos, moto dynamodb
│   └── test_auth.py                     # 27 casos, JWT auto-assinado
├── recommend/
│   └── test_recommend.py               # 11 casos
├── history/
│   └── test_history.py                 # 6 casos
├── post_confirm/
│   └── test_post_confirm.py            # 7 casos
├── preferences/
│   └── test_preferences.py             # 18 casos
├── watch_later/
│   └── test_watch_later.py             # 18 casos
└── contracts/
    └── test_openapi_contract.py         # 23 casos (validação vs openapi.yaml)
```

Total: 124 testes | Cobertura: 100% | Gate CI: 85%
```

- [ ] **Step 2: Verificar que o comando funciona**

```bash
cd /workspaces/isn20261
uv run pytest -v --cov=functions --cov-report=term-missing --cov-fail-under=85 2>&1 | tail -5
```

Saída esperada: `124 passed` e `Total coverage: 100.00%`

- [ ] **Step 3: Commit**

```bash
git add docs/test-plan-layer1.md
git commit -m "docs: fix CI command and test directory in test-plan-layer1"
```

---

## Task 2: Scaffold Vitest no frontend

**Files:**
- Create: `frontend/web/vitest.config.ts`
- Create: `frontend/web/vitest.setup.ts`
- Modify: `frontend/web/package.json`
- Modify: `frontend/web/tsconfig.json`

- [ ] **Step 1: Instalar dependências**

```bash
cd /workspaces/isn20261/frontend/web
pnpm add -D vitest @vitejs/plugin-react jsdom \
  @testing-library/react @testing-library/user-event \
  @testing-library/jest-dom @types/testing-library__jest-dom
```

- [ ] **Step 2: Criar `vitest.config.ts`**

Criar `frontend/web/vitest.config.ts`:

```typescript
import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
```

- [ ] **Step 3: Criar `vitest.setup.ts`**

Criar `frontend/web/vitest.setup.ts`:

```typescript
import "@testing-library/jest-dom";
```

- [ ] **Step 4: Adicionar types ao tsconfig**

Abrir `frontend/web/tsconfig.json` e adicionar `"vitest/globals"` e `"@testing-library/jest-dom"` ao array `compilerOptions.types`. Se o array não existir, criá-lo dentro de `compilerOptions`:

```json
"compilerOptions": {
  "types": ["vitest/globals", "@testing-library/jest-dom"]
}
```

- [ ] **Step 5: Adicionar script de test ao package.json**

Abrir `frontend/web/package.json` e adicionar dentro de `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 6: Verificar que o scaffold funciona**

```bash
cd /workspaces/isn20261/frontend/web
pnpm test 2>&1 | tail -5
```

Saída esperada: `No test files found` (sem erro de configuração).

- [ ] **Step 7: Commit**

```bash
git add frontend/web/vitest.config.ts frontend/web/vitest.setup.ts \
        frontend/web/package.json frontend/web/pnpm-lock.yaml \
        frontend/web/tsconfig.json
git commit -m "feat(frontend): scaffold Vitest + RTL for frontend tests"
```

---

## Task 3: Testar `lib/utils.ts` e `lib/time.ts`

**Files:**
- Create: `frontend/web/__tests__/lib/utils.test.ts`
- Create: `frontend/web/__tests__/lib/time.test.ts`
- Source: `frontend/web/lib/utils.ts` (não modificar)
- Source: `frontend/web/lib/time.ts` (não modificar)

- [ ] **Step 1: Escrever testes de `utils.ts`**

Criar `frontend/web/__tests__/lib/utils.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("retorna string vazia sem argumentos", () => {
    expect(cn()).toBe("");
  });

  it("concatena classes simples", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("ignora valores falsy (false, undefined, null)", () => {
    expect(cn("base", false && "hidden", undefined, null, "visible")).toBe(
      "base visible"
    );
  });

  it("resolve conflito Tailwind — último vence", () => {
    expect(cn("p-4", "p-2")).toBe("p-2");
  });

  it("resolve conflito Tailwind com classe condicional", () => {
    expect(cn("text-red-500", true && "text-blue-500")).toBe("text-blue-500");
  });

  it("aceita array de classes", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar");
  });
});
```

- [ ] **Step 2: Rodar e verificar PASS**

```bash
cd /workspaces/isn20261/frontend/web
pnpm test __tests__/lib/utils.test.ts 2>&1 | tail -10
```

Saída esperada: `6 passed`

- [ ] **Step 3: Escrever testes de `time.ts`**

Criar `frontend/web/__tests__/lib/time.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { sameDay, relativeTime } from "@/lib/time";

const NOW = new Date("2025-06-15T12:00:00Z");

describe("sameDay", () => {
  it("retorna true para datas no mesmo dia UTC", () => {
    expect(sameDay(new Date("2025-01-15T00:00:00Z"), new Date("2025-01-15T23:59:59Z"))).toBe(true);
  });

  it("retorna false para dias diferentes", () => {
    expect(sameDay(new Date("2025-01-15T00:00:00Z"), new Date("2025-01-16T00:00:00Z"))).toBe(false);
  });

  it("retorna false para meses diferentes", () => {
    expect(sameDay(new Date("2025-01-15T00:00:00Z"), new Date("2025-02-15T00:00:00Z"))).toBe(false);
  });
});

describe("relativeTime", () => {
  it("retorna string vazia para ISO inválido", () => {
    expect(relativeTime("not-a-date", NOW)).toBe("");
  });

  it('retorna "Agora mesmo" para 0 minutos atrás', () => {
    expect(relativeTime("2025-06-15T12:00:00Z", NOW)).toBe("Agora mesmo");
  });

  it('retorna "há Xm" para minutos atrás no mesmo dia', () => {
    expect(relativeTime("2025-06-15T11:30:00Z", NOW)).toBe("há 30m");
  });

  it('retorna "há Xh" para horas atrás no mesmo dia', () => {
    expect(relativeTime("2025-06-15T09:00:00Z", NOW)).toBe("há 3h");
  });

  it('retorna "Ontem" para o dia anterior', () => {
    expect(relativeTime("2025-06-14T12:00:00Z", NOW)).toBe("Ontem");
  });

  it("retorna nome abreviado do dia para esta semana", () => {
    // 2025-06-12 é quinta-feira — dentro de 7 dias de 2025-06-15
    const result = relativeTime("2025-06-12T12:00:00Z", NOW);
    expect(result).toBeTruthy();
    expect(result).not.toBe("Ontem");
    expect(result).not.toMatch(/^\d/); // não começa com número
  });

  it("retorna data (mês + dia) para datas mais antigas que 7 dias", () => {
    const result = relativeTime("2025-05-01T12:00:00Z", NOW);
    // pt-BR: "1 de mai." ou "mai. 1" dependendo da plataforma
    expect(result).toBeTruthy();
    expect(result).toMatch(/\d/); // contém algum dígito
  });
});
```

- [ ] **Step 4: Rodar e verificar PASS**

```bash
cd /workspaces/isn20261/frontend/web
pnpm test __tests__/lib/time.test.ts 2>&1 | tail -10
```

Saída esperada: `10 passed`

- [ ] **Step 5: Commit**

```bash
git add frontend/web/__tests__/lib/utils.test.ts \
        frontend/web/__tests__/lib/time.test.ts
git commit -m "test(frontend): add unit tests for lib/utils and lib/time"
```

---

## Task 4: Testar `lib/api/recommend.ts`

**Files:**
- Create: `frontend/web/__tests__/lib/api.recommend.test.ts`
- Source: `frontend/web/lib/api/recommend.ts` (não modificar)

- [ ] **Step 1: Escrever os testes**

Criar `frontend/web/__tests__/lib/api.recommend.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { posterUrl, backdropUrl, type Movie } from "@/lib/api/recommend";

const movie: Movie = {
  id: "tt0133093",
  title: "The Matrix",
  year: 1999,
  runtime: "2h 16m",
  rating: "R",
  match: 92,
  genres: ["action", "sci-fi"],
  director: "The Wachowskis",
  cast: ["Keanu Reeves", "Laurence Fishburne"],
  synopsis: "A hacker discovers the true nature of reality.",
  services: [],
  posterSeed: 42,
  backdropSeed: 99,
  mood: ["intense"],
};

describe("posterUrl", () => {
  it("usa dimensões default (360x540)", () => {
    expect(posterUrl(movie)).toBe(
      "https://picsum.photos/seed/ra-p-42/360/540"
    );
  });

  it("usa dimensões customizadas", () => {
    expect(posterUrl(movie, 200, 300)).toBe(
      "https://picsum.photos/seed/ra-p-42/200/300"
    );
  });

  it("usa o posterSeed correto do filme", () => {
    const other = { ...movie, posterSeed: 7 };
    expect(posterUrl(other)).toContain("ra-p-7");
  });
});

describe("backdropUrl", () => {
  it("usa dimensões default (1600x900)", () => {
    expect(backdropUrl(movie)).toBe(
      "https://picsum.photos/seed/ra-b-99/1600/900"
    );
  });

  it("usa dimensões customizadas", () => {
    expect(backdropUrl(movie, 800, 450)).toBe(
      "https://picsum.photos/seed/ra-b-99/800/450"
    );
  });

  it("usa o backdropSeed correto do filme", () => {
    const other = { ...movie, backdropSeed: 5 };
    expect(backdropUrl(other)).toContain("ra-b-5");
  });
});
```

- [ ] **Step 2: Rodar e verificar PASS**

```bash
cd /workspaces/isn20261/frontend/web
pnpm test __tests__/lib/api.recommend.test.ts 2>&1 | tail -10
```

Saída esperada: `6 passed`

- [ ] **Step 3: Commit**

```bash
git add frontend/web/__tests__/lib/api.recommend.test.ts
git commit -m "test(frontend): add unit tests for lib/api/recommend (posterUrl, backdropUrl)"
```

---

## Task 5: Testar `components/MovieCard.tsx`

**Files:**
- Create: `frontend/web/__tests__/components/MovieCard.test.tsx`
- Source: `frontend/web/components/MovieCard.tsx` (não modificar)

- [ ] **Step 1: Escrever os testes**

Criar `frontend/web/__tests__/components/MovieCard.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MovieCard } from "@/components/MovieCard";
import type { Movie } from "@/lib/api/recommend";

const movie: Movie = {
  id: "tt0133093",
  title: "The Matrix",
  year: 1999,
  runtime: "2h 16m",
  rating: "R",
  match: 92,
  genres: ["action", "sci-fi"],
  director: "The Wachowskis",
  cast: ["Keanu Reeves"],
  synopsis: "A hacker discovers the true nature of reality.",
  services: [],
  posterSeed: 42,
  backdropSeed: 99,
  mood: ["intense"],
};

describe("MovieCard", () => {
  it("renderiza o título do filme", () => {
    render(<MovieCard movie={movie} />);
    expect(screen.getByText("The Matrix")).toBeInTheDocument();
  });

  it("renderiza ano e percentual de compatibilidade", () => {
    render(<MovieCard movie={movie} />);
    expect(screen.getByText("1999 · 92% compatível")).toBeInTheDocument();
  });

  it("renderiza imagem com src gerado pelo posterSeed", () => {
    render(<MovieCard movie={movie} />);
    const img = document.querySelector("img");
    expect(img).toHaveAttribute("src", expect.stringContaining("ra-p-42"));
  });

  it("não tem role=button quando onClick não é fornecido", () => {
    render(<MovieCard movie={movie} />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("tem role=button e chama onClick quando fornecido", () => {
    const onClick = vi.fn();
    render(<MovieCard movie={movie} onClick={onClick} />);
    const btn = screen.getByRole("button");
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("aplica CSS vars de largura e altura customizadas", () => {
    const { container } = render(
      <MovieCard movie={movie} width={200} height={300} />
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.getPropertyValue("--ra-card-w")).toBe("200px");
    expect(root.style.getPropertyValue("--ra-card-h")).toBe("300px");
  });

  it("usa dimensões default 168x252", () => {
    const { container } = render(<MovieCard movie={movie} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.getPropertyValue("--ra-card-w")).toBe("168px");
    expect(root.style.getPropertyValue("--ra-card-h")).toBe("252px");
  });

  it("card interativo tem tabIndex=0", () => {
    render(<MovieCard movie={movie} onClick={vi.fn()} />);
    expect(screen.getByRole("button")).toHaveAttribute("tabindex", "0");
  });
});
```

- [ ] **Step 2: Rodar e verificar PASS**

```bash
cd /workspaces/isn20261/frontend/web
pnpm test __tests__/components/MovieCard.test.tsx 2>&1 | tail -10
```

Saída esperada: `8 passed`

- [ ] **Step 3: Commit**

```bash
git add frontend/web/__tests__/components/MovieCard.test.tsx
git commit -m "test(frontend): add component tests for MovieCard"
```

---

## Task 6: Testar `components/RequireAuth.tsx`

**Files:**
- Create: `frontend/web/__tests__/components/RequireAuth.test.tsx`
- Source: `frontend/web/components/RequireAuth.tsx` (não modificar)

- [ ] **Step 1: Escrever os testes**

Criar `frontend/web/__tests__/components/RequireAuth.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { RequireAuth } from "@/components/RequireAuth";

// Controle do replace entre testes
const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/history",
}));

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "@/lib/auth/AuthContext";
const mockUseAuth = vi.mocked(useAuth);

beforeEach(() => {
  mockReplace.mockClear();
});

describe("RequireAuth", () => {
  it("renderiza children quando autenticado", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      session: null,
      user: null,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    });
    render(
      <RequireAuth>
        <p>Conteúdo protegido</p>
      </RequireAuth>
    );
    expect(screen.getByText("Conteúdo protegido")).toBeInTheDocument();
  });

  it("renderiza placeholder com aria-busy enquanto carrega", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      session: null,
      user: null,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    });
    const { container } = render(
      <RequireAuth>
        <p>Conteúdo protegido</p>
      </RequireAuth>
    );
    expect(screen.queryByText("Conteúdo protegido")).toBeNull();
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });

  it("não renderiza children quando isLoading=true", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: true,
      session: null,
      user: null,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    });
    render(
      <RequireAuth>
        <p>Conteúdo protegido</p>
      </RequireAuth>
    );
    expect(screen.queryByText("Conteúdo protegido")).toBeNull();
  });

  it("redireciona para /login?from=<path> quando não autenticado", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      session: null,
      user: null,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    });
    render(
      <RequireAuth>
        <p>Conteúdo protegido</p>
      </RequireAuth>
    );
    expect(mockReplace).toHaveBeenCalledWith("/login?from=%2Fhistory");
  });

  it("não redireciona quando autenticado", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      session: null,
      user: null,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    });
    render(
      <RequireAuth>
        <p>Conteúdo protegido</p>
      </RequireAuth>
    );
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar e verificar PASS**

```bash
cd /workspaces/isn20261/frontend/web
pnpm test __tests__/components/RequireAuth.test.tsx 2>&1 | tail -10
```

Saída esperada: `5 passed`

- [ ] **Step 3: Commit**

```bash
git add frontend/web/__tests__/components/RequireAuth.test.tsx
git commit -m "test(frontend): add component tests for RequireAuth"
```

---

## Task 7: Testar `components/Navbar.tsx`

**Files:**
- Create: `frontend/web/__tests__/components/Navbar.test.tsx`
- Source: `frontend/web/components/Navbar.tsx` (não modificar)

- [ ] **Step 1: Escrever os testes**

Criar `frontend/web/__tests__/components/Navbar.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Navbar } from "@/components/Navbar";

// Next.js Link renderiza <a> em jsdom sem o router — mock simples
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// BrandMark e AccountMenu são visuais/complexos — mock leve
vi.mock("@/components/BrandMark", () => ({
  BrandMark: () => <span data-testid="brandmark" />,
}));
vi.mock("@/components/AccountMenu", () => ({
  AccountMenu: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "@/lib/auth/AuthContext";
const mockUseAuth = vi.mocked(useAuth);

const guestState = {
  isAuthenticated: false,
  isLoading: false,
  session: null,
  user: null,
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
};

const loggedState = {
  isAuthenticated: true,
  isLoading: false,
  session: null,
  user: { email: "joao@example.com", sub: "user-1" },
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
};

describe("Navbar — variant home (default)", () => {
  it("renderiza links Entrar e Criar conta para visitante", () => {
    mockUseAuth.mockReturnValue(guestState);
    render(<Navbar />);
    expect(screen.getByRole("link", { name: /entrar/i })).toHaveAttribute(
      "href",
      "/login"
    );
    expect(screen.getByRole("link", { name: /criar conta/i })).toHaveAttribute(
      "href",
      "/register"
    );
  });

  it("não renderiza Entrar/Criar conta quando autenticado", () => {
    mockUseAuth.mockReturnValue(loggedState);
    render(<Navbar />);
    expect(screen.queryByRole("link", { name: /entrar/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /criar conta/i })).toBeNull();
  });

  it("exibe saudação com nome do usuário autenticado", () => {
    mockUseAuth.mockReturnValue(loggedState);
    render(<Navbar />);
    // userName = email.split("@")[0] = "joao"
    expect(screen.getByText(/olá, joao/i)).toBeInTheDocument();
  });

  it("renderiza BrandMark com link para home", () => {
    mockUseAuth.mockReturnValue(guestState);
    render(<Navbar />);
    const brandLink = screen.getByRole("link", { name: /cinedica/i });
    expect(brandLink).toHaveAttribute("href", "/");
    expect(brandLink.querySelector("[data-testid='brandmark']")).toBeInTheDocument();
  });
});

describe("Navbar — variant mobile", () => {
  it("renderiza BrandMark e botão de notificações", () => {
    mockUseAuth.mockReturnValue(guestState);
    render(<Navbar variant="mobile" />);
    expect(screen.getByTestId("brandmark")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /notificações/i })
    ).toBeInTheDocument();
  });

  it("não renderiza links de auth na variante mobile", () => {
    mockUseAuth.mockReturnValue(guestState);
    render(<Navbar variant="mobile" />);
    expect(screen.queryByRole("link", { name: /entrar/i })).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e verificar PASS**

```bash
cd /workspaces/isn20261/frontend/web
pnpm test __tests__/components/Navbar.test.tsx 2>&1 | tail -10
```

Saída esperada: `6 passed`

- [ ] **Step 3: Rodar a suite completa do frontend para garantir ausência de regressões**

```bash
cd /workspaces/isn20261/frontend/web
pnpm test 2>&1 | tail -10
```

Saída esperada: todos os testes do frontend passando (sem número de erros).

- [ ] **Step 4: Commit**

```bash
git add frontend/web/__tests__/components/Navbar.test.tsx
git commit -m "test(frontend): add component tests for Navbar"
```

---

## Task 8: Criar spec E2E documentado (Playwright)

> **ATENÇÃO:** Esta task cria os arquivos de spec com os casos de teste documentados como comentários. **Não instalar Playwright** agora. A implementação acontece na fase 9-10 do GSD quando o frontend estabilizar.

**Files:**
- Create: `frontend/web/e2e/playwright.config.ts`
- Create: `frontend/web/e2e/fixtures/auth.ts`
- Create: `frontend/web/e2e/smoke.spec.ts`
- Create: `frontend/web/e2e/auth/login.spec.ts`
- Create: `frontend/web/e2e/auth/register.spec.ts`
- Create: `frontend/web/e2e/recommendation.spec.ts`
- Create: `frontend/web/e2e/watch-later.spec.ts`
- Create: `frontend/web/e2e/history.spec.ts`
- Create: `frontend/web/e2e/preferences.spec.ts`

- [ ] **Step 1: Criar `playwright.config.ts` documentado**

Criar `frontend/web/e2e/playwright.config.ts`:

```typescript
/**
 * Playwright E2E config — DOCUMENTADO, não instalado.
 * Instalar quando o frontend estabilizar (fase 9-10 do GSD):
 *   pnpm add -D @playwright/test
 *   pnpm exec playwright install
 *
 * Decisões de design:
 * - page.route() para interceptar chamadas à API Gateway (sem depender de AWS real)
 * - fixtures/auth.ts centraliza helper de login reutilizável
 * - smoke.spec roda em CI a cada deploy; demais specs sob demanda
 */

// import { defineConfig, devices } from "@playwright/test";
//
// export default defineConfig({
//   testDir: "./",
//   fullyParallel: true,
//   retries: process.env.CI ? 2 : 0,
//   workers: process.env.CI ? 1 : undefined,
//   use: {
//     baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
//     trace: "on-first-retry",
//   },
//   projects: [
//     { name: "chromium", use: { ...devices["Desktop Chrome"] } },
//     { name: "mobile", use: { ...devices["Pixel 5"] } },
//   ],
// });

export {};
```

- [ ] **Step 2: Criar `fixtures/auth.ts` documentado**

Criar `frontend/web/e2e/fixtures/auth.ts`:

```typescript
/**
 * Helper de login reutilizável para specs E2E.
 *
 * Usar com page.route() para interceptar a chamada de signIn
 * sem depender de Cognito real.
 *
 * Exemplo de uso nos specs:
 *   import { loginAs } from "../fixtures/auth";
 *   test("fluxo autenticado", async ({ page }) => {
 *     await loginAs(page, "user@example.com");
 *     ...
 *   });
 */

// import type { Page } from "@playwright/test";
//
// export async function loginAs(page: Page, email: string): Promise<void> {
//   // Intercepta a chamada de auth para retornar sessão mockada
//   await page.route("**/cognito*", (route) =>
//     route.fulfill({
//       status: 200,
//       body: JSON.stringify({ AccessToken: "fake", IdToken: "fake", ExpiresIn: 3600 }),
//     })
//   );
//   // Navega para login e preenche o form
//   await page.goto("/login");
//   await page.getByLabel(/e-mail/i).fill(email);
//   await page.getByLabel(/senha/i).fill("Senha@1234");
//   await page.getByRole("button", { name: /entrar/i }).click();
//   await page.waitForURL("/");
// }

export {};
```

- [ ] **Step 3: Criar `smoke.spec.ts`**

Criar `frontend/web/e2e/smoke.spec.ts`:

```typescript
/**
 * Smoke tests — rodam em CI a cada deploy.
 * Verificam que o básico está de pé.
 *
 * IMPLEMENTAR na fase 9-10 do GSD.
 */

// import { test, expect } from "@playwright/test";
//
// test("home carrega sem erros JS", async ({ page }) => {
//   await page.goto("/");
//   await expect(page).toHaveTitle(/Cinedica/i);
// });
//
// test("página de login carrega", async ({ page }) => {
//   await page.goto("/login");
//   await expect(page.getByRole("button", { name: /entrar/i })).toBeVisible();
// });
//
// test("recomendação anônima retorna conteúdo", async ({ page }) => {
//   await page.route("**/recommend*", (route) =>
//     route.fulfill({
//       status: 200,
//       body: JSON.stringify({ title: "The Matrix", genre: "action" }),
//     })
//   );
//   await page.goto("/recommendation");
//   await expect(page.getByText("The Matrix")).toBeVisible();
// });

export {};
```

- [ ] **Step 4: Criar `auth/login.spec.ts`**

Criar `frontend/web/e2e/auth/login.spec.ts`:

```typescript
/**
 * E2E — Fluxo de Login
 * IMPLEMENTAR na fase 9-10 do GSD.
 *
 * Casos:
 * 1. login válido → redireciona para home (ou ?from=<path>)
 * 2. credenciais erradas → exibe mensagem de erro inline
 * 3. usuário não confirmado → redireciona para /confirm
 * 4. link "esqueci minha senha" → redireciona para /forgot
 * 5. form com email inválido → erro de validação sem chamar API
 */

export {};
```

- [ ] **Step 5: Criar `auth/register.spec.ts`**

Criar `frontend/web/e2e/auth/register.spec.ts`:

```typescript
/**
 * E2E — Fluxo de Registro
 * IMPLEMENTAR na fase 9-10 do GSD.
 *
 * Casos:
 * 1. cadastro válido → redireciona para /confirm com email na URL
 * 2. email já cadastrado → exibe "E-mail já em uso"
 * 3. senha fraca (< 8 chars, sem maiúscula, sem número) → erro inline por regra
 * 4. senhas não conferem → erro "Senhas não conferem"
 * 5. form vazio → erros em todos os campos obrigatórios
 */

export {};
```

- [ ] **Step 6: Criar `recommendation.spec.ts`**

Criar `frontend/web/e2e/recommendation.spec.ts`:

```typescript
/**
 * E2E — Fluxo de Recomendação
 * IMPLEMENTAR na fase 9-10 do GSD.
 *
 * Casos:
 * 1. visitante anônimo recebe recomendação → card do filme visível
 * 2. usuário autenticado com preferência "sci-fi" recebe filme do gênero
 * 3. botão "Assistir depois" adiciona à lista watch-later (verifica via GET /watch-later)
 * 4. botão "Nova sugestão" busca outro filme
 * 5. loading skeleton visível enquanto API responde
 * 6. erro de API → mensagem de erro amigável (não crash)
 */

export {};
```

- [ ] **Step 7: Criar `watch-later.spec.ts`**

Criar `frontend/web/e2e/watch-later.spec.ts`:

```typescript
/**
 * E2E — Fluxo de Watch Later
 * IMPLEMENTAR na fase 9-10 do GSD.
 *
 * Casos:
 * 1. lista vazia → exibe empty state com CTA para /recommendation
 * 2. item adicionado via recomendação aparece na lista
 * 3. dois cliques no mesmo filme → dois itens na lista (sem dedup — comportamento documentado)
 * 4. loading skeleton durante fetch
 * 5. acesso sem auth → redireciona para /login?from=/watch-later
 */

export {};
```

- [ ] **Step 8: Criar `history.spec.ts`**

Criar `frontend/web/e2e/history.spec.ts`:

```typescript
/**
 * E2E — Fluxo de Histórico
 * IMPLEMENTAR na fase 9-10 do GSD.
 *
 * Casos:
 * 1. lista vazia → exibe empty state
 * 2. recomendações anteriores aparecem em ordem cronológica inversa
 * 3. cada item exibe título, gênero e data relativa (ex: "Ontem", "há 3h")
 * 4. loading skeleton durante fetch
 * 5. acesso sem auth → redireciona para /login?from=/history
 */

export {};
```

- [ ] **Step 9: Criar `preferences.spec.ts`**

Criar `frontend/web/e2e/preferences.spec.ts`:

```typescript
/**
 * E2E — Fluxo de Preferências
 * IMPLEMENTAR na fase 9-10 do GSD.
 *
 * Casos:
 * 1. preferências salvas aparecem selecionadas ao recarregar
 * 2. salvar gênero "sci-fi" → próxima recomendação é do gênero sci-fi
 * 3. campo genres com valor inválido → 400 da API → mensagem de erro
 * 4. estado de carregamento (skeleton) durante GET inicial
 * 5. acesso sem auth → redireciona para /login?from=/preferences
 */

export {};
```

- [ ] **Step 10: Commit**

```bash
git add frontend/web/e2e/
git commit -m "docs(e2e): add documented Playwright spec files for future implementation"
```

---

## Verificação final

- [ ] **Rodar suite completa backend**

```bash
cd /workspaces/isn20261
uv run pytest -v --cov=functions --cov-report=term-missing --cov-fail-under=85 2>&1 | tail -5
```

Esperado: `124 passed | Total coverage: 100.00%`

- [ ] **Rodar suite completa frontend**

```bash
cd /workspaces/isn20261/frontend/web
pnpm test 2>&1 | tail -10
```

Esperado: todos os testes de frontend passando, sem falhas.

- [ ] **Verificar que os spec E2E não interferem na suite Vitest**

Os arquivos em `e2e/` exportam apenas `{}` e não são coletados pelo Vitest (que olha para `__tests__/**`). Confirmar que `pnpm test` não reporta erros vindos de `e2e/`.
