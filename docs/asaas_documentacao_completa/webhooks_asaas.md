Introdução
Um Webhook é uma forma automatizada de enviar informações entre sistemas quando certos eventos ocorrem. Quando você ativa um Webhook, ele passará a enviar requisições POST para o endereço configurado sempre que determinado evento acontecer. Essa requisição incluirá informações sobre o evento e o recurso envolvido.
Por que usar Webhooks?
Se você deseja que os dados de pagamento ou informações de clientes estejam sempre sincronizados com sua aplicação, os Webhooks são a melhor solução. Eles funcionam como uma "API reversa", onde o Asaas realizará uma chamada HTTP REST na sua aplicação.
 
Para habilitar o recebimento de eventos de webhooks você precisa configurar a URL que receberá os eventos, o que pode ser feito via interface, acessando a aplicação web, ou via API. É possível cadastrar até 10 URLs de webhooks diferentes, e em cada uma você define quais eventos quer receber.
Habilitando um Webhook
Para ativar os Webhooks você deve acessar a área de Integrações do Asaas, na aba de Webhooks, e informar a URL da sua aplicação que deve receber o POST do Asaas. Você também pode configurar Webhooks via API. Confira os guias:
•	Criar novo Webhook pela aplicação web
•	Criar novo Webhook pela API
Boas práticas no uso de Webhooks
Utilize estas práticas para garantir que sua integração com Webhooks seja segura e funcione adequadamente.
Gerencie eventos duplicados
Os webhooks garantem a entrega "at least once" (ao menos uma entrega). Isso significa que seu endpoint pode receber ocasionalmente o mesmo evento de webhook mais de uma vez. Você pode ignorar eventos duplicados utilizando idempotência. Uma maneira de fazer isso é registrando os eventos que já foram processados e ignorá-los caso sejam enviados novamente. Cada evento enviado pelos Webhooks possui um ID próprio, que se repete caso se trate do mesmo evento.
Configure apenas os tipos de eventos necessários para sua aplicação
Configure apenas os tipos de eventos necessários para sua aplicação em cada Webhook. Receber tipos de eventos adicionais (ou todos os tipos de eventos) sobrecarrega seu servidor e não é recomendável.
Gerencie os eventos de forma assíncrona
Você pode encontrar problemas de escalabilidade se optar por eventos síncronos ou ter problemas de sobrecarregamento no host em caso de picos de eventos em endpoints, por isso é melhor implementar o processamento da fila de eventos de forma assíncrona.
Verifique se os eventos foram enviados a partir do Asaas
Para impedir que a sua aplicação receba requisições de outras origens, você tem a opção de utilizar um token para autenticar as requisições vindas do Asaas. Este token pode ser informado na configuração do Webhook. O token informado será enviado em todas as notificações no header asaas-access-token.
Retorne o mais rápido possível uma resposta de sucesso
Para que o Asaas considere a notificação como processada com sucesso, o status HTTP da resposta deve ser maior ou igual a 200 e menor que 300. A sincronização é feita toda vez que há uma mudança em um evento, e caso seu sistema falhe em responder sucesso 15 vezes consecutivas, a fila de sincronização será interrompida. Novas notificações continuam sendo geradas e incluídas na fila de sincronia, porém não são enviadas para a sua aplicação. Após certificar-se que seu sistema responderá uma resposta de sucesso para o Asaas, basta reativar fila de sincronia acessando a área Minha Conta, aba Integração. Todos os eventos pendentes serão processados em ordem cronológica.
Siga o nosso tutorial para receber eventos do Asaas em seu Webhook.
Fique atento para eventuais falhas de comunicação
Se a sua aplicação retornar qualquer resposta HTTP que não é da família 200, a sua fila de eventos será interrompida e você receberá um e-mail de comunicação do Asaas para deixá-lo ciente disso. Fique atento para evitar ter problemas de sincronização de eventos.
❗️
Atenção
•	O Asaas guarda eventos de Webhooks por 14 dias. Você receberá um e-mail caso haja algum problema de comunicação e seus Webhooks pararem de funcionar.
•	Caso sua fila seja pausada, é de extrema importância que você resolva qualquer problema em até 14 dias para evitar perder informações importantes.
•	Os eventos que estiverem mais de 14 dias parados na fila serão excluídos permanentemente.
Updated about 2 months ago
________________________________________

Alterando notificações de um cliente

Criar novo Webhook pela aplicação web

Did this page help you?
Criar novo Webhook pela aplicação web
Você pode criar novos Webhooks utilizando a aplicação Web do Asaas, para isso acesse Menu do usuário > Integrações > Webhooks.
 
Em seu primeiro acesso você irá visualizar um botão para criar seu primeiro Webhook.
________________________________________
Ao clicar em "Criar Webhook" um formulário para mais informações irá aparecer. Na primeira etapa você precisa:
•	Definir um nome;
•	Definir a URL que receberá as informações dos eventos;
•	Cadastrar um e-mail que será notificado em caso de erros de comunicação;
•	Qual a versão da API;
•	Definir um token de autenticação ou não: este token será enviado no header asaas-access-token em todas as chamadas do Asaas para sua aplicação;
•	Se a fila de sincronização está ativada;
•	Se o Webhook está ativado;
•	Qual o tipo de envio: confira o artigo sobre os tipos de envio disponíveis.
 
Em sequencia a configuração você precisará selecionar os eventos que deseja receber. Você pode conferir a lista completa de eventos na nossa documentação, basta selecionar os eventos que quiser receber em diversos produtos diferentes.
 
________________________________________
Você poderá ter até 10 Webhooks configurados por conta sem restrições de endereços. Você também pode editar ou excluir Webhooks criados.
 
Updated about 2 months ago
________________________________________

Introdução

Criar novo Webhook pela API

Did this page help you?
Criar novo Webhook pela API
Você pode criar novos Webhooks através da API, tanto para contas raiz quanto para subcontas. Você pode ter até 10 Webhooks configurados na sua conta e é você quem escolhe quais eventos cada Webhook irá receber.
Para criar um novo Webhook, vamos realizar uma chamada ao endpoint de Criar novo Webhook.
POST /v3/webhooks
Confira a referência completa deste endpoint
JSON
{
    "name": "Nome Exemplo",
    "url": "https://www.exemplo.com/webhook/asaas",
    "email": "marcelo.almeida@gmail.com",
    "enabled": true,
    "interrupted": false,
    "authToken": null,
    "sendType": "SEQUENTIALLY",
    "events": [
        "PAYMENT_CREDIT_CARD_CAPTURE_REFUSED",
        "PAYMENT_CHECKOUT_VIEWED",
        "PAYMENT_BANK_SLIP_VIEWED",
        "PAYMENT_DUNNING_REQUESTED",
        "PAYMENT_DUNNING_RECEIVED",
        "PAYMENT_AWAITING_CHARGEBACK_REVERSAL",
        "PAYMENT_CHARGEBACK_DISPUTE",
        "PAYMENT_CHARGEBACK_REQUESTED",
        "PAYMENT_RECEIVED_IN_CASH_UNDONE",
        "PAYMENT_REFUND_IN_PROGRESS",
        "PAYMENT_REFUNDED",
        "PAYMENT_RESTORED",
        "PAYMENT_DELETED",
        "PAYMENT_OVERDUE",
        "PAYMENT_ANTICIPATED",
        "PAYMENT_RECEIVED",
        "PAYMENT_CONFIRMED",
        "PAYMENT_UPDATED",
        "PAYMENT_CREATED",
        "PAYMENT_REPROVED_BY_RISK_ANALYSIS",
        "PAYMENT_APPROVED_BY_RISK_ANALYSIS",
        "PAYMENT_AWAITING_RISK_ANALYSIS",
        "PAYMENT_AUTHORIZED"
    ]
}
Na chamada acima, criamos um novo Webhook que receberá praticamente todos os eventos de cobrança existentes.
Pela API você também pode editar, excluir ou deletar os Webhooks da sua conta. Para listar todos os Webhooks, utilize o endpoint como uma chamada GET.
GET /v3/webhooks
Confira a referência completa deste endpoint
A partir deste entpoint você também pode verificar quais dos seus Webhooks estão com a fila interrompida.
Updated about 2 months ago
________________________________________

Criar novo Webhook pela aplicação web

Receba eventos do Asaas no seu endpoint de Webhook

Did this page help you?
Receba eventos do Asaas no seu endpoint de Webhook
Configure uma URL de webhook para manter sua aplicação sempre atualizada com a integração da API
Siga este tutorial para criar seu primeiro Webhook.
O objeto de evento
Eventos são objetos enviados em formato JSON via webhooks do Asaas. Eles são responsáveis por avisar quando algum evento aconteceu em sua conta.
Através dele você terá acesso ao id, event indicando qual seu evento e o objeto da entidade da qual o evento pertence, no exemplo abaixo temos o objeto payment com os dados da cobrança em questão.
JSON
{
   "id": "evt_05b708f961d739ea7eba7e4db318f621&368604920",
   "event":"PAYMENT_RECEIVED",
   "dateCreated": "2024-06-12 16:45:03",
   "payment":{
      "object":"payment",
      "id":"pay_080225913252",
      ...
   }
}
Os webhooks são a forma que você usa para inscrever-se em eventos e receber notificações na sua aplicação sempre que o evento acontece.
Tipos de eventos
Os eventos são divididos por categorias relacionadas a entidade ao qual eles pertencem. Confira a página Eventos de Webhooks para conferir cada um.
Comece por aqui
Para começar a receber eventos através de webhooks na sua aplicação, siga os passos abaixo:
1.	Acesse o ambiente de Sandbox;
2.	Crie um endpoint na sua aplicação para receber requests HTTP do tipo POST;
3.	Configure seu webhook usando nossa aplicação web ou via API;
4.	Teste seu webhook;
5.	Realize debug em problemas com eventos;
6.	Após testado e validado, replique a configurações no ambiente de Produção;
7.	Mantenha seu webhook seguro.
Crie um endpoint
Crie um endpoint que espera receber um objeto de evento em um evento de POST. Este endpoint também deve retornar o mais rápido possível uma resposta 200, para evitar problemas na fila de sincronização de eventos.
Abaixo um exemplo básico usando Node.js:
Node.jsPHPJavaPython
const express = require('express');
const app = express();

app.post('/payments-webhook', express.json({type: 'application/json'}), (request, response) => {
  const body = request.body;

  switch (body.event) {
    case 'PAYMENT_CREATED':
      const payment = body.payment;
      createPayment(payment);
      break;
    case 'PAYMENT_RECEIVED':
      const payment = body.payment;
      receivePayment(payment)
      break;
    // ... trate outos eventos
    default:
      console.log(`Este evento não é aceito ${body.event}`);
  }

  // Retorne uma resposta para dizer que o webhook foi recebido
  response.json({received: true});
});

app.listen(8000, () => console.log('Running on port 8000'));
Configure seu webhook
Você pode realizar a configuração de um novo webhook via aplicação web ou via API.
Recomendamos, para testar seu webhook e sua integração, que você primeiro precisa crie uma conta em Sandbox. Confira nossa documentação sobre o Sandbox e siga os passos. Você também pode seguir os tutoriais de criação de webhook:
•	Criar novo webhook pela aplicação web
•	Criar novo webhook pela API
Teste seu webhook
Com o webhook em Sandbox configurado, você pode testar seu código que está em localhost usando algumas aplicações que expõe o seu código local na web.
Recomendamos usar uma aplicação de confiança como o ngrok ou o Cloudflare Tunnel. Com ambas aplicações você pode definir uma url que pode utilizar na configuração do seu webhook.
Debugar integração com webhooks
Você pode facilmente debugar seu webhook através da nossa página de logs de Webhooks. Acesse Menu do Usuário > Integrações > Logs de Webhooks.
 
Nesta página você poderá visualizar todas as requisições enviadas via webhook para sua aplicação, qual o status retornado pelo seu servidor e também qual o conteúdo enviado. Essa página é relevante também quando você tiver problemas com a fila de sincronização pausada , confira a documentação para mais detalhes.
Mantenha seu webhook seguro
É altamente recomendado que você mantenha sua integração e todos os seus webhooks seguros. Como recomendação, o Asaas sugere:
•	Confie somente nos IPs do Asaas para chamadas em webhooks: você pode realizar o bloqueio via firewall em todos os IPs que realização chamadas nas suas URLs de webhooks, exceto os IPs oficiais do Asaas.
•	Configure um accessToken: ao criar um novo webhook, você pode definir um código único para ele. Crie uma hash forte, de preferência um UUID v4, e confira sempre o header asaas-access-token para certificar que esta é uma chamada legítima.
Updated about 2 months ago
________________________________________

Criar novo Webhook pela API

Como implementar idempotência em Webhooks

Did this page help you?
Como implementar idempotência em Webhooks
Os webhooks do Asaas garantem que os eventos serão enviados ao menos uma vez, ou seja, seguem a premissa "at least once". Isso significa que seu endpoint pode, ocasionalmente, receber o mesmo evento de webhook repetidamente em algumas situações esporádicas. Como, por exemplo, numa situação em que o Asaas não recebe uma resposta do seu endpoint.
Dito isso, o ideal é que sua aplicação saiba tratar os eventos recebidos com duplicidade utilizando idempotência e este artigo tem o objetivo de explicar como a idempotência funciona e como você pode proteger a sua aplicação.
O que é idempotência?
Idempotência se refere a capacidade que uma operação (função) tem de retornar constantemente o mesmo resultado independente da quantidade de vezes que possa ser executada, desde que os parâmetros se mantenham sempre os mesmos.
Trazendo para o contexto de webhook, se o Asaas ocasionalmente enviar o mesmo webhook duas vezes, o ideal é que a sua aplicação responda às duas requisições com HTTP Status 200, mantendo sempre o mesmo retorno da primeira requisição recebida.
Por que usar idempotência?
Antes de explicarmos o porquê de utilizar idempotência, vamos analisar os principais verbos HTTP: GET, PUT, DELETE e POST.
Aplicando os padrões REST corretamente na sua aplicação, os verbos GET, PUT e DELETE serão sempre idempotentes:
•	O GET é um verbo de consulta que não altera o estado do recurso.
•	O PUT, se executado diversas vezes com os mesmos parâmetros, sempre retornará o mesmo resultado.
•	O DELETE na primeira requisição torna o estado do recurso como “excluído”, mesmo que sejam enviadas outras requisições de DELETE, o estado do recurso se manterá o mesmo.
No entanto, o verbo POST é o único dos verbos HTTPs que não possui o comportamento de idempotência por padrão:
•	O POST pode criar um novo recurso único a cada vez que a operação for executada.
Os webhooks que são disparados pelo Asaas, por padrão, utilizam o verbo POST e é por isso que é importante que a sua aplicação aplique o conceito de idempotência para que o recebimento de webhooks repetidos não interfira na lógica aplicada pelo seu sistema.
Estratégias de idempotência
1.	Usando um index único no banco de dados
Os eventos enviados pelos Webhooks do Asaas possuem IDs únicos e, mesmo que eles sejam enviados mais de uma vez, você sempre receberá o mesmo ID. Uma das estratégias é criar uma fila de eventos no seu banco de dados e utilizar esse ID como uma chave única, desta maneira você não conseguirá salvar dois IDs iguais
SQL
CREATE TABLE asaas_events (
    id bigint PRIMARY KEY,
    asaas_event_id text UNIQUE NOT NULL,
    payload JSON NOT NULL,
    status ENUM('PENDING','DONE') NOT NULL
    [...]
);
O indicado é que ao receber o evento do Asaas na sua aplicação, você salve essa informação em uma tabela como mostrada acima e responda 200 para o Asaas para indicar o recebimento com sucesso. Lembre-se de retornar 200 somente após a confirmação da persistência do evento na sua tabela no banco de dados, pois não garantimos que este evento será reenviado automaticamente.
Após isso, crie uma rotina de processamento, como Cron Jobs ou Workers, para processar os eventos persistidos e não processados (status = PENDING), assim que finalizar o seu processamento, marque-os com o status DONE ou simplesmente remova o registro da tabela. Caso a ordem dos eventos seja importante para o seu sistema, lembre-se de buscar e processá-los de forma ascendente.
Node.js
const express = require('express');
const app = express();

app.post('/asaas/webhooks/payments', express.json({type: 'application/json'}), (request, response) => {
  const body = request.body;
  const eventId = body.id;
  const eventType = body.event;
  const payload = body; // Salvar o payload inteiro para verificar o "event" no processamento
  const status = "PENDING";
  
  await client
    .query("INSERT INTO asaas_events (asaas_event_id, payload, status) VALUES ($1, $2, $3)", [eventId, payload, status])
    .catch((e) => {
      // PostgreSQL code for unique violation
      if (e.code == "23505") {
        response.json({received: true});
        return;
      }
      throw e;
    });

  // Retorne uma resposta para dizer que o webhook foi recebido
  response.json({received: true});
});

app.listen(8000, () => console.log('Running on port 8000'));
Se o seu sistema recebe mais de centenas de milhares de eventos por dia, a indicação é utilizar uma solução de fila mais robusta, como Amazon SQS, RabbitMQ ou Kafka.
Nesta solução, além de resolver o ponto da idempotência, a sugestão também é que o processamento dos eventos seja assíncrono, logo tendo uma resposta mais rápida para o Asaas e uma vazão maior da fila de eventos enviados.
2.	Salvar eventos já processados
Outra estratégia comum é realizar o processamento dos Webhooks e salvar o ID de cada evento em uma tabela.
SQL
CREATE TABLE asaas_processed_webhooks (
    id bigint PRIMARY KEY,
    asaas_evt_id text UNIQUE NOT NULL,
    [...]
);
Dessa forma você pode sempre verificar essa tabela quando receber um novo evento e verificar se o ID já foi processado anteriormente.
Node.js
const express = require('express');
const app = express();

app.post('/asaas/webhooks/payments', express.json({type: 'application/json'}), (request, response) => {
  const body = request.body;

  const eventId = body.id;

  
  await client
    .query("INSERT INTO asaas_processed_webhooks (asaas_evt_id) VALUES $1", [eventId])
    .catch((e) => {
      // PostgreSQL code for unique violation
      if (e.code == "23505") {
        response.json({received: true});
        return;
      }
      throw e;
    });

  switch (body.event) {
    case 'PAYMENT_CREATED':
      const payment = body.payment;
      createPayment(payment);
      break;
    // ... trate outos eventos
    default:
      console.log(`Este evento não é aceito ${body.event}`);
  }

  // Retorne uma resposta para dizer que o webhook foi recebido
  response.json({received: true});
});

app.listen(8000, () => console.log('Running on port 8000'));
Nesta solução, a tabela é usada como um check após o processamento, esse que é feito ainda nos 10s de limite de timeout que o Asaas tem da requisição.
Updated about 2 months ago
________________________________________

Receba eventos do Asaas no seu endpoint de Webhook

Polling vs. Webhooks

Did this page help you?
Polling vs. Webhooks
Por que é melhor usar Webhooks?
Digamos que um cliente entra no seu site/aplicação e realiza uma compra. O seu serviço de compras irá receber uma requisição, que irá enviar para o serviço de pagamentos, que irá chamar um gateway de pagamento do Asaas, correto?
Depois disso você tem duas formas de receber informações do Asaas:
Fazer polling
Após ter criado uma cobrança, a sua aplicação faz várias requisições no Asaas para verificar o status do pagamento, até que o Asaas retorne que ela foi paga.
Porém esta prática tem pontos negativos. Fazer polling implica em usar recursos tanto do lado da sua aplicação como no lado do Asaas. Podendo inclusive fazer sua chave de API ser bloqueada por quota limit.
 
Webhooks
Basicamente é um “me avise de volta em determinada URL quando você tem atualizações nesta cobrança”. Quando o Asaas finalizar o processamento de um pagamento, você receberá em sua URL configurada o status do mesmo.
Dessa forma o paradigma mudou e o seu serviço de pagamento não precisa gastar recursos para verificar o status de uma cobrança.
 
Algumas dicas interessantes na hora de usar Webhooks:
•	Você deve desenvolver uma API do seu lado responsável por receber as requisições do Webhook;
•	É interessante que você crie regras no seu endpoint por razões de segurança. O Asaas possibilita que você defina uma authToken para cada Webhook, por exemplo;
•	Caso algum problema aconteça na comunicação com sua API a sua fila é interrompida e você recebe um e-mail de aviso.
Além da economia de recursos, os Webhooks são uma garantia de que sua aplicação receberá um evento sempre que algo mudar no gateway. O polling pode funcionar para verificar se uma cobrança foi paga, porém não te avisará em caso de atraso no pagamento de um boleto ou quando o pagamento de um cartão de crédito efetivamente caiu na sua conta.
A utilização de Webhooks é a forma mais prática e segura de manter sua aplicação atualizada sobre tudo que acontece no gateway do Asaas.
Updated about 2 months ago
________________________________________

Como implementar idempotência em Webhooks

Eventos de Webhooks

Did this page help you?
Eventos de Webhooks
Navegue para as páginas específicas para visualizar os Webhooks de cada categoria.
•	Eventos para cobranças
•	Eventos para assinaturas
•	Eventos para notas fiscais
•	Eventos para transferências
•	Eventos para pague contas
•	Eventos para antecipações
•	Eventos para recargas de celular
•	Eventos para verificar situação da conta
•	Eventos para checkout


🚧
Eventos em subcontas
Você pode configurar os eventos de webhook também para suas subcontas. Para saber mais sobre subcontas, acesse a seção sobre Subcontas.
Os eventos do webhook sempre ficarão disponíveis na interface da conta na qual ele foi configurado.
Além disso, é possível filtrar oseventos do webhook das suas subcontas através dos filtros na sua conta principal:
 
Updated about 2 months ago
________________________________________

Polling vs. Webhooks

Eventos para cobranças

Did this page help you?
Tipos de envio
Os Webhooks possuem dois tipos de envio disponíveis: sequencial e não sequencial.
Qual a diferença entre os tipos de envio?
No envio Sequencial os eventos são enviados na ordem em que ocorreram. Já no envio Não sequencial, os eventos são enviados sem ordem e fluirão melhor, sendo que não é preciso esperar um envio terminar para começar outro.
Envio Sequencial
Um exemplo comum de envio sequencial é quando você quer que os eventos cheguem na mesma ordem em que o seu cliente realizou as ações.
 
No exemplo acima podemos ver que os eventos de um mesmo pagamento são enviados na sequência de que aconteceram. Dessa forma sabemos que o pagamento da cobrança foi realizado após o vencimento.
Envio Não sequencial
Quando você tem um ou poucos eventos selecionados para um Webhook você pode optar pelo envio Não Sequencial. Por exemplo um Webhook para verificar sucesso em transferências, caso você configure apenas os eventos para confirmar se uma transferência foi confirmada ou cancelada, você só receberá um evento por entidade e não precisa se preocupar com a sequencia em qual os eventos serão enviados.
 
No envio Não sequencial os eventos são enviados mais rapidamente, sem aguardar que os outros concluam e podem vir de várias entidades diferentes.
Updated about 2 months ago
________________________________________

Como reativar fila interrompida

Logs de Webhooks

Did this page help you?
Logs de Webhooks
❗️
O Asaas guarda eventos de Webhooks por 14 dias. Você receberá um e-mail caso haja algum problema de comunicação.
Caso sua fila seja pausada, é de extrema importância que você resolva qualquer problema para evitar perder informações importantes.
⚠️ Os eventos que estiverem mais de 14 dias parados na fila serão excluídos permanentemente.
É possível visualizar os Webhooks enviados e quais erros aconteceram, com detalhes na página de Logs de Webhooks na área de Integrações. Você também pode checar e configurar Webhooks via API, só não é possível visualizar os logs neste caso.
 
Logs de Webhooks para você verificar erros que aconteceram de comunicação.
Visualização de logs de Webhooks de subcontas
Os logs de requisições e de Webhooks das subcontas estão disponíveis para a conta principal consultar via interface. No menu Integrações, nas abas de Logs de Requisições e Logs de Webhooks, utilize o filtro: “Tipo de Conta” e quando você seleciona “subcontas”, um novo campo aparece para buscar pelo identificador da subconta. O campo Identificador da subconta é descritivo e só pode ser buscado uma subconta por vez.
 
Updated about 2 months ago
________________________________________

Tipos de envio

Penalização de filas

Did this page help you?
Penalização de filas
Para garantir a estabilidade do nosso sistema de webhooks e fornecer previsibilidade sobre as tentativas de entrega, o Asaas utiliza um sistema de penalização. Quando o seu endpoint começa a retornar erros, aplicamos intervalos de tempo crescentes entre as novas tentativas.
Este mecanismo se aplica tanto para webhooks configurados no modo sequencial quanto no não sequencial.
📘
Importante
Para as configurações no modo sequencial, a ordem de entrega dos eventos é estritamente garantida. Portanto, se um evento estiver penalizado, todos os eventos seguintes da mesma fila aguardarão o sucesso do envio dele antes de serem processados.
Como funciona a penalização?
Se a sua aplicação retornar qualquer resposta que não seja da família 200, consideramos uma falha. Após a primeira falha, o Asaas iniciará o seguinte ciclo de retentativas e notificações:
Tentativa	Tempo	Ação de notificação
1	0	
2	30 segundos	
3	1 min	
4	3,5 min	
5	5 min	1º E-mail de Alerta
6	15 min	
7	25 min	
8	1 hr	
9	1 hr	
10	1 hr	2º E-mail de Alerta
11	1 hr	
12	1 hr	
13	1 hr	
14	1 hr	
15	3 hrs	3º E-mail (Fila Pausada)
Após 15 falhas consecutivas, a fila de envios para a configuração de webhook específica é pausada.
Novos eventos continuarão sendo gerados e enfileirados, mas não serão enviados até você reativar a fila manualmente. Veja mais detalhes sobre a fila pausada em fila pausada.
Updated 4 days ago
________________________________________

Logs de Webhooks

Fila pausada

Did this page help you?
Fila pausada
O que fazer nestes casos?
O Asaas utiliza respostas HTTP convencionais para indicar sucesso ou falha nas requisições.
Ao ativar o Webhook, sempre que houver alterações nos recursos integrados, será feito uma requisição POST para o endereço configurado, contendo o evento e o recurso envolvido. Para que o Asaas considere a notificação como processada com sucesso, o status HTTP da resposta da aplicação do cliente deve ser 200.
📘
Qualquer outro retorno que o Asaas receber (seja 308, 404, 403, 500, etc) é considerada uma falha de comunicação.
Quando houver algum problema no envio de Webhooks, você receberá um e-mail do Asaas no e-mail cadastrado informando o problema. Após isso, o Asaas continuará tentando enviar o mesmo evento. Caso o erro aconteça por 15 vezes seguidas, a fila da envios é pausada e você para de receber novos eventos até que reative a fila no painel.
 
Webhook de cobranças com fila de sincronização interrompida.
Com a fila interrompida, novos eventos continuam sendo gerados e salvos pelo Asaas, porém não são mais enviados para sua aplicação até que você reative ela. Quando reativada, todos os eventos acumulados serão enviados em sequência.
________________________________________
Veja mais: Como visualizar logs de Webhooks
________________________________________
Códigos HTTP e o Comportamento dos Webhooks no Asaas
2xx – Sucesso
Indica que o Webhook foi entregue corretamente e o endpoint do cliente respondeu com sucesso.
Resultado: evento considerado entregue. Nenhuma ação é necessária.
Entretanto, no Asaas consideramos como sucesso somente o HTTP 200. Certifique-se de retornar 200 nos webhooks.
________________________________________
3xx – Redirecionamento
Significa que o endpoint está tentando redirecionar a requisição para outra URL.
O Asaas não segue redirecionamentos automaticamente, o que pode gerar falha de entrega.
Resultado: evento vai para a fila pausada. É necessário corrigir a URL do Webhook.
________________________________________
4xx – Erros do Cliente
Essa faixa representa erros causados por problemas no próprio endpoint do webhook do cliente, como URL incorreta, falta de autenticação ou rejeição do conteúdo.
Resultado: evento entra na fila pausada e não será reprocessado automaticamente. O cliente precisa corrigir a falha.
________________________________________
5xx – Erros do Servidor
Indica que o servidor do cliente recebeu a requisição, mas não conseguiu processá-la por falhas internas ou instabilidades.
Resultado: se o erro for pontual, pode haver reenvio. Se persistir, o evento vai para a fila pausada. O cliente deve estabilizar o sistema.
Se você encontrar alguma mensagem de erro ou código HTTP de resposta nos logs e ficar em dúvida sobre como resolver, você pode consultar os guias abaixo:
•	Erro 400 (Bad Request)
•	Erro 404 (Not Found)
•	Erro 403 (Forbidden)
•	Erro 408 - Read Timed Out
•	Erro 500 (Internal Server Error)
•	Erro Connect Timed Out
•	Outros erros
Updated about 2 months ago
________________________________________

Penalização de filas

Erro 400 (Bad Request)

Did this page help you?
Bloqueio do Firewall na CloudFlare
O CloudFlare é uma das soluções de Firewall mais utilizadas mundialmente para sites.
Se a sua solução de Firewall for CloudFlare e estiver enfrentando o erro HTTP 403 na sincronização dos webhooks, você precisará criar algumas regras no seu Firewall para o correto funcionamento dos Webhooks Asaas com o seu sistema.
Primeiro, acesse as configurações do domínio de seu sistema no CloudFlare. Ao expandir a Visão Geral do domínio, vá até o menu “Segurança > WAF”.
No lado direito, escolha a opção “Regras de acesso de IP” e crie a regra de permitir todos os IPs oficiais do Asaas (clique no link para saber mais).
 
Obs.: em sandbox pode haver outros IPs, siga bloqueando, vá em Segurança > Eventos e libere o IP bloqueado também:
 
Ao acessar a página a lista de IPs bloqueados aparecerão na lista, basta copiar o IP e liberá-los.
Finalizando a configuração, basta acessar o menu de Configurações do Webhook em sua conta Asaas, e reativar a fila de sincronização para conferir se a situação está resolvida.
Updated about 2 months ago
________________________________________

Outros Erros

IPs oficiais do Asaas

Did this page help you?
IPs oficiais do Asaas
O Asaas possui IPs oficiais pelos quais se comunica com sua aplicação através dos webhooks. Você pode utilizá-los para liberar acesso em sua aplicação através do firewall ou para bloquear outros IPs que não sejam estes, por questão de segurança.
•	52.67.12.206
•	18.230.8.159
•	54.94.136.112
•	54.94.183.101
Updated about 2 months ago
________________________________________

Bloqueio do Firewall na CloudFlare

Transferências

Did this page help you?

