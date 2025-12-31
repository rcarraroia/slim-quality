#!/bin/bash

# Teste rápido do deploy no Easypanel
echo "🧪 Testando deploy do agente no Easypanel..."

# Aguardar alguns segundos para o deploy
echo "⏳ Aguardando deploy (30s)..."
sleep 30

# Testar health check
echo "🏥 Testando health check..."
if curl -s --max-time 10 https://api.slimquality.com.br/health > /dev/null; then
    echo "✅ Health check OK"
    curl -s https://api.slimquality.com.br/health | head -5
else
    echo "❌ Health check falhou"
fi

# Testar documentação
echo "📚 Testando documentação..."
if curl -s --max-time 10 https://api.slimquality.com.br/docs > /dev/null; then
    echo "✅ Documentação OK"
else
    echo "❌ Documentação falhou"
fi

echo "🎯 Teste concluído!"