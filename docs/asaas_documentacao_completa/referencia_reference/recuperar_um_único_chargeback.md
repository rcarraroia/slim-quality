# Recuperar um único chargeback

# Recuperar um único chargeback

GET `https://api-sandbox.asaas.com/v3/payments/{id}/chargeback`

Este endpoint recupera um chargeback específico a partir do ID de uma cobrança ou parcelamento.

### Path Params

| Parâmetro | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| id | string | required | Identificador único do pagamento ou do parcelamento para o qual o chargeback será recuperado. |

### Responses

| Status | Descrição |
| --- | --- |
| 200 | OK |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden. Ocorre quando o body da requisição está preenchido, chamadas de método GET precisam ter um body vazio. |
| 404 | Not found |

### Exemplo de Requisição

```bash
curl --request GET \
     --url https://api-sandbox.asaas.com/v3/payments/id/chargeback \
     --header 'accept: application/json'
```