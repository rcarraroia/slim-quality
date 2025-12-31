#!/bin/bash
# Slim Quality - Script de Build Docker
# Cria imagem otimizada para produção

set -e  # Parar em caso de erro

# ============================================
# Configurações
# ============================================
IMAGE_NAME="slim-agent"
REGISTRY="registry.easypanel.host"
VERSION=$(date +%Y%m%d-%H%M%S)
LATEST_TAG="latest"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================
# Funções Utilitárias
# ============================================
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# ============================================
# Validações Pré-Build
# ============================================
log_info "Iniciando build da imagem Docker..."

# Verificar se Docker está rodando
if ! docker info > /dev/null 2>&1; then
    log_error "Docker não está rodando ou não está acessível"
    exit 1
fi

# Verificar se estamos no diretório correto
if [ ! -f "agent/Dockerfile" ]; then
    log_error "Dockerfile não encontrado. Execute este script da raiz do projeto."
    exit 1
fi

if [ ! -f "agent/requirements.txt" ]; then
    log_error "requirements.txt não encontrado no diretório agent/"
    exit 1
fi

# ============================================
# Build da Imagem
# ============================================
log_info "Building imagem Docker..."
log_info "Imagem: ${IMAGE_NAME}"
log_info "Versão: ${VERSION}"

# Navegar para diretório agent
cd agent

# Build com multi-stage para otimização
docker build \
    --tag "${IMAGE_NAME}:${LATEST_TAG}" \
    --tag "${IMAGE_NAME}:${VERSION}" \
    --tag "${REGISTRY}/${IMAGE_NAME}:${LATEST_TAG}" \
    --tag "${REGISTRY}/${IMAGE_NAME}:${VERSION}" \
    --build-arg BUILD_DATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
    --build-arg VERSION="${VERSION}" \
    .

if [ $? -eq 0 ]; then
    log_success "Build concluído com sucesso!"
else
    log_error "Falha no build da imagem"
    exit 1
fi

# Voltar ao diretório raiz
cd ..

# ============================================
# Validação da Imagem
# ============================================
log_info "Validando imagem criada..."

# Verificar se imagem foi criada
if docker images "${IMAGE_NAME}:${LATEST_TAG}" | grep -q "${IMAGE_NAME}"; then
    log_success "Imagem ${IMAGE_NAME}:${LATEST_TAG} criada com sucesso"
else
    log_error "Imagem não foi criada corretamente"
    exit 1
fi

# Mostrar informações da imagem
log_info "Informações da imagem:"
docker images "${IMAGE_NAME}:${LATEST_TAG}" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"

# ============================================
# Teste Rápido da Imagem
# ============================================
log_info "Executando teste rápido da imagem..."

# Testar se a imagem inicia corretamente (timeout 30s)
CONTAINER_ID=$(docker run -d --rm -p 8001:8000 "${IMAGE_NAME}:${LATEST_TAG}")

if [ $? -eq 0 ]; then
    log_info "Container iniciado: ${CONTAINER_ID}"
    
    # Aguardar alguns segundos para inicialização
    sleep 10
    
    # Testar se responde (sem health check por enquanto)
    if docker ps | grep -q "${CONTAINER_ID}"; then
        log_success "Container está rodando corretamente"
        
        # Parar container de teste
        docker stop "${CONTAINER_ID}" > /dev/null
        log_info "Container de teste parado"
    else
        log_error "Container falhou ao iniciar"
        docker logs "${CONTAINER_ID}"
        exit 1
    fi
else
    log_error "Falha ao iniciar container de teste"
    exit 1
fi

# ============================================
# Resumo Final
# ============================================
log_success "Build concluído com sucesso!"
echo ""
log_info "Imagens criadas:"
echo "  - ${IMAGE_NAME}:${LATEST_TAG}"
echo "  - ${IMAGE_NAME}:${VERSION}"
echo "  - ${REGISTRY}/${IMAGE_NAME}:${LATEST_TAG}"
echo "  - ${REGISTRY}/${IMAGE_NAME}:${VERSION}"
echo ""
log_info "Próximos passos:"
echo "  1. Execute './scripts/push.sh' para enviar ao registry"
echo "  2. Execute './scripts/deploy.sh' para fazer deploy no Easypanel"
echo ""
log_warning "Lembre-se de configurar as variáveis de ambiente antes do deploy!"