# DynamoDB — Schema & Tipos

[JSON Schema (Draft 7)](https://json-schema.org/draft-07/json-schema-release-notes.html) 

> **Convenções**
> - Datas são sempre `string` no formato **ISO 8601** (`2024-01-15T10:30:00Z`)
> - Campos marcados com `"required"` são obrigatórios em toda operação de escrita
> - Campos do tipo `map` são documentados como `object` com suas propriedades explícitas
> - Campos do tipo `list` são documentados como `array` com o schema de cada item

---

## Tabelas

- [EmailToSub](#emailtosub)
- [Users](#users)
- [Tokens](#tokens)
- [Historico](#historico)
- [Movies](#movies)
- [Logs](#logs)

---

## EmailToSub

Mapeamento de e-mail para `sub` do Cognito. Usado para lookup por e-mail.

| Chave | Tipo | Papel |
|-------|------|-------|
| `email` | `string` | Partition Key |
| `sub` | `string` | Atributo |

### JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "EmailToSub",
  "type": "object",
  "required": ["email", "sub"],
  "additionalProperties": false,
  "properties": {
    "email": {
      "type": "string",
      "format": "email",
      "description": "Partition Key. E-mail do usuário."
    },
    "sub": {
      "type": "string",
      "description": "UUID do Cognito vinculado ao e-mail."
    }
  }
}
```

---

## Users

Registro principal do usuário. Utiliza `map` para simular um documento NoSQL com campos aninhados.

| Chave | Tipo | Papel |
|-------|------|-------|
| `sub` | `string` | Partition Key |

### Atributos de topo

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `sub` | `string` | ✅ | UUID do Cognito (Partition Key) |
| `email` | `string` | ✅ | E-mail do usuário |
| `name` | `string` | ❌ | Nome do usuário — gravado por `post_confirm` se o Cognito enviar o atributo |
| `preferences` | `object (map)` | ✅ | Preferências de recomendação do usuário — ver detalhes abaixo |
| `watchLater` | `array (list)` | ✅ | Lista de filmes para ver depois — ver detalhes abaixo |
| `createdAt` | `string` | ✅ | ISO 8601 — gravado por `post_confirm` no momento da confirmação do cadastro |
| `updatedAt` | `string` | ❌ | ISO 8601 — gravado por `POST /preferences` no momento da atualização |

> **Nota:** `passwordHash` e `emailVerified` **não** existem nesta tabela. O Cognito é a fonte de verdade para credenciais e estado de verificação de e-mail — a linha em `Users` só é criada pelo trigger `post_confirm` (`PostConfirmation_ConfirmSignUp`), que dispara após a verificação.

### Map: `preferences`

Todos os campos são opcionais — a linha é seedada por `post_confirm` com `preferences: {}` e cada campo é populado individualmente por `POST /preferences`.

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `genres` | `array<string>` | ❌ | Gêneros preferidos (ex: `["action", "sci-fi"]`) |
| `subscriptions` | `array<string>` | ❌ | Serviços de streaming assinados (ex: `["Netflix", "HBO Max"]`) |
| `ageRating` | `string` | ❌ | Classificação indicativa máxima (ex: `"PG-13"`, `"R"`) |
| `humor` | `string` | ❌ | Tipo de humor preferido (ex: `"dark"`, `"light"`) |

### List: `watchLater`

Cada item da lista é um objeto com os campos:

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `movieId` | `string` | ✅ | ID do filme |
| `addedAt` | `string` | ✅ | ISO 8601 — quando foi adicionado |

### JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "User",
  "type": "object",
  "required": [
    "sub",
    "email",
    "preferences",
    "watchLater",
    "createdAt"
  ],
  "additionalProperties": false,
  "properties": {
    "sub": {
      "type": "string",
      "description": "Partition Key. UUID do Cognito."
    },
    "email": {
      "type": "string",
      "format": "email",
      "description": "E-mail do usuário."
    },
    "name": {
      "type": "string",
      "description": "Nome do usuário. Opcional — gravado por post_confirm se o Cognito enviar o atributo."
    },
    "preferences": {
      "type": "object",
      "description": "MAP — Preferências de recomendação. Todos os campos são opcionais; a linha é seedada como {} e POST /preferences popula cada campo individualmente.",
      "additionalProperties": false,
      "properties": {
        "genres": {
          "type": "array",
          "items": {"type": "string"},
          "description": "Gêneros preferidos."
        },
        "subscriptions": {
          "type": "array",
          "items": {"type": "string"},
          "description": "Serviços de streaming assinados."
        },
        "ageRating": {
          "type": "string",
          "description": "Classificação indicativa máxima (ex: 'PG-13', 'R')."
        },
        "humor": {
          "type": "string",
          "description": "Tipo de humor preferido (ex: 'dark', 'light')."
        }
      }
    },
    "watchLater": {
      "type": "array",
      "description": "LIST — Filmes salvos para ver depois.",
      "items": {
        "type": "object",
        "required": ["movieId", "addedAt"],
        "additionalProperties": false,
        "properties": {
          "movieId": {
            "type": "string",
            "description": "ID do filme."
          },
          "title": {
            "type": "string",
            "description": "Título do filme (cache de OMDB/catálogo no momento da adição)."
          },
          "addedAt": {
            "type": "string",
            "format": "date-time",
            "description": "ISO 8601 — data em que o filme foi adicionado."
          }
        }
      }
    },
    "createdAt": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 — data de criação do registro (gravado por post_confirm)."
    },
    "updatedAt": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 — data da última atualização (gravado por POST /preferences). Opcional — só existe após primeira atualização."
    }
  }
}
```

---

## Tokens

Tokens temporários para verificação de e-mail e reset de senha.

| Chave | Tipo | Papel |
|-------|------|-------|
| `token` | `string` | Partition Key |

### Atributos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `token` | `string` | ✅ | UUID do token |
| `sub` | `string` | ✅ | UUID do Cognito — dono do token |
| `type` | `"verify-email"` \| `"reset-password"` | ✅ | Finalidade do token |
| `expiresAt` | `string` | ✅ | ISO 8601 — data de expiração |

### JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "Token",
  "type": "object",
  "required": ["token", "sub", "type", "expiresAt"],
  "additionalProperties": false,
  "properties": {
    "token": {
      "type": "string",
      "description": "Partition Key. UUID do token."
    },
    "sub": {
      "type": "string",
      "description": "UUID do Cognito do usuário dono do token."
    },
    "type": {
      "type": "string",
      "enum": ["verify-email", "reset-password"],
      "description": "Finalidade do token."
    },
    "expiresAt": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 — data e hora de expiração do token."
    }
  }
}
```

---

## Historico

Histórico de filmes recomendados por usuário. Cada entrada é identificada pelo par `sub` + `timestamp`.

| Chave | Tipo | Papel |
|-------|------|-------|
| `sub` | `string` | Partition Key |
| `timestamp` | `string` | Sort Key |

### Atributos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `sub` | `string` | ✅ | UUID do Cognito |
| `timestamp` | `string` | ✅ | ISO 8601 — Sort Key |
| `movieTitle` | `string` | ✅ | Título do filme recomendado |
| `movieId` | `string` | ❌ | IMDB ID do filme — referência ao catálogo Movies |
| `genre` | `string` | ❌ | Gênero — denormalizado no momento da recomendação |

### JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "HistoricoItem",
  "type": "object",
  "required": ["sub", "timestamp", "movieTitle"],
  "additionalProperties": false,
  "properties": {
    "sub": {
      "type": "string",
      "description": "Partition Key. UUID do Cognito."
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "Sort Key. ISO 8601 — momento em que o filme foi recomendado."
    },
    "movieTitle": {
      "type": "string",
      "description": "Título do filme recomendado."
    },
    "movieId": {
      "type": "string",
      "description": "IMDB ID do filme. Referência ao catálogo Movies para enriquecimento futuro."
    },
    "genre": {
      "type": "string",
      "description": "Gênero do filme. Denormalizado no momento da recomendação."
    }
  }
}
```

---

## Movies

Catálogo canônico de filmes. Fonte única de metadados, usada por `/recommend`, `/history` e `/watch-later`. Substitui o `_MOCK_CATALOGUE` que antes era duplicado em `recommend/recommend.py` e `watch_later/watch_later.py`.

| Chave | Tipo | Papel |
|-------|------|-------|
| `movieId` | `string` | Partition Key |

### Atributos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `movieId` | `string` | ✅ | IMDB ID (ex: `"tt0133093"`) ou ID sintético `omdb-{n}` para filmes sem vínculo IMDB — Partition Key |
| `title` | `string` | ✅ | Título do filme |
| `year` | `integer` | ❌ | Ano de lançamento. Ausente para ~742 filmes sem data no dataset OMDB. |
| `genre` | `string` | ✅ | Gênero principal (ex: `"action"`, `"sci-fi"`, `"crime"`) |
| `director` | `string` | ❌ | Diretor(es) |
| `rated` | `string` | ❌ | Classificação indicativa (ex: `"PG-13"`, `"R"`, `"PG"`). Não disponível no dataset OMDB atual — reservado para integração futura. |
| `runtime` | `integer` | ❌ | Duração em minutos |
| `poster` | `string` | ❌ | URL do poster (formato URI) |
| `imdbRating` | `number` | ❌ | Nota IMDB (0.0–10.0) |
| `streamingServices` | `array<object>` | ❌ | Plataformas de streaming onde o filme está disponível. Não disponível no dataset OMDB atual — reservado para integração futura. |

### List: `streamingServices`

Cada item é um objeto com os campos:

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `name` | `string` | ✅ | Nome da plataforma (ex: `"Netflix"`, `"Amazon Prime"`) |
| `image` | `string` | ❌ | URL do ícone/logo da plataforma |
| `url` | `string` | ❌ | URL para assistir na plataforma |

### JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "Movie",
  "type": "object",
  "required": ["movieId", "title", "genre"],
  "additionalProperties": false,
  "properties": {
    "movieId": {
      "type": "string",
      "description": "Partition Key. IMDB ID (tt...) ou ID sintético omdb-{n} para filmes sem vínculo IMDB."
    },
    "title": {
      "type": "string",
      "description": "Título do filme."
    },
    "year": {
      "type": "integer",
      "description": "Ano de lançamento. Ausente para ~742 filmes sem data no dataset OMDB."
    },
    "genre": {
      "type": "string",
      "description": "Gênero principal."
    },
    "director": {
      "type": "string",
      "description": "Diretor(es)."
    },
    "rated": {
      "type": "string",
      "description": "Classificação indicativa (ex: PG-13, R, PG). Não disponível no dataset OMDB atual — reservado para integração futura."
    },
    "runtime": {
      "type": "integer",
      "description": "Duração em minutos."
    },
    "poster": {
      "type": "string",
      "description": "URL do poster."
    },
    "imdbRating": {
      "type": "number",
      "description": "Nota IMDB (0.0 a 10.0)."
    },
    "streamingServices": {
      "type": "array",
      "description": "Plataformas de streaming onde o filme está disponível. Não disponível no dataset OMDB atual — reservado para integração futura.",
      "items": {
        "type": "object",
        "required": ["name"],
        "additionalProperties": false,
        "properties": {
          "name": {
            "type": "string",
            "description": "Nome da plataforma."
          },
          "image": {
            "type": "string",
            "description": "URL do ícone/logo da plataforma."
          },
          "url": {
            "type": "string",
            "description": "URL para assistir na plataforma."
          }
        }
      }
    }
  }
}
```

---

## Logs

Log de ações do usuário no sistema. Cada entrada é identificada pelo par `sub` + `timestamp`.

| Chave | Tipo | Papel |
|-------|------|-------|
| `sub` | `string` | Partition Key |
| `timestamp` | `string` | Sort Key |

### Atributos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `sub` | `string` | ✅ | UUID do Cognito |
| `timestamp` | `string` | ✅ | ISO 8601 — Sort Key |
| `action` | `string` | ✅ | Ação executada (ex: `LOGIN`, `WATCH`, `PASSWORD_RESET`) |
| `metadata` | `object` | ✅ | Dados extras da ação — schema livre |

> **Nota sobre `metadata`:** Este campo é intencionalmente aberto (`additionalProperties: true`) pois cada `action` pode carregar dados diferentes. Se no futuro os metadados de uma ação específica se tornarem estáveis, considere criar um schema dedicado para ela usando `if/then` do JSON Schema.

### JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "LogItem",
  "type": "object",
  "required": ["sub", "timestamp", "action", "metadata"],
  "additionalProperties": false,
  "properties": {
    "sub": {
      "type": "string",
      "description": "Partition Key. UUID do Cognito."
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "Sort Key. ISO 8601 — momento da ação."
    },
    "action": {
      "type": "string",
      "description": "Ação executada. Ex: LOGIN, WATCH, PASSWORD_RESET."
    },
    "metadata": {
      "type": "object",
      "description": "Dados extras da ação. Schema livre — varia por action.",
      "additionalProperties": true
    }
  }
}
```