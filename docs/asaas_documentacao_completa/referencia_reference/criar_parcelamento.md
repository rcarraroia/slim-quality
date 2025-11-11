# Criar parcelamento

# Criar parcelamento

> 🚧
> 
> *   É permitido a criação de parcelamentos no **cartão de crédito** em **até 21x para cartões de bandeira Visa e Master.**
> 
> Anteriormente, era suportado parcelamentos de até 12 parcelas para todas as bandeiras.  
> **Para outras bandeiras, exceto Visa e Master, o limite continua sendo de 12 parcelas.**

  

> ❗️
> 
> Para cobranças avulsas (1x) não deve-se usar os atributos do parcelamento: **`installmentCount`**, **`installmentValue`** e **`totalValue`**. Se for uma cobrança em 1x, usa-se apenas o **`value`**.
> 
> **Somente cobranças com 2 ou mais parcelas usa-se os atributos do parcelamento.**
> 
> Para cobranças avulsa, usar o endpoint **`/v3/payments`** de [criar cobrança]().

installmentCount

int32

required

Número de parcelas

customer

string

required

Identificador único do cliente no Asaas

value

number

required

Valor de cada parcela

totalValue

number

Valor total do parcelamento

billingType

string

enum

required

Forma de pagamento

Allowed:

`UNDEFINED``BOLETO``CREDIT_CARD``PIX`

dueDate

date

required

Data de vencimento da primeira parcela

description

string

Descrição do parcelamento (máx. 500 caracteres)

postalService

boolean

Define se a cobrança será enviada via Correios

daysAfterDueDateToRegistrationCancellation

int32

Dias após o vencimento para cancelamento do registro (somente para boleto bancário)

paymentExternalReference

string

Campo livre para busca

discount

object

Informações de desconto

discount object

interest

object

Informações de juros para pagamento após o vencimento

interest object

fine

object

Informações de multa para pagamento após o vencimento

fine object

splits

array of objects

Configurações do split

ADD object

# 

200

OK

# 

400

Bad Request

# 

401

Unauthorized

Updated 28 days ago

Did this page help you?

Yes

No

ShellNodeRubyPHPPython

xxxxxxxxxx

curl \--request POST \\

     \--url https://api-sandbox.asaas.com/v3/installments \\

     \--header 'accept: application/json' \\

     \--header 'content-type: application/json' \\

     \--data '

{

  "billingType": "UNDEFINED"

}

'

Click `Try It!` to start a request and see the response here! Or choose an example:

application/json

200400401