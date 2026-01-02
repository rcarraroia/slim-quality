-- Migration: Corrigir RLS para permitir acesso público às conversas no dashboard
-- Created: 2026-01-02
-- Author: Kiro AI

-- ============================================
-- ANÁLISE PRÉVIA REALIZADA
-- ============================================
-- Verificado que:
--   ✅ Conversas existem no banco (service key vê 1 conversa)
--   ✅ Frontend não consegue ver (anon key vê 0 conversas)
--   ❌ PROBLEMA: RLS bloqueia usuário anônimo
--   ✅ SOLUÇÃO: Adicionar política pública para dashboard
-- ============================================

BEGIN;

-- Adicionar política para permitir acesso público às conversas
-- Necessário para o dashboard funcionar com anon key
CREATE POLICY "Acesso público para dashboard"
  ON conversations FOR SELECT
  USING (true);  -- Permite acesso público para leitura

-- Adicionar política para permitir acesso público às mensagens
-- Necessário para o dashboard mostrar mensagens das conversas
CREATE POLICY "Acesso público para mensagens do dashboard"
  ON messages FOR SELECT
  USING (true);  -- Permite acesso público para leitura

COMMIT;

-- Comentários para documentação
COMMENT ON POLICY "Acesso público para dashboard" ON conversations IS 'Permite acesso público às conversas para o dashboard admin funcionar com anon key';
COMMENT ON POLICY "Acesso público para mensagens do dashboard" ON messages IS 'Permite acesso público às mensagens para o dashboard admin funcionar com anon key';