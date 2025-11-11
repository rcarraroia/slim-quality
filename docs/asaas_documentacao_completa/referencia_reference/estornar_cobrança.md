# Estornar cobrança

# Estornar cobrança

**URL:** https://docs.asaas.com/reference/estornar-cobranca

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
Listar estornos de uma cobrança
GET
Estornar boleto
POST
Estornar parcelamento
POST
Estornar cobrança com dados resumidos na resposta
POST
Estornar cobrança
POST
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
Estornar cobrança
POST
https://api-sandbox.asaas.com/v3/payments/{id}/refund
Guia de Estornos

Confira o guia de estornos para mais informações.

É possível estornar cobranças via cartão de crédito recebidas ou confirmadas. Ao fazer isto o saldo correspondente é debitado de sua conta no Asaas e a cobrança cancelada no cartão do seu cliente. O cancelamento pode levar até 10 dias úteis para aparecer na fatura de seu cliente. Cobranças recebidas via Pix, permitem o estorno integral ou vários estornos parciais. A soma desses estornos não poderão ultrapassar o valor total da cobrança recebida.

🚧
Atenção

Caso não seja informado nenhum valor, será utilizado o valor integral da cobrança.

🚧
Atenção

As taxas referentes à cobrança como a de compensação e de notificação não são devolvidas em caso de estorno. Portanto, caso você tenha acabado de receber uma cobrança em Pix e tente estornar o valor total, retornará 400 e será necessário aumentar o próprio saldo para conseguir o estorno total.

Path Params
id
string
required

Identificador único da cobrança no Asaas

Body Params
value
number

Valor a ser estornado

description
string

Motivo do estorno

Responses
200

OK

400

Bad Request

401

Unauthorized

404

Not found

Updated 28 days ago

Estornar cobrança com dados resumidos na resposta
Splits
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
     --url https://api-sandbox.asaas.com/v3/payments/id/refund \
3
     --header 'accept: application/json' \
4
     --header 'content-type: application/json'
Try It!
RESPONSE
Examples
Click Try It! to start a request and see the response here! Or choose an example:
application/json
200
400
401