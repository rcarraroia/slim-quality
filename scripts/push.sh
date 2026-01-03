#!/bin/bash

# Script de Push - Sprint 4: Deploy Easypanel
# Push das imagens Docker para registry

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configurações
REGISTRY="docker.io"
IMAGE_NAME="renumvscode/slim-agent"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

echo -e "${YELLOW}🚀 Iniciando push das imagens Docker...${NC}"

# Verificar se imagem existe localmente
if ! docker image inspect ${IMAGE_NAME}:latest >/dev/null 2>&1; then
    echo -e "${RED}❌ Erro: Imagem ${IMAGE_NAME}:latest não encontrada localmente${NC}"
    echo -e "${YELLOW}💡 Execute primeiro: ./scripts/build.sh${NC}"
    exit 1
fi

# Verificar se registry está acessível
echo -e "${YELLOW}🔍 Verificando acesso ao registry...${NC}"
if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}❌ Erro: Docker daemon não está rodando${NC}"
    exit 1
fi

# Tag para registry
echo -e "${YELLOW}🏷️  Criando tags para registry...${NC}"
docker tag ${IMAGE_NAME}:latest ${REGISTRY}/${IMAGE_NAME}:latest
docker tag ${IMAGE_NAME}:latest ${REGISTRY}/${IMAGE_NAME}:${TIMESTAMP}

# Push latest
echo -e "${YELLOW}📤 Fazendo push da imagem latest...${NC}"
if docker push ${REGISTRY}/${IMAGE_NAME}:latest; then
    echo -e "${GREEN}✅ Push latest concluído com sucesso${NC}"
else
    echo -e "${RED}❌ Erro no push da imagem latest${NC}"
    exit 1
fi

# Push versioned
echo -e "${YELLOW}📤 Fazendo push da imagem versionada...${NC}"
if docker push ${REGISTRY}/${IMAGE_NAME}:${TIMESTAMP}; then
    echo -e "${GREEN}✅ Push versionado concluído com sucesso${NC}"
else
    echo -e "${RED}❌ Erro no push da imagem versionada${NC}"
    exit 1
fi

# Verificar imagens no registry
echo -e "${YELLOW}🔍 Verificando imagens no registry...${NC}"
echo "Imagens disponíveis:"
echo "  - ${REGISTRY}/${IMAGE_NAME}:latest"
echo "  - ${REGISTRY}/${IMAGE_NAME}:${TIMESTAMP}"

# Limpeza de imagens antigas locais (manter últimas 3)
echo -e "${YELLOW}🧹 Limpando imagens antigas locais...${NC}"
docker images ${IMAGE_NAME} --format "table {{.Repository}}\t{{.Tag}}\t{{.CreatedAt}}" | head -10

# Remover imagens não utilizadas
docker image prune -f >/dev/null 2>&1 || true

echo -e "${GREEN}🎉 Push concluído com sucesso!${NC}"
echo -e "${YELLOW}📋 Próximos passos:${NC}"
echo "  1. Configurar service no Easypanel"
echo "  2. Executar deploy: ./scripts/deploy.sh"
echo "  3. Verificar health check: https://api.slimquality.com.br/health"

# Salvar informações do build
cat > .last-push.info << EOF
TIMESTAMP=${TIMESTAMP}
REGISTRY=${REGISTRY}
IMAGE_NAME=${IMAGE_NAME}
LATEST_TAG=${REGISTRY}/${IMAGE_NAME}:latest
VERSIONED_TAG=${REGISTRY}/${IMAGE_NAME}:${TIMESTAMP}
PUSH_DATE=$(date)
EOF

echo -e "${GREEN}ℹ️  Informações salvas em .last-push.info${NC}"