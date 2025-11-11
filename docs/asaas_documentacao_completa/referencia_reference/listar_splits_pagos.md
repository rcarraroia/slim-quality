# Listar splits pagos

# Listar splits pagos

**URL:** https://docs.asaas.com/reference/listar-splits-pagos

---

Query Params

**offset**

integer

Elemento inicial da lista

**limit**

integer

≤ 100

Número de elementos da lista (max: 100)

**paymentId**

string

Filtrar pelo ID da cobrança

**status**

string

enum

Filtrar por status

Allowed:

`PENDING`
`PROCESSING`
`AWAITING_CREDIT`
`CANCELLED`
`DONE`
`REFUNDED`
`BLOCKED_BY_VALUE_DIVERGENCE`

**paymentConfirmedDate[ge]**

string

Filtrar a partir da data de confirmação da cobrança inicial

**paymentConfirmedDate[le]**

string

Filtrar a partir da data de confirmação da cobrança final

**creditDate[ge]**

string

Filtrar a partir da data de envio do split inicial

**creditDate[le]**

string

Filtrar a partir da data de envio do split final

Responses

**200**

OK

**400**

Bad Request

**401**

Unauthorized

**403**

Forbidden. Ocorre quando o body da requisição está preenchido, chamadas de método GET precisam ter um body vazio.

ShellNodeRubyPHPPython

xxxxxxxxxx

curl \--request GET \\

     \--url https://api-sandbox.asaas.com/v3/payments/splits/paid \\

     \--header 'accept: application/json'

Click `Try It!` to start a request and see the response here! Or choose an example:

application/json

200

400

401