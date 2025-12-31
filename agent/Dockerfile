# Slim Quality Agent - Backend Conversacional
# Multi-stage build para otimização de produção
# Base: Python 3.11 slim para menor tamanho

# ============================================
# STAGE 1: Builder - Instalar dependências
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

# Copiar requirements e instalar dependências
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

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
RUN mkdir -p /app/logs /app/tmp \
    && chown -R app:app /app

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

# Comando para rodar FastAPI (sem --reload em produção)
CMD ["uvicorn", "src.api.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]