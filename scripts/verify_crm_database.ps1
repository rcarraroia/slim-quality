# Script PowerShell para verificar banco de dados CRM
# Usa Supabase CLI para consultar banco real

Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host ("=" * 79) -ForegroundColor Cyan
Write-Host "VERIFICAÇÃO DO BANCO DE DADOS - SPRINT 5 CRM" -ForegroundColor Yellow
Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host ("=" * 79) -ForegroundColor Cyan
Write-Host ""

# Verificar se Supabase CLI está instalado
Write-Host "Verificando Supabase CLI..." -ForegroundColor Cyan
$supabaseVersion = supabase --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Supabase CLI não encontrado!" -ForegroundColor Red
    Write-Host "Instale com: scoop install supabase" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Supabase CLI instalado: $supabaseVersion" -ForegroundColor Green
Write-Host ""

# Executar verificação SQL
Write-Host "Executando verificação no banco de dados..." -ForegroundColor Cyan
Write-Host ""

$output = supabase db execute -f scripts/verify_crm_tables.sql 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao executar query!" -ForegroundColor Red
    Write-Host $output -ForegroundColor Red
    Write-Host ""
    Write-Host "Possíveis causas:" -ForegroundColor Yellow
    Write-Host "1. Não está linkado ao projeto: supabase link --project-ref SEU_PROJECT_REF" -ForegroundColor Yellow
    Write-Host "2. Não está logado: supabase login" -ForegroundColor Yellow
    Write-Host "3. Tabelas não existem no banco" -ForegroundColor Yellow
    exit 1
}

# Mostrar resultado
Write-Host $output
Write-Host ""

# Salvar relatório
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$reportFile = "database_crm_report_$timestamp.txt"
$output | Out-File -FilePath $reportFile -Encoding UTF8

Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host ("=" * 79) -ForegroundColor Cyan
Write-Host "RELATÓRIO SALVO" -ForegroundColor Green
Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host ("=" * 79) -ForegroundColor Cyan
Write-Host "📄 Arquivo: $reportFile" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Verificação concluída!" -ForegroundColor Green
