-- Migration: Criar trigger para atualização automática da VIEW
-- Created: 2026-01-11
-- Author: Kiro AI
-- Sprint: Correção Crítica Sistema de Afiliados
-- Task: 2.5

-- ============================================
-- OBJETIVO
-- ============================================
-- Criar trigger que atualiza automaticamente affiliate_network_view
-- quando affiliates.referred_by for modificado
-- Garante que VIEW sempre reflete estado atual da rede

-- ============================================
-- FUNÇÃO: Refresh da VIEW
-- ============================================

CREATE OR REPLACE FUNCTION refresh_affiliate_network_view()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar VIEW materializada
  REFRESH MATERIALIZED VIEW CONCURRENTLY affiliate_network_view;
  
  RETURN NULL; -- Trigger AFTER não precisa retornar nada
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER: Executar após mudanças em affiliates
-- ============================================

DROP TRIGGER IF EXISTS trigger_refresh_affiliate_network_view ON affiliates;

CREATE TRIGGER trigger_refresh_affiliate_network_view
  AFTER INSERT OR UPDATE OF referred_by OR DELETE ON affiliates
  FOR EACH STATEMENT -- Executar uma vez por statement, não por row
  EXECUTE FUNCTION refresh_affiliate_network_view();

-- ============================================
-- COMENTÁRIOS DE DOCUMENTAÇÃO
-- ============================================

COMMENT ON FUNCTION refresh_affiliate_network_view() IS 
'Atualiza a VIEW materializada affiliate_network_view quando affiliates.referred_by muda.
Usa REFRESH CONCURRENTLY para não bloquear leituras durante atualização.';

COMMENT ON TRIGGER trigger_refresh_affiliate_network_view ON affiliates IS
'Trigger que mantém affiliate_network_view sincronizada com affiliates.referred_by automaticamente.
Dispara após INSERT, UPDATE (referred_by) ou DELETE em affiliates.';

-- ============================================
-- VALIDAÇÃO
-- ============================================

-- Testar trigger:
-- 1. Inserir novo afiliado com referred_by
-- 2. Verificar se VIEW foi atualizada automaticamente
-- 3. Atualizar referred_by de afiliado existente
-- 4. Verificar se VIEW reflete mudança

-- Query de teste:
-- INSERT INTO affiliates (name, email, referral_code, referred_by) 
-- VALUES ('Teste Trigger', 'teste-trigger@example.com', 'TRIG01', 
--         (SELECT id FROM affiliates LIMIT 1));
-- 
-- SELECT * FROM affiliate_network_view 
-- WHERE affiliate_id = (SELECT id FROM affiliates WHERE email = 'teste-trigger@example.com');

-- ============================================
-- ROLLBACK (para emergências)
-- ============================================

-- BEGIN;
-- DROP TRIGGER IF EXISTS trigger_refresh_affiliate_network_view ON affiliates;
-- DROP FUNCTION IF EXISTS refresh_affiliate_network_view();
-- COMMIT;
