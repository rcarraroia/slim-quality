# Dockerfile para MCP Gateway
FROM python:3.11-slim

WORKDIR /app

# Copiar requirements de todos os MCP Servers
COPY whatsapp-uazapi/requirements.txt /app/uazapi-requirements.txt
COPY whatsapp-evolution/requirements.txt /app/evolution-requirements.txt
COPY google/requirements.txt /app/google-requirements.txt

# Instalar dependências
RUN pip install --no-cache-dir \
    -r /app/uazapi-requirements.txt \
    -r /app/evolution-requirements.txt \
    -r /app/google-requirements.txt \
    fastapi==0.104.1 \
    uvicorn[standard]==0.24.0

# Copiar código dos MCP Servers
COPY . /app/

# Expor porta
EXPOSE 8080

# Comando placeholder (implementar gateway server na próxima iteração)
CMD ["echo", "MCP Gateway - Implementar servidor HTTP"]
