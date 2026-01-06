# Tarefas: Estratégia de Webhooks Asaas

## [ ] Fase 1: Fundação
- [ ] Criar estrutura de folders `src/api/routes/webhooks/handlers/`
- [ ] Mover lógica HMAC para um middleware de validação reutilizável.
- [ ] Criar `BaseWebhookHandler` abstrato.

## [ ] Fase 2: Expansão de Eventos
- [ ] Implementar `PaymentEventsHandler` para tratar `OVERDUE` e `DELETED`.
- [ ] Implementar `SplitEventsHandler` para tratar `PAYMENT_SPLIT_PAID`.
- [ ] Adicionar método `reverseCommission` em `OrderAffiliateProcessor`.

## [ ] Fase 3: Monitoramento e MCP
- [ ] Script de teste de webhook injetando payloads reais de split.
- [ ] Adicionar configuração do Asaas MCP em `.cursor/mcp.json` ou similar conforme documentação.
- [ ] Validar logs em `supabase/migrations` (verificar se campos de split existem).

## [ ] Fase 4: Validação
- [ ] Teste unitário de HMAC.
- [ ] Simulação de payload de estorno.
