# Obter QR Code para pagamentos via Pix

# Obter QR Code para pagamentos via Pix

O recebimento via Pix é um meio rápido, eficaz e seguro para que sua empresa receba as cobranças de seus clientes. Ao gerar uma cobrança com as formas de pagamento `PIX`, `BOLETO` ou `UNDEFINED` o pagamento via Pix é habilitado. Uma das maiores vantagens dessa forma de pagamento é que ocorre de forma instantânea, ou seja, assim que o pagamento for realizado o saldo é disponibilizado em sua conta Asaas. Você pode ler mais sobre o Pix [aqui]().

Para gerar um QRCode Pix no Asaas você precisa criar uma chave, que é realizada através do [Criar uma chave Pix]().

Características:

*   O QRCode gerado é do tipo dinâmico com vencimento.
*   O QRCode expira 12 meses após a data de vencimento.
*   Pode ser impresso ou disponibilizado em documentos, pois os valores são consultados na hora da leitura do QRCode. Por exemplo: imprimir em um boleto ou carnês de pagamento.
*   Só pode ser pago uma vez.

> 🚧
> 
> Atualmente é possível gerar QR Code Pix dinâmico de pagamento imediato sem possuir uma chave Pix Cadastrada no Asaas. Esse QR Code será vinculado a uma instituição parceira onde o Asaas tem uma chave cadastrada. Todo QR Code obtido desta maneira pode ser pago até 23:59 do mesmo dia. A cada atualização em sua cobrança, é necessário obter um novo QR Code. Entretanto essa funcionalidade será descontinuada no futuro, será enviando um comunicado com 30 dias de antecedência, portanto já indicamos fazer o cadastro da sua chave Pix em [Criar uma chave Pix]().

Para gerar/recuperar o QR Code de uma cobrança é necessário informar o ID da cobrança que o Asaas retornou no momento da criação. Como retorno, você obterá o QR Code (retornado em imagem no formato Base 64), um Payload para permitir o Pix Copia e Cola e até quando o QR Code será válido.

### Path Params

*   **id** (string, required): Identificador único da cobrança no Asaas

### Responses

*   **200 OK**
*   **400 Bad Request**
*   **401 Unauthorized**
*   **403 Forbidden**: Ocorre quando o body da requisição está preenchido, chamadas de método GET precisam ter um body vazio.
*   **404 Not found**

### Exemplo de Requisição cURL

```bash
curl --request GET \
     --url https://api-sandbox.asaas.com/v3/payments/{id}/pixQrCode \
     --header 'accept: application/json'
```

