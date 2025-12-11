# Recuperar extrato

# Recuperar extrato

Retorna uma lista de movimentações financeiras no período informado nos parâmetros.

No retorno, o campo `type` pode ter os seguintes tipos:

*   `ASAAS_CARD_RECHARGE` - Recarga de cartão Asaas
*   `ASAAS_CARD_RECHARGE_REVERSAL` - Estorno da recarga de cartão
*   `ASAAS_CARD_TRANSACTION` - Transação efetuada com o cartão Asaas
*   `ASAAS_CARD_CASHBACK` - Cashback recebido com o cartão Asaas
*   `ASAAS_CARD_TRANSACTION_FEE` - Taxa para transação efetuada com o cartão Asaas
*   `ASAAS_CARD_TRANSACTION_FEE_REFUND` - Estorno de taxa para transação efetuada com o cartão Asaas
*   `ASAAS_CARD_TRANSACTION_PARTIAL_REFUND` - Estorno parcial de transação efetuada com o cartão Asaas
*   `ASAAS_CARD_TRANSACTION_PARTIAL_REFUND_CANCELLATION` - Cancelamento do estorno parcial de transação efetuada com o cartão Asaas
*   `ASAAS_CARD_TRANSACTION_REFUND` - Estorno de transação efetuada com o cartão Asaas
*   `ASAAS_CARD_TRANSACTION_REFUND_CANCELLATION` - Cancelamento do estorno de transação efetuada com o cartão Asaas
*   `ASAAS_MONEY_PAYMENT_ANTICIPATION_FEE_REFUND` - Estorno taxa de Parcelamento ASAAS Money
*   `ASAAS_MONEY_PAYMENT_COMPROMISED_BALANCE` - Bloqueio de saldo comprometido com pagamento Asaas Money
*   `ASAAS_MONEY_PAYMENT_COMPROMISED_BALANCE_REFUND` - Cancelamento do bloqueio de saldo comprometido com pagamento Asaas Money
*   `ASAAS_MONEY_PAYMENT_FINANCING_FEE` - Taxa de financiamento ASAAS Money
*   `ASAAS_MONEY_PAYMENT_FINANCING_FEE_REFUND` - Estorno taxa de financiamento ASAAS Money
*   `ASAAS_MONEY_TRANSACTION_CASHBACK` - Cashback - ASAAS MONEY
*   `ASAAS_MONEY_TRANSACTION_CASHBACK_REFUND` - Estorno de cashback - ASAAS MONEY
*   `ASAAS_MONEY_TRANSACTION_CHARGEBACK` - Chargeback transação Asaas Money
*   `ASAAS_MONEY_TRANSACTION_CHARGEBACK_REVERSAL` - Estorno chargeback transação Asaas Money
*   `BILL_PAYMENT` - Pagamento de conta
*   `BILL_PAYMENT_CANCELLED` - Cancelamento do pagamento de conta
*   `BILL_PAYMENT_REFUNDED` - Estorno do pagamento de conta
*   `BILL_PAYMENT_FEE` - Taxa de pagamento de conta
*   `BILL_PAYMENT_FEE_CANCELLED` - Cancelamento da taxa de pagamento de conta
*   `CHARGEBACK` - Bloqueio de saldo devido ao chargeback de cobrança
*   `CHARGEBACK_REVERSAL` - Cancelamento do bloqueio de saldo devido ao chargeback
*   `CHARGED_FEE_REFUND` - Estorno da taxa para negativação da cobrança ou Pix
*   `CONTRACTUAL_EFFECT_SETTLEMENT` - Valor em recebíveis reservado
*   `CONTRACTUAL_EFFECT_SETTLEMENT_REVERSAL` - Estorno do valor em recebíveis reservado
*   `CREDIT` - Crédito
*   `CREDIT_BUREAU_REPORT` - Taxa de consulta Serasa
*   `CUSTOMER_COMMISSION_SETTLEMENT_CREDIT` - Crédito de liquidação de comissão de parceiros
*   `CUSTOMER_COMMISSION_SETTLEMENT_DEBIT` - Débito de liquidação de comissão de parceiros
*   `DEBIT` - Débito
*   `DEBIT_REVERSAL` - Estorno de débito
*   `DEBT_RECOVERY_NEGOTIATION_FINANCIAL_CHARGES` - Encargos sobre renegociação
*   `FREE_PAYMENT_USE` - Estorno por campanha promocional na tarifa
*   `INTERNAL_TRANSFER_CREDIT` - Transferência da conta Asaas
*   `INTERNAL_TRANSFER_DEBIT` - Transferência para a conta Asaas
*   `INTERNAL_TRANSFER_REVERSAL` - Estorno de transferência para a conta Asaas
*   `INVOICE_FEE` - Taxa de emissão da nota fiscal de serviço
*   `PARTIAL_PAYMENT` - Cobrança parcialmente recebida
*   `PAYMENT_DUNNING_CANCELLATION_FEE` - Taxa para cancelamento de negativação de cobrança
*   `PAYMENT_DUNNING_RECEIVED_FEE` - Taxa para negativação de cobrança
*   `PAYMENT_DUNNING_RECEIVED_IN_CASH_FEE` - Taxa para negativação em dinheiro de cobrança
*   `PAYMENT_DUNNING_REQUEST_FEE` - Taxa para negativação de cobrança
*   `PAYMENT_FEE` - Taxa de boleto, cartão ou Pix
*   `PAYMENT_FEE_REVERSAL` - Estorno da taxa de boleto, cartão ou Pix
*   `PAYMENT_MESSAGING_NOTIFICATION_FEE` - Taxa de mensageria de fatura
*   `PAYMENT_RECEIVED` - Cobrança recebida
*   `PAYMENT_CUSTODY_BLOCK` - Bloqueio de saldo por custódia
*   `PAYMENT_CUSTODY_BLOCK_REVERSAL` - Desbloqueio de saldo por custódia
*   `PAYMENT_REFUND_CANCELLED` - Cancelamento do estorno de fatura
*   `PAYMENT_REVERSAL` - Estorno de fatura
*   `PAYMENT_SMS_NOTIFICATION_FEE` - Taxa de notificação por SMS de cobrança
*   `PAYMENT_INSTANT_TEXT_MESSAGE_FEE` - Taxa de notificação por mensagem instantânea de cobrança
*   `PHONE_CALL_NOTIFICATION_FEE` - Taxa de notificação por voz
*   `PIX_TRANSACTION_CREDIT` - Transferência via Pix recebida
*   `PIX_TRANSACTION_CREDIT_FEE` - Taxa de transferência Pix recebida
*   `PIX_TRANSACTION_CREDIT_REFUND` - Estorno de recebimento via Pix
*   `PIX_TRANSACTION_CREDIT_REFUND_CANCELLATION` - Cancelamento de estorno de recebimento via Pix
*   `PIX_TRANSACTION_DEBIT` - Transação via Pix
*   `PIX_TRANSACTION_DEBIT_FEE` - Taxa para Pix
*   `PIX_TRANSACTION_DEBIT_REFUND` - Estorno de transação via Pix
*   `POSTAL_SERVICE_FEE` - Taxa de envio de boletos via Correios
*   `PRODUCT_INVOICE_FEE` - Taxa de emissão da nota fiscal de produto emitida via Base ERP
*   `CONSUMER_INVOICE_FEE` - Taxa de emissão da nota fiscal de consumidor emitida via Base ERP
*   `PROMOTIONAL_CODE_CREDIT` - Desconto na taxa
*   `PROMOTIONAL_CODE_DEBIT` - Estorno do desconto na taxa
*   `RECEIVABLE_ANTICIPATION_GROSS_CREDIT` - Antecipação de parcelamento ou cobrança
*   `RECEIVABLE_ANTICIPATION_DEBIT` - Baixa da parcela ou antecipação
*   `RECEIVABLE_ANTICIPATION_FEE` - Taxa de antecipação de parcelamento ou cobrança
*   `RECEIVABLE_ANTICIPATION_PARTNER_SETTLEMENT` - Baixa da parcela ou antecipação
*   `REFUND_REQUEST_CANCELLED` - Cancelamento do estorno de fatura
*   `REFUND_REQUEST_FEE` - Taxa de realização de estorno de fatura
*   `REFUND_REQUEST_FEE_REVERSAL` - Cancelamento da taxa de realização de estorno de fatura
*   `REVERSAL` - Estorno
*   `TRANSFER` - Transferência para conta bancária
*   `TRANSFER_FEE` - Taxa de transferência para conta bancária
*   `TRANSFER_REVERSAL` - Estorno de transferência para conta bancária
*   `MOBILE_PHONE_RECHARGE` - Recarga de celular
*   `REFUND_MOBILE_PHONE_RECHARGE` - Estorno de recarga de celular
*   `CANCEL_MOBILE_PHONE_RECHARGE` - Cancelamento de recarga de celular
*   `INSTANT_TEXT_MESSAGE_FEE` - Taxa de notificação por WhatsApp
*   `ASAAS_CARD_BALANCE_REFUND` - Estorno de cartão Asaas
*   `ASAAS_MONEY_PAYMENT_ANTICIPATION_FEE` - Taxa de Parcelamento ASAAS Money
*   `BACEN_JUDICIAL_LOCK` - Bloqueio Judicial
*   `BACEN_JUDICIAL_UNLOCK` - Desbloqueio Judicial
*   `BACEN_JUDICIAL_TRANSFER` - Transferência Judicial
*   `ASAAS_DEBIT_CARD_REQUEST_FEE` - Taxa de adesão do cartão Elo débito
*   `ASAAS_PREPAID_CARD_REQUEST_FEE` - Taxa de adesão do cartão Elo pré-pago
*   `EXTERNAL_SETTLEMENT_CONTRACTUAL_EFFECT_BATCH_CREDIT` - Crédito de valores para liquidação de efeitos de contrato
*   `EXTERNAL_SETTLEMENT_CONTRACTUAL_EFFECT_BATCH_REVERSAL` - Estorno de valores referentes a liquidação de efeitos de contrato
*   `ASAAS_CARD_BILL_PAYMENT` - Pagamento de fatura do cartão Asaas
*   `ASAAS_CARD_BILL_PAYMENT_REFUND` - Estorno de pagamento de fatura do cartão Asaas
*   `CHILD_ACCOUNT_KNOWN_YOUR_CUSTOMER_BATCH_FEE` - Taxa de criação de contas filhas
*   `CONTRACTED_CUSTOMER_PLAN_FEE` - Taxa da mensalidade do plano Asaas
*   `ACCOUNT_INACTIVITY_FEE` - Taxa de conta inativa

## Query Params

| Parâmetro | Tipo    | Descrição                               |
| :-------- | :------ | :-------------------------------------- |
| `offset`    | `integer` | Elemento inicial da lista               |
| `limit`     | `integer` | Número de elementos da lista (max: 100) |
| `startDate` | `string`  | Data inicial da lista                   |
| `finishDate`| `string`  | Data final da lista                     |
| `order`     | `string`  | Ordenação do resultado                  |

## Respostas

### 200 OK

### 400 Bad Request

### 401 Unauthorized

### 403 Forbidden
Ocorre quando o body da requisição está preenchido, chamadas de método GET precisam ter um body vazio.

## Exemplo de Requisição cURL

```bash
curl --request GET \
     --url https://api-sandbox.asaas.com/v3/financialTransactions \
     --header 'accept: application/json'
```
