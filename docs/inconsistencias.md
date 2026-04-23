# Inconsistências — ajustes pendentes

Levantadas durante a implementação dos endpoints Lambda. Cada item indica
o que está errado, o que foi feito na implementação e o que precisa ser
corrigido nos documentos de referência.

---

## 1. `POST /lost-password` — autenticação indevida no OpenAPI

**Problema:** O OpenAPI marca o endpoint com `bearerAuth`, mas quem
esqueceu a senha não consegue se autenticar.  
**Implementação:** endpoint público, sem auth.  
**Ação:** remover `security: - bearerAuth: []` do path `/lost-password`
no `docs/openAPI.yaml`.

---

## 2. `GET /history` — campo `genre` inexistente no banco

**Problema:** O response schema de `/history` no OpenAPI inclui o campo
`genre`, mas a tabela `Historico` não possui esse atributo.  
**Implementação:** `genre` removido da resposta. Retorna apenas `title`
e `recommended-at`.  
**Ação:** remover a propriedade `genre` do response de `GET /history`
no `docs/openAPI.yaml`.

---

## 3. `POST /watch-later` — campo `title` deve ser `movieId`

**Problema:** O OpenAPI define `title` como campo do request body, mas
o identificador correto de um filme no sistema é `movieId`.  
**Implementação:** recebe `movieId`.  
**Ação:** alterar o request body de `POST /watch-later` no
`docs/openAPI.yaml`: substituir `title` por `movieId`.

---

## 4. `GET /watch-later` — `title` não armazenado no schema do banco

**Problema:** A tabela `Users.watchLater` (Modelagem.md) define apenas
`{movieId, addedAt}`, mas o endpoint retorna `title`.  
**Implementação:** ao adicionar um filme (`POST /watch-later`) o `title`
é buscado no catálogo (mock/OMDB) e salvo junto no item
`{movieId, title, addedAt}`.  
**Ação:** adicionar o campo `title` ao schema do item `watchLater` em
`docs/Banco-de-Dados/Modelagem.md`.

---

## 5. `Users.preferences` — campos errados no Modelagem.md

**Problema:** O schema da tabela `Users` descreve `preferences` com
`{language, theme, notifications}` (preferências de UI), mas o sistema
usa preferências de filmes.  
**Implementação:** `preferences` armazenado como
`{genres, subscriptions, ageRating, humor}`.  
**Ação:** atualizar o map `preferences` no schema `Users` de
`docs/Banco-de-Dados/Modelagem.md` para refletir os campos corretos.

---

## 6. `Users.passwordHash` — campo desnecessário

**Problema:** O Cognito gerencia as senhas. O campo `passwordHash` no
schema `Users` é redundante e não é escrito em nenhum endpoint.  
**Implementação:** campo ignorado.  
**Ação:** remover `passwordHash` do schema `Users` em
`docs/Banco-de-Dados/Modelagem.md`.

---

## 7. `Tokens` — campo `newEmail` não previsto no schema

**Problema:** O fluxo de `/change-email` precisa que o token carregue
o novo e-mail a ser confirmado. O schema `Token` tem
`additionalProperties: false`, não prevendo campos extras.  
**Implementação:** o campo `newEmail` (string, opcional) é gravado no
item DynamoDB, ultrapassando o schema documentado.  
**Ação:** adicionar `newEmail` como propriedade opcional ao schema
`Token` em `docs/Banco-de-Dados/Modelagem.md`.

---

## 8. `POST /login` — response body não definido no OpenAPI

**Problema:** O response `200` de `/login` não especifica corpo.  
**Implementação:** retorna `{accessToken, idToken, refreshToken}`.  
**Ação:** adicionar o response body ao path `POST /login` no
`docs/openAPI.yaml`:
```yaml
"200":
  content:
    application/json:
      schema:
        type: object
        properties:
          accessToken:
            type: string
          idToken:
            type: string
          refreshToken:
            type: string
```

---

## 9. `POST /register` — response body não definido no OpenAPI

**Problema:** O response `200` de `/register` não especifica corpo.  
**Implementação:** retorna `{verifyEmailUrl}` temporariamente (até SES
estar integrado, momento em que a URL será enviada por e-mail e o body
passará a ser vazio).  
**Ação:** decidir se o body de registro é vazio em produção ou retorna
algum dado; atualizar `docs/openAPI.yaml` conforme a decisão.

---

## 10. Fluxo `/lost-password` incompleto — falta endpoint `/reset-password`

**Problema:** `/lost-password` gera um token de reset mas não existe
nenhum endpoint que receba esse token e defina a nova senha.  
**Implementação:** token é gerado e salvo em `Tokens`, mas o fluxo
termina aí.  
**Ação:** criar o endpoint `POST /reset-password` recebendo
`{token, password}`, validar o token (tipo `reset-password`), chamar
`admin_set_user_password` no Cognito e deletar o token.

---

## 11. Integração OMDB pendente

**Problema:** A recomendação de filmes usa dados mockados (`_MOCK_CATALOGUE`
em `functions/recommend.py`).  
**Ação:** quando `OMDB_API_KEY` estiver disponível, substituir
`_resolve_movie()` e `_pick_movie()` por chamadas reais à OMDB API
(`https://www.omdbapi.com/`).

---

## 12. Envio de e-mail via SES pendente

**Problema:** Os endpoints `/register` e `/lost-password` precisam
enviar e-mails transacionais (verificação e reset). Atualmente a URL
é apenas retornada no response (modo dev) ou descartada.  
**Ação:** configurar SES no Pulumi, adicionar permissão `ses:SendEmail`
ao role Lambda e substituir os `# TODO` em `register.py` e
`lost_password.py` pelo envio real.
