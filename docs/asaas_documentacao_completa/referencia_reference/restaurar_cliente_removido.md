# Restaurar cliente removido

# Restaurar cliente removido

**URL:** https://docs.asaas.com/reference/restaurar-cliente-removido

---

## Path Params

*   **id** (string, required): Identificador único do cliente a ser restaurado.

## Responses

*   **200 OK**
*   **400 Bad Request**
*   **401 Unauthorized**
*   **404 Not found**

Updated 28 days ago

## cURL Request

```bash
curl --request POST \
     --url https://api-sandbox.asaas.com/v3/customers/{id}/restore \
     --header 'accept: application/json' \
     --header 'content-type: application/json'
```

## Examples

Click Try It! to start a request and see the response here! Or choose an example:

*   application/json
    *   200
    *   400
    *   401