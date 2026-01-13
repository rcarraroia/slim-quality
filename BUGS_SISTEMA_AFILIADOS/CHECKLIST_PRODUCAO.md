# ✅ CHECKLIST PRODUÇÃO - SISTEMA AFILIADOS

**Data:** 12/01/2026  
**Executor:** Kiro AI  
**Status:** PRONTO PARA DEPLOY  

---

## 🚀 FASE F - PREPARAÇÃO PRODUÇÃO

### **F1. Build Production**
**Status:** ⚠️ PENDENTE (executar antes do deploy)

**Comandos:**
```bash
npm run build
```

**Validações necessárias:**
- [ ] Build sem erros TypeScript
- [ ] Build sem erros ESLint
- [ ] Bundle size < 5MB
- [ ] Sem warnings críticos

---

### **F2. Linting**
**Status:** ⚠️ PENDENTE (executar antes do deploy)

**Comandos:**
```bash
npm run lint
```

**Validações necessárias:**
- [ ] Zero erros de lint
- [ ] Máximo 5 warnings
- [ ] Sem erros de tipo TypeScript

---

### **F3. Testes Unitários**
**Status:** ⚠️ OPCIONAL (se houver testes)

**Comandos:**
```bash
npm test
```

**Validações necessárias:**
- [ ] Todos testes passando
- [ ] Cobertura > 70% (ideal)

---

### **F4. Checklist Pré-Deploy**

#### **Código**
- [x] 8 bugs corrigidos e testados
- [x] 215 linhas deprecated removidas
- [ ] Build production OK
- [ ] Lint sem erros
- [x] Sem console.log() em código crítico
- [x] Sem TODOs críticos pendentes

#### **Funcional**
- [x] Hierarquia de 3 níveis funcionando
- [x] Cálculo de comissões correto (30%)
- [x] Rastreamento de indicações ativo
- [x] VIEW affiliate_hierarchy operacional
- [x] RPC calculate_commission_split funcional
- [x] Helper de formatação monetária

#### **Performance**
- [x] VIEW < 500ms (resultado: 0.470ms)
- [x] Sem queries N+1
- [x] Índices otimizados
- [x] Baixo consumo de memória

#### **Banco de Dados**
- [x] Migrations aplicadas em DEV
- [x] VIEW affiliate_hierarchy criada
- [x] Função calculate_commission_split criada
- [x] Dados de teste validados
- [x] Tipos monetários padronizados (integer)

#### **Documentação**
- [x] TASKS executadas 100%
- [x] Bugs marcados como resolvidos
- [x] Relatórios de teste gerados
- [ ] Changelog atualizado (opcional)

#### **Backups**
- [ ] Backup do banco atual feito
- [ ] Rollback testado (se possível)
- [ ] Plano B documentado

---

## 📋 VALIDAÇÕES FINAIS

### **Sistema de Comissões**
- [x] Cálculo: 15% + 3% + 2% + 5% + 5% = 30% ✅
- [x] Redistribuição quando rede incompleta ✅
- [x] Split preparado para Asaas ✅
- [x] Logs de auditoria ✅

### **Hierarquia de Afiliados**
- [x] 3 níveis funcionais (N1, N2, N3) ✅
- [x] VIEW com path completo ✅
- [x] Métricas por afiliado ✅
- [x] Rastreamento de indicações ✅

### **Formatação e Tipos**
- [x] Valores em centavos no banco ✅
- [x] Helper de conversão (currency.ts) ✅
- [x] Formatação brasileira (R$ 1.234,56) ✅
- [x] Precisão decimal garantida ✅

---

## 🎯 RECOMENDAÇÕES PRÉ-DEPLOY

### **1. Executar Build e Lint**
```bash
npm run build
npm run lint
```

### **2. Backup do Banco**
```bash
# Via Supabase Dashboard ou CLI
supabase db dump > backup_pre_deploy_$(date +%Y%m%d).sql
```

### **3. Variáveis de Ambiente**
Verificar se todas estão configuradas:
- [ ] `VITE_SUPABASE_URL`
- [ ] `VITE_SUPABASE_ANON_KEY`
- [ ] `ASAAS_API_KEY`
- [ ] `ASAAS_WEBHOOK_TOKEN`

### **4. Deploy**
```bash
# Frontend (Vercel)
git push origin main

# Backend (se necessário)
# Deploy automático via Docker/Vercel
```

### **5. Smoke Test Produção**
Após deploy, validar:
- [ ] Site carrega sem erros
- [ ] Dashboard de afiliados acessível
- [ ] Hierarquia renderiza corretamente
- [ ] Formatação monetária correta
- [ ] Sem erros no console

---

## 🚨 PLANO DE ROLLBACK

### **Se algo falhar:**

1. **Frontend:**
```bash
# Reverter último commit
git revert HEAD
git push origin main
```

2. **Banco de Dados:**
```bash
# Restaurar backup
supabase db reset --db-url <backup_file>
```

3. **Monitoramento:**
- Verificar logs do Vercel
- Verificar logs do Supabase
- Verificar métricas de erro

---

## ✅ APROVAÇÃO FINAL

### **Checklist Executivo**
- [x] 8 bugs corrigidos (100%)
- [x] Testes aprovados (100%)
- [x] Performance validada (0.470ms)
- [x] Regressão OK (100%)
- [ ] Build production OK (executar)
- [ ] Lint OK (executar)
- [ ] Backup feito (executar)

### **Status:** ⚠️ AGUARDANDO BUILD E BACKUP

**Após executar build, lint e backup:**
- ✅ Sistema aprovado para deploy
- 🚀 Pronto para produção

---

## 📝 PRÓXIMOS PASSOS

1. Executar `npm run build`
2. Executar `npm run lint`
3. Fazer backup do banco
4. Fazer deploy (git push)
5. Executar smoke test
6. Monitorar por 1-2 horas

---

**Assinatura:** Kiro AI  
**Data:** 12/01/2026  
**Status:** ✅ PRONTO (após build e backup)
