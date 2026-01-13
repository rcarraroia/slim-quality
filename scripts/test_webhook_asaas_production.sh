#!/bin/bash

# Script para testar webhook Asaas em produção
# Simula evento PAYMENT_CONFIRMED que dispara cálculo de comissões

echo "🧪 TESTE DO WEBHOOK ASAAS - PRODUÇÃO"
echo "===================================="
echo ""

# URL do webhook em produção
WEBHOOK_URL="https://api.slimquality.com.br/api/webhooks/asaas"

# 1. Testar health check
echo "1️⃣ Testando health check do webhook..."
curl -s -X GET "${WEBHOOK_URL}/health" | jq '.'
echo ""

# 2. Simular evento PAYMENT_CONFIRMED
echo "2️⃣ Simulando evento PAYMENT_CONFIRMED..."
echo ""

# Payload de teste (baseado na estrutura real do Asaas)
PAYLOAD='{
  "event": "PAYMENT_CONFIRMED",
  "payment": {
    "id": "pay_test_123456",
    "customer": "cus_000005735957",
    "billingType": "CREDIT_CARD",
    "value": 3290.00,
    "netValue": 3125.50,
    "originalValue": 3290.00,
    "interestValue": 0,
    "description": "Colchão Magnético Padrão",
    "externalReference": "ORDER_ID_AQUI",
    "dueDate": "2026-01-11",
    "paymentDate": "2026-01-11",
    "clientPaymentDate": "2026-01-11",
    "installmentNumber": null,
    "invoiceUrl": "https://www.asaas.com/i/test",
    "invoiceNumber": "12345",
    "status": "CONFIRMED",
    "confirmedDate": "2026-01-11"
  }
}'

# Enviar requisição
RESPONSE=$(curl -s -X POST "${WEBHOOK_URL}" \
  -H "Content-Type: application/json" \
  -H "X-Asaas-Signature: test_signature" \
  -d "${PAYLOAD}")

echo "📤 Resposta do webhook:"
echo "${RESPONSE}" | jq '.'
echo ""

# 3. Verificar logs no Easypanel
echo "3️⃣ PRÓXIMO PASSO:"
echo "   Verifique os logs no Easypanel para confirmar:"
echo "   - ✅ Webhook recebido"
echo "   - ✅ Pedido atualizado para 'paid'"
echo "   - ✅ RPC calculate_commission_split chamada"
echo "   - ✅ Comissões calculadas"
echo ""

echo "✅ Teste concluído!"
echo ""
echo "📋 CHECKLIST:"
echo "   [ ] Health check retornou 200 OK"
echo "   [ ] Webhook retornou status 'received'"
echo "   [ ] Logs mostram processamento"
echo "   [ ] Comissões foram criadas no banco"
