# Design: Estratégia de Webhooks Asaas

## 1. Arquitetura Proposta: Webhook Único (Opção A)
Centralização total em `/api/webhooks/asaas`. Esta abordagem foi escolhida pela simplicidade de manutenção e consistência dos logs de auditoria.

### Roteamento Interno
O handler principal atuará como um "Dispatcher":

```typescript
switch (payload.event) {
  case 'PAYMENT_RECEIVED':
  case 'PAYMENT_CONFIRMED':
    return PaymentHandler.processSuccess(payload);
  case 'PAYMENT_OVERDUE':
    return PaymentHandler.processOverdue(payload);
  case 'PAYMENT_SPLIT_PAID':
    return SplitHandler.processPaid(payload);
  // ... outros eventos
}
```

## 2. Fluxo de Dados
1. **Recepção**: Endpoint recebe POST.
2. **Log Inicial**: Salva `{raw_payload, timestamp}` em `webhook_logs`.
3. **Validação**: Checa HMAC. Se falhar, atualiza log e retorna 401.
4. **Idempotência**: Verifica se o `payment.id` + `event` já foi processado no dia.
5. **Processamento**: Executa lógica de negócio.
6. **Log Final**: Atualiza entrada original com o `status` (success/failed) e `result_message`.

## 3. Integração com MCP
Para acelerar o desenvolvimento e manutenção:
- Configurar `mcpServers` com `https://docs.asaas.com/mcp`.
- O servidor MCP permite que a IA valide se os tipos de dados do webhook condizem com a versão atual da API do Asaas sem sair do contexto do código.

## 4. Segurança
- Segredo armazenado em `ASAAS_WEBHOOK_SECRET`.
- Validação via `crypto.timingSafeEqual` para mitigar ataques de tempo.
