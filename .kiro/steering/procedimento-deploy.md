---
inclusion: manual
---

# 🚀 PROCEDIMENTO DE DEPLOY - SLIM QUALITY

## ⚠️ ATENÇÃO - RESPOSTAS SEMPRE EM PORTUGUES-BR

## 📋 ARQUITETURA DO SISTEMA

### **FRONTEND (React/Vite)**
- **Localização:** Raiz do projeto (`/`)
- **Deploy:** Automático via Vercel
- **Trigger:** Commit + Push para repositório GitHub
- **URL:** https://slimquality.com.br

### **BACKEND/AGENTE (Python/FastAPI)**
- **Localização:** Pasta `agent/`
- **Deploy:** Manual via Docker Hub + EasyPanel
- **Trigger:** Rebuild manual necessário
- **URL:** https://api.slimquality.com.br

---

## 🔄 FLUXO DE DEPLOY

### **ALTERAÇÕES NO FRONTEND**
```bash
# 1. Fazer alterações nos arquivos (src/, public/, etc.)
# 2. Commit e push
git add .
git commit -m "feat: descrição da alteração"
git push origin main

# 3. Deploy automático no Vercel (sem ação necessária)
# ✅ Site atualizado automaticamente em ~2 minutos
```

### **ALTERAÇÕES NO AGENTE/BACKEND**
```bash
# 1. Fazer alterações nos arquivos da pasta agent/
# 2. Commit e push (para versionamento)
git add .
git commit -m "feat: alteração no agente"
git push origin main

# 3. Rebuild da imagem Docker
cd agent
docker build -t renumvscode/slim-agent:latest .

# 4. Push para Docker Hub
docker push renumvscode/slim-agent:latest

# 5. Rebuild manual no EasyPanel (Renato faz)
# - Acessar EasyPanel
# - Ir no service slim-agent
# - Clicar em "Rebuild"
# ✅ API atualizada após rebuild
```

---

## 📁 IDENTIFICAÇÃO DE ALTERAÇÕES

### **FRONTEND (Deploy Automático)**
Alterações em qualquer arquivo fora da pasta `agent/`:
- `src/` - Código React/TypeScript
- `public/` - Arquivos estáticos
- `index.html` - HTML principal
- `package.json` - Dependências frontend
- `vite.config.ts` - Configuração Vite
- `tailwind.config.ts` - Configuração CSS
- Qualquer arquivo na raiz (exceto `agent/`)

### **BACKEND (Rebuild Docker Necessário)**
Alterações em qualquer arquivo dentro da pasta `agent/`:
- `agent/src/` - Código Python/FastAPI
- `agent/requirements.txt` - Dependências Python
- `agent/Dockerfile` - Configuração Docker
- `agent/docker-compose.yml` - Orquestração
- Qualquer arquivo dentro de `agent/`

---

## 🛠️ COMANDOS ESSENCIAIS

### **Verificar Status do Docker**
```bash
# Ver imagens locais
docker images | grep slim-agent

# Ver containers rodando
docker ps | grep slim-agent

# Logs do container (se rodando local)
docker logs slim-agent
```

### **Rebuild Completo do Agente**
```bash
# Navegar para pasta do agente
cd agent

# Limpar cache (opcional)
docker system prune -f

# Rebuild forçado (sem cache)
docker build --no-cache -t renumvscode/slim-agent:latest .

# Push para Docker Hub
docker push renumvscode/slim-agent:latest
```

### **Verificar Deploy**
```bash
# Testar API após deploy
curl https://api.slimquality.com.br/health

# Testar frontend após deploy
curl https://slimquality.com.br
```

---

## 📊 CHECKLIST DE DEPLOY

### **ANTES DE FAZER ALTERAÇÕES:**
- [ ] Identificar se alteração é frontend ou backend
- [ ] Verificar se há dependências entre frontend e backend
- [ ] Fazer backup se alteração for crítica

### **ALTERAÇÕES NO FRONTEND:**
- [ ] Testar localmente (`npm run dev`)
- [ ] Fazer commit e push
- [ ] Aguardar deploy automático do Vercel (~2 min)
- [ ] Testar site em produção
- [ ] ✅ Concluído

### **ALTERAÇÕES NO BACKEND:**
- [ ] Testar localmente (`python src/api/main.py`)
- [ ] Fazer commit e push
- [ ] Navegar para pasta `agent/`
- [ ] Rebuild Docker: `docker build -t renumvscode/slim-agent:latest .`
- [ ] Push Docker Hub: `docker push renumvscode/slim-agent:latest`
- [ ] Informar Renato para rebuild no EasyPanel
- [ ] Aguardar rebuild manual (~5 min)
- [ ] Testar API em produção
- [ ] ✅ Concluído

---

## 🚨 SITUAÇÕES ESPECIAIS

### **ALTERAÇÕES EM AMBOS (Frontend + Backend)**
1. Fazer todas as alterações
2. Commit e push (para versionamento)
3. Deploy frontend (automático)
4. Rebuild backend (manual)
5. Testar integração completa

### **ALTERAÇÕES APENAS EM CONFIGURAÇÃO**
- `.env` - Não precisa rebuild (apenas restart)
- `package.json` (frontend) - Deploy automático
- `requirements.txt` (backend) - Rebuild necessário
- `Dockerfile` - Rebuild necessário

### **ROLLBACK DE EMERGÊNCIA**
```bash
# Frontend: Reverter commit e push
git revert HEAD
git push origin main

# Backend: Usar tag anterior
docker pull renumvscode/slim-agent:previous
docker tag renumvscode/slim-agent:previous renumvscode/slim-agent:latest
docker push renumvscode/slim-agent:latest
# + Rebuild no EasyPanel
```

---

## 🔧 CONFIGURAÇÃO DO EASYPANEL (Para Automação Futura)

### **Webhook Automático (Opcional)**
Para automatizar o rebuild do EasyPanel quando houver push no Docker Hub:

1. **No Docker Hub:**
   - Ir em Settings > Webhooks
   - Adicionar webhook: `https://api.easypanel.io/webhooks/docker/slim-agent`

2. **No EasyPanel:**
   - Configurar webhook para trigger rebuild
   - Filtrar apenas pushes da tag `latest`

### **GitHub Actions (Alternativa)**
Criar `.github/workflows/deploy-agent.yml`:
```yaml
name: Deploy Agent
on:
  push:
    paths: ['agent/**']
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Build and Push Docker
        run: |
          cd agent
          docker build -t renumvscode/slim-agent:latest .
          docker push renumvscode/slim-agent:latest
      - name: Trigger EasyPanel Rebuild
        run: |
          curl -X POST "https://api.easypanel.io/projects/slim-quality/services/slim-agent/deploy" \
               -H "Authorization: Bearer ${{ secrets.EASYPANEL_TOKEN }}"
```

---

## 📝 LOGS E MONITORAMENTO

### **Verificar Status dos Deploys**
- **Frontend:** https://vercel.com/dashboard (Renato tem acesso)
- **Backend:** EasyPanel Dashboard > slim-agent service
- **Docker Hub:** https://hub.docker.com/r/renumvscode/slim-agent

### **Logs de Erro Comuns**
- **Frontend:** Console do navegador + Vercel logs
- **Backend:** EasyPanel logs + `docker logs slim-agent`

---

## 🎯 RESUMO EXECUTIVO

### **REGRA SIMPLES:**
- **Alteração fora de `agent/`** = Deploy automático ✅
- **Alteração dentro de `agent/`** = Rebuild Docker + EasyPanel 🔄

### **COMANDOS ESSENCIAIS:**
```bash
# Para alterações no agente:
cd agent
docker build -t renumvscode/slim-agent:latest .
docker push renumvscode/slim-agent:latest
# + Informar Renato para rebuild no EasyPanel
```

---

**ESTE DOCUMENTO DEVE SER CONSULTADO SEMPRE QUE HOUVER DÚVIDAS SOBRE DEPLOY!**

**Criado em:** 02/01/2026  
**Última atualização:** 02/01/2026  
**Status:** Ativo e obrigatório