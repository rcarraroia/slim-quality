# Listar antecipações

# Listar antecipações

**URL:** https://docs.asaas.com/reference/listar-antecipacoes

---

Diferente da recuperação de uma antecipação específica, este método retorna uma lista paginada com todos as antecipações para o filtro informado.

### Exemplo de Filtro por Status

`GET https://api.asaas.com/v3/anticipations?status=PENDING`

## Parâmetros de Consulta (Query Params)

| Parâmetro   | Tipo    | Descrição                                    | Restrições/Valores Permitidos |
|-------------|---------|----------------------------------------------|-------------------------------|
| `offset`    | integer | Elemento inicial da lista                    |                               |
| `limit`     | integer | Número de elementos da lista (máx: 100)      | ≤ 100                         |
| `payment`   | string  | Filtrar antecipações de uma cobrança         |                               |
| `installment`| string  | Filtrar antecipações de um parcelamento      |                               |
| `status`    | string  | Filtrar por status                           | `PENDING`, `DENIED`, `CREDITED`, `DEBITED`, `CANCELLED`, `OVERDUE`, `SCHEDULED` |

## Respostas

### 200 OK

### 400 Bad Request

### 401 Unauthorized

### 403 Forbidden
Ocorre quando o body da requisição está preenchido, chamadas de método GET precisam ter um body vazio.