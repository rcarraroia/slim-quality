#!/bin/bash

# Script de Deploy - Sprint 4: Deploy Easypanel
# Deploy do backend no Easypanel

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações
REGISTRY="registry.easypanel.host"
IMAGE_NAME="slim-agent"
DOMAIN="api.slimquality.com.br"
HEALTH_ENDPOINT="https://${DOMAIN}/health"

echo -e "${YELLOW}🚀 Iniciando deploy no Easypanel...${NC}"

# Verificar se arquivo de push existe
if [ ! -f ".last-push.info" ]; then
    echo -e "${RED}❌ Erro: Arquivo .last-push.info não encontrado${NC}"
    echo -e "${YELLOW}💡 Execute primeiro: ./scripts/push.sh${NC}"
    exit 1
fi

# Carregar informações do último push
source .last-push.info

echo -e "${BLUE}📋 Informações do deploy:${NC}"
echo "  Registry: ${REGISTRY}"
echo "  Imagem: ${IMAGE_NAME}"
echo "  Tag: ${VERSIONED_TAG}"
echo "  Domínio: ${DOMAIN}"
echo "  Health Check: ${HEALTH_ENDPOINT}"

# Verificar variáveis de ambiente necessárias
echo -e "${YELLOW}🔍 Verificando variáveis de ambiente...${NC}"

REQUIRED_VARS=(
    "EASYPANEL_TOKEN"
    "CLAUDE_API_KEY"
    "SUPABASE_URL"
    "SUPABASE_SERVICE_KEY"
    "EVOLUTION_API_KEY"
)

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}❌ Erro: Variável ${var} não definida${NC}"
        echo -e "${YELLOW}💡 Configure no Easypanel ou .env${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✅ Todas as variáveis necessárias estão definidas${NC}"

# Função para fazer chamadas à API do Easypanel
call_easypanel_api() {
    local method=$1
    local endpoint=$2
    local data=$3
    
    if [ -n "$data" ]; then
        curl -s -X ${method} \
            -H "Authorization: Bearer ${EASYPANEL_TOKEN}" \
            -H "Content-Type: application/json" \
            -d "${data}" \
            "https://easypanel.host/api${endpoint}"
    else
        curl -s -X ${method} \
            -H "Authorization: Bearer ${EASYPANEL_TOKEN}" \
            "https://easypanel.host/api${endpoint}"
    fi
}

# Verificar se service já existe
echo -e "${YELLOW}🔍 Verificando service existente...${NC}"
SERVICE_EXISTS=$(call_easypanel_api "GET" "/services/slim-agent" | jq -r '.name // empty' 2>/dev/null || echo "")

if [ -n "$SERVICE_EXISTS" ]; then
    echo -e "${BLUE}📦 Service slim-agent já existe, atualizando...${NC}"
    
    # Atualizar service existente
    UPDATE_DATA=$(cat << EOF
{
    "image": "${VERSIONED_TAG}",
    "env": {
        "CLAUDE_API_KEY": "${CLAUDE_API_KEY}",
        "SUPABASE_URL": "${SUPABASE_URL}",
        "SUPABASE_SERVICE_KEY": "${SUPABASE_SERVICE_KEY}",
        "SUPABASE_ANON_KEY": "${SUPABASE_ANON_KEY}",
        "EVOLUTION_URL": "https://slimquality-evolution-api.wpjtfd.easypanel.host",
        "EVOLUTION_API_KEY": "${EVOLUTION_API_KEY}",
        "REDIS_URL": "redis://redis:6379",
        "ENVIRONMENT": "production",
        "LOG_LEVEL": "info",
        "DEBUG": "false"
    }
}
EOF
)
    
    if call_easypanel_api "PUT" "/services/slim-agent" "$UPDATE_DATA" >/dev/null; then
        echo -e "${GREEN}✅ Service atualizado com sucesso${NC}"
    else
        echo -e "${RED}❌ Erro ao atualizar service${NC}"
        exit 1
    fi
    
else
    echo -e "${BLUE}📦 Criando novo service slim-agent...${NC}"
    
    # Criar novo service
    CREATE_DATA=$(cat << EOF
{
    "name": "slim-agent",
    "image": "${VERSIONED_TAG}",
    "port": 8000,
    "domain": "${DOMAIN}",
    "env": {
        "CLAUDE_API_KEY": "${CLAUDE_API_KEY}",
        "SUPABASE_URL": "${SUPABASE_URL}",
        "SUPABASE_SERVICE_KEY": "${SUPABASE_SERVICE_KEY}",
        "SUPABASE_ANON_KEY": "${SUPABASE_ANON_KEY}",
        "EVOLUTION_URL": "https://slimquality-evolution-api.wpjtfd.easypanel.host",
        "EVOLUTION_API_KEY": "${EVOLUTION_API_KEY}",
        "REDIS_URL": "redis://redis:6379",
        "ENVIRONMENT": "production",
        "LOG_LEVEL": "info",
        "DEBUG": "false"
    },
    "healthcheck": {
        "path": "/health",
        "interval": 30,
        "timeout": 10,
        "retries": 3
    },
    "resources": {
        "memory": "1GB",
        "cpu": "0.5"
    },
    "restart": "always"
}
EOF
)
    
    if call_easypanel_api "POST" "/services" "$CREATE_DATA" >/dev/null; then
        echo -e "${GREEN}✅ Service criado com sucesso${NC}"
    else
        echo -e "${RED}❌ Erro ao criar service${NC}"
        exit 1
    fi
fi

# Aguardar deploy
echo -e "${YELLOW}⏳ Aguardando deploy (60s)...${NC}"
sleep 60

# Verificar health check
echo -e "${YELLOW}🏥 Verificando health check...${NC}"
MAX_ATTEMPTS=10
ATTEMPT=1

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
    echo -e "${BLUE}🔍 Tentativa ${ATTEMPT}/${MAX_ATTEMPTS}...${NC}"
    
    if curl -f -s "${HEALTH_ENDPOINT}" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Health check OK!${NC}"
        
        # Mostrar resposta do health check
        echo -e "${BLUE}📊 Status do sistema:${NC}"
        curl -s "${HEALTH_ENDPOINT}" | jq '.' 2>/dev/null || curl -s "${HEALTH_ENDPOINT}"
        break
    else
        if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
            echo -e "${RED}❌ Health check falhou após ${MAX_ATTEMPTS} tentativas${NC}"
            echo -e "${YELLOW}🔍 Verificar logs no Easypanel${NC}"
            exit 1
        fi
        
        echo -e "${YELLOW}⏳ Aguardando 10s antes da próxima tentativa...${NC}"
        sleep 10
        ((ATTEMPT++))
    fi
done

# Verificar endpoints principais
echo -e "${YELLOW}🔍 Verificando endpoints principais...${NC}"

ENDPOINTS=(
    "/health"
    "/docs"
)

for endpoint in "${ENDPOINTS[@]}"; do
    URL="https://${DOMAIN}${endpoint}"
    if curl -f -s "${URL}" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ ${endpoint} - OK${NC}"
    else
        echo -e "${RED}❌ ${endpoint} - FALHOU${NC}"
    fi
done

# Salvar informações do deploy
cat > .last-deploy.info << EOF
DEPLOY_DATE=$(date)
IMAGE_TAG=${VERSIONED_TAG}
DOMAIN=${DOMAIN}
HEALTH_ENDPOINT=${HEALTH_ENDPOINT}
SERVICE_NAME=slim-agent
STATUS=deployed
EOF

echo -e "${GREEN}🎉 Deploy concluído com sucesso!${NC}"
echo -e "${BLUE}📋 Informações do deploy:${NC}"
echo "  🌐 URL: https://${DOMAIN}"
echo "  🏥 Health: ${HEALTH_ENDPOINT}"
echo "  📚 Docs: https://${DOMAIN}/docs"
echo "  📊 Painel: https://easypanel.host"

echo -e "${YELLOW}📋 Próximos passos:${NC}"
echo "  1. Configurar DNS se necessário"
echo "  2. Configurar webhook Evolution API"
echo "  3. Testar integração completa"
echo "  4. Monitorar logs no Easypanel"

echo -e "${GREEN}ℹ️  Informações salvas em .last-deploy.info${NC}"