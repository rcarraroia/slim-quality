-- ============================================
-- Migration: Políticas de Storage para Produtos
-- Sprint: 2
-- Created: 2025-01-24
-- Author: Kiro AI
-- ============================================
-- Objetivo: Configurar políticas de acesso ao bucket product-images
-- ============================================

BEGIN;
-- ============================================
-- 1. POLÍTICAS PARA BUCKET: product-images
-- ============================================
-- NOTA: Usando DO block para criar policies apenas se não existirem
-- Isso torna a migration idempotente e segura para reaplicação

DO $$
BEGIN
  -- Política 1: Todos podem visualizar imagens (bucket público)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage'
    AND tablename = 'objects' 
    AND policyname = 'Anyone can view product images'
  ) THEN
    CREATE POLICY "Anyone can view product images"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'product-images');
    RAISE NOTICE 'Policy "Anyone can view product images" created';
  ELSE
    RAISE NOTICE 'Policy "Anyone can view product images" already exists';
  END IF;

  -- Política 2: Admins podem fazer upload de imagens
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage'
    AND tablename = 'objects' 
    AND policyname = 'Admins can upload product images'
  ) THEN
    CREATE POLICY "Admins can upload product images"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'product-images'
        AND auth.role() = 'authenticated'
        AND EXISTS (
          SELECT 1 FROM public.user_roles
          WHERE user_id = auth.uid()
          AND role = 'admin'
          AND deleted_at IS NULL
        )
      );
    RAISE NOTICE 'Policy "Admins can upload product images" created';
  ELSE
    RAISE NOTICE 'Policy "Admins can upload product images" already exists';
  END IF;

  -- Política 3: Admins podem atualizar imagens
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage'
    AND tablename = 'objects' 
    AND policyname = 'Admins can update product images'
  ) THEN
    CREATE POLICY "Admins can update product images"
      ON storage.objects FOR UPDATE
      USING (
        bucket_id = 'product-images'
        AND auth.role() = 'authenticated'
        AND EXISTS (
          SELECT 1 FROM public.user_roles
          WHERE user_id = auth.uid()
          AND role = 'admin'
          AND deleted_at IS NULL
        )
      );
    RAISE NOTICE 'Policy "Admins can update product images" created';
  ELSE
    RAISE NOTICE 'Policy "Admins can update product images" already exists';
  END IF;

  -- Política 4: Admins podem deletar imagens
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage'
    AND tablename = 'objects' 
    AND policyname = 'Admins can delete product images'
  ) THEN
    CREATE POLICY "Admins can delete product images"
      ON storage.objects FOR DELETE
      USING (
        bucket_id = 'product-images'
        AND auth.role() = 'authenticated'
        AND EXISTS (
          SELECT 1 FROM public.user_roles
          WHERE user_id = auth.uid()
          AND role = 'admin'
          AND deleted_at IS NULL
        )
      );
    RAISE NOTICE 'Policy "Admins can delete product images" created';
  ELSE
    RAISE NOTICE 'Policy "Admins can delete product images" already exists';
  END IF;
END $$;
COMMIT;
-- ============================================
-- VALIDAÇÕES PÓS-MIGRATION
-- ============================================
-- Verificar políticas criadas:
-- SELECT policyname, cmd, qual FROM pg_policies 
-- WHERE schemaname = 'storage' AND tablename = 'objects';;
