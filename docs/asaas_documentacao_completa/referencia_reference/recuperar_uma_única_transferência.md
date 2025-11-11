# Recuperar uma única transferência

# Recuperar uma única transferência

**URL:** https://docs.asaas.com/reference/recuperar-uma-unica-transferencia

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
Transferir para conta de outra Instituição ou chave Pix
POST
Listar transferências
GET
Transferir para conta Asaas
POST
Recuperar uma única transferência
GET
Cancelar uma transferência
DEL
Guia de transferências
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
Recuperar uma única transferência
GET
https://api-sandbox.asaas.com/v3/transfers/{id}
Path Params
id
string
required

Identificador único da transferência no Asaas

Responses
200

OK

400

Bad Request

401

Unauthorized

403

Forbidden. Ocorre quando o body da requisição está preenchido, chamadas de método GET precisam ter um body vazio.

404

Not found

Updated 28 days ago

Transferir para conta Asaas
Cancelar uma transferência
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
     --url https://api-sandbox.asaas.com/v3/transfers/id \
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