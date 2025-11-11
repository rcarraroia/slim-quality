# Recuperar uma única cobrança com dados resumidos

# Recuperar uma única cobrança com dados resumidos

## Path Params

| Parâmetro | Tipo | Requerido | Descrição |
|---|---|---|---|
| `id` | `string` | Sim | Identificador único da cobrança no Asaas |

## Responses

### 200 OK

### 400 Bad Request

### 401 Unauthorized

### 403 Forbidden
Ocorre quando o body da requisição está preenchido, chamadas de método GET precisam ter um body vazio.

### 404 Not found

## cURL Request

```bash
curl --request GET \
     --url https://api-sandbox.asaas.com/v3/lean/payments/id \
     --header 'accept: application/json'
```

## Examples

Click Try It! to start a request and see the response here! Or choose an example:

* `application/json`
  * `200`
  * `400`
  * `401`

Updated 28 days ago