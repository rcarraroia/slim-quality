# Recuperar um único pagamento de conta

# Recuperar um único pagamento de conta

**URL:** https://docs.asaas.com/reference/recuperar-um-unico-pagamento-de-conta

## Path Params

*   `id` (string, required): Identificador único do pagamento de conta no Asaas.

## Responses

### 200 OK

### 400 Bad Request

Forbidden. Ocorre quando o body da requisição está preenchido, chamadas de método GET precisam ter um body vazio.

### 401 Unauthorized

### 403 Forbidden

Forbidden. Ocorre quando o body da requisição está preenchido, chamadas de método GET precisam ter um body vazio.

### 404 Not found

## cURL Request

```bash
curl --request GET \
     --url https://api-sandbox.asaas.com/v3/bill/{id} \
     --header 'accept: application/json'
```

Updated 28 days ago