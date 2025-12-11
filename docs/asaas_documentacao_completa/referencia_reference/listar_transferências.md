# Listar transferências

# Listar transferências

Este método retorna uma lista paginada com todas as transferências para o filtro informado.

## Exemplo de filtro

Filtrar por data de criação: `GET https://api.asaas.com/v3/transfers?dateCreated=2019-05-02`




## Query Params
| Parâmetro | Tipo | Descrição |
|---|---|---|
| `dateCreated[ge]` | `string` | Filtrar pela data de criação inicial |
| `dateCreated[le]` | `string` | Filtrar pela data de criação final |
| `transferDate[ge]` | `string` | Filtrar pela data inicial de efetivação de transferência |
| `transferDate[le]` | `string` | Filtrar pela data final de efetivação de transferência |
| `type` | `string` | Filtrar por tipo da transferência |

# Respostas

## 200 OK

## 400 Bad Request

## 401 Unauthorized

## 403 Forbidden
Ocorre quando o body da requisição está preenchido, chamadas de método GET precisam ter um body vazio.