# Script de limpeza automática do Docker (PowerShell)
# Executa após cada deploy para manter espaço livre

Write-Host "🧹 Iniciando limpeza do Docker..." -ForegroundColor Green

# Mostrar espaço antes
Write-Host "📊 Espaço antes da limpeza:" -ForegroundColor Yellow
docker system df

# Limpeza agressiva (remove tudo não utilizado)
Write-Host "🗑️ Removendo imagens, containers e cache não utilizados..." -ForegroundColor Yellow
docker system prune -a --volumes -f

# Mostrar espaço depois
Write-Host "✅ Espaço após limpeza:" -ForegroundColor Green
docker system df

Write-Host "🎉 Limpeza concluída!" -ForegroundColor Green