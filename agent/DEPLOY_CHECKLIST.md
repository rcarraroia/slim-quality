# 🚀 CHECKLIST DE DEPLOY - SPRINT 5.5

## ⚠️ SISTEMA EM PRODUÇÃO - VERIFICAÇÃO OBRIGATÓRIA

**Data:** 02/01/2026  
**Sprint:** 5.5 - Queries + Imagens + Áudio  
**Status:** PRONTO PARA DEPLOY  

---

## 📋 CHECKLIST PRÉ-DEPLOY

### ✅ 1. VARIÁVEIS DE AMBIENTE

**Verificar se estão configuradas:**
- [ ] `OPENAI_API_KEY` - Para TTS e Whisper
- [ ] `SUPABASE_URL` - Conexão com banco
- [ ] `SUPABASE_ANON_KEY` - Autenticação Supabase
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Para MCP Server
- [ ] `EVOLUTION_API_URL` - WhatsApp API
- [ ] `EVOLUTION_API_KEY` - Autenticação Evolution
- [ ] `EVOLUTION_INSTANCE` - Instância WhatsApp

**Comando de verificação:**
```bash
python -c "
import os
vars = ['OPENAI_API_KEY', 'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'EVOLUTION_API_URL', 'EVOLUTION_API_KEY']
missing = [v for v in vars if not os.getenv(v)]
print('✅ Todas configuradas' if not missing else f'❌ Faltando: {missing}')
"
```

### ✅ 2. DEPENDÊNCIAS PYTHON

**Verificar se estão instaladas:**
- [ ] `openai>=1.0.0` - Para TTS e Whisper
- [ ] `supabase>=2.0.0` - Cliente Supabase
- [ ] `structlog` - Logging estruturado
- [ ] `asyncio` - Operações assíncronas
- [ ] `requests` - HTTP requests
- [ ] `python-dotenv` - Variáveis de ambiente

**Comando de verificação:**
```bash
cd agent
pip list | grep -E "(openai|supabase|structlog)"
```

### ✅ 3. SERVIÇOS MCP

**Verificar se estão rodando:**
- [ ] MCP Gateway (porta 8085)
- [ ] MCP Supabase Server (porta 3005)
- [ ] MCP WhatsApp Evolution (se configurado)

**Comando de verificação:**
```bash
cd agent
docker-compose ps
curl -s http://localhost:8085/health || echo "❌ MCP Gateway offline"
curl -s http://localhost:3005/health || echo "❌ MCP Supabase offline"
```

### ✅ 4. BANCO DE DADOS

**Verificar estruturas:**
- [ ] Tabela `products` com campos `image_url` e `product_page_url`
- [ ] Tabela `customers` acessível
- [ ] Bucket `product-images` no Supabase Storage
- [ ] Imagens dos 4 produtos carregadas

**Comando de verificação:**
```bash
# Via MCP
curl -X POST http://localhost:3005/execute \
  -H "Content-Type: application/json" \
  -d '{"tool": "query_database", "parameters": {"table": "products", "limit": 1}}'
```

### ✅ 5. CONECTIVIDADE EXTERNA

**Verificar APIs externas:**
- [ ] OpenAI API (TTS e Whisper)
- [ ] Evolution API (WhatsApp)
- [ ] Supabase (banco e storage)

**Comando de verificação:**
```bash
# OpenAI
curl -s -H "Authorization: Bearer $OPENAI_API_KEY" https://api.openai.com/v1/models | grep -q "whisper" && echo "✅ OpenAI OK" || echo "❌ OpenAI falhou"

# Evolution API
curl -s "$EVOLUTION_API_URL/instance/fetchInstances" -H "apikey: $EVOLUTION_API_KEY" | grep -q "instance" && echo "✅ Evolution OK" || echo "❌ Evolution falhou"
```

### ✅ 6. FUNCIONALIDADES IMPLEMENTADAS

**Verificar se estão funcionando:**
- [ ] Preços dinâmicos (cache + fallback)
- [ ] Histórico de clientes (reconhecimento)
- [ ] Imagens híbridas (envio automático)
- [ ] Áudio → Transcrição (Whisper)
- [ ] Texto → Áudio (TTS)
- [ ] Estratégia espelhada (áudio↔áudio, texto↔texto)

### ✅ 7. MÉTRICAS E MONITORAMENTO

**Verificar se estão coletando:**
- [ ] Métricas de áudio (TTS, Whisper, detecção)
- [ ] Métricas de cache (hit/miss rates)
- [ ] Saúde dos serviços
- [ ] Alertas configurados

---

## 🧪 TESTES DE VALIDAÇÃO

### Teste 1: Preços Dinâmicos
```bash
# Testar via SICC Service
python -c "
import asyncio
from src.services.dynamic_pricing_service import get_dynamic_pricing_service

async def test():
    service = get_dynamic_pricing_service()
    prices = await service.get_current_prices()
    print(f'✅ Preços: {len(prices)} produtos' if prices else '❌ Preços falhou')

asyncio.run(test())
"
```

### Teste 2: Histórico Cliente
```bash
# Testar reconhecimento
python -c "
import asyncio
from src.services.customer_history_service import get_customer_history_service

async def test():
    service = get_customer_history_service()
    result = await service.check_customer_history('+5511999999999')
    print('✅ Histórico funcionando' if result is not None else '❌ Histórico falhou')

asyncio.run(test())
"
```

### Teste 3: Detecção de Áudio
```bash
# Testar detecção
python -c "
from src.services.audio_detection_service import get_audio_detection_service

service = get_audio_detection_service()
test_msg = {'messageType': 'audioMessage', 'media': {'url': 'test.ogg'}}
result = service.is_audio_message(test_msg)
print('✅ Detecção áudio OK' if result else '❌ Detecção áudio falhou')
"
```

### Teste 4: Saúde do Sistema
```bash
# Executar health check completo
python -c "
import asyncio
from src.services.system_health_service import get_system_health_service

async def test():
    service = get_system_health_service()
    health = await service.run_full_health_check()
    print(f'Status: {health[\"overall_status\"]}')
    print(f'Passou: {health[\"summary\"][\"passed\"]}/{health[\"summary\"][\"total_checks\"]}')

asyncio.run(test())
"
```

---

## 🚨 PROCEDIMENTO DE DEPLOY

### 1. Backup de Segurança
```bash
# Backup do banco (se necessário)
supabase db dump > backup_pre_sprint55_$(date +%Y%m%d_%H%M%S).sql

# Backup dos arquivos críticos
cp -r agent/src/services agent/src/services_backup_$(date +%Y%m%d_%H%M%S)
```

### 2. Deploy dos Serviços
```bash
# Parar serviços atuais
cd agent
docker-compose down

# Atualizar código
git pull origin main

# Subir serviços atualizados
docker-compose up -d

# Verificar se subiram
docker-compose ps
```

### 3. Validação Pós-Deploy
```bash
# Aguardar 30 segundos para inicialização
sleep 30

# Executar health check
python -c "
import asyncio
from src.services.system_health_service import get_system_health_service

async def validate():
    service = get_system_health_service()
    health = await service.run_full_health_check()
    
    if health['overall_status'] == 'healthy':
        print('✅ DEPLOY SUCESSO - Sistema saudável')
        return True
    else:
        print(f'❌ DEPLOY PROBLEMA - Status: {health[\"overall_status\"]}')
        print('Componentes com problema:')
        for comp, status in health['components'].items():
            if status['status'] != 'healthy':
                print(f'  - {comp}: {status[\"message\"]}')
        return False

success = asyncio.run(validate())
exit(0 if success else 1)
"
```

### 4. Teste com Cliente Real
```bash
# Enviar mensagem de teste via WhatsApp
# Verificar se BIA responde normalmente
# Testar áudio → transcrição → resposta
# Testar pedido de produto → imagem
```

---

## 🔄 ROLLBACK (Se necessário)

### Em caso de problemas:
```bash
# Parar serviços
cd agent
docker-compose down

# Restaurar backup
rm -rf src/services
mv src/services_backup_YYYYMMDD_HHMMSS src/services

# Subir versão anterior
docker-compose up -d

# Validar rollback
curl -s http://localhost:8085/health && echo "✅ Rollback OK"
```

---

## 📊 MONITORAMENTO PÓS-DEPLOY

### Métricas para acompanhar:
- **Taxa de erro áudio:** < 5%
- **Tempo resposta TTS:** < 20s
- **Tempo resposta Whisper:** < 30s
- **Cache hit rate:** > 70%
- **Disponibilidade geral:** > 99%

### Logs para monitorar:
```bash
# Logs dos serviços
docker-compose logs -f

# Logs específicos do SICC
docker-compose logs -f agent

# Métricas em tempo real
curl -s http://localhost:8085/metrics | jq .
```

---

## ✅ APROVAÇÃO FINAL

**Checklist completo:**
- [ ] Todas as variáveis de ambiente configuradas
- [ ] Todos os serviços rodando
- [ ] Banco de dados atualizado
- [ ] APIs externas acessíveis
- [ ] Funcionalidades testadas
- [ ] Métricas coletando
- [ ] Health check passou
- [ ] Teste com cliente real OK

**Responsável pelo deploy:** Kiro AI  
**Data/Hora:** _______________  
**Aprovado por:** Renato Carraro  

---

**🚀 SISTEMA PRONTO PARA PRODUÇÃO!**