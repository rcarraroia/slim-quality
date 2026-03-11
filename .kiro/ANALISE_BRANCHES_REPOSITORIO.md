# 🔍 ANÁLISE DE BRANCHES DO REPOSITÓRIO

**Data da Análise:** 11/03/2026  
**Objetivo:** Identificar branches que podem ser deletadas para evitar merges acidentais

---

## 📊 RESUMO EXECUTIVO

### Total de Branches
- **Branch principal:** `main` (protegida)
- **Branches locais:** 2
- **Branches remotas:** 6 (incluindo main)
- **Branches não mergeadas:** 4

### Recomendação Geral
- ✅ **Manter:** 1 branch (main)
- ⚠️ **Avaliar:** 2 branches (podem ter código útil)
- 🔴 **DELETAR:** 3 branches (perigosas ou obsoletas)

---

## 🔴 BRANCHES PARA DELETAR IMEDIATAMENTE

### 1. `origin/claude/system-audit-quality-9622F` 🔥 CRÍTICO

**Status:** ❌ DELETAR IMEDIATAMENTE

**Motivo:** Branch PERIGOSA que deleta arquivos críticos do sistema

**Análise:**
- Commit principal: `c5c69e0` (11/01/2026)
- Deleta 15+ arquivos essenciais do sistema
- Propõe arquitetura incompatível com Vercel
- Código não testado
- **RISCO ALTÍSSIMO:** Merge acidental destruiria o sistema em produção

**Arquivos Críticos Deletados:**
- ❌ `api/affiliates.js` (2019 linhas)
- ❌ `api/webhook-assinaturas.js` (1965 linhas)
- ❌ `api/admin.js`
- ❌ `api/create-payment.js`
- ❌ `api/referral.js`
- ❌ `api/store-profiles.js`
- ❌ `src/components/PaywallCadastro.tsx`
- ❌ E mais 20+ componentes

**Impacto de Merge Acidental:**
- 🔴 Sistema completamente quebrado
- 🔴 Perda de funcionalidades de afiliados
- 🔴 Perda de sistema de pagamentos
- 🔴 Perda de comissionamento automático
- 🔴 Tempo de inatividade indeterminado

**Documentação Útil:**
- Contém 4 arquivos de auditoria que já foram extraídos
- Documentação já está em `.kiro/ANALISE_BRANCH_CLAUDE.md`

**Comando para Deletar:**
```bash
git push origin --delete claude/system-audit-quality-9622F
```

---

### 2. `origin/fix/deploy-trigger`

**Status:** ✅ DELETAR (já mergeada)

**Motivo:** Branch já foi mergeada na main

**Análise:**
- Commit principal: `4c230ae`
- Branch aparece em `git branch -r --merged origin/main`
- Todas as mudanças já estão na main
- Não há risco de perder código

**Mudanças Incluídas:**
- ✅ Fix cron schedule para hobby plan
- ✅ Sistema de monitoramento Asaas
- ✅ Alertas email/whatsapp
- ✅ Diagnóstico de autenticação Asaas

**Comando para Deletar:**
```bash
git push origin --delete fix/deploy-trigger
```

---

### 3. `origin/feature/limpeza-dados-mockados`

**Status:** ⚠️ AVALIAR ANTES DE DELETAR

**Motivo:** Branch antiga (3 meses) com muitas mudanças não mergeadas

**Análise:**
- Commit principal: `ef163f9`
- Última atualização: 3 meses atrás
- 504 commits à frente da main
- 47 commits atrás da main
- Mudanças: +36.000 linhas, -12.000 linhas

**Conteúdo:**
- ⚠️ Sistema 100% conectado ao banco
- ⚠️ Upload de imagens
- ⚠️ Specs completas de Sprints 0-7
- ⚠️ Documentação de steering files
- ⚠️ Correções críticas

**Risco:**
- ⚠️ Pode conter código útil não mergeado
- ⚠️ Pode conter documentação importante
- ⚠️ Pode conter correções não aplicadas

**Recomendação:**
1. ⏳ **ANTES DE DELETAR:** Revisar manualmente os commits
2. ⏳ Verificar se há código útil não mergeado
3. ⏳ Extrair documentação importante
4. ⏳ Só então deletar

**Comando para Revisar:**
```bash
git log origin/main..origin/feature/limpeza-dados-mockados --oneline
git diff origin/main...origin/feature/limpeza-dados-mockados --name-status
```

**Comando para Deletar (após revisão):**
```bash
git push origin --delete feature/limpeza-dados-mockados
```

---

## ⚠️ BRANCHES PARA AVALIAR

### 4. `origin/claude/audit-affiliate-payments-T5Rrx`

**Status:** ⚠️ AVALIAR

**Motivo:** Correções no fluxo de cadastro de afiliados

**Análise:**
- Commit principal: `a5eef6d`
- Última atualização: 2 horas atrás
- 0 commits à frente da main
- 1 commit atrás da main
- Mudanças pequenas e focadas

**Conteúdo:**
- ✅ Correção no fluxo de cadastro de afiliados
- ✅ Ajustes em `api/create-payment.js`
- ✅ Ajustes em `api/webhook-asaas.js`
- ✅ Ajustes em `PaywallCadastro.tsx`
- ✅ Ajustes em `customer-auth.service.ts`

**Mudanças:**
```
api/create-payment.js                 |  10 +++-
api/webhook-asaas.js                  | 110 ++++++++++++++++++++++++++
src/components/PaywallCadastro.tsx    |   3 +-
src/services/customer-auth.service.ts |  42 ++++++++++---
```

**Risco:**
- ✅ Mudanças pequenas e focadas
- ✅ Não deleta arquivos
- ✅ Parece ser correção legítima

**Recomendação:**
1. ⏳ **Revisar código** das mudanças
2. ⏳ Se útil: fazer merge na main
3. ⏳ Se obsoleto: deletar

**Comando para Revisar:**
```bash
git diff origin/main...origin/claude/audit-affiliate-payments-T5Rrx
```

---

### 5. `origin/claude/debug-auth-feature-flags-ako94`

**Status:** ⚠️ AVALIAR

**Motivo:** Correções no sistema de autenticação e criação de usuários

**Análise:**
- Commit principal: `0048418`
- Última atualização: 2 meses atrás
- 412 commits à frente da main
- 4 commits atrás da main
- Mudanças focadas em debug e correções

**Conteúdo:**
- ✅ Correção na Edge Function `admin-create-user`
- ✅ Análise de timeout da Edge Function
- ✅ Diagnóstico de criação de usuários
- ✅ Scripts de diagnóstico do banco
- ✅ Fallback para criação de usuário

**Mudanças:**
```
ANALISE_EDGE_FUNCTION_TIMEOUT.md              | 384 ++++++++++++
DIAGNOSTICO_CRIAR_USUARIOS.md                 | 519 +++++++++++++++
scripts/diagnostico_banco.sh                  | 189 ++++++
supabase/functions/admin-create-user/index.ts |  68 +++-
test_database_real.py                         | 197 ++++++
```

**Risco:**
- ✅ Mudanças focadas em debug
- ✅ Adiciona documentação útil
- ⚠️ Pode ter correções importantes não mergeadas

**Recomendação:**
1. ⏳ **Revisar código** das correções
2. ⏳ Extrair documentação útil
3. ⏳ Se correções úteis: fazer merge
4. ⏳ Se obsoleto: deletar

**Comando para Revisar:**
```bash
git diff origin/main...origin/claude/debug-auth-feature-flags-ako94
```

---

## 📋 BRANCHES LOCAIS

### 6. `feature/limpeza-dados-mockados` (local)

**Status:** ⚠️ AVALIAR

**Motivo:** Cópia local da branch remota

**Recomendação:**
- Se branch remota for deletada, deletar também a local
- Comando: `git branch -D feature/limpeza-dados-mockados`

### 7. `fix/deploy-trigger` (local)

**Status:** ✅ DELETAR

**Motivo:** Branch já mergeada

**Recomendação:**
- Deletar imediatamente
- Comando: `git branch -D fix/deploy-trigger`

---

## 🎯 PLANO DE AÇÃO RECOMENDADO

### Fase 1: Deletar Branches Perigosas (URGENTE)

```bash
# 1. Deletar branch PERIGOSA imediatamente
git push origin --delete claude/system-audit-quality-9622F

# 2. Deletar branch já mergeada
git push origin --delete fix/deploy-trigger

# 3. Deletar branches locais obsoletas
git branch -D fix/deploy-trigger
```

### Fase 2: Avaliar Branches com Código Útil

```bash
# 1. Revisar branch de correções de afiliados
git diff origin/main...origin/claude/audit-affiliate-payments-T5Rrx

# 2. Revisar branch de debug de autenticação
git diff origin/main...origin/claude/debug-auth-feature-flags-ako94

# 3. Revisar branch de limpeza de dados
git log origin/main..origin/feature/limpeza-dados-mockados --oneline
```

### Fase 3: Decisão Final

**Para cada branch avaliada:**

1. **Se código útil:**
   - Fazer merge na main
   - Testar em staging
   - Deploy em produção
   - Deletar branch

2. **Se código obsoleto:**
   - Extrair documentação útil
   - Deletar branch

---

## 📊 RESUMO DE RECOMENDAÇÕES

| Branch | Status | Ação | Prioridade |
|--------|--------|------|------------|
| `origin/claude/system-audit-quality-9622F` | 🔴 PERIGOSA | DELETAR IMEDIATAMENTE | 🔥 CRÍTICA |
| `origin/fix/deploy-trigger` | ✅ MERGEADA | DELETAR | Alta |
| `fix/deploy-trigger` (local) | ✅ MERGEADA | DELETAR | Alta |
| `origin/claude/audit-affiliate-payments-T5Rrx` | ⚠️ AVALIAR | REVISAR → MERGE ou DELETAR | Média |
| `origin/claude/debug-auth-feature-flags-ako94` | ⚠️ AVALIAR | REVISAR → MERGE ou DELETAR | Média |
| `origin/feature/limpeza-dados-mockados` | ⚠️ AVALIAR | REVISAR → MERGE ou DELETAR | Baixa |
| `feature/limpeza-dados-mockados` (local) | ⚠️ AVALIAR | Seguir decisão da remota | Baixa |

---

## ⚠️ AVISOS IMPORTANTES

### 1. Proteção da Branch Main

**Recomendação:** Proteger a branch `main` no GitHub para evitar:
- ❌ Force push
- ❌ Deleção acidental
- ❌ Merge sem aprovação
- ❌ Merge de branches perigosas

**Como Proteger:**
1. GitHub → Settings → Branches
2. Add rule → Branch name pattern: `main`
3. Habilitar:
   - ✅ Require pull request reviews before merging
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
   - ✅ Include administrators
   - ✅ Restrict who can push to matching branches

### 2. Política de Branches

**Recomendação:** Estabelecer política de branches:

1. **Nomenclatura:**
   - `feature/nome-da-feature` - Novas funcionalidades
   - `fix/nome-do-bug` - Correções de bugs
   - `docs/nome-da-doc` - Documentação
   - `refactor/nome-do-refactor` - Refatorações

2. **Ciclo de Vida:**
   - Criar branch a partir da main
   - Desenvolver e testar
   - Abrir Pull Request
   - Code review
   - Merge na main
   - **DELETAR branch imediatamente após merge**

3. **Limpeza Automática:**
   - Configurar GitHub para deletar branches automaticamente após merge
   - GitHub → Settings → General → Automatically delete head branches

### 3. Revisão Periódica

**Recomendação:** Revisar branches a cada 30 dias:

```bash
# Listar branches não mergeadas há mais de 30 dias
git for-each-ref --sort=-committerdate refs/remotes/ --format='%(committerdate:short) %(refname:short)' | grep -v main
```

---

## 📝 CHECKLIST DE EXECUÇÃO

### Deletar Branches Perigosas (URGENTE)

- [ ] Deletar `origin/claude/system-audit-quality-9622F`
- [ ] Deletar `origin/fix/deploy-trigger`
- [ ] Deletar `fix/deploy-trigger` (local)
- [ ] Verificar que branches foram deletadas

### Avaliar Branches com Código Útil

- [ ] Revisar `origin/claude/audit-affiliate-payments-T5Rrx`
- [ ] Revisar `origin/claude/debug-auth-feature-flags-ako94`
- [ ] Revisar `origin/feature/limpeza-dados-mockados`
- [ ] Decidir: merge ou deletar cada uma

### Configurar Proteções

- [ ] Proteger branch `main` no GitHub
- [ ] Configurar deleção automática de branches
- [ ] Estabelecer política de branches
- [ ] Documentar processo de revisão

---

**Análise realizada por:** Kiro AI  
**Data:** 11/03/2026  
**Status:** Aguardando aprovação para execução
