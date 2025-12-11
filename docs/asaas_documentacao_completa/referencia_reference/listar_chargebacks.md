# Listar chargebacks

# Listar chargebacks

`GET` https://api-sandbox.asaas.com/v3/chargebacks/

Este método retorna uma lista paginada com todos os chargebacks para o(s) filtro(s) informado(s).

### Query Params

| Parâmetro | Tipo | Descrição |
| --- | --- | --- |
| `offset` | integer | Elemento inicial da lista |
| `limit` | integer | ≤ 100<br>Número de elementos da lista (max: 100) |
| `creditCardBrand` | string (enum) | Filtrar por bandeira do cartão utilizado.<br>**Valores possíveis:** `VISA`, `MASTERCARD`, `ELO`, `DINERS`, `DISCOVER`, `AMEX`, `CABAL`, `BANESCARD`, `CREDZ`, `SOROCRED`, `CREDSYSTEM`, `JCB`, `UNKNOWN` |
| `originDisputeDate[le]` | string | Filtrar até uma data de abertura de chargeback. |
| `originDisputeDate[ge]` | string | Filtrar a partir de uma data de abertura de chargeback. |
| `originTransactionDate[le]` | string | Filtrar até uma data de transação. |
| `originTransactionDate[ge]` | string | Filtrar a partir de uma data de transação. |
| `status` | string (enum) | Filtrar por status do chargeback.<br>**Valores possíveis:** `REQUESTED`, `IN_DISPUTE`, `DISPUTE_LOST`, `REVERSED`, `DONE` |

### Responses

| Código | Descrição |
| --- | --- |
| `200` | OK |
| `400` | Bad Request |
| `401` | Unauthorized |
| `403` | Forbidden. Ocorre quando o body da requisição está preenchido, chamadas de método GET precisam ter um body vazio. |

### Exemplo de Requisição

```bash
curl --request GET \
     --url https://api-sandbox.asaas.com/v3/chargebacks/ \
     --header 'accept: application/json'
```
