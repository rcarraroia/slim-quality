# Listar assinaturas

# Listar assinaturas

Diferente da recuperação de uma assinatura específica, este método retorna uma lista paginada com todas as assinaturas para os filtros informados.

Listar assinaturas de um cliente específico: `GET https://api.asaas.com/v3/subscriptions?customer={customer_id}`

Filtrar por forma de pagamento: `GET https://api.asaas.com/v3/subscriptions?billingType=CREDIT_CARD`

## Query Params

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `offset` | `integer` | Elemento inicial da lista |
| `limit` | `integer` | Número de elementos da lista (max: 100) |
| `customer` | `string` | Filtrar pelo Identificador único do cliente |
| `customerGroupName` | `string` | Filtrar pelo nome do grupo de cliente |
| `billingType` | `string` (enum) | Filtrar por forma de pagamento. Valores permitidos: `UNDEFINED`, `BOLETO`, `CREDIT_CARD`, `DEBIT_CARD`, `TRANSFER`, `DEPOSIT`, `PIX` |
| `status` | `string` (enum) | Filtrar pelo status. Valores permitidos: `ACTIVE`, `EXPIRED`, `INACTIVE` |
| `deletedOnly` | `string` | Envie `true` para retornar somente as assinaturas removidas |
| `includeDeleted` | `string` | Envie `true` para recuperar também as assinaturas removidas |
| `externalReference` | `string` | Filtrar pelo Identificador do seu sistema |
| `order` | `string` | Ordem crescente ou decrescente |
| `sort` | `string` | Por qual campo será ordenado |

## Respostas

### 200 OK

### 400 Bad Request

### 401 Unauthorized

### 403 Forbidden

Ocorre quando o body da requisição está preenchido, chamadas de método GET precisam ter um body vazio.

## Exemplo de Requisição cURL

```bash
curl --request GET \
     --url https://api-sandbox.asaas.com/v3/subscriptions \
     --header 'accept: application/json'
```

## Exemplo de Resposta (application/json)

Click `Try It!` to start a request and see the response here! Or choose an example:

200
400
401