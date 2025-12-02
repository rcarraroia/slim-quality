-- Script para aplicar correção de RLS Policies
-- Execute este SQL no Supabase SQL Editor
-- Dashboard > SQL Editor > New Query > Cole este código > Run

-- ============================================
-- CORREÇÃO DE RLS POLICIES
-- ============================================

BEGIN;

-- ============================================
-- 1. CONVERSATIONS
-- ============================================

DROP POLICY IF EXISTS "Ver conversas de clientes visíveis" ON conversations;
DROP POLICY IF EXISTS "Criar conversas para clientes gerenciados" ON conversations;
DROP POLICY IF EXISTS "Atualizar conversas gerenciadas" ON conversations;

-- Policies sem deleted_at (conversations não tem essa coluna)
CREATE POLICY "Users can view assigned conversations"
  ON conversations FOR SELECT
  USING (
    auth.uid() IS NOT NULL 
    AND (
      assigned_to = auth.uid()
      OR assigned_to IS NULL
    )
  );

CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update assigned conversations"
  ON conversations FOR UPDATE
  USING (
    auth.uid() IS NOT NULL 
    AND assigned_to = auth.uid()
  );

-- ============================================
-- 2. MESSAGES
-- ============================================

DROP POLICY IF EXISTS "Ver mensagens de conversas visíveis" ON messages;
DROP POLICY IF EXISTS "Enviar mensagens em conversas gerenciadas" ON messages;

-- Policies sem deleted_at (messages e conversations não têm essa coluna)
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

DROP POLICY IF EXISTS "Vendedores veem clientes atribuídos" ON customers;
DROP POLICY IF EXISTS "Usuários autenticados podem criar clientes" ON customers;

CREATE POLICY "Authenticated users can view active customers"
  ON customers FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND deleted_at IS NULL
  );

CREATE POLICY "Authenticated users can create customers"
  ON customers FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update customers"
  ON customers FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND deleted_at IS NULL
  );

-- ============================================
-- 4. CUSTOMER_TAGS
-- ============================================

DROP POLICY IF EXISTS "Usuários autenticados veem tags ativas" ON customer_tags;
DROP POLICY IF EXISTS "Admins gerenciam tags" ON customer_tags;

CREATE POLICY "Users can view active tags"
  ON customer_tags FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND is_active = TRUE
  );

CREATE POLICY "Users can create tags"
  ON customer_tags FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update tags"
  ON customer_tags FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- ============================================
-- 5. CUSTOMER_TAG_ASSIGNMENTS
-- ============================================

DROP POLICY IF EXISTS "Ver assignments de clientes visíveis" ON customer_tag_assignments;
DROP POLICY IF EXISTS "Aplicar tags em clientes editáveis" ON customer_tag_assignments;
DROP POLICY IF EXISTS "Remover tags próprias ou de clientes gerenciados" ON customer_tag_assignments;

CREATE POLICY "Users can view tag assignments"
  ON customer_tag_assignments FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create tag assignments"
  ON customer_tag_assignments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete tag assignments"
  ON customer_tag_assignments FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- ============================================
-- 6. CUSTOMER_TIMELINE
-- ============================================

DROP POLICY IF EXISTS "Ver timeline de clientes visíveis" ON customer_timeline;
DROP POLICY IF EXISTS "Adicionar eventos em clientes gerenciados" ON customer_timeline;
DROP POLICY IF EXISTS "Editar eventos próprios" ON customer_timeline;

CREATE POLICY "Users can view customer timeline"
  ON customer_timeline FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create timeline events"
  ON customer_timeline FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- 7. APPOINTMENTS
-- ============================================

DROP POLICY IF EXISTS "Users can view appointments" ON appointments;
DROP POLICY IF EXISTS "Users can create appointments" ON appointments;
DROP POLICY IF EXISTS "Users can update appointments" ON appointments;

-- NOTA: appointments TEM deleted_at
CREATE POLICY "Users can view all appointments"
  ON appointments FOR SELECT
  USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);

CREATE POLICY "Users can create new appointments"
  ON appointments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update all appointments"
  ON appointments FOR UPDATE
  USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);

COMMIT;

-- ============================================
-- VERIFICAÇÃO
-- ============================================
-- Verificar policies criadas:
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'conversations',
    'customers', 
    'customer_tags',
    'messages',
    'customer_tag_assignments',
    'customer_timeline',
    'appointments'
  )
ORDER BY tablename, policyname;
