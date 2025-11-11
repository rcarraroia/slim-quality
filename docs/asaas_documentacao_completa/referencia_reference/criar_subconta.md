# Criar subconta

# Criar subconta

O objeto de retorno da API conterá a chave de API da subconta criada (`apiKey`) além do `walletId` para Split de Cobranças ou Transferências.

A chave de API (`apiKey`) será devolvida uma única vez, na resposta da chamada de criação da subconta Asaas, portanto, assegure-se de gravar a informação nesse momento. Caso não tenha realizado o armazenamento, entre em contato com nosso Suporte Técnico.

> 🚧
> 
> Em Sandbox só é possível criar 20 subcontas por dia, caso a conta atinja o limite diário receberá uma notificação de erro.
> 
> Além disso, todas as comunicações de subcontas em Sandbox serão enviadas para o e-mail da conta raiz. O dono da subconta recebe notificações.

> 🚧
> 
> O `postalCode` informado precisa ser válido, pois fazemos o cadastro da cidade através dele. Caso não seja localizado, será retornado um erro `400` avisando que a cidade precisa ser informada

> ❗️
> 
> O envio da renda (PF) ou faturamento mensal (PJ) através do campo `incomeValue` nos endpoints de Atualização de Dados Comerciais (`/v3/myAccount/commercialInfo`) e Criação de Subcontas (`/v3/accounts`) passará a ser obrigatório e você precisa atualizar sua integração para que as chamadas sejam enviadas com essa informação.
> 
> A partir do dia 30/05/24, chamadas para estes endpoints sem essa informação retornarão erro, indicando que o campo é obrigatório.

> ❗️
> 
> Lembre-se que, anualmente, os dados comerciais da subconta (como telefone, e-mail, endereço, renda/faturamento e atividade) precisarão ser confirmados ou atualizados. Este é um requisito regulatório. Veja detalhes completos na seção **[Confirmação Anual de Dados Comerciais para Subcontas]()** em nosso Guia.

name

string

required

Nome da subconta

email

string

required

Email da subconta

loginEmail

string

Email para login da subconta, caso não informado será utilizado o email da subconta

cpfCnpj

string

required

CPF ou CNPJ do proprietário da subconta

birthDate

date

Data de nascimento (somente quando Pessoa Física)

companyType

string

enum

Tipo da empresa (somente quando Pessoa Jurídica)

Allowed:

`MEI``LIMITED``INDIVIDUAL``ASSOCIATION`

phone

string

Telefone Fixo

mobilePhone

string

required

Telefone Celular

site

string

URL of the subbacount website

incomeValue

number

required

Faturamento/Renda mensal

address

string

required

Logradouro

addressNumber

string

required

Número do endereço

complement

string

Complemento do endereço

province

string

required

Bairro

postalCode

string

required

CEP do endereço

webhooks

array of objects

Array com as configurações de Webhooks desejadas

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

     \--url https://api-sandbox.asaas.com/v3/accounts \\

     \--header 'accept: application/json' \\

     \--header 'content-type: application/json'

Click `Try It!` to start a request and see the response here! Or choose an example:

application/json

200400401