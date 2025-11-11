# Recuperar uma única negativação

# Recuperar uma única negativação

**URL:** https://docs.asaas.com/reference/recuperar-uma-unica-negativacao

---

## Path Params

*   **id** (string, required)
    *   Identificador único da negativação no Asaas

## Responses

### 200 OK

### 400 Bad Request

### 401 Unauthorized

### 403 Forbidden

Ocorre quando o body da requisição está preenchido, chamadas de método GET precisam ter um body vazio.

### 404 Not found

---

## cURL Request

```bash
curl --request GET \
     --url https://api-sandbox.asaas.com/v3/paymentDunnings/id \
     --header 'accept: application/json'
```

Updated 28 days ago
