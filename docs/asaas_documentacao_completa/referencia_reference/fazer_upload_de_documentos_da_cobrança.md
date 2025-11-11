# Fazer upload de documentos da cobrança

# Fazer upload de documentos da cobrança

Permite anexar um documento dentro da cobrança, que será disponibilizado ao pagador diretamente na fatura Asaas para download.

## Path Params

- `id` (string, required): Identificador único da cobrança no Asaas

## Body Params

- `availableAfterPayment` (boolean, required): true para disponibilizar o documento apenas após o pagamento
  - Valores permitidos: `true`, `false`
- `type` (string, enum, required): Tipo de documento
  - Valores permitidos:
    - `INVOICE`
    - `CONTRACT`
    - `MEDIA`
    - `DOCUMENT`
    - `SPREADSHEET`
    - `PROGRAM`
    - `OTHER`
- `file` (file, required): Arquivo

## Responses

- **200 OK**
- **400 Bad Request**
- **401 Unauthorized**
- **404 Not found**

## Exemplo de Requisição cURL

```bash
curl --request POST \
     --url https://api-sandbox.asaas.com/v3/payments/id/documents \
     --header 'accept: application/json' \
     --header 'content-type: multipart/form-data' \
     --form availableAfterPayment=true \
     --form type=INVOICE
```

Updated 28 days ago