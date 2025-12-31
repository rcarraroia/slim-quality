#!/bin/bash

# Script de teste da integração Evolution API → Backend
# Testa webhook, processamento e resposta

set -e

BACKEND_URL="https://api.slimquality.com.br"
EVOLUTION_URL="https://slimquality-evolution-api.wpjtfd.easypanel.host"

echo "🔗 TESTANDO INTEGRAÇÃO EVOLUTION → BACKEND"
echo "=========================================="
echo "Backend: $BACKEND_URL"
echo "Evolution: $EVOLUTION_URL"
echo ""

# Função para testar endpoint
test_endpoint() {
    local url=$1
    local method=$2
    local description=$3
    local expected_status=$4
    
    echo "📡 Testando: $description"
    echo "   URL: $url"
    echo "   Method: $method"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" "$url")
    else
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X "$method" "$url")
    fi
    
    status_code=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    body=$(echo "$response" | sed 's/HTTPSTATUS:[0-9]*$//')
    
    if [ "$status_code" = "$expected_status" ]; then
        echo "   ✅ Status: $status_code (OK)"
        if [ ! -z "$body" ]; then
            echo "   📄 Response: $body"
        fi
    else
        echo "   ❌ Status: $status_code (Esperado: $expected_status)"
        if [ ! -z "$body" ]; then
            echo "   📄 Response: $body"
        fi
        return 1
    fi
    echo ""
}

# Função para testar webhook com payload simulado
test_webhook_payload() {
    echo "📨 TESTANDO WEBHOOK COM PAYLOAD SIMULADO"
    echo "======================================="
    
    # Payload simulado de mensagem WhatsApp
    webhook_payload='{
        "event": "messages.upsert",
        "instance": "slim-quality-test",
        "data": {
            "key": {
                "remoteJid": "5511999999999@s.whatsapp.net",
                "fromMe": false,
                "id": "test_message_id_123"
            },
            "message": {
                "conversation": "Olá, este é um teste de integração"
            },
            "messageTimestamp": '$(date +%s)',
            "pushName": "Teste Usuario"
        },
        "destination": "5511999999999@s.whatsapp.net",
        "date_time": "'$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")'"
    }'
    
    echo "📡 Enviando webhook simulado..."
    echo "   Payload: Mensagem de teste"
    
    response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -d "$webhook_payload" \
        "$BACKEND_URL/webhooks/evolution")
    
    status_code=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    body=$(echo "$response" | sed 's/HTTPSTATUS:[0-9]*$//')
    
    if [ "$status_code" = "200" ]; then
        echo "   ✅ Webhook aceito: Status $status_code"
        echo "   📄 Response: $body"
        
        # Extrair request_id da resposta
        request_id=$(echo "$body" | grep -o '"request_id":"[^"]*"' | cut -d'"' -f4)
        if [ ! -z "$request_id" ]; then
            echo "   🆔 Request ID: $request_id"
        fi
    else
        echo "   ❌ Webhook rejeitado: Status $status_code"
        echo "   📄 Response: $body"
        return 1
    fi
    echo ""
}

# Função para verificar métricas de webhook
check_webhook_metrics() {
    echo "📊 VERIFICANDO MÉTRICAS DE WEBHOOK"
    echo "================================="
    
    echo "📡 Obtendo métricas..."
    
    response=$(curl -s -w "HTTPSTATUS:%{http_code}" "$BACKEND_URL/webhooks/metrics")
    status_code=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    body=$(echo "$response" | sed 's/HTTPSTATUS:[0-9]*$//')
    
    if [ "$status_code" = "200" ]; then
        echo "   ✅ Métricas obtidas: Status $status_code"
        echo "   📊 Métricas:"
        echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
    else
        echo "   ❌ Erro ao obter métricas: Status $status_code"
        echo "   📄 Response: $body"
        return 1
    fi
    echo ""
}

# Função para verificar logs do backend
check_backend_logs() {
    echo "📋 VERIFICANDO LOGS DO BACKEND"
    echo "============================="
    
    echo "ℹ️  Para verificar logs detalhados:"
    echo "   1. Acesse Easypanel > Services > slim-agent > Logs"
    echo "   2. Procure por:"
    echo "      - 'Webhook received from Evolution'"
    echo "      - 'Processing message'"
    echo "      - 'SICC processing message'"
    echo "      - 'Response sent to WhatsApp'"
    echo ""
    echo "   3. Filtros úteis:"
    echo "      - ERROR: Erros críticos"
    echo "      - WARNING: Alertas"
    echo "      - webhook: Eventos de webhook"
    echo "      - request_id: Rastrear requisição específica"
    echo ""
}

# Função para testar Evolution API
test_evolution_api() {
    echo "🔌 TESTANDO EVOLUTION API"
    echo "========================"
    
    # Verificar se Evolution está respondendo
    if ! test_endpoint "$EVOLUTION_URL/manager/instances" "GET" "Evolution API - Instances" "200"; then
        echo "   ⚠️  Evolution API não está respondendo"
        echo "   🔧 Verifique se o service está rodando no Easypanel"
        return 1
    fi
    
    echo "   ✅ Evolution API está operacional"
    echo ""
}

# Função principal de teste
main() {
    echo "🚀 Iniciando testes de integração..."
    echo "Timestamp: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
    echo ""
    
    failures=0
    
    # Teste 1: Backend Health Check
    echo "🏥 TESTE 1: BACKEND HEALTH CHECK"
    echo "==============================="
    if ! test_endpoint "$BACKEND_URL/health" "GET" "Backend Health Check" "200"; then
        echo "   ❌ Backend não está saudável"
        ((failures++))
    else
        echo "   ✅ Backend operacional"
    fi
    
    # Teste 2: Evolution API
    echo "🔌 TESTE 2: EVOLUTION API"
    echo "========================"
    if ! test_evolution_api; then
        echo "   ❌ Evolution API com problemas"
        ((failures++))
    else
        echo "   ✅ Evolution API operacional"
    fi
    
    # Teste 3: Webhook Endpoint
    echo "📨 TESTE 3: WEBHOOK ENDPOINT"
    echo "==========================="
    if ! test_endpoint "$BACKEND_URL/webhooks/evolution" "POST" "Webhook Endpoint (sem payload)" "400"; then
        echo "   ❌ Webhook endpoint com problemas"
        ((failures++))
    else
        echo "   ✅ Webhook endpoint respondendo (rejeita payload vazio corretamente)"
    fi
    
    # Teste 4: Webhook com Payload
    echo "📨 TESTE 4: WEBHOOK COM PAYLOAD"
    echo "=============================="
    if ! test_webhook_payload; then
        echo "   ❌ Processamento de webhook falhou"
        ((failures++))
    else
        echo "   ✅ Webhook processado com sucesso"
    fi
    
    # Teste 5: Métricas
    echo "📊 TESTE 5: MÉTRICAS DE WEBHOOK"
    echo "=============================="
    if ! check_webhook_metrics; then
        echo "   ❌ Métricas não disponíveis"
        ((failures++))
    else
        echo "   ✅ Métricas funcionando"
    fi
    
    # Aguardar processamento
    echo "⏳ Aguardando processamento (10 segundos)..."
    sleep 10
    
    # Verificar logs
    check_backend_logs
    
    # Resultado final
    echo "📋 RESULTADO FINAL"
    echo "=================="
    
    if [ $failures -eq 0 ]; then
        echo "✅ TODOS OS TESTES PASSARAM!"
        echo "🎉 Integração Evolution → Backend funcionando"
        echo ""
        echo "📝 PRÓXIMOS PASSOS:"
        echo "   1. Envie uma mensagem real via WhatsApp"
        echo "   2. Verifique logs no Easypanel"
        echo "   3. Confirme resposta automática"
        echo "   4. Monitore métricas de webhook"
        exit 0
    else
        echo "❌ $failures TESTE(S) FALHARAM"
        echo "🔧 Verificar configuração necessária"
        echo ""
        echo "🛠️  TROUBLESHOOTING:"
        echo "   1. Verificar se backend está deployado"
        echo "   2. Verificar se Evolution API está rodando"
        echo "   3. Verificar URL do webhook na Evolution"
        echo "   4. Verificar logs de ambos os services"
        exit 1
    fi
}

# Verificar dependências
check_dependencies() {
    if ! command -v curl &> /dev/null; then
        echo "❌ curl não encontrado. Instale curl para executar os testes."
        exit 1
    fi
    
    if ! command -v python3 &> /dev/null; then
        echo "⚠️  python3 não encontrado. JSON não será formatado."
    fi
}

# Executar testes
check_dependencies
main