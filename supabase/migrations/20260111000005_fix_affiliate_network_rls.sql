-- Migration: Corrigir políticas RLS de affiliate_network
-- Created: 11/01/2026
-- Task 3.1: Simplificar políticas RLS para melhor performance

BEGIN;

-- ============================================
-- ANÁLISE PRÉVIA REALIZADA
-- ============================================
-- Verificado que:
--   ✅ Políticas atuais usam funções recursivas (get_network_tree, get_network_ancestors)
--   ✅ Isso causa problemas de performance e complexidade
--   ✅ VIEW materializada já existe e está sincronizada
--   ✅ Podemos usar a VIEW para simplificar as políticas
-- ============================================

-- 1. REMOVER POLÍTICAS ANTIGAS COMPLEXAS
DROP POLICY IF EXISTS "Affiliates can view own network" ON affiliate_network;

-- 2. MANTER POLÍTICAS DE ADMIN (já estão corretas)
-- "Admins can view all network" - OK
-- "Admins can modify network" - OK

-- 3. MANTER POLÍTICA SIMPLES DE REFERRALS (já atualizada na migration anterior)
-- "Affiliates can view their referrals" - OK (usa parent_id)

-- 4. CRIAR NOVA POLÍTICA SIMPLES PARA VISUALIZAÇÃO DE REDE
-- Permite que afiliado veja:
-- a) Seu próprio registro na rede
-- b) Seus descendentes (quem ele indicou, direta ou indiretamente)
CREATE POLICY "Affiliates can view own network tree"
  ON affiliate_network
  FOR SELECT
  USING (
    -- Afiliado vê seu próprio registro
    affiliate_id IN (
      SELECT id FROM affiliates
      WHERE user_id = auth.uid()
      AND deleted_at IS NULL
    )
    OR
    -- Afiliado vê seus descendentes (usando VIEW materializada)
    affiliate_id IN (
      SELECT anv.affiliate_id
      FROM affiliate_network_view anv
      WHERE anv.path LIKE (
        SELECT anv2.path || '%'
        FROM affiliate_network_view anv2
        INNER JOIN affiliates a ON a.id = anv2.affiliate_id
        WHERE a.user_id = auth.uid()
        AND a.deleted_at IS NULL
      )
    )
  );

-- 5. CRIAR POLÍTICA PARA VISUALIZAÇÃO DE ASCENDENTES
-- Permite que afiliado veja quem o indicou (seus ascendentes na rede)
CREATE POLICY "Affiliates can view own ancestors"
  ON affiliate_network
  FOR SELECT
  USING (
    affiliate_id IN (
      -- Buscar ascendentes usando a VIEW materializada
      WITH RECURSIVE ancestors AS (
        -- Começar com o afiliado atual
        SELECT anv.affiliate_id, anv.parent_id, anv.path
        FROM affiliate_network_view anv
        INNER JOIN affiliates a ON a.id = anv.affiliate_id
        WHERE a.user_id = auth.uid()
        AND a.deleted_at IS NULL
        
        UNION ALL
        
        -- Subir na hierarquia
        SELECT anv.affiliate_id, anv.parent_id, anv.path
        FROM affiliate_network_view anv
        INNER JOIN ancestors anc ON anv.affiliate_id = anc.parent_id
      )
      SELECT affiliate_id FROM ancestors
    )
  );

-- 6. COMENTÁRIOS PARA DOCUMENTAÇÃO
COMMENT ON POLICY "Affiliates can view own network tree" ON affiliate_network IS 
  'Permite que afiliado visualize seu próprio registro e todos os seus descendentes (rede abaixo dele)';

COMMENT ON POLICY "Affiliates can view own ancestors" ON affiliate_network IS 
  'Permite que afiliado visualize seus ascendentes (quem o indicou na rede)';

COMMENT ON POLICY "Affiliates can view their referrals" ON affiliate_network IS 
  'Permite que afiliado visualize seus indicados diretos (N1)';

COMMIT;

-- ============================================
-- VALIDAÇÃO PÓS-MIGRATION
-- ============================================
-- Para validar, executar:
-- 1. SELECT * FROM pg_policies WHERE tablename = 'affiliate_network';
-- 2. Testar com usuário afiliado real
-- 3. Verificar que não há erros de permissão
-- ============================================
