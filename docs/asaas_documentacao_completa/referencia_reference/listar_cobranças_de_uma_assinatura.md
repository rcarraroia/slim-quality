# Listar cobranças de uma assinatura

# Listar cobranças de uma assinatura

**URL:** https://docs.asaas.com/reference/listar-cobrancas-de-uma-assinatura

---

## Path Params

**id** *string* required

Identificador único da assinatura no Asaas

## Query Params

**status** *string* enum

Filtrar por status das cobranças

*   PENDING
*   RECEIVED
*   CONFIRMED
*   OVERDUE
*   REFUNDED
*   RECEIVED_IN_CASH
*   REFUND_REQUESTED
*   REFUND_IN_PROGRESS
*   CHARGEBACK_REQUESTED
*   CHARGEBACK_DISPUTE
*   AWAITING_CHARGEBACK_REVERSAL
*   DUNNING_REQUESTED
*   DUNNING_RECEIVED
*   AWAITING_RISK_ANALYSIS

## Responses

*   **200** OK
*   **400** Bad Request
*   **401** Unauthorized
*   **403** Forbidden. Ocorre quando o body da requisição está preenchido, chamadas de método GET precisam ter um body vazio.
*   **404** Not found

## Exemplo de Requisição

### cURL

```bash
curl --request GET \
     --url https://api-sandbox.asaas.com/v3/subscriptions/id/payments \
     --header 'accept: application/json'
```