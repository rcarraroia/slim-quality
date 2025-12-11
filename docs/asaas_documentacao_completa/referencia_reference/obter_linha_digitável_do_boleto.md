# Obter linha digitável do boleto

# Obter linha digitável do boleto

A linha digitável do boleto é a representação numérica do código de barras. Essa informação pode ser disponibilizada ao seu cliente para pagamento do boleto diretamente no Internet Banking. Ao gerar uma cobrança com as formas de pagamento `BOLETO` ou `UNDEFINED`, a linha digitável pode ser recuperada.

Para recuperar a linha digitável do boleto, é necessário informar o ID da cobrança que o Asaas retornou no momento da criação. Como retorno, você receberá a linha digitável.

> 🚧
> 
> Caso a cobrança seja atualizada, a linha digitável também sofrerá alterações. O indicado é que a cada nova atualização da cobrança a linha digitável seja novamente recuperada, garantindo que você sempre estará exibindo a linha digitável atualizada.

id

string

required

Identificador único da cobrança no Asaas

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

404

Not found

Updated 28 days ago

Did this page help you?

Yes

No

ShellNodeRubyPHPPython

xxxxxxxxxx

curl \--request GET \\

     \--url https://api-sandbox.asaas.com/v3/payments/id/identificationField \\

     \--header 'accept: application/json'

Click `Try It!` to start a request and see the response here! Or choose an example:

application/json

200400401