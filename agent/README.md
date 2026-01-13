# 🤖 BACKEND DO AGENTE BIA

## ⚠️ ATENÇÃO - LEIA ANTES DE IMPLEMENTAR QUALQUER CÓDIGO AQUI

## 🎯 PROPÓSITO DESTE BACKEND

Este backend é **EXCLUSIVAMENTE** para o **Agente BIA** (assistente de IA via WhatsApp).

**NÃO é o backend principal do sistema Slim Quality.**

---

## 🚫 O QUE **NÃO** VAI AQUI

### ❌ APIs do Sistema Geral
- Checkout/Pagamento
- Tracking de afiliados
- Gestão de pedidos
- Cadastro de clientes
- Dashboard administrativo
- Qualquer endpoint que o frontend React consome

### ❌ Integrações Gerais
- Asaas (exceto webhooks específicos do agente)
- Supabase (exceto para salvar conversas do agente)
- APIs de terceiros não relacionadas ao agente

---

## ✅ O QUE **VAI** AQUI

### ✅ Funcionalidades do Agente BIA
- Processamento de mensagens via IA
- Sistema SICC (memória corporativa)
- Integração com WhatsApp (Evolution API)
- Webhooks do Evolution API
- Conversas do agente (salvar no Supabase)
- Lógica de resposta inteligente

### ✅ Estrutura de Pastas
```
agent/
├── src/
│   ├── api/              # Endpoints FastAPI
│   │   ├── main.py       # Entry point
│   │   ├── agent.py      # Status do agente
│   │   ├── mcp.py        # Integrações MCP
│   │   ├── sicc.py       # Sistema SICC
│   │   └── webhooks_*.py # Webhooks específicos
│   ├── services/         # Lógica de negócio
│   │   ├── sicc/         # Sistema de memória
│   │   └── ai_service.py # Integração OpenAI
│   └── graph/            # LangGraph (se usado)
├── Dockerfile
└── requirements.txt
```

---

## 🔄 BACKEND PRINCIPAL DO SISTEMA

**Localização:** `/server/index.js` (Express/Node.js)

**Responsável por:**
- APIs REST do sistema (`/api/*`)
- Checkout e pagamento
- Tracking de afiliados
- Webhooks Asaas
- Integrações gerais

**Quando implementar APIs:**
- Se o frontend React chama → `server/index.js`
- Se é webhook externo do sistema → `server/index.js`
- Se é processamento do agente BIA → `agent/src/api/`

---

## 📋 CHECKLIST ANTES DE IMPLEMENTAR

Antes de adicionar código neste backend, perguntar:

- [ ] Esta funcionalidade é **exclusiva** do agente BIA?
- [ ] O frontend React **NÃO** vai chamar esta API?
- [ ] Não é uma integração geral do sistema?
- [ ] Está relacionado a WhatsApp/Evolution API?
- [ ] Está relacionado ao sistema SICC?

**Se respondeu "NÃO" para qualquer pergunta acima:**
→ **Implementar em `server/index.js`, NÃO aqui!**

---

## 🛠️ TECNOLOGIAS

- **Runtime:** Python 3.11+
- **Framework:** FastAPI
- **IA:** OpenAI GPT-4
- **Memória:** Sistema SICC (Supabase)
- **WhatsApp:** Evolution API
- **Deploy:** Docker (EasyPanel)

---

## 🚀 DEPLOY

**Método:** Docker Hub + EasyPanel (rebuild manual)

**Processo:**
1. Fazer alterações no código
2. Commit e push para GitHub
3. Rebuild da imagem Docker:
   ```bash
   cd agent
   docker build -t renumvscode/slim-agent:latest .
   docker push renumvscode/slim-agent:latest
   ```
4. Informar Renato para rebuild no EasyPanel

**NÃO é deploy automático como o frontend!**

---

## 📞 DÚVIDAS?

**Antes de implementar qualquer código aqui, pergunte:**
- "Esta API deve estar no backend Express ou no backend Python?"
- "O frontend vai chamar esta API?"
- "Isso é exclusivo do agente BIA?"

**Em caso de dúvida, SEMPRE perguntar ao Renato!**

---

**Criado em:** 13/01/2026  
**Última atualização:** 13/01/2026  
**Status:** Obrigatório - ler antes de qualquer implementação
