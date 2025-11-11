# Listar cobranças

# Listar cobranças

Diferente da recuperação de uma cobrança específica, este método retorna uma lista paginada com todas as cobranças para os filtros informados.

Listar cobranças de um cliente específico: `GET https://api.asaas.com/v3/payments?customer={customer_id}`

Filtrar por forma de pagamento: `GET https://api.asaas.com/v3/payments?billingType=CREDIT_CARD`

Filtrar por status: `GET https://api.asaas.com/v3/payments?status=RECEIVED`

Filtrar por status e forma de pagamento: `GET https://api.asaas.com/v3/payments?status=RECEIVED&billingType=CREDIT_CARD`

Filtrar por data de criação inicial e final: `GET https://api.asaas.com/v3/payments?dateCreated%5Bge%5D=2017-01-12&dateCreated%5Ble%5D=2017-11-28`

Filtrar por data de vencimento inicial e final: `GET https://api.asaas.com/v3/payments?dueDate%5Bge%5D=2017-01-12&dueDate%5Ble%5D=2017-11-28`

Filtrar por data de recebimento inicial e final: `GET https://api.asaas.com/v3/payments?paymentDate%5Bge%5D=2017-01-12&paymentDate%5Ble%5D=2017-11-28`

Filtrar apenas cobranças antecipadas: `GET https://api.asaas.com/v3/payments?anticipated=true`

Filtrar apenas cobranças antecipáveis: `GET https://api.asaas.com/v3/payments?anticipable=true`

> ❗️
> 
> Polling é a prática de realizar sucessivas requisições `GET` para verificar status de cobranças. É considerado uma má prática devido ao alto consumo de recursos que ocasiona. Recomendamos que você utilize nossos Webhooks para receber mudanças de status de cobranças e manter sua aplicação atualizada.
> 
> Realizar muitas requisições pode levar ao [bloqueio da sua chave de API]() por abuso.
> 
> Leia mais: [Polling vs. Webhooks]()

installment

string

Filtrar pelo Identificador único do parcelamento

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

Allowed:

`UNDEFINED``BOLETO``CREDIT_CARD``PIX`

status

string

enum

Filtrar por status

Show 14 enum values

subscription

string

Filtrar pelo Identificador único da assinatura

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

Allowed:

`SCHEDULED``AUTHORIZED``PROCESSING_CANCELLATION``CANCELED``CANCELLATION_DENIED``ERROR`

estimatedCreditDate

string

Filtrar pela data estimada de crédito

pixQrCodeId

string

Filtrar recebimentos originados de um QrCode estático utilizando o id gerado na hora da criação do QrCode

anticipated

boolean

Filtrar registros antecipados ou não

anticipable

boolean

Filtrar registros antecipaveis ou não

dateCreated\[ge\]

string

Filtrar a partir da data de criação inicial

dateCreated\[le\]

string

Filtrar até a data de criação final

paymentDate\[ge\]

string

Filtrar a partir da data de recebimento inicial

paymentDate\[le\]

string

Filtrar até a data de recebimento final

estimatedCreditDate\[ge\]

string

Filtrar a partir da data estimada de crédito inicial

estimatedCreditDate\[le\]

string

Filtrar até a data estimada de crédito final

dueDate\[ge\]

string

Filtrar a partir da data de vencimento inicial

dueDate\[le\]

string

Filtrar até a data de vencimento final

user

string

Filtrar pelo endereço de e-mail do usuário que criou a cobrança

# 

200

OK

# 

400

Bad Request

# 

401

Unauthorized

403

Forbidden. Ocorre quando o body da requisição está preenchido, chamadas de método GET precisam ter um body vazio.

Updated 28 days ago

Did this page help you?

Yes

No

ShellNodeRubyPHPPython

xxxxxxxxxx

curl \--request GET \\

     \--url https://api-sandbox.asaas.com/v3/payments \\

     \--header 'accept: application/json'

Click `Try It!` to start a request and see the response here! Or choose an example:

application/json

200400401