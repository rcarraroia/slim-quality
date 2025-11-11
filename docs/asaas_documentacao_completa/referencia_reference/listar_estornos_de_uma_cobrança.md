# Listar estornos de uma cobrança

# Listar estornos de uma cobrança

`GET` https://api-sandbox.asaas.com/v3/payments/{id}/refunds

## Path Params

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `id` | string | Identificador único da cobrança no Asaas |

## Responses

- `200 OK`
- `400 Bad Request`
- `401 Unauthorized`
- `403 Forbidden` - Ocorre quando o body da requisição está preenchido, chamadas de método GET precisam ter um body vazio.
- `404 Not found`

## Credenciais

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `access_token` | string | Token de acesso para autenticação. |

## cURL Request

```bash
curl --request GET \
  --url https://api-sandbox.asaas.com/v3/payments/{id}/refunds \
  --header 'accept: application/json'
```

## Response Examples

### 200 OK

```json
[
  {
    "id": "ref_00000000000001",
    "value": 100.00,
    "dateCreated": "2023-01-01",
    "status": "APPROVED",
    "description": "Estorno de teste"
  }
]
```

### 400 Bad Request

```json
{
  "errors": [
    {
      "code": "invalid_id",
      "description": "ID da cobrança inválido."
    }
  ]
}
```

### 401 Unauthorized

```json
{
  "errors": [
    {
      "code": "access_token_not_found",
      "description": "Access token não fornecido ou inválido."
    }
  ]
}
```
