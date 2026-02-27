-- Migration: Corrigir atualização automática de slug ao alterar nome da loja
-- Created: 27/02/2026
-- Author: Kiro AI

-- ============================================
-- PROBLEMA IDENTIFICADO
-- ============================================
-- O slug da loja não era atualizado automaticamente quando o nome mudava
-- A função set_store_slug() só gerava slug se fosse NULL ou vazio
-- A função generate_store_slug() usava unaccent() que não estava habilitada
-- ============================================

BEGIN;

-- 1. Habilitar extensão unaccent
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 2. Corrigir função generate_store_slug para não usar unaccent()
CREATE OR REPLACE FUNCTION generate_store_slug(store_name TEXT, affiliate_id_param UUID)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Gerar slug base: lowercase + remover caracteres especiais
  base_slug := lower(store_name);
  
  -- Substituir caracteres acentuados manualmente
  base_slug := replace(base_slug, 'á', 'a');
  base_slug := replace(base_slug, 'à', 'a');
  base_slug := replace(base_slug, 'â', 'a');
  base_slug := replace(base_slug, 'ã', 'a');
  base_slug := replace(base_slug, 'ä', 'a');
  base_slug := replace(base_slug, 'é', 'e');
  base_slug := replace(base_slug, 'è', 'e');
  base_slug := replace(base_slug, 'ê', 'e');
  base_slug := replace(base_slug, 'ë', 'e');
  base_slug := replace(base_slug, 'í', 'i');
  base_slug := replace(base_slug, 'ì', 'i');
  base_slug := replace(base_slug, 'î', 'i');
  base_slug := replace(base_slug, 'ï', 'i');
  base_slug := replace(base_slug, 'ó', 'o');
  base_slug := replace(base_slug, 'ò', 'o');
  base_slug := replace(base_slug, 'ô', 'o');
  base_slug := replace(base_slug, 'õ', 'o');
  base_slug := replace(base_slug, 'ö', 'o');
  base_slug := replace(base_slug, 'ú', 'u');
  base_slug := replace(base_slug, 'ù', 'u');
  base_slug := replace(base_slug, 'û', 'u');
  base_slug := replace(base_slug, 'ü', 'u');
  base_slug := replace(base_slug, 'ç', 'c');
  base_slug := replace(base_slug, 'ñ', 'n');
  
  -- Substituir espaços e caracteres especiais por hífen
  base_slug := regexp_replace(base_slug, '[^a-z0-9]+', '-', 'g');
  
  -- Remover hífens do início e fim
  base_slug := trim(both '-' from base_slug);
  
  -- Tentar slug base primeiro
  final_slug := base_slug;
  
  -- Se já existir, adicionar sufixo numérico
  WHILE EXISTS (
    SELECT 1 FROM store_profiles 
    WHERE slug = final_slug 
    AND affiliate_id != affiliate_id_param
  ) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- 3. Corrigir função set_store_slug para atualizar slug quando nome mudar
CREATE OR REPLACE FUNCTION set_store_slug()
RETURNS TRIGGER AS $$
BEGIN
  -- Se é INSERT ou se o store_name mudou, regenerar slug
  IF (TG_OP = 'INSERT' AND (NEW.slug IS NULL OR NEW.slug = '')) OR 
     (TG_OP = 'UPDATE' AND NEW.store_name != OLD.store_name) THEN
    NEW.slug := generate_store_slug(NEW.store_name, NEW.affiliate_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Recriar trigger para garantir que use a função correta
DROP TRIGGER IF EXISTS trigger_set_store_slug ON store_profiles;

CREATE TRIGGER trigger_set_store_slug
  BEFORE INSERT OR UPDATE OF store_name ON store_profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_store_slug();

COMMIT;

-- ============================================
-- RESULTADO
-- ============================================
-- ✅ Slug agora atualiza automaticamente quando nome da loja mudar
-- ✅ Função generate_store_slug() funciona sem dependência de unaccent()
-- ✅ Caracteres acentuados são tratados corretamente
-- ============================================
