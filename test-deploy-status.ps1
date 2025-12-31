# Teste de status do deploy
Write-Host "🧪 Testando deploy do Slim Agent..." -ForegroundColor Blue

# Aguardar deploy
Write-Host "⏳ Aguardando deploy (60s)..." -ForegroundColor Yellow
Start-Sleep -Seconds 60

# Testar health check
Write-Host "🏥 Testando health check..." -ForegroundColor Blue
try {
    $response = Invoke-WebRequest -Uri "https://api.slimquality.com.br/health" -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Health check OK - Status: $($response.StatusCode)" -ForegroundColor Green
        Write-Host "Response: $($response.Content.Substring(0, [Math]::Min(200, $response.Content.Length)))" -ForegroundColor Gray
    } else {
        Write-Host "⚠️ Health check retornou: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Health check falhou: $($_.Exception.Message)" -ForegroundColor Red
}

# Testar documentação
Write-Host "📚 Testando documentação..." -ForegroundColor Blue
try {
    $response = Invoke-WebRequest -Uri "https://api.slimquality.com.br/docs" -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Documentação OK - Status: $($response.StatusCode)" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Documentação retornou: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Documentação falhou: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "🎯 Teste concluído!" -ForegroundColor Blue