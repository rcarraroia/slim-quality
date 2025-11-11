# Criar cobrança com cartão de crédito com dados resumidos na resposta

# Criar cobrança com cartão de crédito com dados resumidos na resposta

**URL:** https://docs.asaas.com/reference/criar-cobranca-com-cartao-de-credito-com-dados-resumidos-na-resposta

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
Criar cobrança com cartão de crédito com dados resumidos na resposta
POST
https://api-sandbox.asaas.com/v3/lean/payments/
Body Params
customer
string
required

Identificador único do cliente no Asaas

billingType
string
enum
required

Forma de pagamento

UNDEFINED
BOLETO
CREDIT_CARD
PIX
Allowed:
UNDEFINED
BOLETO
CREDIT_CARD
PIX
value
number
required

Valor da cobrança

dueDate
date
required

Data de vencimento da cobrança

description
string

Descrição da cobrança (máx. 500 caracteres)

daysAfterDueDateToRegistrationCancellation
int32

Dias após o vencimento para cancelamento do registro (somente para boleto bancário)

externalReference
string

Campo livre para busca

installmentCount
int32

Número de parcelas (somente no caso de cobrança parcelada)

totalValue
number

Informe o valor total de uma cobrança que será parcelada (somente no caso de cobrança parcelada). Caso enviado este campo o installmentValue não é necessário, o cálculo por parcela será automático.

installmentValue
number

Valor de cada parcela (somente no caso de cobrança parcelada). Envie este campo em caso de querer definir o valor de cada parcela.

discount
object

Informações de desconto

DISCOUNT OBJECT
interest
object

Informações de juros para pagamento após o vencimento

INTEREST OBJECT
fine
object

Informações de multa para pagamento após o vencimento

FINE OBJECT
postalService
boolean

Define se a cobrança será enviada via Correios

false
true
false
split
array of objects

Configurações do split

ADD OBJECT
callback
object

Informações de redirecionamento automático após pagamento do link de pagamento

CALLBACK OBJECT
creditCard
object

Informações do cartão de crédito

CREDITCARD OBJECT
creditCardHolderInfo
object

Informações do titular do cartão de crédito

CREDITCARDHOLDERINFO OBJECT
creditCardToken
string

Token do cartão de crédito para uso da funcionalidade de tokenização de cartão de crédito

authorizeOnly
boolean

Realizar apenas a Pré-Autorização da cobrança

true
false
remoteIp
string
required

IP de onde o cliente está fazendo a compra. Não deve ser informado o IP do seu servidor.

Responses
200

OK

400

Bad Request

401

Unauthorized

Updated 28 days ago

Listar cobranças com dados resumidos
Capturar cobrança com Pré-Autorização com dados resumidos na resposta
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
Examples
1
curl --request POST \
2
     --url https://api-sandbox.asaas.com/v3/lean/payments/ \
3
     --header 'accept: application/json' \
4
     --header 'content-type: application/json' \
5
     --data '
6
{
7
  "billingType": "UNDEFINED"
8
}
9
'
Try It!
RESPONSE
Examples
Click Try It! to start a request and see the response here! Or choose an example:
application/json
200
400
401