# Rollback Procedure - Modelo de 3 Planos (Vitrine + Agente IA)

## When to Rollback

Execute rollback se:
- ❌ Erros críticos em produção
- ❌ Corrupção de dados detectada
- ❌ Reclamações de usuários > 5
- ❌ Taxa de erro > 1%
- ❌ Logistas afetados negativamente
- ❌ Individuais existentes afetados negativamente

---

## Rollback Steps

### Step 1: Rollback Frontend (Vercel)

1. Acesse Vercel Dashboard: https://vercel.com/dashboard
2. Selecione o projeto `slim-quality`
3. Vá para aba "Deployments"
4. Encontre o deployment anterior à feature (antes do commit `4827396`)
5. Clique nos 3 pontos → "Promote to Production"
6. Aguarde deployment (2-3 minutos)
7. Verifique frontend funcionando

**Validação:**
```bash
# Verificar se menu "Loja" voltou a ser exclusivo para logistas
# Acessar como individual SEM mensalidade → não deve ver menu "Loja"
# Acessar como logista → deve ver menu "Loja"
```

---

### Step 2: Rollback Backend (Git)

```bash
# 1. Encontrar commit antes da feature
git log --oneline | grep -B 5 "feat: Habilita menu Loja"

# 2. Reverter commits da feature
git revert 4827396  # Frontend changes
git revert 432ed50  # Backend changes

# 3. Push para trigger Vercel deploy
git push origin main

# 4. Aguardar deploy automático (2-3 minutos)
```

**Validação:**
```bash
# Verificar webhook logs
vercel logs api/webhook-assinaturas.js --follow

# Verificar se detectBundlePayment() voltou a verificar affiliate_type
# Verificar se activateTenantAndVitrine() voltou ao nome original
```

---

### Step 3: Rollback Database (SQL)

**⚠️ ATENÇÃO: Execute em ordem e com cuidado!**

```sql
BEGIN;

-- ============================================
-- STEP 3.1: Rollback RLS Policies
-- ============================================

-- Drop new policies
DROP POLICY IF EXISTS "Affiliates can view own profile" ON store_profiles;
DROP POLICY IF EXISTS "Affiliates can update own profile" ON store_profiles;
DROP POLICY IF EXISTS "Affiliates can insert own profile" ON store_profiles;

-- Restore original policies (ONLY LOGISTAS)
CREATE POLICY "Logistas can view own profile"
  ON store_profiles FOR SELECT
  USING (
    affiliate_id IN (
      SELECT id FROM affiliates 
      WHERE user_id = auth.uid() 
      AND affiliate_type = 'logista'
      AND deleted_at IS NULL
    )
  );

CREATE POLICY "Logistas can update own profile"
  ON store_profiles FOR UPDATE
  USING (
    affiliate_id IN (
      SELECT id FROM affiliates 
      WHERE user_id = auth.uid() 
      AND affiliate_type = 'logista'
      AND deleted_at IS NULL
    )
  );

CREATE POLICY "Logistas can insert own profile"
  ON store_profiles FOR INSERT
  WITH CHECK (
    affiliate_id IN (
      SELECT id FROM affiliates 
      WHERE user_id = auth.uid() 
      AND affiliate_type = 'logista'
      AND deleted_at IS NULL
    )
  );

-- ============================================
-- STEP 3.2: Rollback has_subscription field
-- ============================================

-- OPÇÃO 1: Manter campo (recomendado - menos impacto)
-- Apenas zerar individuais que foram atualizados
UPDATE affiliates 
SET has_subscription = false 
WHERE affiliate_type = 'individual' 
AND has_subscription = true;

-- OPÇÃO 2: Remover campo completamente (mais drástico)
-- ALTER TABLE affiliates DROP COLUMN has_subscription;
-- DROP INDEX IF EXISTS idx_affiliates_has_subscription;

-- ============================================
-- STEP 3.3: Rollback Product Configuration
-- ============================================

-- Desativar produto Individual COM Mensalidade
UPDATE products
SET is_active = false
WHERE category = 'adesao_afiliado'
AND eligible_affiliate_type = 'individual'
AND is_subscription = true;

COMMIT;
```

**Validação:**
```sql
-- Verificar policies
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'store_profiles';

-- Verificar has_subscription
SELECT 
  affiliate_type,
  has_subscription,
  COUNT(*) 
FROM affiliates 
WHERE deleted_at IS NULL
GROUP BY affiliate_type, has_subscription;

-- Verificar produtos
SELECT 
  name,
  category,
  eligible_affiliate_type,
  is_subscription,
  is_active
FROM products
WHERE category = 'adesao_afiliado'
ORDER BY eligible_affiliate_type, is_subscription;
```

---

### Step 4: Rollback Edge Function (Supabase)

**⚠️ ATENÇÃO: Requer acesso ao Supabase Dashboard**

1. Acesse Supabase Dashboard
2. Vá para "Edge Functions"
3. Selecione `process-affiliate-webhooks`
4. Vá para aba "Versions"
5. Encontre versão anterior à v9 (provavelmente v8)
6. Clique em "Restore this version"
7. Aguarde deploy (1-2 minutos)

**Validação:**
```bash
# Verificar logs da edge function
# Deve voltar a bloquear APENAS logistas em caso de inadimplência
```

---

### Step 5: Verify Rollback

**Checklist de Validação:**

**Database:**
- [ ] RLS policies voltaram ao estado original (ONLY logistas)
- [ ] Campo `has_subscription` zerado para individuais
- [ ] Produto Individual COM Mensalidade desativado
- [ ] Logistas com `has_subscription = true` (mantido)
- [ ] Zero corrupção de dados

**Backend:**
- [ ] Webhook voltou a verificar `affiliate_type === 'logista'`
- [ ] Função voltou ao nome `activateTenantAndVitrine()`
- [ ] Edge function voltou a bloquear APENAS logistas
- [ ] Zero erros em webhook logs

**Frontend:**
- [ ] Menu "Loja" visível APENAS para logistas
- [ ] Individuais NÃO veem menu "Loja"
- [ ] Badge removido da página Loja
- [ ] Query de produto voltou a não filtrar por tipo
- [ ] Zero erros no console

**Vitrine Pública:**
- [ ] Lojas de logistas continuam visíveis
- [ ] Páginas de detalhe funcionando
- [ ] Botão "Comprar Agora" funcionando
- [ ] Código de indicação passado corretamente

**Logistas:**
- [ ] Logistas conseguem acessar menu "Loja"
- [ ] Logistas conseguem ativar vitrine
- [ ] Logistas conseguem ver Show Room
- [ ] Zero impacto negativo

---

## Post-Rollback Actions

### 1. Notificar Equipe
```
Subject: [ROLLBACK] Modelo de 3 Planos - Vitrine + Agente IA

Rollback executado com sucesso.

Motivo: [DESCREVER MOTIVO]

Status:
- Frontend: ✅ Revertido
- Backend: ✅ Revertido
- Database: ✅ Revertido
- Edge Function: ✅ Revertida

Próximos passos:
1. Investigar causa raiz
2. Corrigir problemas identificados
3. Re-testar em ambiente de staging
4. Re-deploy quando aprovado
```

### 2. Investigar Root Cause

**Perguntas a responder:**
- O que causou o problema?
- Por que não foi detectado nos testes?
- Como prevenir no futuro?
- Que validações faltaram?

**Documentar em:** `.kiro/specs/vitrine-individuais/POST_MORTEM.md`

### 3. Fix Issues

**Checklist de Correção:**
- [ ] Problema identificado
- [ ] Correção implementada
- [ ] Testes adicionados para prevenir regressão
- [ ] Validação em ambiente de staging
- [ ] Aprovação da equipe

### 4. Re-Deploy

**Quando re-deployar:**
- ✅ Problema corrigido e testado
- ✅ Validação em staging passou
- ✅ Equipe aprovou
- ✅ Usuários notificados (se necessário)

**Processo:**
1. Criar nova branch: `fix/modelo-3-planos-v2`
2. Implementar correções
3. Executar todos os testes
4. Fazer PR com revisão
5. Merge e deploy
6. Monitorar por 24 horas

---

## Emergency Contacts

**Em caso de problemas críticos:**

- **Renato Carraro** (Product Owner)
- **Equipe de Desenvolvimento**
- **Suporte Vercel:** https://vercel.com/support
- **Suporte Supabase:** https://supabase.com/support

---

## Rollback History

| Data | Motivo | Executado por | Status |
|------|--------|---------------|--------|
| - | - | - | - |

---

**Última Atualização:** 03/03/2026  
**Versão:** 1.0  
**Status:** ATIVO
