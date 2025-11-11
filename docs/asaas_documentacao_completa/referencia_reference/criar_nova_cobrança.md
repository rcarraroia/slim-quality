# Criar nova cobrança

# Criar nova cobrança

É possível escolher entre as formas de pagamento com boleto, cartão de crédito, Pix ou permitir que o cliente escolha a forma que desejar.

> 📘
> 
> Não é possível gerar uma cobrança com dois billingTypes diferentes (`PIX` e `CREDIT_CARD`, por exemplo).
> 
> Caso não queira receber pagamento em Pix ou em Cartão de débito, é possível desabilitar dentro de sua interface em `Minha Conta > Configuração > Configurações do Sistema`.
> 
> Caso queira desabilitar em subcontas white label, [entre em contato]() com o nosso time de integração.

> 🚧
> 
> O status `CONFIRMED` pode ficar disponível em cobranças Pix de contas de pessoas físicas em caso de cobranças que sofram bloqueio cautelar e que precisam de análise da área de prevenção. O prazo máximo de bloqueio é de 72h e a cobrança mudará para o status `RECEIVED` se recebida ou `REFUNDED` caso negada.

> 🚧
> 
> Este atributo define quantos dias após o vencimento o boleto poderá continuar sendo pago. É essencial preencher este valor com atenção para evitar problemas no recebimento das cobranças.
> 
> *   Se for informado "0", o registro do boleto será automaticamente cancelado assim que o status da cobrança mudar para vencido (OVERDUE), não podendo ser paga após essa data.
> *   Caso o atributo não seja preenchido, será considerado o prazo de registro padrão.
> *   Este atributo não pode ser alterado após a criação da cobrança. Caso seja necessário mudar o fator de cancelamento do registro, será preciso emitir um novo boleto.
> *   Esta funcionalidade é válida apenas para Boletos. Para cobranças via Pix ou Cartão de Crédito, o atributo não será aplicado.

> ❗️
> 
> Para cobranças avulsas (1x) não deve-se usar os atributos do parcelamento: **`installmentCount`**, **`installmentValue`** e **`totalValue`**. Se for uma cobrança em 1x, usa-se apenas o **`value`**.
> 
> **Somente cobranças com 2 ou mais parcelas usa-se os atributos do parcelamento.**

customer

string

required

Identificador único do cliente no Asaas

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

Updated 28 days ago

Did this page help you?

Yes

No

ShellNodeRubyPHPPython

xxxxxxxxxx

curl \--request POST \\

     \--url https://api-sandbox.asaas.com/v3/payments \\

     \--header 'accept: application/json' \\

     \--header 'content-type: application/json' \\

     \--data 

{

  "billingType": "UNDEFINED"

}



Click `Try It!` to start a request and see the response here! Or choose an example:

application/json

200400401