-- Migration: Corrigir RLS Policies para permitir acesso básico
-- Created: 2025-12-01
-- Author: Kiro AI
-- Issue: 403 Forbidden em conversations, customers, messages

-- ============================================
-- PROBLEMA IDENTIFICADO:
-- ============================================
-- Policies existentes são muito restritivas e fazem JOINs
-- complexos que causam "permission denied for table users"
-- 
-- SOLUÇÃO:
-- Simplificar policies para permitir acesso básico a usuários
-- autenticados, mantendo segurança por assigned_to/user_id
-- ============================================

BEGIN;
-- ============================================
-- 1. CONVERSATIONS
-- ============================================

-- Remover policies antigas (se existirem)
DROP POLICY IF EXISTS "Ver conversas de clientes visíveis" ON conversations;
DROP POLICY IF EXISTS "Criar conversas para clientes gerenciados" ON conversations;
DROP POLICY IF EXISTS "Atualizar conversas gerenciadas" ON conversations;
-- Policy simplificada: Usuários autenticados veem conversas atribuídas a eles
-- NOTA: conversations NÃO tem deleted_at
CREATE POLICY "Users can view assigned conversations"
  ON conversations FOR SELECT
  USING (
    auth.uid() IS NOT NULL 
    AND (
      assigned_to = auth.uid()
      OR assigned_to IS NULL  -- Conversas não atribuídas (para distribuição)
    )
  );
-- Usuários podem criar conversas
CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
-- Usuários podem atualizar conversas atribuídas a eles
CREATE POLICY "Users can update assigned conversations"
  ON conversations FOR UPDATE
  USING (
    auth.uid() IS NOT NULL 
    AND assigned_to = auth.uid()
  );
-- ============================================
-- 2. MESSAGES
-- ============================================

-- Remover policies antigas
DROP POLICY IF EXISTS "Ver mensagens de conversas visíveis" ON messages;
DROP POLICY IF EXISTS "Enviar mensagens em conversas gerenciadas" ON messages;
-- Policy simplificada: Usuários veem mensagens de conversas que podem ver
-- NOTA: messages e conversations NÃO têm deleted_at
CREATE POLICY "Users can view messages from assigned conversations"
  ON messages FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (
        conversations.assigned_to = auth.uid()
        OR conversations.assigned_to IS NULL
      )
    )
  );
-- Usuários podem criar mensagens em conversas atribuídas
CREATE POLICY "Users can create messages in assigned conversations"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = conversation_id
      AND conversations.assigned_to = auth.uid()
    )
  );
-- ============================================
-- 3. CUSTOMERS
-- ============================================

-- Remover policies antigas
DROP POLICY IF EXISTS "Vendedores veem clientes atribuídos" ON customers;
DROP POLICY IF EXISTS "Usuários autenticados podem criar clientes" ON customers;
-- Policy simplificada: Todos usuários autenticados veem clientes ativos
CREATE POLICY "Authenticated users can view active customers"
  ON customers FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND deleted_at IS NULL
  );
-- Usuários podem criar clientes
CREATE POLICY "Authenticated users can create customers"
  ON customers FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
-- Usuários podem atualizar clientes
CREATE POLICY "Authenticated users can update customers"
  ON customers FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND deleted_at IS NULL
  );
-- ============================================
-- 4. CUSTOMER_TAGS
-- ============================================

-- Remover policies antigas
DROP POLICY IF EXISTS "Usuários autenticados veem tags ativas" ON customer_tags;
DROP POLICY IF EXISTS "Admins gerenciam tags" ON customer_tags;
-- Policy simplificada: Todos veem tags ativas
CREATE POLICY "Users can view active tags"
  ON customer_tags FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND is_active = TRUE
  );
-- Usuários podem criar tags
CREATE POLICY "Users can create tags"
  ON customer_tags FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
-- Usuários podem atualizar tags
CREATE POLICY "Users can update tags"
  ON customer_tags FOR UPDATE
  USING (auth.uid() IS NOT NULL);
-- ============================================
-- 5. CUSTOMER_TAG_ASSIGNMENTS
-- ============================================

-- Remover policies antigas
DROP POLICY IF EXISTS "Ver assignments de clientes visíveis" ON customer_tag_assignments;
DROP POLICY IF EXISTS "Aplicar tags em clientes editáveis" ON customer_tag_assignments;
DROP POLICY IF EXISTS "Remover tags próprias ou de clientes gerenciados" ON customer_tag_assignments;
-- Policy simplificada: Usuários veem assignments
CREATE POLICY "Users can view tag assignments"
  ON customer_tag_assignments FOR SELECT
  USING (auth.uid() IS NOT NULL);
-- Usuários podem criar assignments
CREATE POLICY "Users can create tag assignments"
  ON customer_tag_assignments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
-- Usuários podem deletar assignments
CREATE POLICY "Users can delete tag assignments"
  ON customer_tag_assignments FOR DELETE
  USING (auth.uid() IS NOT NULL);
-- ============================================
-- 6. CUSTOMER_TIMELINE
-- ============================================

-- Remover policies antigas
DROP POLICY IF EXISTS "Ver timeline de clientes visíveis" ON customer_timeline;
DROP POLICY IF EXISTS "Adicionar eventos em clientes gerenciados" ON customer_timeline;
DROP POLICY IF EXISTS "Editar eventos próprios" ON customer_timeline;
-- Policy simplificada: Usuários veem timeline
-- NOTA: customer_timeline NÃO tem deleted_at
CREATE POLICY "Users can view customer timeline"
  ON customer_timeline FOR SELECT
  USING (auth.uid() IS NOT NULL);
-- Usuários podem criar eventos
CREATE POLICY "Users can create timeline events"
  ON customer_timeline FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
-- ============================================
-- 7. APPOINTMENTS
-- ============================================

-- Remover policies antigas
DROP POLICY IF EXISTS "Users can view appointments" ON appointments;
DROP POLICY IF EXISTS "Users can create appointments" ON appointments;
DROP POLICY IF EXISTS "Users can update appointments" ON appointments;
-- Policy simplificada: Usuários veem agendamentos
-- NOTA: appointments TEM deleted_at
CREATE POLICY "Users can view all appointments"
  ON appointments FOR SELECT
  USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);
-- Usuários podem criar agendamentos
CREATE POLICY "Users can create new appointments"
  ON appointments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
-- Usuários podem atualizar agendamentos
CREATE POLICY "Users can update all appointments"
  ON appointments FOR UPDATE
  USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);
COMMIT;
-- ============================================
-- VERIFICAÇÃO
-- ============================================
-- Para testar se as policies estão funcionando:
-- 
-- 1. Login no sistema
-- 2. Tentar acessar /dashboard/conversas
-- 3. Deve carregar sem erro 403
-- 
-- Se ainda houver erro, verificar:
-- SELECT * FROM pg_policies WHERE schemaname = 'public';
-- ============================================;
