# Estornar parcelamento

# Estornar parcelamento

É possível estornar um parcelamento via cartão de crédito recebido ou confirmado.

Como já ocorre no processo de estorno de uma cobrança avulsa por cartão de crédito, o saldo correspondente do parcelamento é debitado de sua conta no Asaas e a cobrança é cancelada no cartão do seu cliente. O cancelamento pode levar até 10 dias úteis para aparecer na fatura de seu cliente.

## Guia de Estornos

Confira o guia de estornos para mais informações.

## Path Params

*   `id` (string, required): Identificador único do parcelamento a ser estornado.

## Responses

*   **200 OK**
*   **400 Bad Request**
*   **401 Unauthorized**
*   **404 Not found**

## cURL Request

```bash
curl --request POST \
     --url https://api-sandbox.asaas.com/v3/installments/{id}/refund \
     --header 'accept: application/json' \
     --header 'content-type: application/json'
```

## Examples

Click `Try It!` to start a request and see the response here! Or choose an example:

application/json

200
400
401