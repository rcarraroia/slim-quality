# 🔐 CONEXÃO REAL COM CONTA ASAAS - GUIA COMPLETO

## ⚠️ ATENÇÃO - RESPOSTAS SEMPRE EM PORTUGUES-BR

## 🎯 OBJETIVO

Conectar o MCP configurado com sua conta real do Asaas para executar operações reais de:
- Consulta de clientes
- Criação de cobranças  
- Gerenciamento de webhooks
- Validação de subcontas (Wallet IDs)
- Split de pagamentos

---

## 🔧 PASSO 1: OBTER CREDENCIAIS ASAAS

### **1.1 Acessar Painel Asaas**
1. Acesse: https://app.asaas.com
2. Faça login na sua conta
3. Vá em **Configurações** > **Integrações** > **API**

### **1.2 Gerar/Copiar API Key**
```bash
# Exemplo de API Key (SANDBOX):
$aact_YTU5YTE0M2M2N2I4MTliNzk0YTI5N2U5MzdjNWZmNDQ6OjAwMDAwMDAwMDAwMDAwNzI4Mjk6OiRhYWRkOmY3NjIx

# Exemplo de API Key (PRODUCTION):
$aact_MzQ1NjE0M2M2N2I4MTliNzk0YTI5N2U5MzdjNWZmNDQ6OjAwMDAwMDAwMDAwMDAwNzI4Mjk6OiRhYWRkOmY3NjIx
```

### **1.3 Identificar Ambiente**
- **Sandbox:** Para testes (recomendado inicialmente)
- **Production:** Para operações reais

---

## 🔧 PASSO 2: CONFIGURAR VARIÁVEIS DE AMBIENTE

### **2.1 Criar arquivo .env (se não existir)**
<function_calls>
<invoke name="fsWrite">
<parameter name="path">.env.asaas.example CONFIGURAÇÃO ASAAS - COPIE PARA .env
# ⚠️ NUNCA COMMITAR ESTE ARQUIVO COM DADOS REAIS

# AMBIENTE (sandbox ou production)
ASAAS_ENVIRONMENT=sandbox

# API KEYS (use apenas uma por vez)
# SANDBOX
ASAAS_API_KEY_SANDBOX=$aact_YTU5YTE0M2M2N2I4MTliNzk0YTI5N2U5MzdjNWZmNDQ6OjAwMDAwMDAwMDAwMDAwNzI4Mjk6OiRhYWRkOmY3NjIx

# PRODUCTION (descomente quando for usar)
# ASAAS_API_KEY_PRODUCTION=$aact_SUA_CHAVE_PRODUCTION_AQUI

# URLS DA API
ASAAS_API_URL_SANDBOX=https://sandbox.asaas.com/api/v3
ASAAS_API_URL_PRODUCTION=https://api.asaas.com/v3

# WEBHOOK (opcional)
ASAAS_WEBHOOK_SECRET=sua_webhook_secret_aqui

# WALLET IDS (para split)
ASAAS_WALLET_FABRICA=wal_xxxxx
ASAAS_WALLET_RENUM=wal_xxxxx  
ASAAS_WALLET_JB=wal_xxxxx