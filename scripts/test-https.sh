#!/bin/bash

# Script de teste HTTPS completo
# Valida SSL, redirect e endpoints principais

set -e

DOMAIN="api.slimquality.com.br"
BASE_URL="https://$DOMAIN"

echo "🔍 TESTANDO ACESSO HTTPS COMPLETO"
echo "=================================="
echo "Domain: $DOMAIN"
echo "Base URL: $BASE_URL"
echo ""

# Função para testar endpoint
test_endpoint() {
    local url=$1
    local expected_status=$2
    local description=$3
    
    echo "📡 Testando: $description"
    echo "   URL: $url"
    
    # Fazer request e capturar status
    response=$(curl -s -w "HTTPSTATUS:%{http_code};TIME:%{time_total}" "$url" || echo "HTTPSTATUS:000;TIME:0")
    
    # Extrair status code e tempo
    status_code=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    time_total=$(echo "$response" | grep -o "TIME:[0-9.]*" | cut -d: -f2)
    
    # Validar resultado
    if [ "$status_code" = "$expected_status" ]; then
        echo "   ✅ Status: $status_code (OK)"
        echo "   ⏱️  Tempo: ${time_total}s"
    else
        echo "   ❌ Status: $status_code (Esperado: $expected_status)"
        echo "   ⏱️  Tempo: ${time_total}s"
        return 1
    fi
    echo ""
}

# Função para testar SSL
test_ssl() {
    echo "🔒 TESTANDO CERTIFICADO SSL"
    echo "=========================="
    
    # Verificar certificado
    echo "📋 Informações do certificado:"
    cert_info=$(echo | openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" 2>/dev/null | openssl x509 -noout -text 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        # Extrair informações importantes
        issuer=$(echo "$cert_info" | grep "Issuer:" | head -1)
        subject=$(echo "$cert_info" | grep "Subject:" | head -1)
        not_after=$(echo "$cert_info" | grep "Not After" | head -1)
        
        echo "   Issuer: $issuer"
        echo "   Subject: $subject"
        echo "   Expiry: $not_after"
        echo "   ✅ Certificado SSL válido"
    else
        echo "   ❌ Erro ao verificar certificado SSL"
        return 1
    fi
    echo ""
}

# Função para testar redirect HTTP → HTTPS
test_redirect() {
    echo "🔄 TESTANDO REDIRECT HTTP → HTTPS"
    echo "================================"
    
    http_url="http://$DOMAIN/health"
    echo "📡 Testando redirect de: $http_url"
    
    # Testar redirect (não seguir redirects)
    response=$(curl -s -w "HTTPSTATUS:%{http_code};LOCATION:%{redirect_url}" -o /dev/null "$http_url")
    
    status_code=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    location=$(echo "$response" | grep -o "LOCATION:.*" | cut -d: -f2-)
    
    if [ "$status_code" = "301" ] || [ "$status_code" = "302" ]; then
        echo "   ✅ Redirect Status: $status_code (OK)"
        echo "   📍 Location: $location"
        
        # Verificar se redirect é para HTTPS
        if [[ "$location" == https://* ]]; then
            echo "   ✅ Redirect para HTTPS: OK"
        else
            echo "   ❌ Redirect não é para HTTPS"
            return 1
        fi
    else
        echo "   ❌ Redirect Status: $status_code (Esperado: 301 ou 302)"
        return 1
    fi
    echo ""
}

# Função para testar performance
test_performance() {
    echo "⚡ TESTANDO PERFORMANCE"
    echo "====================="
    
    url="$BASE_URL/health"
    echo "📡 Testando performance de: $url"
    
    # Fazer múltiplas requests para medir performance
    total_time=0
    requests=5
    
    for i in $(seq 1 $requests); do
        time_total=$(curl -s -w "%{time_total}" -o /dev/null "$url")
        total_time=$(echo "$total_time + $time_total" | bc -l)
        echo "   Request $i: ${time_total}s"
    done
    
    # Calcular média
    avg_time=$(echo "scale=3; $total_time / $requests" | bc -l)
    avg_time_ms=$(echo "scale=0; $avg_time * 1000" | bc -l)
    
    echo "   📊 Tempo médio: ${avg_time}s (${avg_time_ms}ms)"
    
    # Validar se está dentro do limite (< 200ms)
    if (( $(echo "$avg_time_ms < 200" | bc -l) )); then
        echo "   ✅ Performance: OK (< 200ms)"
    else
        echo "   ⚠️  Performance: Lenta (> 200ms)"
    fi
    echo ""
}

# Executar todos os testes
main() {
    echo "🚀 Iniciando testes HTTPS completos..."
    echo "Timestamp: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
    echo ""
    
    # Contador de falhas
    failures=0
    
    # Teste 1: SSL Certificate
    if ! test_ssl; then
        ((failures++))
    fi
    
    # Teste 2: HTTP → HTTPS Redirect
    if ! test_redirect; then
        ((failures++))
    fi
    
    # Teste 3: Health Check HTTPS
    if ! test_endpoint "$BASE_URL/health" "200" "Health Check"; then
        ((failures++))
    fi
    
    # Teste 4: API Documentation
    if ! test_endpoint "$BASE_URL/docs" "200" "API Documentation (Swagger)"; then
        ((failures++))
    fi
    
    # Teste 5: OpenAPI Schema
    if ! test_endpoint "$BASE_URL/openapi.json" "200" "OpenAPI Schema"; then
        ((failures++))
    fi
    
    # Teste 6: Performance
    if ! test_performance; then
        ((failures++))
    fi
    
    # Resultado final
    echo "📋 RESULTADO FINAL"
    echo "=================="
    
    if [ $failures -eq 0 ]; then
        echo "✅ TODOS OS TESTES PASSARAM!"
        echo "🎉 HTTPS configurado corretamente"
        echo "🔒 SSL funcionando"
        echo "🔄 Redirect funcionando"
        echo "⚡ Performance adequada"
        exit 0
    else
        echo "❌ $failures TESTE(S) FALHARAM"
        echo "🔧 Verificar configuração necessária"
        exit 1
    fi
}

# Verificar dependências
check_dependencies() {
    # Verificar se curl está disponível
    if ! command -v curl &> /dev/null; then
        echo "❌ curl não encontrado. Instale curl para executar os testes."
        exit 1
    fi
    
    # Verificar se openssl está disponível
    if ! command -v openssl &> /dev/null; then
        echo "❌ openssl não encontrado. Instale openssl para verificar SSL."
        exit 1
    fi
    
    # Verificar se bc está disponível (para cálculos)
    if ! command -v bc &> /dev/null; then
        echo "❌ bc não encontrado. Instale bc para cálculos de performance."
        exit 1
    fi
}

# Executar verificações e testes
check_dependencies
main