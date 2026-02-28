-- Migration: Criar estrutura de blog
-- Created: 28/02/2026
-- Author: Kiro AI

-- ============================================
-- TABELA: blog_posts
-- ============================================

CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  featured_image TEXT,
  author_id UUID REFERENCES profiles(id),
  category TEXT,
  tags TEXT[],
  meta_title TEXT,
  meta_description TEXT,
  meta_keywords TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

-- ============================================
-- ÍNDICES
-- ============================================

CREATE INDEX idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX idx_blog_posts_published ON blog_posts(published_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_blog_posts_category ON blog_posts(category) WHERE deleted_at IS NULL;
CREATE INDEX idx_blog_posts_author ON blog_posts(author_id);
CREATE INDEX idx_blog_posts_tags ON blog_posts USING GIN(tags);

-- ============================================
-- TRIGGER: updated_at
-- ============================================

CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS (Row Level Security)
-- ============================================

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Política: Todos podem ler posts publicados
CREATE POLICY "Anyone can view published posts"
  ON blog_posts FOR SELECT
  USING (published_at IS NOT NULL AND published_at <= NOW() AND deleted_at IS NULL);

-- Política: Admins podem fazer tudo
CREATE POLICY "Admins can do everything"
  ON blog_posts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Política: Autores podem ver seus próprios posts
CREATE POLICY "Authors can view own posts"
  ON blog_posts FOR SELECT
  USING (author_id = auth.uid());

-- Política: Autores podem editar seus próprios posts
CREATE POLICY "Authors can update own posts"
  ON blog_posts FOR UPDATE
  USING (author_id = auth.uid());

-- ============================================
-- COMENTÁRIOS
-- ============================================

COMMENT ON TABLE blog_posts IS 'Artigos do blog para SEO e conteúdo educacional';
COMMENT ON COLUMN blog_posts.slug IS 'URL amigável única para o post';
COMMENT ON COLUMN blog_posts.excerpt IS 'Resumo curto para listagens';
COMMENT ON COLUMN blog_posts.tags IS 'Array de tags para categorização';
COMMENT ON COLUMN blog_posts.published_at IS 'Data de publicação (NULL = rascunho)';
