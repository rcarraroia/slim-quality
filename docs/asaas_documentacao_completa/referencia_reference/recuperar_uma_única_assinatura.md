# Recuperar uma única assinatura

# Recuperar uma única assinatura

Para recuperar uma assinatura específica é necessário que você tenha o ID que o Asaas retornou no momento da criação dela.

Para recuperar as cobranças de uma assinatura utilize [Listar cobranças de uma assinatura]().

id

string

required

Identificador único da assinatura no Asaas

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

     \--url https://api-sandbox.asaas.com/v3/subscriptions/id \\

     \--header 'accept: application/json'

Click `Try It!` to start a request and see the response here! Or choose an example:

application/json

200400401