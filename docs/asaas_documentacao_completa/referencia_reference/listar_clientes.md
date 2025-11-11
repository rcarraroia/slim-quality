# Listar clientes

# Listar clientes
Diferente da recuperação de um cliente específico, este método retorna uma lista paginada com todos os clientes para os filtros informados.

Filtrar por nome:

GET https://api.asaas.com/v3/customers?name=Marcelo

Filtrar por CPF ou CNPJ:

GET https://api.asaas.com/v3/customers?cpfCnpj=42885229519

Query Params
offset
integer

Elemento inicial da lista

limit
integer
≤ 100

Número de elementos da lista (max: 100)

name
string

Filtrar por nome

email
string

Filtrar por email

cpfCnpj
string

Filtrar por CPF ou CNPJ

groupName
string

Filtrar por grupo

externalReference
string

Filtrar pelo Identificador do seu sistema

Responses
200

OK

400

Bad Request

401

Unauthorized

403 Forbidden. Ocorre quando o body da requisição está preenchido, chamadas de método GET precisam ter um body vazio.
