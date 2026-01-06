# 🧪 TESTE DE CONEXÃO ASAAS VIA MCP

## ⚠️ ATENÇÃO - RESPOSTAS SEMPRE EM PORTUGUES-BR

## 🔧 PASSO A PASSO PARA CONECTAR

### **1. CONFIGURAR VARIÁVEIS DE AMBIENTE**

Copie o conteúdo de `docs/ASAAS_CONEXAO_REAL.md` para seu arquivo `.env`:

```bash
# No arquivo .env (criar se não existir)
ASAAS_ENVIRONMENT=sandbox
ASAAS_API_KEY_SANDBOX=$aact_YTU5YTE0M2M2N2I4MTliNzk0YTI5N2U5MzdjNWZmNDQ6OjAwMDAwMDAwMDAwMDAwNzI4Mjk6OiRhYWRkOmY3NjIx
ASAAS_API_URL_SANDBOX=https://sandbox.asaas.com/api/v3
```

### **2. OBTER SUA API KEY REAL**

#### **Para Sandbox (Testes):**
1. Acesse: https://sandbox.asaas.com
2. Faça login ou crie conta
3. Vá em: **Configurações > Integrações > API Key**
4. Copie a chave que começa com `$aact_`

#### **Para Production (Real):**
1. Acesse: https://app.asaas.com
2. Faça login na sua conta real
3. Vá em: **Configurações > Integrações > API Key**
4. Copie a chave que começa com `$aact_`

### **3. ATUALIZAR CONFIGURAÇÃO**

Substitua a API Key no arquivo `.env`:
```bash
# Sandbox
ASAAS_API_KEY_SANDBOX=$aact_SUA_CHAVE_SANDBOX_AQUI

# Production (quando for usar)
ASAAS_API_KEY_PRODUCTION=$aact_SUA_CHAVE_PRODUCTION_AQUI
```

---

## 🚀 COMANDOS DE TESTE VIA MCP

### **Teste 1: Verificar Conta**
```
Kiro, use o MCP asaas-api para fazer GET /myAccount com header:
Authorization: $aact_SUA_CHAVE_AQUI
```

### **Teste 2: Listar Clientes**
```
Kiro, use o MCP asaas-api para fazer GET /customers com header:
Authorization: $aact_SUA_CHAVE_AQUI
```

### **Teste 3: Criar Cliente de Teste**
```
Kiro, use o MCP asaas-api para fazer POST /customers com:
Headers: Authorization: $aact_SUA_CHAVE_AQUI
Body: {
  "name": "Cliente Teste MCP",
  "email": "teste@exemplo.com",
  "cpfCnpj": "12345678901"
}
```

### **Teste 4: Verificar Saldo**
```
Kiro, use o MCP asaas-api para fazer GET /finance/balance com header:
Authorization: $aact_SUA_CHAVE_AQUI
```

---

## 📋 CHECKLIST DE CONFIGURAÇÃO

### **ANTES DE TESTAR:**
- [ ] API Key obtida do painel Asaas
- [ ] Variáveis de ambiente configuradas
- [ ] Kiro reiniciado para carregar MCP
- [ ] Ambiente definido (sandbox/production)

### **TESTES BÁSICOS:**
- [ ] GET /myAccount (dados da conta)
- [ ] GET /customers (lista de clientes)
- [ ] GET /finance/balance (saldo da conta)
- [ ] POST /customers (criar cliente teste)

### **TESTES AVANÇADOS:**
- [ ] Criar cobrança de teste
- [ ] Listar cobranças
- [ ] Testar webhook (se configurado)
- [ ] Validar split de pagamento

---

## 🔐 SEGURANÇA

### **IMPORTANTE:**
- ✅ **NUNCA** commitar API Keys no Git
- ✅ **SEMPRE** usar `.env` para credenciais
- ✅ **COMEÇAR** sempre com sandbox
- ✅ **TESTAR** antes de usar production

### **ESTRUTURA DE ARQUIVOS:**
```
projeto/
├── .env                    # Suas credenciais (não commitado)
├── .env.example           # Template (commitado)
├── .gitignore             # Inclui .env
└── docs/
    ├── ASAAS_CONEXAO_REAL.md  # Template de configuração
    └── TESTE_ASAAS_MCP.md     # Este guia
```

---

## 🎯 PRÓXIMOS PASSOS

### **APÓS CONFIGURAR:**
1. **Reiniciar Kiro** para carregar MCP atualizado
2. **Testar conexão** com comandos acima
3. **Validar dados** retornados pela API
4. **Implementar funcionalidades** específicas do projeto

### **COMANDOS PRONTOS PARA USAR:**
```bash
# Verificar conta
"Use o MCP asaas-api para GET /myAccount"

# Listar clientes  
"Use o MCP asaas-api para GET /customers"

# Verificar saldo
"Use o MCP asaas-api para GET /finance/balance"
```

---

**Configure suas credenciais e teste a conexão!** 🚀

**Data:** 06/01/2026  
**Status:** ✅ PRONTO PARA CONFIGURAR  
**Próximo passo:** Obter API Key e testar conexão