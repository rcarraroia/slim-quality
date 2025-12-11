# Recuperar status de uma cobrança

# Recuperar status de uma cobrança

**URL:** https://docs.asaas.com/reference/recuperar-status-de-uma-cobranca

---

## Endpoint

`GET https://api-sandbox.asaas.com/v3/payments/{id}/status`

## Path Params

*   `id` (string, required)
    *   Identificador único da cobrança no Asaas

## Responses

*   **200 OK**

*   **400 Bad Request**

*   **401 Unauthorized**

*   **403 Forbidden.** Ocorre quando o body da requisição está preenchido, chamadas de método GET precisam ter um body vazio.

*   **404 Not found**

---

Updated 28 days ago

## Exemplo de Requisição (cURL)

```bash
curl --request GET \
     --url https://api-sandbox.asaas.com/v3/payments/id/status \
     --header 'accept: application/json'
```