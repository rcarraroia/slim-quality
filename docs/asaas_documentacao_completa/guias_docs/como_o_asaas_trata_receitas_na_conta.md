# Como o Asaas trata receitas na conta?

# Como o Asaas trata receitas na conta?

Sempre que sua conta recebe um pagamento, uma cobrança é atrelada a ele e a receita é adicionada ao seu extrato. A mesma coisa acontece para qualquer outra receita que entre na sua conta, onde o Asaas cria cobranças automaticamente.

> 📘
> 
> É importante sempre estar atento no Webhook de Cobranças e preparar sua aplicação para diferenciar cada cobrança criada.

A assinatura é uma funcionalidade que cria novas cobranças. Quando é uma assinatura por cartão de crédito a cobrança é paga automaticamente, se for uma assinatura por boleto, por exemplo, uma cobrança é criada e enviada ao seu cliente. Um campo chamado `subscription` com o ID da assinatura será adicionado em todas as cobranças criadas provenientes de assinaturas.

Ao finalizar um link de pagamento, uma cobrança também é criada. Quando o Link é pago no cartão de crédito cobrança é criada e paga automaticamente, o mesmo pode acontecer com o Pix. No boleto uma fatura é gerada para se paga conforme configurações. Nestes casos, o campo `paymentLink` será adicionado na cobrança criada com o ID do link de pagamento.

Você pode criar um QR Code estático, onde sua conta recebe pagamentos via Pix. Nestes casos uma cobrança também será criada, com o `billingType` como `PIX` e o campo `pixQrCodeId` conterá o ID do QR Code estático criado.

No extrato será exibido a cobrança com a descrição "Cobrança criada automaticamente a partir de Pix recebido".

Da mesma forma, transferências recebidas, sejam por TED ou Chave Pix também geram automaticamente a criação de uma cobrança, transferências TED recebem uma descrição "Cobrança gerada automaticamente a partir de TED recebido", já as de Pix recebem também o campo `pixTransaction` informando o ID da transação Pix.

Updated about 1 month ago

Did this page help you?

Yes

No

Ask AI