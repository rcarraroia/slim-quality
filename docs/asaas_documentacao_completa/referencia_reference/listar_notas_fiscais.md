# Listar notas fiscais

# Listar notas fiscais

Diferente da recuperação de uma nota fiscal específica, este método retorna uma lista paginada com todas as notas fiscais para os filtros informados.

Filtrar por data de emissão: `GET https://api.asaas.com/v3/invoices?effectiveDate%5Bge%5D=2018-06-03&effectiveDate%5Ble%5D=2018-06-10`

Filtrar por situação: `GET https://api.asaas.com/v3/invoices?status=SCHEDULED`

## Query Params

| Parâmetro         | Tipo    | Descrição                                        | Valores Permitidos |
| :---------------- | :------ | :----------------------------------------------- | :----------------- |
| `offset`          | integer | Elemento inicial da lista                        |                    |
| `limit`           | integer | Número de elementos da lista (max: 100)          | ≤ 100              |
| `effectiveDate[Ge]` | string  | Filtrar a partir de uma data de emissão          |                    |
| `effectiveDate[Le]` | string  | Filtrar até uma data de emissão                  |                    |
| `payment`         | string  | Filtrar pelo identificador único da cobrança     |                    |
| `installment`     | string  | Filtrar pelo identificador único do parcelamento |                    |
| `externalReference` | string  | Filtrar pelo identificador da nota fiscal no seu sistema |                    |
| `status`          | string  | Filtrar por situação                             | `SCHEDULED`, `AUTHORIZED`, `PROCESSING_CANCELLATION`, `CANCELED`, `CANCELLATION_DENIED`, `ERROR` |
| `customer`        | string  | Filtrar pelo identificador único do cliente      |                    |

## Respostas

| Código | Status       | Descrição                                                              |
| :----- | :----------- | :--------------------------------------------------------------------- |
| `200`  | OK           |                                                                        |
| `400`  | Bad Request  |                                                                        |
| `401`  | Unauthorized |                                                                        |
| `403`  | Forbidden    | Ocorre quando o body da requisição está preenchido, chamadas de método GET precisam ter um body vazio. |

## Exemplo de Requisição cURL

```bash
curl --request GET \
     --url https://api-sandbox.asaas.com/v3/invoices \
     --header 'accept: application/json'
```

Updated 28 days ago