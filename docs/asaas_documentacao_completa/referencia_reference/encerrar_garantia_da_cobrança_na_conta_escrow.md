# Encerrar garantia da cobrança na Conta Escrow

# Encerrar garantia da cobrança na Conta Escrow

**URL:** https://docs.asaas.com/reference/encerrar-garantia-da-cobranca-na-conta-escrow

---

## Guia de Contas escrow

Confira o guia de contas escrow para mais informações.

## Path Params

*   `id` (string, required)

    Identificador único da garantia da cobrança na Conta Escrow do Asaas

## Responses

*   **200 OK**
*   **400 Bad Request**
*   **401 Unauthorized**
*   **404 Not found**

Updated 28 days ago

## cURL Request

```bash
curl --request POST \
     --url https://api-sandbox.asaas.com/v3/escrow/id/finish \
     --header 'accept: application/json' \
     --header 'content-type: application/json'
```

## RESPONSE

Click Try It! to start a request and see the response here! Or choose an example:

`application/json`

*   200
*   400
*   401