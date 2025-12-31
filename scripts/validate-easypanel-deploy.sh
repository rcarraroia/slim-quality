#!/bin/bash

# 🎯 VALIDAÇÃO DE DEPLOY NO EASYPANEL
# Script para validar se o service slim-agent foi deployado corretamente

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações
BASE_URL="https://api.slimquality.com.br"
TIMEOUT=30

echo -e "${BLUE}🎯 VALIDAÇÃO DE DEPLOY - SLIM AGENT NO EASYPANEL${NC}"
echo "=================================================="
echo "URL Base: $BASE_URL"
echo "Timeout: ${TIMEOUT}s"
echo ""

# Função para log com timestamp
log() {
    echo -e "[$(date '+%H:%M:%S')] $1"
}

# Função para testar endpoint
test_endpoint() {
    local endpoint="$1"
    local description="$2"
    local expected_status="${3:-200}"
    
    log "Testando $description..."
    
    local response=$(curl -s -w "%{http_code}" -o /dev/null --max-time $TIMEOUT "$BASE_URL$endpoint" 2>/dev/null || echo "000")
    
    if [ "$response" = "$expected_status" ]; then
        log "${GREEN}✅ $description OK ($response)${NC}"
        return 0
    else
        log "${RED}❌ $description FALHOU ($response)${NC}"
        return 1
    fi
}

# Função para testar conectividade básica
test_connectivity() {
    log "${BLUE}🌐 Testando conectividade básica...${NC}"
    
    if ping -c 1 api.slimquality.com.br >/dev/null 2>&1; then
        log "${GREEN}✅ DNS resolvendo corretamente${NC}"
    else
        log "${RED}❌ Problema de DNS${NC}"
        return 1
    fi
    
    if curl -s --max-time 10 "$BASE_URL" >/dev/null 2>&1; then
        log "${GREEN}✅ Conectividade HTTPS OK${NC}"
    else
        log "${RED}❌ Problema de conectividade HTTPS${NC}"
        return 1
    fi
}

# Função para verificar SSL
test_ssl() {
    log "${BLUE}🔒 Verificando certificado SSL...${NC}"
    
    local ssl_info=$(echo | openssl s_client -connect api.slimquality.com.br:443 -servername api.slimquality.com.br 2>/dev/null | openssl x509 -noout -dates 2>/dev/null || echo "SSL_ERROR")
    
    if [[ "$ssl_info" != "SSL_ERROR" ]]; then
        log "${GREEN}✅ Certificado SSL válido${NC}"
        echo "$ssl_info" | while read line; do
            log "   $line"
        done
        return 0
    else
        log "${YELLOW}⚠️ Não foi possível verificar SSL${NC}"
        return 1
    fi
}

# Função para testar health check detalhado
test_health_detailed() {
    log "${BLUE}🏥 Testando health check detalhado...${NC}"
    
    local health_response=$(curl -s --max-time $TIMEOUT "$BASE_URL/health" 2>/dev/null || echo "ERROR")
    
    if [ "$health_response" != "ERROR" ]; then
        log "${GREEN}✅ Health check respondendo${NC}"
        
        # Verificar se é JSON válido
        if echo "$health_response" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(f'Status: {data.get(\"status\", \"unknown\")}')
    services = data.get('services', {})
    for service, info in services.items():
        status = info.get('status', 'unknown')
        print(f'  {service}: {status}')
except:
    print('Invalid JSON')
" 2>/dev/null; then
            log "${GREEN}✅ Health check JSON válido${NC}"
        else
            log "${YELLOW}⚠️ Health check retornou dados inválidos${NC}"
        fi
    else
        log "${RED}❌ Health check não respondeu${NC}"
        return 1
    fi
}

# Função para testar endpoints principais
test_main_endpoints() {
    log "${BLUE}🎯 Testando endpoints principais...${NC}"
    
    local endpoints=(
        "/:Root endpoint"
        "/health:Health Check"
        "/docs:API Documentation"
        "/openapi.json:OpenAPI Schema"
        "/webhooks/metrics:Webhook Metrics"
    )
    
    local success_count=0
    local total_count=${#endpoints[@]}
    
    for endpoint_info in "${endpoints[@]}"; do
        IFS=':' read -r endpoint description <<< "$endpoint_info"
        
        if test_endpoint "$endpoint" "$description"; then
            ((success_count++))
        fi
    done
    
    local success_rate=$((success_count * 100 / total_count))
    
    if [ $success_rate -ge 80 ]; then
        log "${GREEN}✅ Endpoints principais OK ($success_count/$total_count - $success_rate%)${NC}"
        return 0
    else
        log "${RED}❌ Muitos endpoints falhando ($success_count/$total_count - $success_rate%)${NC}"
        return 1
    fi
}

# Função para testar webhook
test_webhook() {
    log "${BLUE}📡 Testando webhook endpoint...${NC}"
    
    local webhook_response=$(curl -s -w "%{http_code}" -X POST "$BASE_URL/webhooks/evolution" \
        -H "Content-Type: application/json" \
        -d '{"test": "validation"}' \
        --max-time $TIMEOUT 2>/dev/null || echo "000")
    
    # Webhook deve rejeitar payload inválido (400) ou aceitar (200)
    if [[ "$webhook_response" =~ (200|400) ]]; then
        log "${GREEN}✅ Webhook endpoint respondendo ($webhook_response)${NC}"
        return 0
    else
        log "${RED}❌ Webhook endpoint não respondeu ($webhook_response)${NC}"
        return 1
    fi
}

# Função para verificar performance
test_performance() {
    log "${BLUE}⚡ Testando performance...${NC}"
    
    local start_time=$(date +%s.%N)
    local response=$(curl -s -w "%{http_code}" -o /dev/null --max-time $TIMEOUT "$BASE_URL/health" 2>/dev/null || echo "000")
    local end_time=$(date +%s.%N)
    
    local duration=$(echo "$end_time - $start_time" | bc 2>/dev/null || echo "0")
    local duration_ms=$(echo "$duration * 1000" | bc 2>/dev/null || echo "0")
    
    if [ "$response" = "200" ]; then
        if (( $(echo "$duration < 2.0" | bc -l 2>/dev/null || echo "0") )); then
            log "${GREEN}✅ Performance OK (${duration_ms%.*}ms)${NC}"
            return 0
        else
            log "${YELLOW}⚠️ Performance lenta (${duration_ms%.*}ms)${NC}"
            return 1
        fi
    else
        log "${RED}❌ Falha no teste de performance ($response)${NC}"
        return 1
    fi
}

# Executar todos os testes
main() {
    local total_tests=6
    local passed_tests=0
    
    echo ""
    
    # Teste 1: Conectividade
    if test_connectivity; then
        ((passed_tests++))
    fi
    echo ""
    
    # Teste 2: SSL
    if test_ssl; then
        ((passed_tests++))
    fi
    echo ""
    
    # Teste 3: Health Check
    if test_health_detailed; then
        ((passed_tests++))
    fi
    echo ""
    
    # Teste 4: Endpoints
    if test_main_endpoints; then
        ((passed_tests++))
    fi
    echo ""
    
    # Teste 5: Webhook
    if test_webhook; then
        ((passed_tests++))
    fi
    echo ""
    
    # Teste 6: Performance
    if test_performance; then
        ((passed_tests++))
    fi
    echo ""
    
    # Resultado final
    local success_rate=$((passed_tests * 100 / total_tests))
    
    log "${BLUE}📊 RESULTADO FINAL${NC}"
    echo "==================="
    log "Testes executados: $total_tests"
    log "Testes aprovados: $passed_tests"
    log "Taxa de sucesso: $success_rate%"
    echo ""
    
    if [ $success_rate -ge 80 ]; then
        log "${GREEN}🎉 DEPLOY VALIDADO COM SUCESSO!${NC}"
        log "${GREEN}✅ Slim Agent está funcionando corretamente no Easypanel${NC}"
        echo ""
        log "🌐 URLs disponíveis:"
        log "   • API: $BASE_URL"
        log "   • Health: $BASE_URL/health"
        log "   • Docs: $BASE_URL/docs"
        log "   • Metrics: $BASE_URL/webhooks/metrics"
        echo ""
        exit 0
    else
        log "${RED}❌ DEPLOY COM PROBLEMAS DETECTADOS${NC}"
        log "${RED}⚠️ Alguns testes falharam - verificar configuração${NC}"
        echo ""
        log "🔧 Possíveis soluções:"
        log "   • Verificar logs do service no Easypanel"
        log "   • Validar environment variables"
        log "   • Confirmar se imagem foi deployada corretamente"
        log "   • Aguardar propagação DNS (se recém configurado)"
        echo ""
        exit 1
    fi
}

# Verificar dependências
if ! command -v curl >/dev/null 2>&1; then
    log "${RED}❌ curl não encontrado. Instale: apt-get install curl${NC}"
    exit 1
fi

if ! command -v openssl >/dev/null 2>&1; then
    log "${RED}❌ openssl não encontrado. Instale: apt-get install openssl${NC}"
    exit 1
fi

# Executar validação
main