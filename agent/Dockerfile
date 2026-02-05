# Slim Quality Agent - Backend Conversacional
# Multi-stage build para otimização de produção
# Base: Python 3.11 slim para menor tamanho

# ============================================
# STAGE 1: Builder - Instalar dependências (REBUILD FORÇADO)
# ============================================
FROM python:3.11-slim as builder

# Instalar dependências de build
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Criar diretório de trabalho
WORKDIR /app

# Copiar requirements e instalar dependências com retry e otimizações
COPY requirements.txt .

# Instalar dependências em etapas para melhor resiliência de rede
RUN pip install --no-cache-dir --user --timeout=300 --retries=3 \
    fastapi==0.115.0 \
    uvicorn[standard]==0.32.0 \
    langchain==1.2.0 \
    langgraph==1.0.5 \
    langchain-anthropic==1.3.0 \
    langchain-core==1.2.5 \
    openai>=1.50.0 \
    supabase==2.27.0 \
    redis>=5.0.0 \
    httpx \
    python-dotenv>=1.0.0 \
    pydantic>=2.11.0 \
    pydantic-settings>=2.5.0 \
    python-multipart>=0.0.9 \
    mcp>=1.25.0 \
    structlog>=23.2.0

# Instalar PyTorch CPU-only com versões compatíveis
RUN pip install --no-cache-dir --user --timeout=600 --retries=5 \
    torch==2.4.0+cpu \
    torchvision==0.19.0+cpu \
    torchaudio==2.4.0+cpu \
    --index-url https://download.pytorch.org/whl/cpu

# Instalar dependências de ML/AI separadamente
RUN pip install --no-cache-dir --user --timeout=300 --retries=3 \
    transformers>=4.35.0 \
    sentence-transformers>=2.2.2 \
    numpy>=1.24.0 \
    scikit-learn>=1.3.0

# Instalar dependências restantes
RUN pip install --no-cache-dir --user --timeout=300 --retries=3 \
    google-api-python-client>=2.108.0 \
    google-auth-httplib2>=0.2.0 \
    google-auth-oauthlib>=1.2.0 \
    google-generativeai>=0.8.0 \
    psycopg2-binary>=2.9.7 \
    pgvector>=0.2.4 \
    sqlalchemy>=2.0.0 \
    alembic>=1.12.0 \
    asyncio-mqtt>=0.13.0 \
    aioredis>=2.0.1 \
    aiohttp>=3.8.0 \
    celery>=5.3.0 \
    pandas>=2.1.0 \
    matplotlib>=3.7.0 \
    seaborn>=0.12.0 \
    hypothesis>=6.88.0 \
    pytest>=7.4.0 \
    pytest-asyncio>=0.21.0

# ============================================
# STAGE 2: Runtime - Imagem final otimizada
# ============================================
FROM python:3.11-slim

# Metadados da imagem
LABEL maintainer="Slim Quality Team"
LABEL version="1.0.0"
LABEL description="Backend conversacional com LangGraph + FastAPI"

# Criar usuário não-root para segurança
RUN groupadd -r app && useradd -r -g app -u 1000 app

# Instalar apenas dependências runtime necessárias
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Definir diretório de trabalho
WORKDIR /app

# Copiar dependências Python do builder
COPY --from=builder /root/.local /home/app/.local

# Copiar código fonte
COPY --chown=app:app src/ ./src/

# Criar diretórios necessários com permissões corretas
RUN mkdir -p /app/logs /app/tmp /home/app/.cache \
    && chown -R app:app /app /home/app/.cache \
    && chmod -R 755 /app /home/app/.cache

# Configurar PATH para incluir pacotes do usuário
ENV PATH=/home/app/.local/bin:$PATH
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# Expor porta 8000 para FastAPI
EXPOSE 8000

# Health check para monitoramento
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Mudar para usuário não-root
USER app

# Comando para rodar FastAPI (com logs forçados)
CMD echo "=== CONTAINER INICIANDO ===" && \
    echo "Executando: uvicorn src.api.main:app --host 0.0.0.0 --port 8000" && \
    uvicorn src.api.main:app --host 0.0.0.0 --port 8000 --log-level debug