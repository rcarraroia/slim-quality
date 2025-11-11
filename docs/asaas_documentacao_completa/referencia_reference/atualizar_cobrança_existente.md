# Atualizar cobrança existente

# Atualizar cobrança existente

Somente é possível atualizar cobranças aguardando pagamento ou vencidas. Uma vez criada, não é possível alterar o cliente ao qual a cobrança pertence.

Só é permitido alterar splits de cobranças feitas com cartão de crédito ou débito.

A data máxima para realizar a alteração é até 1 dia útil antes da data prevista de pagamento.

É permitido alterar apenas cobranças com status `CONFIRMED` e que não possui antecipação.

A única exceção às regras anteriores ocorre quando há um bloqueio por divergência de split no momento do recebimento da cobrança. Nesse caso, será permitida a atualização do split para cobranças com os status `CONFIRMED`, `RECEIVED` e mesmo no caso da cobrança possuir antecipação. Contudo, não será permitido atualizar nenhum outro campo além do split.

Nos casos de antecipação automática com split configurado por valor fixo na emissão da cobrança, o cálculo do split considerará a taxa mais alta aplicável ao cartão de crédito utilizado.

id

string

required

Identificador único da cobrança no Asaas

billingType

string

enum

required

Forma de pagamento

Allowed:

`UNDEFINED``BOLETO``CREDIT_CARD``PIX`

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

postalService

boolean

Define se a cobrança será enviada via Correios

split

array of objects

Configurações do split

ADD object

callback

object

Informações de redirecionamento automático após pagamento do link de pagamento

callback object

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

curl \--request PUT \\

     \--url https://api-sandbox.asaas.com/v3/payments/id \\

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