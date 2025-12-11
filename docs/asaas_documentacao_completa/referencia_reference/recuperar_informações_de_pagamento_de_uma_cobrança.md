# Recuperar informações de pagamento de uma cobrança

## Path Params

idstringrequired

Identificador único da cobrança no Asaas

## Responses

200OK

400Bad Request

401Unauthorized

403Forbidden

Ocorre quando o body da requisição está preenchido, chamadas de método GET precisam ter um body vazio.

404Not found

## LANGUAGE

ShellNodeRubyPHPPython

### Header

### cURL Request

```
curl --request GET \\
  --url https://api-sandbox.asaas.com/v3/payments/{id}/billingInfo \\
  --header 'accept: application/json'
```

### RESPONSE

Try It!

Click Try It! to start a request and see the response here! Or choose an example:

application/json

200400401403404