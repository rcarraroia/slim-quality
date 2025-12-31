# 🚀 DEPLOY VIA GITHUB - ALTERNATIVA

Se o Docker Hub continuar com erro, use este método:

## 1. Configurar Source como GitHub

No Easypanel:
1. **Source:** GitHub
2. **Repository:** [SEU_REPO_GITHUB]/slim-quality
3. **Branch:** main
4. **Build Path:** agent
5. **Dockerfile Path:** agent/Dockerfile

## 2. Environment Variables

```bash
SUPABASE_URL=https://vtynmmtuvxreiwcxxlma.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0
CLAUDE_API_KEY=sk-ant-api03-[SUA_CHAVE]
EVOLUTION_URL=https://evolution-api.wpjtfd.easypanel.host
REDIS_URL=redis://redisn8n:6379
ENVIRONMENT=production
LOG_LEVEL=INFO
PYTHONPATH=/app
PYTHONUNBUFFERED=1
PORT=8000
```

## 3. Networking

- **Porta:** 8000
- **Domínio:** api.slimquality.com.br

Este método fará build direto do código no GitHub.