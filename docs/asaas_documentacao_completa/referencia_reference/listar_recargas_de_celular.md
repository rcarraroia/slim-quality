# Listar recargas de celular

# Listar recargas de celular

**URL:** https://docs.asaas.com/reference/listar-recargas-de-celular

## Query Params

*   `offset` (integer): Elemento inicial da lista
*   `limit` (integer, ≤ 100): Número de elementos da lista (max: 100)

## Responses

*   **200 OK**
*   **400 Bad Request**
*   **401 Unauthorized**
*   **403 Forbidden**: Ocorre quando o body da requisição está preenchido, chamadas de método GET precisam ter um body vazio.

## cURL Request

```bash
curl --request GET \
     --url https://api-sandbox.asaas.com/v3/mobilePhoneRecharges \
     --header 'accept: application/json'
```

## Exemplos de Resposta

```json
// Exemplo de resposta 200 OK (estrutura esperada)
{
  "data": [
    {
      "id": "rec_xxxxxxxxxxxx",
      "value": 10.00,
      "status": "APPROVED",
      "mobilePhone": {
        "countryCode": "55",
        "areaCode": "11",
        "number": "999999999"
      },
      "provider": "TIM",
      "dateCreated": "2023-01-01T10:00:00Z"
    }
  ],
  "hasMore": false,
  "totalCount": 1,
  "limit": 10,
  "offset": 0
}
```