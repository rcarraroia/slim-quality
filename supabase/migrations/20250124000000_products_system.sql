-- ============================================
-- Migration: Sistema de Produtos
-- Sprint: 2
-- Created: 2025-01-24
-- Author: Kiro AI
-- ============================================
-- ANÁLISE PRÉVIA REALIZADA
-- ============================================
-- Verificado que:
--   ✅ Tabelas não existem
--   ✅ Nenhum dado será perdido
--   ✅ Compatível com estrutura existente
--   ✅ Preparação para Sprint 3 (Vendas) incluída
-- ============================================

BEGIN;

-- ============================================
-- 1. TABELA: products
-- ============================================
-- Objetivo: Armazenar informações dos colchões magnéticos
-- 4 modelos fixos: Solteiro, Padrão, Queen, King

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Informações básicas
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  sku TEXT NOT NULL UNIQUE,
  description TEXT,
  
  -- Especificações
  width_cm DECIMAL(10,2) NOT NULL CHECK (width_cm > 0),
  length_cm DECIMAL(10,2) NOT NULL CHECK (length_cm > 0),
  height_cm DECIMAL(10,2) NOT NULL CHECK (height_cm > 0),
  weight_kg DECIMAL(10,2) CHECK (weight_kg IS NULL OR weight_kg > 0),
  
  -- Preço (em centavos para precisão)
  price_cents INTEGER NOT NULL CHECK (price_cents > 0),
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  is_featured BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0 CHECK (display_order >= 0),
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ
);

-- Comentários
COMMENT ON TABLE products IS 'Catálogo de produtos (colchões magnéticos)';
COMMENT ON COLUMN products.price_cents IS 'Preço em centavos para precisão (ex: 329000 = R$ 3.290,00)';
COMMENT ON COLUMN products.is_featured IS 'Produto em destaque (ex: "Mais vendido")';
COMMENT ON COLUMN products.display_order IS 'Ordem de exibição no catálogo';

-- Índices para performance
CREATE INDEX idx_products_slug ON products(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_sku ON products(sku) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_is_active ON products(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_display_order ON products(display_order) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_is_featured ON products(is_featured) WHERE deleted_at IS NULL AND is_featured = TRUE;

-- Trigger para updated_at
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. FUNÇÃO: Gerar slug automaticamente
-- ============================================

CREATE OR REPLACE FUNCTION generate_product_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    -- Gerar slug a partir do nome
    NEW.slug := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]+', '-', 'g'));
    -- Remover hífens no início e fim
    NEW.slug := trim(both '-' from NEW.slug);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_product_slug() IS 'Gera slug automaticamente a partir do nome do produto';

-- Trigger para gerar slug
CREATE TRIGGER generate_product_slug_trigger
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION generate_product_slug();

-- ============================================
-- 3. FUNÇÃO: Gerar SKU automaticamente
-- ============================================

CREATE OR REPLACE FUNCTION generate_product_sku()
RETURNS TRIGGER AS $$
DECLARE
  prefix TEXT := 'COL';
  random_suffix TEXT;
BEGIN
  IF NEW.sku IS NULL OR NEW.sku = '' THEN
    -- Gerar sufixo aleatório de 6 caracteres
    random_suffix := upper(substring(md5(random()::text) from 1 for 6));
    NEW.sku := prefix || '-' || random_suffix;
    
    -- Verificar unicidade (loop até encontrar SKU único)
    WHILE EXISTS (SELECT 1 FROM products WHERE sku = NEW.sku AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)) LOOP
      random_suffix := upper(substring(md5(random()::text) from 1 for 6));
      NEW.sku := prefix || '-' || random_suffix;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_product_sku() IS 'Gera SKU único automaticamente (formato: COL-XXXXXX)';

-- Trigger para gerar SKU
CREATE TRIGGER generate_product_sku_trigger
  BEFORE INSERT ON products
  FOR EACH ROW
  EXECUTE FUNCTION generate_product_sku();

-- ============================================
-- 4. TABELA: technologies
-- ============================================
-- Objetivo: Armazenar tecnologias dos colchões
-- 8 tecnologias fixas comuns a todos os produtos

CREATE TABLE IF NOT EXISTS technologies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Informações
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  icon_url TEXT,
  
  -- Exibição
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  display_order INTEGER DEFAULT 0 CHECK (display_order >= 0),
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Comentários
COMMENT ON TABLE technologies IS 'Tecnologias terapêuticas dos colchões magnéticos';
COMMENT ON COLUMN technologies.icon_url IS 'URL do ícone no Supabase Storage';

-- Índices
CREATE INDEX idx_technologies_slug ON technologies(slug);
CREATE INDEX idx_technologies_is_active ON technologies(is_active);
CREATE INDEX idx_technologies_display_order ON technologies(display_order);

-- Trigger para updated_at
CREATE TRIGGER update_technologies_updated_at
  BEFORE UPDATE ON technologies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. TABELA: product_technologies (N:N)
-- ============================================
-- Objetivo: Relacionamento entre produtos e tecnologias

CREATE TABLE IF NOT EXISTS product_technologies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  technology_id UUID NOT NULL REFERENCES technologies(id) ON DELETE CASCADE,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  UNIQUE(product_id, technology_id)
);

-- Comentários
COMMENT ON TABLE product_technologies IS 'Relacionamento N:N entre produtos e tecnologias';

-- Índices
CREATE INDEX idx_product_technologies_product ON product_technologies(product_id);
CREATE INDEX idx_product_technologies_technology ON product_technologies(technology_id);

-- ============================================
-- 6. TABELA: product_images
-- ============================================
-- Objetivo: Armazenar imagens dos produtos

CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  -- URLs (Supabase Storage)
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  
  -- Metadados
  alt_text TEXT,
  display_order INTEGER DEFAULT 0 CHECK (display_order >= 0),
  is_primary BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Comentários
COMMENT ON TABLE product_images IS 'Imagens dos produtos armazenadas no Supabase Storage';
COMMENT ON COLUMN product_images.is_primary IS 'Imagem principal do produto';

-- Índices
CREATE INDEX idx_product_images_product ON product_images(product_id);
CREATE INDEX idx_product_images_display_order ON product_images(product_id, display_order);
CREATE INDEX idx_product_images_is_primary ON product_images(product_id, is_primary) WHERE is_primary = TRUE;

-- ============================================
-- 7. TABELA: inventory_logs
-- ============================================
-- Objetivo: Histórico de movimentações de estoque

CREATE TABLE IF NOT EXISTS inventory_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  -- Movimentação
  type TEXT NOT NULL CHECK (type IN ('entrada', 'saida', 'ajuste', 'venda', 'devolucao')),
  quantity INTEGER NOT NULL,
  quantity_before INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  
  -- Referências
  reference_type TEXT,
  reference_id UUID,
  
  -- Observações
  notes TEXT,
  
  -- Responsável
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Comentários
COMMENT ON TABLE inventory_logs IS 'Histórico de movimentações de estoque';
COMMENT ON COLUMN inventory_logs.type IS 'Tipo: entrada, saida, ajuste, venda, devolucao';
COMMENT ON COLUMN inventory_logs.quantity IS 'Quantidade movimentada (positivo para entrada, negativo para saída)';

-- Índices
CREATE INDEX idx_inventory_logs_product ON inventory_logs(product_id);
CREATE INDEX idx_inventory_logs_type ON inventory_logs(type);
CREATE INDEX idx_inventory_logs_created_at ON inventory_logs(created_at DESC);
CREATE INDEX idx_inventory_logs_product_created ON inventory_logs(product_id, created_at DESC);

-- ============================================
-- 8. VIEW: product_inventory
-- ============================================
-- Objetivo: Calcular estoque atual de cada produto

CREATE OR REPLACE VIEW product_inventory AS
SELECT 
  p.id AS product_id,
  p.name AS product_name,
  p.sku,
  COALESCE(SUM(il.quantity), 0) AS quantity_available,
  MAX(il.created_at) AS last_movement_at,
  CASE 
    WHEN COALESCE(SUM(il.quantity), 0) > 0 THEN TRUE
    ELSE FALSE
  END AS in_stock
FROM products p
LEFT JOIN inventory_logs il ON il.product_id = p.id
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.name, p.sku;

-- Comentários
COMMENT ON VIEW product_inventory IS 'View para consultar estoque atual de cada produto';

-- ============================================
-- 9. ROW LEVEL SECURITY (RLS)
-- ============================================

-- 9.1 RLS para products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Política: Todos podem visualizar produtos ativos (API pública)
CREATE POLICY "Anyone can view active products"
  ON products FOR SELECT
  USING (is_active = TRUE AND deleted_at IS NULL);

-- Política: Admins podem visualizar todos os produtos
CREATE POLICY "Admins can view all products"
  ON products FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND deleted_at IS NULL
    )
  );

-- Política: Admins podem inserir produtos
CREATE POLICY "Admins can insert products"
  ON products FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND deleted_at IS NULL
    )
  );

-- Política: Admins podem atualizar produtos
CREATE POLICY "Admins can update products"
  ON products FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND deleted_at IS NULL
    )
  );

-- 9.2 RLS para technologies
ALTER TABLE technologies ENABLE ROW LEVEL SECURITY;

-- Política: Todos podem visualizar tecnologias ativas
CREATE POLICY "Anyone can view active technologies"
  ON technologies FOR SELECT
  USING (is_active = TRUE);

-- Política: Admins podem gerenciar tecnologias
CREATE POLICY "Admins can manage technologies"
  ON technologies FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND deleted_at IS NULL
    )
  );

-- 9.3 RLS para product_technologies
ALTER TABLE product_technologies ENABLE ROW LEVEL SECURITY;

-- Política: Todos podem visualizar relacionamentos
CREATE POLICY "Anyone can view product technologies"
  ON product_technologies FOR SELECT
  USING (true);

-- Política: Admins podem gerenciar relacionamentos
CREATE POLICY "Admins can manage product technologies"
  ON product_technologies FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND deleted_at IS NULL
    )
  );

-- 9.4 RLS para product_images
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

-- Política: Todos podem visualizar imagens
CREATE POLICY "Anyone can view product images"
  ON product_images FOR SELECT
  USING (true);

-- Política: Admins podem gerenciar imagens
CREATE POLICY "Admins can manage product images"
  ON product_images FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND deleted_at IS NULL
    )
  );

-- 9.5 RLS para inventory_logs
ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;

-- Política: Admins podem visualizar logs
CREATE POLICY "Admins can view inventory logs"
  ON inventory_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND deleted_at IS NULL
    )
  );

-- Política: Admins podem inserir logs
CREATE POLICY "Admins can insert inventory logs"
  ON inventory_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND deleted_at IS NULL
    )
  );

COMMIT;

-- ============================================
-- VALIDAÇÕES PÓS-MIGRATION
-- ============================================
-- Verificar que tabelas foram criadas:
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('products', 'technologies', 'product_technologies', 'product_images', 'inventory_logs');

-- Verificar índices:
-- SELECT tablename, indexname FROM pg_indexes 
-- WHERE tablename IN ('products', 'technologies', 'product_technologies', 'product_images', 'inventory_logs');

-- Verificar view:
-- SELECT * FROM product_inventory LIMIT 1;

-- Verificar políticas RLS:
-- SELECT tablename, policyname FROM pg_policies 
-- WHERE tablename IN ('products', 'technologies', 'product_technologies', 'product_images', 'inventory_logs');
