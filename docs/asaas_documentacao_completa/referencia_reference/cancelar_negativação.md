# Cancelar negativação

# Cancelar negativação

Permite o cancelamento de uma negativação. Utilize a propriedade `canBeCancelled` retornado no objeto de negativação para verificar se a negativação pode ser cancelada.

Caso a negativação já tenha sido iniciada, ao solicitar o cancelamento a negativação ficará com o status de `AWAITING_CANCELLATION` até que seja efetivamente cancelada (`CANCELLED`).

## Path Params

*   **id** (string, required): Identificador único da negativação a ser cancelada.

## Respostas

*   **200 OK**
*   **400 Bad Request**
*   **401 Unauthorized**
*   **404 Not found**

## Exemplo de Requisição cURL

```bash
curl --request POST \
     --url https://api-sandbox.asaas.com/v3/paymentDunnings/{id}/cancel \
     --header 'accept: application/json' \
     --header 'content-type: application/json'
```
