FROM python:3.11-slim

WORKDIR /app

# Copiar requirements e instalar dependências
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código do servidor
COPY server.py .

# Expor porta
EXPOSE 3000

# Comando para iniciar servidor
CMD ["python", "server.py"]