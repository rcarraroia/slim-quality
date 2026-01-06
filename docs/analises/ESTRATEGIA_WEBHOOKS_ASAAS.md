# Estratégia de Webhooks Asaas

## Módulos Analisados

- `src/services/asaas.service.ts`: Serviço de integração com a API v3 do Asaas.
- `src/api/routes/webhooks/asaas-webhook.ts`: Handler atual de webhooks (base para expansão).
- `src/services/sales/order-affiliate-processor.ts`: Lógica de associação de pedidos e cálculo de comissões.
- `src/services/asaas/wallet-validator.service.ts`: Validação de subcontas Asaas para split.
- `src/api/routes/affiliates.ts`: Gerenciamento de cadastros e links de afiliados.

## Eventos Necessários

### Pagamentos
- `PAYMENT_RECEIVED`: Confirmação de recebimento (PIX/Boleto). Ação: Marcar pedido como pago e iniciar processamento de comissões.
- `PAYMENT_CONFIRMED`: Confirmação de pagamento (Cartão). Ação: Marcar pedido como pago e iniciar processamento de comissões.
- `PAYMENT_OVERDUE`: Pagamento vencido. Ação: Mudar status do pedido para "Atrasado" e notificar cliente.
- `PAYMENT_DELETED`: Cobrança removida no Asaas. Ação: Marcar pedido como cancelado.
- `PAYMENT_REFUNDED`: Pagamento estornado. Ação: Reverter comissões de afiliados e atualizar saldo.

### Splits
- `PAYMENT_SPLIT_PAID`: Split liquidado com sucesso na subconta. Ação: Mudar status da comissão para "Liquidada".
- `PAYMENT_SPLIT_FAILED`: Falha no processamento do split. Ação: Logar erro e alertar administração para reprocessamento manual.

### Afiliados
- `TRANSFER_CONFIRMED`: (Opcional) Transferência de saldo da subconta do afiliado para conta bancária. Ação: Log de histórico de saques.
- **Observação**: Os eventos de Afiliados no nosso sistema são disparados majoritariamente pelos eventos de `PAYMENT_*` e `PAYMENT_SPLIT_*` citados acima.

## Recomendação: Única
**Justificativa:**
1. **Consistência de Dados**: Um único endpoint facilita o logging centralizado em `webhook_logs`, facilitando a depuração de fluxos complexos.
2. **Segurança**: Centraliza a validação HMAC em um único ponto, reduzindo a superfície de ataque e erros de configuração.
3. **Escalabilidade**: O uso de um roteador interno por `event_type` é altamente extensível para novos eventos sem necessidade de abrir novas rotas no servidor.
4. **Idempotência**: Facilita a verificação de registros duplicados em uma única tabela de controle.

## Estrutura Proposta

```typescript
// src/api/routes/webhooks/asaas-webhook.ts

router.post('/asaas', async (req, res) => {
  const { event, payment } = req.body;
  const signature = req.headers['x-asaas-signature'];

  // 1. Validação de Segurança HMAC
  if (!verifyAsaasSignature(req.rawBody, signature)) {
    return res.status(401).send('Unauthorized');
  }

  // 2. Registro de Log de Auditoria Inicial
  await logWebhook('asaas', event, payment.id, req.body);

  try {
    switch (event) {
      case 'PAYMENT_RECEIVED':
      case 'PAYMENT_CONFIRMED':
        await handlePaymentSuccess(payment);
        break;
      case 'PAYMENT_REFUNDED':
        await handlePaymentRefund(payment);
        break;
      case 'PAYMENT_SPLIT_PAID':
        await handleSplitSuccess(payment);
        break;
      // ... demais casos
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error(`Erro processando webhook ${event}:`, error);
    // Respondemos 200 para evitar retries infinitos do Asaas em caso de erro lógico
    // O erro já está logado para ação manual.
    res.status(200).json({ success: false, error: 'Internal logic error' });
  }
});
```

## Conexão MCP Server (IA)
A análise da documentação do Asaas indica que a conexão via **MCP Server** (`https://docs.asaas.com/mcp`) é altamente benéfica para o processo de desenvolvimento.
- **Benefício**: Permite que assistentes de IA (como o Antigravity) consultem a documentação técnica e os schemas da API v3 em tempo real, gerando handlers de webhook e chamadas de API 100% compatíveis com a versão atual do Asaas.
- **Ação**: Recomendamos configurar o servidor MCP no ambiente local do desenvolvedor (`.cursor/mcp.json` ou similar).

## Próximos Passos
1. **Refatoração**: Migrar o handler atual para a estrutura modular de Dispatcher.
2. **Expansão**: Implementar o `handlePaymentRefund` para garantir reversão de comissões.
3. **Monitoramento**: Adicionar alertas para o evento `PAYMENT_SPLIT_FAILED` no Dashboard Admin.
4. **Segurança**: Habilitar obrigatoriedade de `x-asaas-signature` em ambiente de staging e production.
