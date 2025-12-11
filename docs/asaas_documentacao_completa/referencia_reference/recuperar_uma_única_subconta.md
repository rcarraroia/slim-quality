# Recuperar uma única subconta

# Recuperar uma única subconta

**Método:** `GET`

**URL:** `https://api-sandbox.asaas.com/v3/accounts/{id}`

## Path Params

| Parâmetro | Tipo   | Obrigatório | Descrição                               |
| :-------- | :----- | :---------- | :-------------------------------------- |
| `id`      | string | sim         | Identificador único da subconta no Asaas |

## Responses

### 200 OK

### 400 Bad Request

### 401 Unauthorized

### 403 Forbidden

Ocorre quando o body da requisição está preenchido, chamadas de método GET precisam ter um body vazio.

### 404 Not found

## cURL Request

```bash
curl --request GET \
     --url https://api-sandbox.asaas.com/v3/accounts/id \
     --header 'accept: application/json'
```

## Headers

| Parâmetro      | Descrição           |
| :------------- | :------------------ |
| `access_token` | Token de acesso da API |

*Atualizado há 28 dias atrás*