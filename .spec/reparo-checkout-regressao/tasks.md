# Tarefas: Reparo do Checkout e Afiliados

## 📋 Checklist de Execução

### Fase 1: Saneamento de Código
- [ ] Corrigir erro de sintaxe no `api/checkout.js` (Bloco residual pós-remoção).
- [ ] Validar sintaxe com `node --check api/checkout.js`.
- [ ] Remover qualquer referência restante a `isSubscription` que não seja na Guard Clause de proteção.

### Fase 2: Correção de Integridade de Dados
- [ ] Atualizar `processAffiliateTracking` em `src/services/checkout.service.ts`.
- [ ] Adicionar busca de `affiliate_id` no Supabase antes da inserção.
- [ ] Testar inserção manual via script para validar constraint.

### Fase 3: Validação Final
- [ ] Simular checkout de Produto Físico (PIX).
- [ ] Simular checkout de Produto Físico (Cartão).
- [ ] Capturar logs de sucesso e erro.
- [ ] Gerar Relatório de Validação `docs/validacoes/VALIDACAO_REPARO_CHECKOUT.md`.

## [ ] APROVAÇÃO DO USUÁRIO
*Assinatura para início dos trabalhos: ____________________*
