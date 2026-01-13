# Tarefas: Implementação Webhook Asaas

- [ ] 1. Configurar variáveis de ambiente (`ASAAS_WEBHOOK_SECRET`) em ambiente local e Easypanel.
- [ ] 2. Implementar `verify_asaas_signature` em `agent/src/api/webhooks_asaas.py`.
- [ ] 3. Criar handlers para cada evento suportado.
- [ ] 4. Integrar com o cliente Supabase existente no backend Python.
- [ ] 5. Implementar chamada à RPC `calculate_commission_split`.
- [ ] 6. Registrar o router em `agent/src/api/main.py`.
- [ ] 7. Criar script de teste local para simular payloads do Asaas.
- [ ] 8. Validar logs na tabela `webhook_logs`.
