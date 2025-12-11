# Recuperar uma única recarga de celular

# Recuperar uma única recarga de celular

**URL:** https://docs.asaas.com/reference/recuperar-uma-unica-recarga-de-celular

## Path Params

| Parâmetro | Tipo   | Requerido | Descrição                                  |
| :-------- | :----- | :-------- | :----------------------------------------- |
| `id`      | string | sim       | Identificador único da recarga de celular no Asaas |

## Respostas

### 200 OK

### 400 Bad Request

### 401 Unauthorized

### 403 Forbidden

Ocorre quando o body da requisição está preenchido, chamadas de método GET precisam ter um body vazio.

### 404 Not found

## cURL Request

```bash
curl --request GET \
     --url https://api-sandbox.asaas.com/v3/mobilePhoneRecharges/{id} \
     --header 'accept: application/json'
```

## Credenciais

### Header

| Parâmetro    | Descrição |
| :----------- | :-------- |
| `access_token` |           |

## Exemplos de Resposta

Click Try It! to start a request and see the response here! Or choose an example:

`application/json`

## Última Atualização

Updated 28 days ago
