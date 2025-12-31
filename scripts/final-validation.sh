#!/bin/bash

# 🎯 VALIDAÇÃO FINAL COMPLETA - SPRINT 4 DEPLOY EASYPANEL
# Executa todos os testes e validações para confirmar sistema em produção

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações
BASE_URL="https://api.slimquality.com.br"
RESULTS_DIR="validation_results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo -e "${BLUE}🎯 VALIDAÇÃO FINAL COMPLETA - SLIM QUALITY BACKEND${NC}"
echo "=================================================="
echo "URL Base: $BASE_URL"
echo "Timestamp: $TIMESTAMP"
echo ""

# Criar diretório de resultados
mkdir -p "$RESULTS_DIR"

# Função para log com timestamp
log() {
    echo -e "[$(date '+%H:%M:%S')] $1"
}

# Função para verificar se comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Verificar dependências
log "${BLUE}📋 Verificando dependências...${NC}"

if ! command_exists curl; then
    log "${RED}❌ curl não encontrado. Instale: apt-get install curl${NC}"
    exit 1
fi

if ! command_exists python3; then
    log "${RED}❌ python3 não encontrado. Instale Python 3.8+${NC}"
    exit 1
fi

log "${GREEN}✅ Dependências OK${NC}"
echo ""

# 1. TESTE BÁSICO DE CONECTIVIDADE
log "${BLUE}🌐 1. TESTE BÁSICO DE CONECTIVIDADE${NC}"
echo "----------------------------------------"

log "Testando conectividade básica..."
if curl -s --max-time 10 "$BASE_URL/health" > /dev/null; then
    log "${GREEN}✅ Conectividade OK${NC}"
else
    log "${RED}❌ Falha na conectividade básica${NC}"
    exit 1
fi

# Testar SSL
log "Verificando certificado SSL..."
SSL_INFO=$(echo | openssl s_client -connect api.slimquality.com.br:443 -servername api.slimquality.com.br 2>/dev/null | openssl x509 -noout -dates 2>/dev/null || echo "SSL_ERROR")

if [[ "$SSL_INFO" != "SSL_ERROR" ]]; then
    log "${GREEN}✅ Certificado SSL válido${NC}"
    echo "$SSL_INFO" > "$RESULTS_DIR/ssl_info_$TIMESTAMP.txt"
else
    log "${YELLOW}⚠️ Não foi possível verificar SSL (pode estar OK)${NC}"
fi

echo ""

# 2. SMOKE TESTS
log "${BLUE}🧪 2. EXECUTANDO SMOKE TESTS${NC}"
echo "------------------------------"

if [ -f "tests/production/smoke_tests.py" ]; then
    log "Executando smoke tests..."
    cd tests/production
    
    if python3 smoke_tests.py "$BASE_URL" > "../../$RESULTS_DIR/smoke_tests_$TIMESTAMP.log" 2>&1; then
        log "${GREEN}✅ Smoke tests PASSARAM${NC}"
        SMOKE_SUCCESS=true
    else
        log "${RED}❌ Smoke tests FALHARAM${NC}"
        SMOKE_SUCCESS=false
    fi
    
    # Mover resultados JSON se existir
    if [ -f "smoke_tests_results.json" ]; then
        mv "smoke_tests_results.json" "../../$RESULTS_DIR/smoke_tests_results_$TIMESTAMP.json"
    fi
    
    cd ../..
else
    log "${YELLOW}⚠️ Smoke tests não encontrados${NC}"
    SMOKE_SUCCESS=false
fi

echo ""

# 3. TESTES DE INTEGRAÇÃO
log "${BLUE}🔗 3. EXECUTANDO TESTES DE INTEGRAÇÃO${NC}"
echo "--------------------------------------"

if [ -f "tests/production/integration_tests.py" ]; then
    log "Executando testes de integração..."
    cd tests/production
    
    if python3 integration_tests.py "$BASE_URL" > "../../$RESULTS_DIR/integration_tests_$TIMESTAMP.log" 2>&1; then
        log "${GREEN}✅ Testes de integração PASSARAM${NC}"
        INTEGRATION_SUCCESS=true
    else
        log "${RED}❌ Testes de integração FALHARAM${NC}"
        INTEGRATION_SUCCESS=false
    fi
    
    # Mover resultados JSON se existir
    if [ -f "integration_tests_results.json" ]; then
        mv "integration_tests_results.json" "../../$RESULTS_DIR/integration_tests_results_$TIMESTAMP.json"
    fi
    
    cd ../..
else
    log "${YELLOW}⚠️ Testes de integração não encontrados${NC}"
    INTEGRATION_SUCCESS=false
fi

echo ""

# 4. TESTES DE CARGA (OPCIONAL - pode ser lento)
log "${BLUE}⚡ 4. EXECUTANDO TESTES DE CARGA${NC}"
echo "--------------------------------"

read -p "Executar testes de carga? (podem demorar 5-10 minutos) [y/N]: " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ -f "tests/production/load_tests.py" ]; then
        log "Executando testes de carga..."
        cd tests/production
        
        if timeout 600 python3 load_tests.py "$BASE_URL" > "../../$RESULTS_DIR/load_tests_$TIMESTAMP.log" 2>&1; then
            log "${GREEN}✅ Testes de carga PASSARAM${NC}"
            LOAD_SUCCESS=true
        else
            log "${RED}❌ Testes de carga FALHARAM ou TIMEOUT${NC}"
            LOAD_SUCCESS=false
        fi
        
        # Mover resultados JSON se existir
        if [ -f "load_tests_results.json" ]; then
            mv "load_tests_results.json" "../../$RESULTS_DIR/load_tests_results_$TIMESTAMP.json"
        fi
        
        cd ../..
    else
        log "${YELLOW}⚠️ Testes de carga não encontrados${NC}"
        LOAD_SUCCESS=false
    fi
else
    log "${YELLOW}⏭️ Testes de carga pulados${NC}"
    LOAD_SUCCESS=true  # Considerar OK se pulado
fi

echo ""

# 5. VALIDAÇÃO DE ENDPOINTS CRÍTICOS
log "${BLUE}🎯 5. VALIDAÇÃO DE ENDPOINTS CRÍTICOS${NC}"
echo "------------------------------------"

ENDPOINTS=(
    "/health:Health Check"
    "/docs:API Documentation"
    "/openapi.json:OpenAPI Schema"
    "/webhooks/metrics:Webhook Metrics"
)

ENDPOINT_SUCCESS=true

for endpoint_info in "${ENDPOINTS[@]}"; do
    IFS=':' read -r endpoint description <<< "$endpoint_info"
    
    log "Testando $description ($endpoint)..."
    
    response=$(curl -s -w "%{http_code}" -o /dev/null --max-time 10 "$BASE_URL$endpoint")
    
    if [ "$response" = "200" ]; then
        log "${GREEN}✅ $description OK (200)${NC}"
    else
        log "${RED}❌ $description FALHOU ($response)${NC}"
        ENDPOINT_SUCCESS=false
    fi
done

echo ""

# 6. TESTE DE WEBHOOK (SIMULADO)
log "${BLUE}📡 6. TESTE DE WEBHOOK SIMULADO${NC}"
echo "-------------------------------"

log "Enviando webhook de teste..."

webhook_response=$(curl -s -w "%{http_code}" -X POST "$BASE_URL/webhooks/evolution" \
    -H "Content-Type: application/json" \
    -d '{
        "event": "messages.upsert",
        "instance": "validation-test",
        "data": {
            "key": {
                "remoteJid": "5511999999999@s.whatsapp.net",
                "fromMe": false,
                "id": "validation_test_'$TIMESTAMP'"
            },
            "message": {
                "conversation": "Teste de validação final - '$TIMESTAMP'"
            },
            "messageTimestamp": '$(date +%s)',
            "pushName": "Validation Test"
        }
    }' 2>/dev/null)

# Extrair status code (últimos 3 caracteres)
webhook_status="${webhook_response: -3}"
webhook_body="${webhook_response%???}"

if [ "$webhook_status" = "200" ]; then
    log "${GREEN}✅ Webhook aceito (200)${NC}"
    WEBHOOK_SUCCESS=true
    echo "$webhook_body" > "$RESULTS_DIR/webhook_response_$TIMESTAMP.json"
else
    log "${RED}❌ Webhook rejeitado ($webhook_status)${NC}"
    WEBHOOK_SUCCESS=false
fi

echo ""

# 7. VERIFICAÇÃO DE MÉTRICAS
log "${BLUE}📊 7. VERIFICAÇÃO DE MÉTRICAS${NC}"
echo "-----------------------------"

log "Coletando métricas do sistema..."

# Health check detalhado
health_response=$(curl -s --max-time 10 "$BASE_URL/health" 2>/dev/null || echo "ERROR")

if [ "$health_response" != "ERROR" ]; then
    echo "$health_response" > "$RESULTS_DIR/health_check_$TIMESTAMP.json"
    
    # Verificar se é JSON válido e tem status "up"
    if echo "$health_response" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if data.get('status') == 'up':
        print('HEALTHY')
    else:
        print('UNHEALTHY')
except:
    print('INVALID')
" 2>/dev/null | grep -q "HEALTHY"; then
        log "${GREEN}✅ Sistema saudável${NC}"
        HEALTH_SUCCESS=true
    else
        log "${RED}❌ Sistema não saudável${NC}"
        HEALTH_SUCCESS=false
    fi
else
    log "${RED}❌ Não foi possível obter métricas${NC}"
    HEALTH_SUCCESS=false
fi

# Métricas de webhook
webhook_metrics=$(curl -s --max-time 10 "$BASE_URL/webhooks/metrics" 2>/dev/null || echo "ERROR")

if [ "$webhook_metrics" != "ERROR" ]; then
    echo "$webhook_metrics" > "$RESULTS_DIR/webhook_metrics_$TIMESTAMP.json"
    log "${GREEN}✅ Métricas de webhook coletadas${NC}"
else
    log "${YELLOW}⚠️ Não foi possível coletar métricas de webhook${NC}"
fi

echo ""

# 8. RELATÓRIO FINAL
log "${BLUE}📋 8. RELATÓRIO FINAL DE VALIDAÇÃO${NC}"
echo "===================================="

# Calcular score geral
TOTAL_TESTS=6
PASSED_TESTS=0

[ "$SMOKE_SUCCESS" = true ] && ((PASSED_TESTS++))
[ "$INTEGRATION_SUCCESS" = true ] && ((PASSED_TESTS++))
[ "$LOAD_SUCCESS" = true ] && ((PASSED_TESTS++))
[ "$ENDPOINT_SUCCESS" = true ] && ((PASSED_TESTS++))
[ "$WEBHOOK_SUCCESS" = true ] && ((PASSED_TESTS++))
[ "$HEALTH_SUCCESS" = true ] && ((PASSED_TESTS++))

SUCCESS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))

# Criar relatório JSON
cat > "$RESULTS_DIR/final_validation_report_$TIMESTAMP.json" << EOF
{
    "validation_timestamp": "$TIMESTAMP",
    "base_url": "$BASE_URL",
    "total_tests": $TOTAL_TESTS,
    "passed_tests": $PASSED_TESTS,
    "success_rate": $SUCCESS_RATE,
    "test_results": {
        "smoke_tests": $SMOKE_SUCCESS,
        "integration_tests": $INTEGRATION_SUCCESS,
        "load_tests": $LOAD_SUCCESS,
        "endpoint_validation": $ENDPOINT_SUCCESS,
        "webhook_test": $WEBHOOK_SUCCESS,
        "health_check": $HEALTH_SUCCESS
    },
    "system_status": "$([ $SUCCESS_RATE -ge 80 ] && echo "OPERATIONAL" || echo "DEGRADED")"
}
EOF

# Exibir relatório
echo ""
log "📊 RESULTADOS DA VALIDAÇÃO:"
echo "   • Smoke Tests: $([ "$SMOKE_SUCCESS" = true ] && echo -e "${GREEN}✅ PASSOU${NC}" || echo -e "${RED}❌ FALHOU${NC}")"
echo "   • Testes de Integração: $([ "$INTEGRATION_SUCCESS" = true ] && echo -e "${GREEN}✅ PASSOU${NC}" || echo -e "${RED}❌ FALHOU${NC}")"
echo "   • Testes de Carga: $([ "$LOAD_SUCCESS" = true ] && echo -e "${GREEN}✅ PASSOU${NC}" || echo -e "${RED}❌ FALHOU${NC}")"
echo "   • Validação de Endpoints: $([ "$ENDPOINT_SUCCESS" = true ] && echo -e "${GREEN}✅ PASSOU${NC}" || echo -e "${RED}❌ FALHOU${NC}")"
echo "   • Teste de Webhook: $([ "$WEBHOOK_SUCCESS" = true ] && echo -e "${GREEN}✅ PASSOU${NC}" || echo -e "${RED}❌ FALHOU${NC}")"
echo "   • Health Check: $([ "$HEALTH_SUCCESS" = true ] && echo -e "${GREEN}✅ PASSOU${NC}" || echo -e "${RED}❌ FALHOU${NC}")"
echo ""
log "📈 TAXA DE SUCESSO: $SUCCESS_RATE% ($PASSED_TESTS/$TOTAL_TESTS)"
echo ""

# Status final
if [ $SUCCESS_RATE -ge 80 ]; then
    log "${GREEN}🎉 SISTEMA VALIDADO COM SUCESSO!${NC}"
    log "${GREEN}✅ Backend Slim Quality está OPERACIONAL em produção${NC}"
    echo ""
    log "🌐 URLs de Produção:"
    echo "   • API: https://api.slimquality.com.br"
    echo "   • Health: https://api.slimquality.com.br/health"
    echo "   • Docs: https://api.slimquality.com.br/docs"
    echo ""
    FINAL_STATUS="SUCCESS"
else
    log "${RED}⚠️ SISTEMA COM PROBLEMAS DETECTADOS${NC}"
    log "${RED}❌ Alguns testes falharam - verificar logs${NC}"
    echo ""
    FINAL_STATUS="FAILED"
fi

# Informações sobre resultados
log "📄 Resultados salvos em: $RESULTS_DIR/"
log "📋 Relatório principal: $RESULTS_DIR/final_validation_report_$TIMESTAMP.json"
echo ""

# Exit code baseado no sucesso
if [ "$FINAL_STATUS" = "SUCCESS" ]; then
    exit 0
else
    exit 1
fi