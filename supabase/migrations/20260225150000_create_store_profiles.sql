-- Migration: Criar tabela store_profiles para perfis de lojas de Logistas
-- Created: 25/02/2026
-- Author: Kiro AI
-- ETAPA 4: Vitrine Pública

-- ============================================
-- ANÁLISE PRÉVIA REALIZADA
-- ============================================
-- Verificado que:
--   ✅ PostGIS está habilitado (versão 3.3.7)
--   ✅ Funções ST_Distance, ST_DWithin disponíveis
--   ✅ Tabela store_profiles não existe
--   ✅ Campo affiliate_type existe em affiliates (ETAPA 1)
-- ============================================

-- UP Migration
BEGIN;

-- Criar função para gerar slug único
CREATE OR REPLACE FUNCTION generate_store_slug(store_name TEXT, affiliate_id_param UUID)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Gerar slug base a partir do nome
  base_slug := lower(regexp_replace(
    unaccent(store_name),
    '[^a-z0-9]+',
    '-',
    'g'
  ));
  
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

-- Criar tabela store_profiles
CREATE TABLE IF NOT EXISTS store_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL UNIQUE REFERENCES affiliates(id) ON DELETE CASCADE,
  
  -- Informações básicas
  store_name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE,
  description TEXT,
  
  -- Endereço completo
  street VARCHAR(255),
  number VARCHAR(20),
  complement VARCHAR(100),
  neighborhood VARCHAR(100),
  city VARCHAR(100) NOT NULL,
  state CHAR(2) NOT NULL CHECK (state IN (
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  )),
  zip_code VARCHAR(9) CHECK (zip_code ~ '^\d{5}-\d{3}$'),
  
  -- Coordenadas geográficas (PostGIS)
  location GEOGRAPHY(Point, 4326),
  
  -- Contato
  phone VARCHAR(20),
  whatsapp VARCHAR(20),
  email VARCHAR(255),
  website VARCHAR(500),
  
  -- Redes sociais
  instagram VARCHAR(255),
  facebook VARCHAR(255),
  
  -- Imagens (URLs do Supabase Storage)
  logo_url TEXT,
  banner_url TEXT,
  
  -- Horário de funcionamento (JSON)
  business_hours JSONB DEFAULT '{
    "monday": {"open": "09:00", "close": "18:00", "closed": false},
    "tuesday": {"open": "09:00", "close": "18:00", "closed": false},
    "wednesday": {"open": "09:00", "close": "18:00", "closed": false},
    "thursday": {"open": "09:00", "close": "18:00", "closed": false},
    "friday": {"open": "09:00", "close": "18:00", "closed": false},
    "saturday": {"open": "09:00", "close": "13:00", "closed": false},
    "sunday": {"open": "00:00", "close": "00:00", "closed": true}
  }'::jsonb,
  
  -- Controle de visibilidade
  is_visible_in_showcase BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

-- Criar índices
CREATE INDEX idx_store_profiles_affiliate_id ON store_profiles(affiliate_id);
CREATE INDEX idx_store_profiles_slug ON store_profiles(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_store_profiles_visible ON store_profiles(is_visible_in_showcase) WHERE deleted_at IS NULL;
CREATE INDEX idx_store_profiles_city_state ON store_profiles(city, state) WHERE deleted_at IS NULL;

-- Criar índice espacial GIST para busca por proximidade
CREATE INDEX idx_store_profiles_location ON store_profiles USING GIST(location) WHERE deleted_at IS NULL;

-- Criar trigger para atualizar updated_at
CREATE TRIGGER update_store_profiles_updated_at
  BEFORE UPDATE ON store_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Criar trigger para gerar slug automaticamente
CREATE OR REPLACE FUNCTION set_store_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_store_slug(NEW.store_name, NEW.affiliate_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_store_slug
  BEFORE INSERT OR UPDATE OF store_name ON store_profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_store_slug();

-- Criar políticas RLS
ALTER TABLE store_profiles ENABLE ROW LEVEL SECURITY;

-- Política: Logistas podem ver e editar apenas seu próprio perfil
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

-- Política: Público pode ver perfis visíveis
CREATE POLICY "Public can view visible profiles"
  ON store_profiles FOR SELECT
  USING (
    is_visible_in_showcase = true 
    AND deleted_at IS NULL
  );

-- Adicionar comentários
COMMENT ON TABLE store_profiles IS 'Perfis de lojas de afiliados Logistas para vitrine pública';
COMMENT ON COLUMN store_profiles.location IS 'Coordenadas geográficas (latitude, longitude) usando PostGIS';
COMMENT ON COLUMN store_profiles.is_visible_in_showcase IS 'Se true, loja aparece na vitrine pública';
COMMENT ON COLUMN store_profiles.business_hours IS 'Horário de funcionamento em formato JSON';

-- ============================================
-- FUNÇÃO RPC: BUSCAR LOJAS PRÓXIMAS
-- ============================================

CREATE OR REPLACE FUNCTION get_nearby_stores(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius_meters INTEGER DEFAULT 10000,
  max_results INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  store_name VARCHAR,
  slug VARCHAR,
  description TEXT,
  city VARCHAR,
  state CHAR,
  neighborhood VARCHAR,
  street VARCHAR,
  number VARCHAR,
  logo_url TEXT,
  phone VARCHAR,
  whatsapp VARCHAR,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  distance DOUBLE PRECISION,
  affiliate_name VARCHAR,
  referral_code VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sp.id,
    sp.store_name,
    sp.slug,
    sp.description,
    sp.city,
    sp.state,
    sp.neighborhood,
    sp.street,
    sp.number,
    sp.logo_url,
    sp.phone,
    sp.whatsapp,
    ST_Y(sp.location::geometry) AS latitude,
    ST_X(sp.location::geometry) AS longitude,
    ST_Distance(
      sp.location,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
    ) AS distance,
    a.name AS affiliate_name,
    a.referral_code
  FROM store_profiles sp
  INNER JOIN affiliates a ON sp.affiliate_id = a.id
  WHERE 
    sp.is_visible_in_showcase = true
    AND sp.deleted_at IS NULL
    AND sp.location IS NOT NULL
    AND ST_DWithin(
      sp.location,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      radius_meters
    )
  ORDER BY distance ASC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_nearby_stores IS 'Busca lojas próximas usando PostGIS ST_DWithin para performance otimizada';

COMMIT;

-- DOWN Migration (para rollback)
-- BEGIN;
-- DROP TABLE IF EXISTS store_profiles CASCADE;
-- DROP FUNCTION IF EXISTS generate_store_slug(TEXT, UUID) CASCADE;
-- DROP FUNCTION IF EXISTS set_store_slug() CASCADE;
-- COMMIT;
