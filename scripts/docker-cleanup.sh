#!/bin/bash
# Script de limpeza automática do Docker
# Executa após cada deploy para manter espaço livre

echo "🧹 Iniciando limpeza do Docker..."

# Mostrar espaço antes
echo "📊 Espaço antes da limpeza:"
docker system df

# Limpeza agressiva (remove tudo não utilizado)
echo "🗑️ Removendo imagens, containers e cache não utilizados..."
docker system prune -a --volumes -f

# Mostrar espaço depois
echo "✅ Espaço após limpeza:"
docker system df

echo "🎉 Limpeza concluída!"