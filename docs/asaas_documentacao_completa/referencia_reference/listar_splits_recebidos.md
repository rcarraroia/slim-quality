# Listar splits recebidos

# Listar splits recebidos

**URL:** https://docs.asaas.com/reference/listar-splits-recebidos

---

## Query Params

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `offset` | `integer` | Elemento inicial da lista |
| `limit` | `integer` | Número de elementos da lista (max: 100) |
| `paymentId` | `string` | Filtrar pelo ID da cobrança |
| `status` | `string` (enum) | Filtrar por status. Valores permitidos: `PENDING`, `PROCESSING`, `AWAITING_CREDIT`, `CANCELLED`, `DONE`, `REFUNDED`, `BLOCKED_BY_VALUE_DIVERGENCE` |
| `paymentConfirmedDate[ge]` | `string` | Filtrar a partir da data de confirmação da cobrança inicial |
| `paymentConfirmedDate[le]` | `string` | Filtrar a partir da data de confirmação da cobrança final |
| `creditDate[ge]` | `string` | Filtrar a partir da data de recebimento do split inicial |
| `creditDate[le]` | `string` | Filtrar a partir da data de recebimento do split final |

## Respostas

### Códigos de Status HTTP

*   **200 OK**
*   **400 Bad Request**
*   **401 Unauthorized**
*   **403 Forbidden**: Ocorre quando o body da requisição está preenchido, chamadas de método GET precisam ter um body vazio.

## Exemplo de Requisição cURL

```bash
curl --request GET \
     --url https://api-sandbox.asaas.com/v3/payments/splits/received \
     --header 'accept: application/json'
```

Updated 28 days ago.