# Requisitos: Webhook Asaas (FastAPI)

## 📌 Objetivo
Portar a lógica de recebimento de notificações do Asaas do backend Express (Node.js) para o backend FastAPI (Python), garantindo que as notificações de pagamento sejam processadas corretamente na infraestrutura de produção atual.

## 🎯 Critérios de Aceite
1. **Endpoid POST**: Criar a rota `POST /api/webhooks/asaas`.
2. **Endpoint Health**: Criar a rota `GET /api/webhooks/asaas/health`.
3. **Segurança**: Validar a assinatura `x-asaas-signature` usando o token configurado no ambiente.
4. **Eventos Suportados**:
   - `PAYMENT_RECEIVED`: Atualizar pedido para `processing`.
   - `PAYMENT_CONFIRMED`: Atualizar pedido para `paid` e disparar cálculo de comissão.
   - `PAYMENT_OVERDUE`: Atualizar pedido para `overdue`.
   - `PAYMENT_REFUNDED`: Atualizar pedido para `refunded` e cancelar comissões.
   - `PAYMENT_SPLIT_CANCELLED` / `PAYMENT_SPLIT_DIVERGENCE_BLOCK`: Registrar erro de split.
5. **Integração Supabase**:
   - Atualizar tabelas `orders` e `payments`.
   - Chamar RPC `calculate_commission_split`.
   - Logar eventos em `webhook_logs`.
6. **Robustez**: Implementar mecanismo de retry (opcional no Python se o Asaas já fizer, mas bom ter logs claros de falha).

## ⚠️ Regras de Negócio
- A comissão total é de 30%, dividida entre os níveis de afiliados conforme definido na RPC.
- O evento `PAYMENT_CREATED` deve ser ignorado ou apenas logado (não processado).
