# Pagar uma cobrança com cartão de crédito

# Pagar uma cobrança com cartão de crédito

Este endpoint paga uma cobrança com o cartão de crédito informado na hora que você chamá-lo.

> 🚧
> 
> **Não é possível agendar um pagamento.**

id

string

required

Identificador único da cobrança no Asaas

creditCard

object

required

Informações do cartão de crédito

creditCard object

creditCardHolderInfo

object

required

Informações do titular do cartão de crédito

creditCardHolderInfo object

creditCardToken

string

Token do cartão de crédito para uso da funcionalidade de tokenização de cartão de crédito. Caso informado, os campos acima não são obrigatórios.

# 

200

OK

# 

400

Bad Request

# 

401

Unauthorized

404

Not found

Updated 28 days ago

Did this page help you?

Yes

No

ShellNodeRubyPHPPython

xxxxxxxxxx

curl \--request POST \\

     \--url https://api-sandbox.asaas.com/v3/payments/id/payWithCreditCard \\

     \--header 'accept: application/json' \\

     \--header 'content-type: application/json'

Click `Try It!` to start a request and see the response here!

application/json

200400401