# Recuperar um único cliente

# Recuperar um único cliente

**URL:** https://docs.asaas.com/reference/recuperar-um-unico-cliente

## Path Params

*   `id` (string, required): Identificador único do cliente no Asaas

## Responses

### 200 OK

### 400 Bad Request

### 401 Unauthorized

### 403 Forbidden

Ocorre quando o body da requisição está preenchido, chamadas de método GET precisam ter um body vazio.

### 404 Not found

Updated 28 days ago

## cURL Request

```bash
curl --request GET \
     --url https://api-sandbox.asaas.com/v3/customers/{id} \
     --header 'accept: application/json'
```

## Examples

Click Try It! to start a request and see the response here! Or choose an example:

`application/json`

*   200
*   400
*   401
