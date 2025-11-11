# Listar cobranças com dados resumidos

# Listar cobranças com dados resumidos

**URL:** https://docs.asaas.com/reference/listar-cobrancas-com-dados-resumidos

---

Jump to Content
Discord
Status
Log In
v3
Home
Guias / Guides
Referência / Reference
Changelog
Breaking changes
Sugestões
Search
CTRL-K
JUMP TO
CTRL-/
SELECT YOUR LANGUAGE
Português 🇧🇷
English 🇺🇸
INTRODUÇÃO
Comece por aqui
Como testar as chamadas aqui na documentação
Autenticação
Códigos HTTP das respostas
Listagem e paginação
Limites da API
Guia de Webhooks
Guia de Sandbox
ASAAS
Cobranças
Ações em sandbox
Cobranças com dados resumidos
Criar nova cobrança com dados resumidos na resposta
POST
Listar cobranças com dados resumidos
GET
Criar cobrança com cartão de crédito com dados resumidos na resposta
POST
Capturar cobrança com Pré-Autorização com dados resumidos na resposta
POST
Recuperar uma única cobrança com dados resumidos
GET
Atualizar cobrança existente com dados resumidos na resposta
PUT
Excluir cobrança com dados resumidos
DEL
Restaurar cobrança removida com dados resumidos na resposta
POST
Confirmar recebimento em dinheiro com dados resumidos na resposta
POST
Desfazer confirmação de recebimento em dinheiro com dados resumidos na resposta
POST
Cartão de crédito
Estornos
Splits
Conta Escrow
Documentos de cobranças
Clientes
Notificações
Parcelamentos
Assinaturas
Pix
Transações Pix
Pix Recorrente
Link de pagamentos
Checkout
Transferências
Antecipações
Negativações
Pagamento de contas
Recargas de celular
Consulta Serasa
Extrato
Informações financeiras
Informações e personalização da conta
Notas fiscais
Informações fiscais
Configurações de Webhooks
Subcontas Asaas
Envio de documentos White Label
Chargeback
ENGLISH REFERENCE
Getting started
How to test API calls in our documentation
HTTP response codes
Listing and Pagination
API limits
Webhooks guide
Sandbox guide
Payment
Sandbox Actions
Payment with summary data
Credit Card
Payment Refund
Payment Split
Escrow Account
Payment Document
Customer
Notification
Installment
Subscription
Pix
Pix Transaction
Recurring Pix
Payment Link
Checkout
Transfer
Anticipation
Payment Dunning
Bill
Mobile Phone Recharge
Credit Bureau Report
Financial Transaction
Finance
Account info
Invoice
Fiscal Info
Webhook
Subaccount
Account Document
Chargeback
Powered by 
Ask AI
Listar cobranças com dados resumidos
GET
https://api-sandbox.asaas.com/v3/lean/payments
Query Params
offset
integer

Elemento inicial da lista

limit
integer
≤ 100

Número de elementos da lista (max: 100)

customer
string

Filtrar pelo Identificador único do cliente

customerGroupName
string

Filtrar pelo nome do grupo de cliente

billingType
string
enum

Filtrar por forma de pagamento

UNDEFINED
UNDEFINED
BOLETO
CREDIT_CARD
PIX
Allowed:
UNDEFINED
BOLETO
CREDIT_CARD
PIX
status
string
enum

Filtrar por status

PENDING
PENDING
RECEIVED
CONFIRMED
OVERDUE
REFUNDED
RECEIVED_IN_CASH
REFUND_REQUESTED
REFUND_IN_PROGRESS
CHARGEBACK_REQUESTED
CHARGEBACK_DISPUTE
AWAITING_CHARGEBACK_REVERSAL
DUNNING_REQUESTED
DUNNING_RECEIVED
AWAITING_RISK_ANALYSIS
Show 14 enum values
subscription
string

Filtrar pelo Identificador único da assinatura

installment
string

Filtrar pelo Identificador único do parcelamento

externalReference
string

Filtrar pelo Identificador do seu sistema

paymentDate
string

Filtrar pela data de pagamento

invoiceStatus
string
enum

Filtro para retornar cobranças que possuem ou não nota fiscal

SCHEDULED
SCHEDULED
AUTHORIZED
PROCESSING_CANCELLATION
CANCELED
CANCELLATION_DENIED
ERROR
Allowed:
SCHEDULED
AUTHORIZED
PROCESSING_CANCELLATION
CANCELED
CANCELLATION_DENIED
ERROR
estimatedCreditDate
string

Filtrar pela data estimada de crédito

pixQrCodeId
string

Filtrar recebimentos originados de um QrCode estático utilizando o id gerado na hora da criação do QrCode

anticipated
boolean

Filtrar registros antecipados ou não

true
false
anticipable
boolean

Filtrar registros antecipaveis ou não

true
false
dateCreated[ge]
string

Filtrar a partir da data de criação inicial

dateCreated[le]
string

Filtrar até a data de criação final

paymentDate[ge]
string

Filtrar a partir da data de recebimento inicial

paymentDate[le]
string

Filtrar até a data de recebimento final

estimatedCreditDate[ge]
string

Filtrar a partir da data estimada de crédito inicial

estimatedCreditDate[le]
string

Filtrar até a data estimada de crédito final

dueDate[ge]
string

Filtrar a partir da data de vencimento inicial

dueDate[le]
string

Filtrar até a data de vencimento final

user
string

Filtrar pelo endereço de e-mail do usuário que criou a cobrança

Responses
200

OK

400

Bad Request

401

Unauthorized

403

Forbidden. Ocorre quando o body da requisição está preenchido, chamadas de método GET precisam ter um body vazio.

Updated 28 days ago

Criar nova cobrança com dados resumidos na resposta
Criar cobrança com cartão de crédito com dados resumidos na resposta
Did this page help you?
Yes
No
LANGUAGE
Shell
Node
Ruby
PHP
Python
CREDENTIALS
HEADER
Header
cURL Request
1
curl --request GET \
2
     --url https://api-sandbox.asaas.com/v3/lean/payments \
3
     --header 'accept: application/json'
Try It!
RESPONSE
Examples
Click Try It! to start a request and see the response here! Or choose an example:
application/json
200
400
401