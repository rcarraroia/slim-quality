# Solicitar antecipação

# Solicitar antecipação

É possível solicitar uma antecipação de um parcelamento ou de uma cobrança avulsa. Em casos de parcelamento, onde a forma de pagamento é por cartão, a antecipação poderá ser feita para o parcelamento completo ou para cada parcela individualmente, e quando a forma de pagamento é por boleto, a antecipação será obrigatoriamente para cada parcela individualmente.

Para solicitar uma antecipação de cobrança avulsa, informe o ID da cobrança para o campo `payment`. Para solicitar uma antecipação de parcelamentos, informe o ID do parcelamento para o campo `installment`.

Para determinar se o envio de notas fiscais eletrônicas ou contratos de prestação de serviços é obrigatório, verifique a propriedade `isDocumentationRequired` retornada na [simulação da antecipação](https://docs.asaas.com/reference/simular-antecipacao).

> 🚧 **Atenção**
> Caso a cobrança a ser antecipada possua split de pagamento definido, é preciso observar as regras de execução do [Split em cobranças antecipadas](https://docs.asaas.com/reference/split-em-cobrancas-antecipadas).

## Body Params

| Parâmetro   | Tipo   | Descrição                       |
| :---------- | :----- | :------------------------------ |
| `installment` | `string` | ID do parcelamento a ser antecipado |
| `payment`     | `string` | ID da cobrança a ser antecipada     |
| `documents`   | `file`   | Arquivo                         |

## Respostas

### 200 OK

### 400 Bad Request

### 401 Unauthorized

## Exemplo de Requisição cURL

```bash
curl --request POST \
     --url https://api-sandbox.asaas.com/v3/anticipations \
     --header 'accept: application/json' \
     --header 'content-type: multipart/form-data'
```

## Exemplo de Resposta (200 OK)

```json
{
  "object": "anticipation",
  "id": "ant_0000000000000000",
  "value": 100.00,
  "anticipationFee": 2.50,
  "netValue": 97.50,
  "status": "PENDING",
  "dateCreated": "2023-10-26",
  "payment": "pay_0000000000000000",
  "installment": null,
  "creditBureau": null,
  "documents": [],
  "automaticAnticipation": false
}
```

Updated 28 days ago