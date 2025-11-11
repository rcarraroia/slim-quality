# Estornar boleto

# Estornar boleto

**URL:** https://docs.asaas.com/reference/estornar-boleto

---

## Guia de Estornos

Confira o guia de estornos para mais informações.

Ao solicitar o estorno será retornado um link, através dele o cliente que realizou o pagamento do boleto deve preencher os dados bancários e enviar os documentos de identificação que comprovam que ele é o titular da conta bancaria informada.

## Path Params

*   `id` (string, required): Identificador único da cobrança no Asaas

## Responses

*   **200 OK**
*   **400 Bad Request**
*   **401 Unauthorized**
*   **404 Not found**

Updated 28 days ago

## cURL Request

```bash
curl --request POST \
     --url https://api-sandbox.asaas.com/v3/payments/{id}/bankSlip/refund \
     --header 'accept: application/json' \
     --header 'content-type: application/json'
```

## RESPONSE

Click Try It! to start a request and see the response here! Or choose an example:

`application/json`

*   **200**
*   **400**
*   **401**