# Listar webhooks

# Listar webhooks

`GET` https://api-sandbox.asaas.com/v3/webhooks

Endpoint para listar todos os Webhooks cadastrados na sua conta.

## Query Params

| | | |
| :--- | :--- | :--- |
| `offset` | integer | Elemento inicial da lista |
| `limit` | integer | Número de elementos da lista (max: 100) |

## Responses

| | |
| :--- | :--- |
| 200 | OK |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden. Ocorre quando o body da requisição está preenchido, chamadas de método GET precisam ter um body vazio. |