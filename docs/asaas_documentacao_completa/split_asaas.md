Introdução
Como dividir parte dos valores recebidos.
O split de pagamento é uma funcionalidade que permite "dividir" valores recebidos através dos pagamentos entre uma ou várias carteiras (contas ASAAS) automaticamente.
🚧
•	O split de pagamentos é uma funcionalidade exclusiva da API do ASAAS, não podendo ser utilizado ou gerenciado através do uso pelo site; * Caso não tenha uma integração API e queira utilizar o split, você poderá usar outras alternativas como o Pluga, Make ou nosso plugin para WooCommerce.* Se a cobrança estiver sendo utilizada como garantia em uma operação de crédito, mesmo que em outra instituição financeira, o split não poderá ser realizado;* Para realizar o split, é preciso possuir o walletId (ID da carteira) de todos os envolvidos no split. O walletId é um dado retornado automaticamente na criação de subcontas e também pode ser recuperado via requisição caso você possua a chave de API da conta destino.
Por exemplo, consideremos o seguinte cenário hipotético: João faz uma venda de R$ 200,00 e Marcelo deve receber 20% do valor da venda. Neste caso, a cobrança deve ser criada na conta do João (pois é ele quem fez venda ou prestou o serviço), e através das configurações de Split será indicado que Marcelo deve receber os 20% do valor da cobrança. Desta maneira, ao registrar o recebimento da cobrança, o Asaas fará o débito desses 20% do valor da cobrança da conta do João e creditará os 20% na conta de Marcelo.
📘
O valor do split sempre será feito em cima do netValue que é o valor da cobrança descontados os valores de taxas aplicadas.
 
Fluxo de funcionamento de um split
Ao configurar o Split é possível informar tanto valor fixo quanto percentual sobre a cobrança. No caso de percentual, o valor a ser transferido é calculado com base no valor líquido (após o desconto da tarifa do Asaas) da cobrança. Em caso de estorno da cobrança, o Split também será estornado, ou seja, todas as contas que receberam o saldo da cobrança em questão terão a transferência estornada.
O que preciso para utilizar o split?
Para fazer Split de cobranças é necessário que você tenha o walletId de todas as contas Asaas envolvidas nas transação.
🚧
Não há limite no número de walletId a serem enviados no split. A limitação sempre será o valor líquido total da cobrança em casos de valores fixos e a distribuição de 100% nos splits em valores percentuais.
WalletId
O walletId é retornado pelo Asaas no momento da criação da conta via API. Caso você não o tenha armazenado ou a conta não tenha sido criada via API, acesse nossa seção recuperar walletId para mais detalhes sobre como obtê-lo.
🚧
Você não deve indicar a própria carteira (walletId) ao realizar um split. Toda a diferença líquida que não foi direcionada via split será automaticamente creditada ao emissor da cobrança. Caso a própria carteira seja enviada na requisição, a API retornará uma exceção.
Status de Split
Os status disponíveis para Splits são:
•	PENDING, AWAITING_CREDIT, CANCELLED, DONE, REFUSED e REFUNDED.
Caso o status do Split seja REFUSED também receberá o preenchimento do campo refusalReason:
•	RECEIVABLE_UNIT_AFFECTED_BY_EXTERNAL_CONTRACTUAL_EFFECT: Split não executado devido à existência de efeitos de contrato.


Bloqueio por divergência de split
No momento em que ocorre o recebimento ou a antecipação de uma cobrança, caso o valor total do split seja superior ao valor líquido a receber, o montante e o split correspondente são bloqueados. Uma notificação via webhook é enviada, informando o bloqueio e concedendo um prazo de 2 dias úteis para ajuste do split.
Se o ajuste do split for realizado dentro do prazo e o novo valor total for igual ou inferior ao valor bloqueado, o desbloqueio é efetuado e o split processado. No entanto, caso o ajuste não seja feito dentro do prazo estipulado, o bloqueio é encerrado automaticamente por expiração, e os splits são cancelados. Nesse cenário, uma nova notificação via webhook é enviada, informando a liberação do valor e o cancelamento do split.
Eventos do webhook utilizados para comunicação:
● Para o fluxo de bloqueio: PAYMENT_SPLIT_DIVERGENCE_BLOCK
● Para o fluxo de desbloqueio por expiração do prazo: PAYMENT_SPLIT_DIVERGENCE_BLOCK_FINISHED


Valores permitidos para splits
Como indicado anteriormente, na criação ou atualização de splits você poderá trabalhar com valores fixos (fixedValue) ou valores percentuais (percentualValue).
O máximo possível de split aplicado em cada cobrança será o valor líquido da mesma (considerando o débito de taxas). caso trabalhe com splits fixos, ou 100% caso trabalhe com valores percentuais.
Também é possível trabalhar com as duas opções em conjunto, sendo que não há regra de prioridade para aplicação do split. O cálculo base sempre acontecerá em cima do valor líquido de sua cobrança.
Por exemplo, se você possui uma cobrança de R$100,00 no boleto bancário e sua taxa de boleto é de R$2,00, o valor líquido da mesma será de R$98,00.
Nesse cenário, se você criar um split fixo de R$50,00 e um split percentual de 50%, nessa mesma cobrança o Asaas lhe retornará uma exceção pelo seguinte motivo:
50% de R$98 (valor líquido) = R$49,00 + R$50,00 = R$99,00 (valor maior que o valor líquido).
________________________________________
Casas decimais no split
Para splits fixos (criados com fixedValue), aceitaremos apenas duas casas decimais. Ex: 9.32
Para splits percentuais (criados com percentualValue), aceitaremos apenas quatro casas decimais. Ex: 92.3444
Updated about 2 months ago
________________________________________

Erros comuns e boas práticas

Split em cobranças avulsas

Did this page help you?
Split em cobranças avulsas
A única diferença entre a criação de uma cobrança avulsa com e sem Split se dará no envio do array split na requisição de criação de uma cobrança avulsa. Este array é chamado split e contém a lista de objetos walletId e valores a serem transferidos quando a cobrança for recebida:
JSON
{
   ...
   "splits":[
      {
         "walletId":"48548710-9baa-4ec1-a11f-9010193527c6",
         "fixedValue":20.00
      },
      {
         "walletId":"0b763922-aa88-4cbe-a567-e3fe8511fa06",
         "percentualValue":10.00
      }
   ]
}
📘
Você só precisa adicionar informações de Split das contas que quer transferir uma parte do valor. O saldo restante fica todo na conta que emitiu a cobrança.
Atualizar Split da Cobrança
Para atualizar o split, basta recuperar o ID da cobrança e utilizar o método de Atualização de cobrança para realizar a atualização e informar os novos atributos de split.
JSON
{
    ...
    "splits":[
        {
            "walletId":"48548710-9baa-4ec1-a11f-9010193527c6",
            "fixedValue":10.00
        }
    ]
}
🚧
Atenção
Ao atualizar uma cobrança, caso não queira alterar as configurações do Split, não informe o parâmetro splits na requisição, pois passando null ou [] o Split será desativado.
❗️
Importante
Se você excluir uma cobrança, as configurações de split serão removidas. Caso a cobrança seja restaurada e paga o split não estará mais configurado e não acontecerá. Portanto, caso a cobrança restaurada possuía split configurado antes da exclusão, certifique-se de configurar novamente o split.
Consultar Split em Cobrança
Para consultas as definições de split de uma determinada cobrança, você poderá utilizar o método de Listar Cobranças ou então Recuperar uma única cobrança.
Caso a cobrança possua split definido, a resposta lhe trará a lista de objetos das cobranças, onde você poderá visualizar o array de splits na raiz do payment. Caso o array não seja devolvido, indica que o split não está aplicado na cobrança.
Os dados de split aplicados na cobrança também serão enviados nos Webhooks disparados pelo ASAAS.
Updated about 2 months ago
________________________________________

Introdução

Split em parcelamentos

Did this page help you?
Split em parcelamentos
Ao utilizar o split em parcelamentos, temos duas formas de configurar a divisão do valor:
Enviando o valor que deve ser aplicado em cada parcela, previamente calculado. Por exemplo, se você possui uma cobrança de R$100,00 que será dividida em 4 parcelas e precisará realizar um split total de R$40,00, você precisará enviar nas atribuições do split o valor de R$10,00 no campo fixedValue, sendo assim, serão aplicados R$10,00 de split para cada parcela automaticamente, garantindo o split de R$40,00 ao término da quitação do parcelamento.
JSON
{
   ...
   "totalValue":100.00,
   "installmentCount":4,
   "splits":[
      {
         "walletId":"48548710-9baa-4ec1-a11f-9010193527c6",
         "fixedValue":10.00
      }
   ]
}
Enviando o valor total de split a ser abatido do valor total do parcelamento. Utilizando deste método o Asaas irá executar a divisão conforme o número de parcelas. Por exemplo, se você possui uma cobrança de R$300,00 que será dividida em 3 parcelas e precisará realizar um split total de R$100,00, você deve enviar nas atribuições do split o valor de R$100,00 no campo totalFixedValue, sendo assim, serão aplicados splits de R$33,33; R$33,33 e R$33,34 para cada parcela respectivamente de forma automática, garantindo o split de R$100,00 ao término da quitação do parcelamento.
JSON
{
   ...
   "totalValue":300.00,
   "installmentCount":3,
   "splits":[
      {
         "walletId":"0b763922-aa88-4cbe-a567-e3fe8511fa06",
         "totalFixedValue":100.00
      }
   ]
}
Para splits em porcentagem, o valor de percentualValue será aplicado a cada parcelamento da cobrança, então por exemplo se você tem uma cobrança de R$300,00 parcelados em 3 vezes com o percentualValue de 6% então em cada parcela o split será de R$6,00, assim totalizando R$18,00 de split nesta cobrança.
JSON
{
   ...
   "totalValue":100.00,
   "installmentCount":3,
   "splits":[
      {
         "walletId":"0b763922-aa88-4cbe-a567-e3fe8511fa06",
         "percentualValue": 6
      }
   ]
}
Caso precise aplicar um valor percentual em cima do valor total da cobrança, você pode calcular a porcentagem desejada e atribuir como um valor fixo no campo totalFixedValue
Updated about 2 months ago
________________________________________

Split em cobranças avulsas

Split em assinaturas

Did this page help you?
Split em assinaturas
A única diferença entre a criação de uma assinatura com e sem Split se dará no envio do array split na requisição de criação de uma assinatura. Este array é chamado split e contém a lista de objetos walletId e valores a serem transferidos quando a cobrança for recebida.
JSON
{
    ...
    "splits":[
        {
            "walletId":"48548710-9baa-4ec1-a11f-9010193527c6",
            "fixedValue":20.00
        },
        {
            "walletId":"0b763922-aa88-4cbe-a567-e3fe8511fa06",
            "percentualValue":10.00
        }
    ]
}
🚧
O split configurado na assinatura servirá como um template, que será utilizado na criação de cada nova cobrança.
Atualizar Split da Assinatura
Para atualizar o split, basta recuperar o ID da assinatura e utilizar o método de Atualização de assinatura para realizar a atualização e informar os novos atributos de split.
JSON
{
    ...
    "splits":[
        {
            "walletId":"48548710-9baa-4ec1-a11f-9010193527c6",
            "fixedValue":10.00
        }
    ]
}
🚧
Ao atualizar uma assinatura, caso não queira alterar as configurações do Split, não informe o parâmetro splits na requisição, pois passando null ou [] o Split será desativado.
Cobranças já geradas não irão ser atualizadas. Para atualizar o split de cobranças já geradas será necessário fazê-lo manualmente em cada cobrança da assinatura, atualizando as cobranças.
Consultar Split em Assinatura
Para consultas as definições de split de uma determinada assinatura, você poderá utilizar o método de Listar Assinaturas ou então Recuperar uma única assinatura.
Updated about 2 months ago
________________________________________

Split em parcelamentos

Split em cobranças antecipadas

Did this page help you?
Split em cobranças antecipadas
Caso você decida antecipar cobranças que possuam split aplicados, será preciso se atentar a algumas regras para uso de ambas as funcionalidades.
Split em valores fixos
Na antecipação de cobranças com split em valores fixos, no momento de definir os valores do split, é preciso observar que o valor máximo a ser aplicado como split será o valor líquido da cobrança, já deduzindo as taxas do Asaas e também as taxas da antecipação.
Caso o valor de split configurado exceda o valor final a ser recebido após a antecipação, não será possível prosseguir com a solicitação de antecipação no Asaas.
Split em valores percentuais
Na antecipação de cobranças com split em valores percentuais, o Asaas realizará o cálculo do valor a ser aplicado como split com base no valor líquido final que será recebido após a antecipação.
Ou seja, o valor final de crédito já antecipado será a base para o cálculo do percentual.
Por exemplo, se houver um split de 100% configurado em uma cobrança que foi antecipada, todo o valor recebido após o crédito da antecipação será aplicado como split seguindo a regra percentual.
Updated about 2 months ago
________________________________________

Split em assinaturas

Consulta de splits via interface

Did this page help you?
Consulta de splits via interface
É possível acompanhar o andamento de seus splits pagos e recebidos através da interface do Asaas. No menu principal, ao lado esquerdo, o menu Split de Pagamentos estará disponível caso sua conta tenha splits configurados.
Se desejar ver as estatísticas via API, você pode usar o endpoint de Recuperar valores de split.
📘
Essa opção não está disponível para contas white label, já que o cliente não tem acesso à aplicação web.
 
Nesta tela você também pode filtrar como desejar e exportar os dados em CSV.
 
Updated about 2 months ago
________________________________________

Split em cobranças antecipadas

Usando o split sem API

Did this page help you?
Usando o split sem API
O split de pagamentos é uma funcionalidade exclusiva da API do Asaas.
Porém, através de conectores e plugins, você poderá utilizar a função sem a necessidade de escrever uma linha de código sequer, de maneira fácil e rápida.
No Asaas, essa função está disponível das seguintes maneiras:
•	Plugin Asaas para WooCommerce
•	Pluga
Updated about 2 months ago
________________________________________

Consulta de splits via interface

Split no WooCommerce

Did this page help you?

