# Requisitos: Estratégia de Webhooks Asaas

## 1. Descrição Funcional
O sistema Slim Quality depende da sincronização em tempo real com o Asaas para gerenciar o ciclo de vida dos pedidos e as comissões dos afiliados. A estratégia atual processa apenas o "sucesso" do pagamento. É necessário tratar o ciclo completo, incluindo atrasos, cancelamentos e a liquidação dos splits.

## 2. Regras de Negócio
- **Confirmação de Venda**: Atualmente `PAYMENT_RECEIVED` e `PAYMENT_CONFIRMED`. Deve permanecer disparando o `OrderAffiliateProcessor`.
- **Inadimplência**: Evento `PAYMENT_OVERDUE` deve marcar o pedido como atrasado.
- **Cancelamento/Estorno**: Eventos `PAYMENT_DELETED` e `PAYMENT_REFUNDED` devem disparar a reversão da comissão (decremento do saldo do afiliado).
- **Splits**: O evento `PAYMENT_SPLIT_PAID` deve ser o gatilho final para marcar uma comissão como "Liquidada" no sistema.
- **Falha de Split**: `PAYMENT_SPLIT_FAILED` deve alertar o administrador em `webhook_logs` para intervenção manual.

## 3. Critérios de Aceite
- O webhook deve responder `200 OK` em menos de 2 segundos.
- Todos os payloads brutos devem ser salvos em `webhook_logs` antes do processamento.
- A assinatura HMAC (`x-asaas-signature`) deve ser obrigatória em produção.
- Erros de processamento não devem impedir a resposta `200 OK` ao Asaas (para evitar loops), mas devem ser logados com stacktrace.
