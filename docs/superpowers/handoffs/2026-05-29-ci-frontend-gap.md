# Handoff — Conectar testes de frontend ao CI

> Criado: 2026-05-29 | Para retomar em outro chat

## TL;DR

Os 41 testes de frontend (Vitest) **não rodam em nenhum workflow de CI**. O `ci.yml` só executa pytest + ruff (Python). Resultado: alguém pode quebrar um teste de frontend e o CI passa verde. **Tarefa: adicionar um job de frontend ao CI.**

## Contexto

Na sessão de 2026-05-29 implementamos a estratégia de testes (plano em `docs/superpowers/plans/2026-05-29-test-strategy-implementation.md`). Tudo foi feito **menos o commit** (o usuário commita tudo junto no final — ver "Estado do git" abaixo).

O que existe agora:
- **Backend:** 127 testes pytest, 99% cobertura — já roda no CI (`ci.yml`).
- **Frontend:** 41 testes Vitest (`frontend/web/__tests__/`) — ✅ passam localmente, ❌ não rodam no CI.
- **E2E:** 9 specs Playwright documentados (comentados) — não executáveis ainda.
- Documento de referência completo: `docs/TESTING.md`.

## O problema concreto

`.github/workflows/ci.yml` hoje:

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
jobs:
  tests:
    name: Testes Python
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.13"
      - uses: astral-sh/setup-uv@v5
        with:
          enable-cache: true
      - run: uv sync
      - run: uv run ruff check functions/ tests/
      - run: uv run pytest -v --cov=functions --cov-report=term-missing --cov-fail-under=85
```

Só Python. Nenhum job roda `pnpm test` no `frontend/web`.

## Tarefa proposta

Adicionar um segundo job ao `ci.yml` (ou um workflow separado `frontend-ci.yml`) que:

1. Faz checkout.
2. Setup pnpm (`pnpm/action-setup@v4`, version 10) + Node (`actions/setup-node@v4`, usando `frontend/web/.nvmrc`, cache pnpm).
3. `pnpm install --frozen-lockfile` em `frontend/web`.
4. `pnpm test` em `frontend/web`.
5. (Opcional, avaliar) rodar `pnpm lint` também.

**Referência de setup pnpm+Node:** copiar os passos `Setup pnpm` / `Setup Node` / `Install frontend deps` que já existem em `.github/workflows/deploy-prod.yml` (estão prontos e testados lá).

### Decisões a tomar no próximo chat

- **Job separado vs. workflow separado?** Provavelmente um job novo dentro de `ci.yml` (mesmo gatilho push/PR). Confirmar com o usuário.
- **Path filter?** Considerar rodar o job de frontend só quando `frontend/web/**` muda (economiza CI), ou sempre (mais simples). Recomendo sempre, no início.
- **Gate de cobertura no frontend?** Hoje não há. Decisão do design: entra só quando o frontend estabilizar (fase 9-10 do GSD). **Não adicionar gate agora.**

## Como verificar

```bash
cd frontend/web && pnpm test   # deve dar 41 passed (6 arquivos)
uv run pytest --cov=functions --cov-fail-under=85 -q   # 127 passed, 99%
```

Depois de editar o workflow: validar YAML e, se possível, abrir um PR de teste para ver o job rodar.

## Estado do git (IMPORTANTE)

Nada foi commitado ainda nesta linha de trabalho. O usuário pediu para **commitar tudo junto no final**. Trabalho pendente de commit na branch `feat/melhorias-testes`:

- `functions/{history,preferences,watch_later,recommend}.py` — tratamento de 500
- `tests/{history,preferences,watch_later,recommend}/*.py` — testes de 500
- `docs/test-plan-layer1.md` — comando CI corrigido
- `frontend/web/vitest.config.ts`, `vitest.setup.ts`, `package.json`, `tsconfig.json`, `pnpm-lock.yaml`
- `frontend/web/__tests__/**` (6 arquivos de teste)
- `frontend/web/e2e/**` (9 specs documentados)
- `docs/TESTING.md`, `docs/superpowers/**`

Decidir no próximo chat: a edição do CI entra **no mesmo commit** ou em um commit/PR separado.

## Nota lateral (não bloqueante)

Diagnóstico do TS em `frontend/web/tsconfig.json:22` — `baseUrl` preterido no TS 7.0. Não relacionado a testes; ignorar ou tratar à parte.
