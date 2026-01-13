# Script para testar webhook Asaas em produção
# Simula evento PAYMENT_CONFIRMED que dispara cálculo de comissões

Write-Host "Teste do Webhook Asaas - Producao" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# URL do webhook em produção
$webhookUrl = "https://api.slimquality.com.br/api/webhooks/asaas"

# 1. Testar health check
Write-Host "1. Testando health check do webhook..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "$webhookUrl/health" -Method Get
    Write-Host "OK Health check OK:" -ForegroundColor Green
    $healthResponse | ConvertTo-Json -Depth 10
} catch {
    Write-Host "ERRO no health check: $_" -ForegroundColor Red
}
Write-Host ""

# 2. Simular evento PAYMENT_CONFIRMED
Write-Host "2. Simulando evento PAYMENT_CONFIRMED..." -ForegroundColor Yellow
Write-Host ""

# Payload de teste (baseado na estrutura real do Asaas)
$payload = @{
    event = "PAYMENT_CONFIRMED"
    payment = @{
        id = "pay_test_123456"
        customer = "cus_000005735957"
        billingType = "CREDIT_CARD"
        value = 3290.00
        netValue = 3125.50
        originalValue = 3290.00
        interestValue = 0
        description = "Colchão Magnético Padrão"
        externalReference = "ORDER_ID_AQUI"
        dueDate = "2026-01-11"
        paymentDate = "2026-01-11"
        clientPaymentDate = "2026-01-11"
        installmentNumber = $null
        invoiceUrl = "https://www.asaas.com/i/test"
        invoiceNumber = "12345"
        status = "CONFIRMED"
        confirmedDate = "2026-01-11"
    }
} | ConvertTo-Json -Depth 10

# Headers
$headers = @{
    "Content-Type" = "application/json"
    "X-Asaas-Signature" = "test_signature"
}

# Enviar requisição
try {
    $response = Invoke-RestMethod -Uri $webhookUrl -Method Post -Headers $headers -Body $payload
    Write-Host "Resposta do webhook:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "ERRO ao enviar webhook: $_" -ForegroundColor Red
    Write-Host "Detalhes: $($_.Exception.Response)" -ForegroundColor Red
}
Write-Host ""

# 3. Verificar logs no Easypanel
Write-Host "3. PROXIMO PASSO:" -ForegroundColor Yellow
Write-Host "   Verifique os logs no Easypanel para confirmar:" -ForegroundColor White
Write-Host "   - OK Webhook recebido" -ForegroundColor White
Write-Host "   - OK Pedido atualizado para paid" -ForegroundColor White
Write-Host "   - OK RPC calculate_commission_split chamada" -ForegroundColor White
Write-Host "   - OK Comissoes calculadas" -ForegroundColor White
Write-Host ""

Write-Host "OK Teste concluido!" -ForegroundColor Green
Write-Host ""
Write-Host "CHECKLIST:" -ForegroundColor Cyan
Write-Host "   [ ] Health check retornou 200 OK" -ForegroundColor White
Write-Host "   [ ] Webhook retornou status received" -ForegroundColor White
Write-Host "   [ ] Logs mostram processamento" -ForegroundColor White
Write-Host "   [ ] Comissoes foram criadas no banco" -ForegroundColor White
