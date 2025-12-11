# Desfazer confirmação de recebimento em dinheiro

# Desfazer confirmação de recebimento em dinheiro

**URL:** https://docs.asaas.com/reference/desfazer-confirmacao-de-recebimento-em-dinheiro

---

## Path Params

*   `id` (string, required): Identificador único da cobrança no Asaas.

## Responses

*   **200 OK**
*   **400 Bad Request**
*   **401 Unauthorized**
*   **404 Not found**

## cURL Request

```bash
curl --request POST \
     --url https://api-sandbox.asaas.com/v3/payments/{id}/undoReceivedInCash \
     --header 'accept: application/json' \
     --header 'content-type: application/json'
```

## Examples

Click Try It! to start a request and see the response here! Or choose an example:

`application/json`

*   200
*   400
*   401

---

Updated 28 days ago

Confirmar recebimento em dinheiro
Simulador de vendas