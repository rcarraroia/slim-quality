# Criar cobrança com cartão de crédito

_**[Home](/) > [Referência / Reference](/reference) > Criar cobrança com cartão de crédito**_

# Criar cobrança com cartão de crédito

`POST` https://api-sandbox.asaas.com/v3/payments/

Ao criar uma cobrança com a forma de pagamento cartão de crédito, é possível redirecionar o cliente para a URL da fatura (`invoiceUrl`) para que ele possa inserir os dados do seu cartão através da interface do Asaas, ou os dados do cartão e titular do cartão podem ser enviados na criação solicitação de processamento de pagamento imediato.

Para isso, ao executar a solicitação de criação de cobrança, basta enviar os dados do cartão de crédito juntamente com os dados do titular do cartão através dos objetos `creditCard` e `creditCardHolderInfo`. É essencial que os dados do titular do cartão correspondam exatamente aos registados no emissor do cartão; caso contrário, a transação poderá ser negada devido à suspeita de fraude.

Caso a transação seja autorizada, o faturamento será criado e o Asaas retornará `HTTP 200`. Caso contrário, o faturamento não será persistido e `HTTP 400` será retornado.

No `Sandbox`, as transações são aprovadas automaticamente. Para simular um erro, você precisa usar os números de cartão de crédito `5184019740373151 (Mastercard)` ou `4916561358240741 (Visa)`.

> 📘 Guia de Cartão de crédito
> Confira o guia de cartão de crédito para mais informações.

## Tokenização de cartão de crédito

- Ao realizar a primeira transação para o cliente com cartão de crédito, a resposta do Asaas retornará o atributo `creditCardToken`.
- Com essas informações, nas transações subsequentes, o atributo `creditCardToken` poderá substituir os objetos `creditCard` e `creditCardHolderInfo` e ser fornecido diretamente na raiz da solicitação, eliminando a necessidade de fornecer novamente os objetos.

> 🚧 Atenção
> - Independentemente da data de vencimento informada, a captura (cobrança no cartão do cliente) será feita no momento da criação da cobrança.
> - Caso opte por capturar os dados do cartão do cliente através da interface do seu sistema, o uso de SSL (HTTPS) é obrigatório; caso contrário, sua conta poderá ser bloqueada para transações com cartão de crédito.
> - Para evitar timeouts e consequentes duplicidades na captura, recomendamos configurar um timeout mínimo de 60 segundos para esta requisição.

> 🚧 Atenção
> - É permitido a criação de parcelamentos no cartão de crédito em **até 21x para cartões de bandeira Visa e Master.**
> Anteriormente, era suportado parcelamentos de até 12 parcelas para todas as bandeiras. 
> **Para outras bandeiras, exceto Visa e Master, o limite continua sendo de 12 parcelas.**

## Crie cobrança de cartão de crédito com pré-autorização

A Pré-Autorização funciona como uma reserva de saldo no cartão do cliente, garantindo que o valor esperado estará disponível.

Ao invés de debitar efetivamente o valor, é feita uma reserva, fazendo com que esse valor seja subtraído do limite do cartão até que a captura, seja feita ou a Pré-Autorização expire.

A diferença entre criar uma cobrança Pré-Autorizada e uma cobrança de captura imediata está apenas no atributo `authorizeOnly`, que deverá ser enviado com o valor `true`, indicando que somente a Pré-Autorização será realizada para este faturamento.

> 📘
> - Uma cobrança Pré-Autorizada será revertida automaticamente após 3 dias caso não seja capturada.
> - Para cancelar a Pré-Autorização antes dos 3 dias, você deverá utilizar o recurso [Estorno de pagamento](/reference/refund-payment).
> - A cobrança pré-autorizada será criada com o status `AUTHORIZED` após a criação bem-sucedida.
> - No Sandbox, as capturas são aprovadas automaticamente. Para simular um erro, basta utilizar uma cobrança que não foi criada em Pré-Autorização ou com status diferente de `AUTHORIZED`.

## Parâmetros do Corpo da Requisição

| CAMPO | TIPO | OBRIGATÓRIO | DESCRIÇÃO |
| --- | --- | --- | --- |
| `customer` | string | Sim | Identificador único do cliente no Asaas |
| `billingType` | string | Sim | Forma de pagamento. Valores permitidos: `UNDEFINED`, `BOLETO`, `CREDIT_CARD`, `PIX` |
| `value` | number | Sim | Valor da cobrança |
| `dueDate` | date | Sim | Data de vencimento da cobrança |
| `description` | string | Não | Descrição da cobrança (máx. 500 caracteres) |
| `daysAfterDueDateToRegistrationCancellation` | int32 | Não | Dias após o vencimento para cancelamento do registro (somente para boleto bancário) |
| `externalReference` | string | Não | Campo livre para busca |
| `installmentCount` | int32 | Não | Número de parcelas (somente no caso de cobrança parcelada) |
| `totalValue` | number | Não | Informe o valor total de uma cobrança que será parcelada (somente no caso de cobrança parcelada). Caso enviado este campo o `installmentValue` não é necessário, o cálculo por parcela será automático. |
| `installmentValue` | number | Não | Valor de cada parcela (somente no caso de cobrança parcelada). Envie este campo em caso de querer definir o valor de cada parcela. |
| `discount` | object | Não | Informações de desconto. Veja o objeto `discount` [aqui](/reference/object-discount-object). |
| `interest` | object | Não | Informações de juros para pagamento após o vencimento. Veja o objeto `interest` [aqui](/reference/object-interest-object). |
| `fine` | object | Não | Informações de multa para pagamento após o vencimento. Veja o objeto `fine` [aqui](/reference/object-fine-object). |
| `postalService` | boolean | Não | Define se a cobrança será enviada via Correios |
| `split` | array of objects | Não | Configurações do split. Veja o objeto `split` [aqui](/reference/object-split-object). |
| `callback` | object | Não | Informações de redirecionamento automático após pagamento do link de pagamento. Veja o objeto `callback` [aqui](/reference/object-callback-object). |
| `creditCard` | object | Não | Informações do cartão de crédito. Veja o objeto `creditCard` [aqui](/reference/object-creditcard-object). |
| `creditCardHolderInfo` | object | Não | Informações do titular do cartão de crédito. Veja o objeto `creditCardHolderInfo` [aqui](/reference/object-creditcardholderinfo-object). |
| `creditCardToken` | string | Não | Token do cartão de crédito para uso da funcionalidade de tokenização de cartão de crédito |
| `authorizeOnly` | boolean | Não | Realizar apenas a Pré-Autorização da cobrança |
| `remoteIp` | string | Sim | IP de onde o cliente está fazendo a compra. Não deve ser informado o IP do seu servidor. |

## Respostas

| CÓDIGO | DESCRIÇÃO |
| --- | --- |
| `200` | OK |
| `400` | Bad Request |
| `401` | Unauthorized |
