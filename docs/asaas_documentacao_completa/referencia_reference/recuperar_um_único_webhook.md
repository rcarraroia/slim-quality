# Recuperar um único webhook

# Recuperar um único webhook

`GET` https://api-sandbox.asaas.com/v3/webhooks/{id}

Este endpoint recupera um único webhook de acordo com o ID informado.

### Path Params

| Parâmetro | Tipo   | Obrigatório | Descrição                      |
| :-------- | :----- | :---------- | :----------------------------- |
| `id`      | string | required    | Identificador único do webhook |

### Responses

| Código | Descrição                                                                                             |
| :----- | :---------------------------------------------------------------------------------------------------- |
| `200`  | OK                                                                                                    |
| `400`  | Bad Request                                                                                           |
| `401`  | Unauthorized                                                                                          |
| `403`  | Forbidden. Ocorre quando o body da requisição está preenchido, chamadas de método GET precisam ter um body vazio. |
| `404`  | Not found                                                                                             |

### Exemplo de Requisição (cURL)

```bash
curl --request GET \
     --url https://api-sandbox.asaas.com/v3/webhooks/id \
     --header 'accept: application/json'
```