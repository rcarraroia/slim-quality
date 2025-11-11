# Como testar as chamadas aqui na documentação

# Como testar as chamadas aqui na documentação

A documentação interativa da Asaas permite testar chamadas da API diretamente por ela! Veja o passo a passo abaixo.

✅ Passo 1: Crie sua conta no ambiente Sandbox

Antes de realizar as chamadas em nossa documentação, você precisa de uma conta no ambiente Sandbox.

1.  Acesse: https://sandbox.asaas.com
2.  Crie sua conta gratuitamente
3.  Dentro do Menu (o menu fica no bonequinho cinza no canto superior direito da tela), vá em Integrações > Chave da API
4.  Copie a sua chave de API

⚠️

Importante: as chamadas pela documentação funcionam apenas com a chave sandbox. Não use a chave de produção aqui.

Saiba mais sobre o Sandbox

🔐 Segurança e boas práticas:

A chave Sandbox é exclusiva para testes e pode ser usada sempre que você quiser simular integrações sem impactos reais. Essa sempre será a chave que utilizará para testes! No entanto, a chave de produção deve ser armazenada com segurança e jamais compartilhada publicamente.

Recomendamos seguir boas práticas de segurança para o armazenamento de chaves sensíveis. Confira nossos artigos sobre o tema:
👉 Como armazenar sua chave com segurança

🔑 Passo 2: Cole sua chave na documentação

Na nossa documentação, escolha a rota que quer utilizar. Na lateral direita, abaixo de "Asaas", temos diversas abas onde pode selecionar a rota desejada:

No topo da documentação interativa, no canto superior direito, localize o campo Header e cole sua chave de API

🧾 Passo 3: Preencha os parâmetros obrigatórios

Quando você escolher qual chamada API que realizar, notará que alguns campos são obrigatórios:

*   Os campos obrigatórios têm “required” escrito ao lado
*   Leia as descrições ao lado de cada campo para saber o que preencher
*   Alguns campos contém exemplos que ajudam a entender o formato de preenchimento. Você pode utilizar a informação contida neles para preenchê-los, mas em campos do tipo data use datas futuras (maiores que o dia de hoje) e nos campos do tipo id , use idsda sua conta em sandbox (ex: id de um cliente que você tenha criado na sua conta sandbox, id de uma cobrança que tenha criado em sandbox)

💡
Dica: Recomendamos que você crie um cliente na sua conta Asaas antes de qualquer outra ação - ele será o ponto de partida para os seus próximos testes. Após criar o cliente, você poderá utilizar o ID retornado para gerar cobranças, assinaturas, parcelamentos e outros recursos disponíveis.
🚀 Passo 4: Execute a requisição
Clique em Try It! após preencher os dados
Veja a resposta exibida logo abaixo

A resposta traz:

*   Status HTTP (ex: 200 OK, 400 Bad Request, etc)
*   Corpo JSON com os dados do recurso
❗ Erros comuns
Para status diferentes de 200 (sucesso), consulte nossa documentação de códigos HTTP:
https://docs.asaas.com/reference/codigos-http-das-respostas
Os erros geralmente vêm acompanhados de mensagens explicativas, mas o código já ajuda a identificar o problema junto da nossa documentação!
🧩 Sugestão de rotas para começar

Quer começar testando sem complicação? Aqui estão algumas rotas úteis:

*   Criar cliente
*   Criar nova cobrança
*   Consultar cobranças

Updated about 1 month ago

Did this page help you?

Yes

No