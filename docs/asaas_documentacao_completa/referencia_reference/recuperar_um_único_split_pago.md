# Recuperar um único split pago

# Recuperar um único split pago

## Path Params
- `id` (string, required): Identificador único do split pago no Asaas

## cURL Request
```bash
curl --request GET \
  --url https://api-sandbox.asaas.com/v3/payments/splits/paid/{id} \
  --header 'accept: application/json'
```

## Responses
### 200 OK
### 400 Bad Request
### 401 Unauthorized
### 403 Forbidden
Ocorre quando o body da requisição está preenchido, chamadas de método GET precisam ter um body vazio.
### 404 Not found

Updated 28 days ago
