# 🚀 INSTRUÇÕES DE DEPLOY - EDGE FUNCTION VALIDATE-ASAAS-WALLET

**Data:** 10/01/2026  
**Responsável:** Renato Carraro  
**Tempo Estimado:** 10 minutos  

---

## ✅ CORREÇÕES JÁ REALIZADAS

### 1. **Edge Function Corrigida**
- ✅ Arquivo: `supabase/functions/validate-asaas-wallet/index.ts`
- ✅ Regex atualizado para UUID v4
- ✅ Mensagem de erro atualizada

### 2. **Migration Criada**
- ✅ Arquivo: `supabase/migrations/20260111000007_fix_asaas_wallets_constraint.sql`
- ✅ Corrige constraint da tabela `asaas_wallets`

---

## 📋 PASSO A PASSO PARA DEPLOY

### **ETAPA 1: Aplicar Migration no Banco**

```bash
# Navegar para raiz do projeto
cd E:\PROJETOS SITE\repositorios\slim-quality

# Aplicar migration
supabase db push
```

**Resultado esperado:**
```
Applying migration 20260111000007_fix_asaas_wallets_constraint.sql...
✓ Migration applied successfully
```

---

### **ETAPA 2: Deploy da Edge Function**

```bash
# Deploy da função
supabase functions deploy validate-asaas-wallet
```

**Resultado esperado:**
```
Deploying function validate-asaas-wallet...
✓ Function deployed successfully
URL: https://vtynmmtuvxreiwcxxlma.supabase.co/functions/v1/validate-asaas-wallet
```

---

### **ETAPA 3: Configurar API Key do Asaas**

**Opção A: Via Supabase CLI**
```bash
supabase secrets set ASAAS_API_KEY=sua-chave-asaas-aqui
```

**Opção B: Via Dashboard (Recomendado)**
1. Acessar: https://supabase.com/dashboard/project/vtynmmtuvxreiwcxxlma
2. Ir em: **Settings** → **Edge Functions** → **Secrets**
3. Adicionar secret:
   - **Name:** `ASAAS_API_KEY`
   - **Value:** Sua chave da API Asaas (começa com `$aact_...`)
4. Clicar em **Save**

**⚠️ IMPORTANTE:** Use a chave de PRODUÇÃO do Asaas, não a de sandbox!

---

### **ETAPA 4: Testar a Edge Function**

**Teste via cURL:**
```bash
curl -X POST https://vtynmmtuvxreiwcxxlma.supabase.co/functions/v1/validate-asaas-wallet \
  -H "Content-Type: application/json" \
  -d '{"walletId": "c0c31b6a-2481-4e3f-a6de-91c3ff834d1f"}'
```

**Resultado esperado (sucesso):**
```json
{
  "valid": true,
  "exists": true,
  "active": true,
  "name": "Nome do titular da wallet"
}
```

**Resultado esperado (wallet inválida):**
```json
{
  "valid": false,
  "exists": false,
  "error": "Wallet ID não encontrada no Asaas"
}
```

**Resultado esperado (formato errado):**
```json
{
  "valid": false,
  "error": "Formato de Wallet ID inválido. Deve ser um UUID v4 (ex: cd912fa1-5fa4-4d49-92eb-b5ab4dfba961)"
}
```

---

### **ETAPA 5: Atualizar Wallet do Giuseppe**

1. Acessar: https://supabase.com/dashboard/project/vtynmmtuvxreiwcxxlma/editor
2. Ir na tabela: **affiliates**
3. Localizar registro: **Giuseppe Afonso**
4. Editar campo `wallet_id`:
   - **Valor atual:** `a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d` (teste)
   - **Novo valor:** UUID real da wallet do Giuseppe no Asaas
5. Salvar alteração

---

### **ETAPA 6: Testar no Frontend**

1. Acessar: https://slimquality.com.br/dashboard/configuracoes
2. Ir na seção: **Configurações de Afiliado**
3. Tentar atualizar Wallet ID com:
   - ✅ UUID válido do Asaas → Deve aceitar
   - ❌ Formato antigo `wal_xxxxx` → Deve rejeitar
   - ❌ UUID inválido → Deve rejeitar

---

## 🔍 VERIFICAÇÃO DE SUCESSO

### **Checklist:**
- [ ] Migration aplicada sem erros
- [ ] Edge Function deployada com sucesso
- [ ] Secret `ASAAS_API_KEY` configurado
- [ ] Teste via cURL retorna resposta válida
- [ ] Wallet do Giuseppe atualizada
- [ ] Frontend valida corretamente Wallet IDs

---

## 🚨 TROUBLESHOOTING

### **Erro: "ASAAS_API_KEY não configurada"**
- **Causa:** Secret não foi configurado
- **Solução:** Executar ETAPA 3 novamente

### **Erro: "Wallet ID não encontrada no Asaas"**
- **Causa:** UUID não existe no Asaas ou é de sandbox
- **Solução:** Verificar UUID correto no painel do Asaas

### **Erro: "CORS error"**
- **Causa:** Edge Function não foi deployada
- **Solução:** Executar ETAPA 2 novamente

### **Erro: "Formato de Wallet ID inválido"**
- **Causa:** UUID não está no formato v4
- **Solução:** Verificar formato correto (8-4-4-4-12 caracteres hexadecimais)

---

## 📊 LOGS E MONITORAMENTO

### **Ver logs da Edge Function:**
```bash
supabase functions logs validate-asaas-wallet
```

### **Ver logs em tempo real:**
```bash
supabase functions logs validate-asaas-wallet --follow
```

### **Via Dashboard:**
1. Acessar: https://supabase.com/dashboard/project/vtynmmtuvxreiwcxxlma
2. Ir em: **Edge Functions** → **validate-asaas-wallet** → **Logs**

---

## ✅ CONCLUSÃO

Após executar todos os passos:
- ✅ Edge Function validará Wallet IDs corretamente
- ✅ Formato UUID v4 será aceito
- ✅ Validação real via API Asaas funcionará
- ✅ Afiliados não poderão cadastrar Wallet IDs inválidos
- ✅ Comissões serão protegidas

**Tempo total estimado:** 10 minutos  
**Complexidade:** Baixa  
**Risco:** Mínimo (apenas correção de validação)

---

**Qualquer dúvida, consultar:**
- Relatório de verificação: `.kiro/specs/correcao-critica-sistema-afiliados/RELATORIO_VERIFICACAO_BANCO.md`
- Documentação Supabase: https://supabase.com/docs/guides/functions
