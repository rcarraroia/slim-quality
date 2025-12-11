# Listar negativações

# Listar negativações

**URL:** https://docs.asaas.com/reference/listar-negativacoes

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
Criar uma negativação
POST
Listar negativações
GET
Simular uma negativação
POST
Recuperar uma única negativação
GET
Listar histórico de eventos
GET
Listar pagamentos recebidos
GET
Listar cobranças disponíveis para negativação
GET
Reenviar documentos
POST
Cancelar negativação
POST
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
Listar negativações
GET
https://api-sandbox.asaas.com/v3/paymentDunnings
Query Params
offset
integer

Elemento inicial da lista

limit
integer
≤ 100

Número de elementos da lista (max: 100)

status
string
enum

Filtrar por status da negativação

PENDING
PENDING
AWAITING_APPROVAL
AWAITING_CANCELLATION
PROCESSED
PAID
PARTIALLY_PAID
DENIED
CANCELLED
Show 8 enum values
type
string
enum

Filtrar por tipo de negativação

CREDIT_BUREAU
CREDIT_BUREAU
DEBT_RECOVERY_ASSISTANCE
Allowed:
CREDIT_BUREAU
DEBT_RECOVERY_ASSISTANCE
payment
string

Filtrar por negativações de uma determinada cobrança

requestStartDate
string

Filtrar a partir da data de solicitação inicial

requestEndDate
string

Filtrar a partir da data de solicitação final

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

Criar uma negativação
Simular uma negativação
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
     --url https://api-sandbox.asaas.com/v3/paymentDunnings \
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