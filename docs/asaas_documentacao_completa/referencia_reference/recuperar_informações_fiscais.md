# Recuperar informações fiscais

# Recuperar informações fiscais

**URL:** https://api-sandbox.asaas.com/v3/fiscalInfo/

Permite verificar as configurações para emissão de notas fiscais. Caso ainda não tenha sido cadastrada, será retornado HTTP 404.

## Responses

### 200 OK

### 400 Bad Request

### 401 Unauthorized

### 403 Forbidden
Ocorre quando o body da requisição está preenchido, chamadas de método GET precisam ter um body vazio.

Updated 28 days ago

## Exemplo de Requisição (cURL)

```bash
curl --request GET \
     --url https://api-sandbox.asaas.com/v3/fiscalInfo/ \
     --header 'accept: application/json'
```

## Exemplo de Resposta

Click Try It! to start a request and see the response here! Or choose an example:

`application/json`

**Códigos de Resposta:**
- 200
- 400
- 401