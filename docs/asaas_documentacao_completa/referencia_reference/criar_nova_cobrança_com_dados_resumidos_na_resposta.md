# Criar nova cobrança com dados resumidos na resposta

# Criar nova cobrança com dados resumidos na resposta

## Endpoint

`POST https://api-sandbox.asaas.com/v3/lean/payments`

## Body Params

| Parâmetro | Tipo | Requerido | Descrição |
|---|---|---|---|
| `customer` | `string` | Sim | Identificador único do cliente no Asaas |
| `billingType` | `string` (enum) | Sim | Forma de pagamento. Valores permitidos: `UNDEFINED`, `BOLETO`, `CREDIT_CARD`, `PIX` |
| `value` | `number` | Sim | Valor da cobrança |
| `dueDate` | `date` | Sim | Data de vencimento da cobrança |
| `description` | `string` | Não | Descrição da cobrança (máx. 500 caracteres) |
| `daysAfterDueDateToRegistrationCancellation` | `int32` | Não | Dias após o vencimento para cancelamento do registro (somente para boleto bancário) |
| `externalReference` | `string` | Não | Campo livre para busca |
| `installmentCount` | `int32` | Não | Número de parcelas (somente no caso de cobrança parcelada) |
| `totalValue` | `number` | Não | Informe o valor total de uma cobrança que será parcelada (somente no caso de cobrança parcelada). Caso enviado este campo o `installmentValue` não é necessário, o cálculo por parcela será automático. |
| `installmentValue` | `number` | Não | Valor de cada parcela (somente no caso de cobrança parcelada). Envie este campo em caso de querer definir o valor de cada parcela. |
| `discount` | `object` | Não | Informações de desconto |
| `interest` | `object` | Não | Informações de juros para pagamento após o vencimento |
| `fine` | `object` | Não | Informações de multa para pagamento após o vencimento |
| `postalService` | `boolean` | Não | Define se a cobrança será enviada via Correios. Valores: `false`, `true` |
| `split` | `array of objects` | Não | Configurações do split |
| `callback` | `object` | Não | Informações de redirecionamento automático após pagamento do link de pagamento |

## cURL Request Example

```bash
curl --request POST \
     --url https://api-sandbox.asaas.com/v3/lean/payments \
     --header \'accept: application/json\' \
     --header \'content-type: application/json\' \
     --data \'
{
  "billingType": "UNDEFINED"
}
\'
```

## Responses

### 200 OK

### 400 Bad Request

### 401 Unauthorized
