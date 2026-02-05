# Design Document - Sprint 2: Sistema de Produtos

## Overview

Este documento detalha o design técnico para o Sprint 2 do projeto Slim Quality Backend. O foco é implementar um sistema completo de gestão de produtos (colchões magnéticos), incluindo catálogo, tecnologias, imagens e controle básico de estoque.

**Características principais:**
- 4 modelos fixos de colchões
- 8 tecnologias comuns a todos os produtos
- Upload de imagens para Supabase Storage
- APIs públicas performáticas
- APIs administrativas protegidas

## Architecture

### Product System Flow

```
┌─────────────┐
│   Cliente   │
└──────┬──────┘
       │ GET /api/products
       ↓
┌─────────────────────────────────────┐
│     Public API (sem auth)           │
│  • Lista produtos ativos            │
│  • Detalhes do produto              │
│  • Lista tecnologias                │
└──────┬──────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────┐
│     Database (PostgreSQL)           │
│  • products                         │
│  • technologies                     │
│  • product_technologies (N:N)       │
│  • product_images                   │
│  • inventory_logs                   │
└─────────────────────────────────────┘

┌─────────────┐
│    Admin    │
└──────┬──────┘
       │ POST /api/admin/products
       │ (requireAuth + requireAdmin)
       ↓
┌─────────────────────────────────────┐
│     Admin API (protegida)           │
│  • CRUD de produtos                 │
│  • Upload de imagens                │
│  • Gestão de estoque                │
└──────┬──────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────┐
│     Supabase Storage                │
│  • Bucket: product-images           │
│  • Thumbnails automáticos           │
└─────────────────────────────────────┘
```

## Database Schema

### 1. Tabela: products

**Objetivo:** Armazenar informações dos colchões magnéticos

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Informações básicas
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  sku TEXT NOT NULL UNIQUE,
  description TEXT,
  
  -- Especificações
  width_cm DECIMAL(10,2) NOT NULL,  -- Largura em cm
  length_cm DECIMAL(10,2) NOT NULL, -- Comprimento em cm
  height_cm DECIMAL(10,2) NOT NULL, -- Altura em cm
  weight_kg DECIMAL(10,2),          -- Peso em kg
  
  -- Preço (em centavos para precisão)
  price_cents INTEGER NOT NULL CHECK (price_cents > 0),
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  is_featured BOOLEAN DEFAULT FALSE, -- Destaque (ex: "Mais vendido")
  display_order INTEGER DEFAULT 0,   -- Ordem de exibição
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ
);

-- Índices
CREATE INDEX idx_products_slug ON products(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_sku ON products(sku) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_is_active ON products(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_display_order ON products(display_order) WHERE deleted_at IS NULL;

-- Trigger para updated_at
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Função para gerar slug automaticamente
CREATE OR REPLACE FUNCTION generate_product_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]+', '-', 'g'));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_product_slug_trigger
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION generate_product_slug();
```

### 2. Tabela: technologies

**Objetivo:** Armazenar tecnologias dos colchões

```sql
CREATE TABLE technologies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Informações
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  icon_url TEXT, -- URL do ícone no Supabase Storage
  
  -- Exibição
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  display_order INTEGER DEFAULT 0,
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices
CREATE INDEX idx_technologies_slug ON technologies(slug);
CREATE INDEX idx_technologies_is_active ON technologies(is_active);
CREATE INDEX idx_technologies_display_order ON technologies(display_order);

-- Trigger para updated_at
CREATE TRIGGER update_technologies_updated_at
  BEFORE UPDATE ON technologies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 3. Tabela: product_technologies (N:N)

**Objetivo:** Relacionamento entre produtos e tecnologias

```sql
CREATE TABLE product_technologies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  technology_id UUID NOT NULL REFERENCES technologies(id) ON DELETE CASCADE,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  UNIQUE(product_id, technology_id)
);

-- Índices
CREATE INDEX idx_product_technologies_product ON product_technologies(product_id);
CREATE INDEX idx_product_technologies_technology ON product_technologies(technology_id);
```

### 4. Tabela: product_images

**Objetivo:** Armazenar imagens dos produtos

```sql
CREATE TABLE product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  -- URLs (Supabase Storage)
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  
  -- Metadados
  alt_text TEXT,
  display_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT FALSE, -- Imagem principal
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices
CREATE INDEX idx_product_images_product ON product_images(product_id);
CREATE INDEX idx_product_images_display_order ON product_images(product_id, display_order);
CREATE INDEX idx_product_images_is_primary ON product_images(product_id, is_primary);
```

### 5. Tabela: inventory_logs

**Objetivo:** Histórico de movimentações de estoque

```sql
CREATE TABLE inventory_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  -- Movimentação
  type TEXT NOT NULL CHECK (type IN ('entrada', 'saida', 'ajuste', 'venda', 'devolucao')),
  quantity INTEGER NOT NULL, -- Positivo para entrada, negativo para saída
  quantity_before INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  
  -- Referências
  reference_type TEXT, -- 'order', 'manual', etc
  reference_id UUID,   -- ID do pedido, etc
  
  -- Observações
  notes TEXT,
  
  -- Responsável
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices
CREATE INDEX idx_inventory_logs_product ON inventory_logs(product_id);
CREATE INDEX idx_inventory_logs_type ON inventory_logs(type);
CREATE INDEX idx_inventory_logs_created_at ON inventory_logs(created_at DESC);

-- View para estoque atual
CREATE VIEW product_inventory AS
SELECT 
  p.id AS product_id,
  p.name AS product_name,
  p.sku,
  COALESCE(SUM(il.quantity), 0) AS quantity_available,
  MAX(il.created_at) AS last_movement_at
FROM products p
LEFT JOIN inventory_logs il ON il.product_id = p.id
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.name, p.sku;
```

## API Endpoints

### Public Endpoints (sem autenticação)

#### GET /api/products

**Descrição:** Lista produtos ativos

**Query Parameters:**
- `featured` (boolean) - Filtrar apenas produtos em destaque
- `limit` (number) - Limite de resultados (padrão: 10)
- `offset` (number) - Offset para paginação

**Response (200):**
```typescript
{
  success: true;
  data: {
    products: [
      {
        id: string;
        name: string;
        slug: string;
        description: string;
        price: number; // em reais
        dimensions: {
          width: number;
          length: number;
          height: number;
        };
        primary_image: string | null;
        is_featured: boolean;
        technologies: [
          {
            id: string;
            name: string;
            icon_url: string;
          }
        ];
      }
    ];
    total: number;
    limit: number;
    offset: number;
  };
}
```

---

#### GET /api/products/:slug

**Descrição:** Detalhes completos do produto

**Response (200):**
```typescript
{
  success: true;
  data: {
    id: string;
    name: string;
    slug: string;
    sku: string;
    description: string;
    price: number;
    dimensions: {
      width: number;
      length: number;
      height: number;
      weight: number;
    };
    images: [
      {
        id: string;
        url: string;
        thumbnail_url: string;
        alt_text: string;
        is_primary: boolean;
      }
    ];
    technologies: [
      {
        id: string;
        name: string;
        slug: string;
        description: string;
        icon_url: string;
      }
    ];
    inventory: {
      available: number;
      in_stock: boolean;
    };
    created_at: string;
    updated_at: string;
  };
}
```

---

#### GET /api/technologies

**Descrição:** Lista todas as tecnologias ativas

**Response (200):**
```typescript
{
  success: true;
  data: [
    {
      id: string;
      name: string;
      slug: string;
      description: string;
      icon_url: string;
    }
  ];
}
```

---

### Admin Endpoints (requer autenticação + role admin)

#### POST /api/admin/products

**Descrição:** Criar novo produto

**Request:**
```typescript
{
  name: string;
  description: string;
  width_cm: number;
  length_cm: number;
  height_cm: number;
  weight_kg?: number;
  price_cents: number;
  is_featured?: boolean;
  display_order?: number;
}
```

**Response (201):**
```typescript
{
  success: true;
  data: Product;
  message: "Produto criado com sucesso";
}
```

---

#### PUT /api/admin/products/:id

**Descrição:** Atualizar produto

**Request:** (mesmos campos do POST, todos opcionais)

**Response (200):**
```typescript
{
  success: true;
  data: Product;
  message: "Produto atualizado com sucesso";
}
```

---

#### DELETE /api/admin/products/:id

**Descrição:** Deletar produto (soft delete)

**Response (200):**
```typescript
{
  success: true;
  message: "Produto deletado com sucesso";
}
```

---

#### POST /api/admin/products/:id/images

**Descrição:** Upload de imagens do produto

**Content-Type:** `multipart/form-data`

**Request:**
```
files: File[] (máximo 10 imagens)
alt_text?: string[]
is_primary?: boolean (para primeira imagem)
```

**Response (201):**
```typescript
{
  success: true;
  data: {
    uploaded: number;
    images: ProductImage[];
  };
  message: "Imagens enviadas com sucesso";
}
```

---

#### DELETE /api/admin/products/:productId/images/:imageId

**Descrição:** Deletar imagem do produto

**Response (200):**
```typescript
{
  success: true;
  message: "Imagem deletada com sucesso";
}
```

---

#### POST /api/admin/products/:id/inventory

**Descrição:** Ajustar estoque do produto

**Request:**
```typescript
{
  type: 'entrada' | 'saida' | 'ajuste';
  quantity: number;
  notes?: string;
}
```

**Response (200):**
```typescript
{
  success: true;
  data: {
    product_id: string;
    quantity_before: number;
    quantity_after: number;
    movement: InventoryLog;
  };
  message: "Estoque atualizado com sucesso";
}
```

---

#### GET /api/admin/products/:id/inventory/history

**Descrição:** Histórico de movimentações de estoque

**Response (200):**
```typescript
{
  success: true;
  data: {
    product: {
      id: string;
      name: string;
      sku: string;
    };
    current_quantity: number;
    history: InventoryLog[];
  };
}
```

## Services

### ProductService

```typescript
class ProductService {
  /**
   * Lista produtos ativos
   */
  async listProducts(filters: ProductFilters): Promise<ProductList> {
    // 1. Buscar produtos com filtros
    // 2. Incluir tecnologias e imagem principal
    // 3. Calcular estoque disponível
    // 4. Retornar lista paginada
  }
  
  /**
   * Busca produto por slug
   */
  async getProductBySlug(slug: string): Promise<ProductDetail | null> {
    // 1. Buscar produto
    // 2. Incluir todas as imagens
    // 3. Incluir todas as tecnologias
    // 4. Incluir estoque atual
    // 5. Retornar detalhes completos
  }
  
  /**
   * Cria novo produto
   */
  async createProduct(data: CreateProductData): Promise<Product> {
    // 1. Validar dados
    // 2. Gerar SKU único
    // 3. Criar produto
    // 4. Associar tecnologias
    // 5. Inicializar estoque
    // 6. Retornar produto criado
  }
  
  /**
   * Atualiza produto
   */
  async updateProduct(id: string, data: UpdateProductData): Promise<Product> {
    // 1. Validar dados
    // 2. Atualizar produto
    // 3. Retornar produto atualizado
  }
  
  /**
   * Deleta produto (soft delete)
   */
  async deleteProduct(id: string): Promise<void> {
    // 1. Soft delete do produto
    // 2. Manter relacionamentos
  }
}
```

### ImageService

```typescript
class ImageService {
  /**
   * Upload de imagem para Supabase Storage
   */
  async uploadProductImage(
    productId: string,
    file: File,
    options: ImageUploadOptions
  ): Promise<ProductImage> {
    // 1. Validar arquivo (formato, tamanho)
    // 2. Gerar nome único
    // 3. Upload para Supabase Storage bucket 'product-images'
    // 4. Gerar thumbnail
    // 5. Criar registro em product_images
    // 6. Retornar imagem criada
  }
  
  /**
   * Deleta imagem
   */
  async deleteProductImage(imageId: string): Promise<void> {
    // 1. Buscar imagem
    // 2. Deletar do Supabase Storage
    // 3. Deletar registro do banco
  }
  
  /**
   * Reordena imagens
   */
  async reorderImages(productId: string, imageIds: string[]): Promise<void> {
    // 1. Atualizar display_order de cada imagem
  }
}
```

### InventoryService

```typescript
class InventoryService {
  /**
   * Busca estoque atual do produto
   */
  async getProductInventory(productId: string): Promise<Inventory> {
    // 1. Consultar view product_inventory
    // 2. Retornar quantidade disponível
  }
  
  /**
   * Registra movimentação de estoque
   */
  async recordMovement(data: InventoryMovement): Promise<InventoryLog> {
    // 1. Buscar estoque atual
    // 2. Calcular novo estoque
    // 3. Criar registro em inventory_logs
    // 4. Retornar log criado
  }
  
  /**
   * Busca histórico de movimentações
   */
  async getMovementHistory(productId: string): Promise<InventoryLog[]> {
    // 1. Buscar logs do produto
    // 2. Ordenar por data (mais recente primeiro)
    // 3. Retornar histórico
  }
}
```

## Validation Schemas (Zod)

```typescript
// Produto
export const CreateProductSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().min(10).max(5000),
  width_cm: z.number().positive(),
  length_cm: z.number().positive(),
  height_cm: z.number().positive(),
  weight_kg: z.number().positive().optional(),
  price_cents: z.number().int().positive(),
  is_featured: z.boolean().optional(),
  display_order: z.number().int().min(0).optional(),
});

export const UpdateProductSchema = CreateProductSchema.partial();

// Estoque
export const InventoryMovementSchema = z.object({
  type: z.enum(['entrada', 'saida', 'ajuste']),
  quantity: z.number().int(),
  notes: z.string().max(500).optional(),
});

// Upload de imagem
export const ImageUploadSchema = z.object({
  alt_text: z.string().max(200).optional(),
  is_primary: z.boolean().optional(),
});
```

## Supabase Storage Configuration

### Bucket: product-images

```typescript
// Configuração do bucket
{
  name: 'product-images',
  public: true, // Imagens públicas
  fileSizeLimit: 5242880, // 5MB
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
}

// Estrutura de pastas
product-images/
├── products/
│   ├── {product-id}/
│   │   ├── original/
│   │   │   └── {filename}.jpg
│   │   └── thumbnails/
│   │       └── {filename}_thumb.jpg
└── technologies/
    └── icons/
        └── {technology-slug}.svg
```

## Data Models

### Entity Relationship Diagram

```
┌─────────────────┐
│    products     │
│  - id (PK)      │
│  - name         │
│  - sku (unique) │
│  - price_cents  │
│  - dimensions   │
└────────┬────────┘
         │ 1:N
         ↓
┌─────────────────┐
│ product_images  │
│  - id (PK)      │
│  - product_id   │
│  - image_url    │
│  - display_order│
└─────────────────┘

┌─────────────────┐
│    products     │
└────────┬────────┘
         │ N:N
         ↓
┌─────────────────────┐
│product_technologies │
│  - product_id       │
│  - technology_id    │
└────────┬────────────┘
         │
         ↓
┌─────────────────┐
│  technologies   │
│  - id (PK)      │
│  - name         │
│  - description  │
└─────────────────┘

┌─────────────────┐
│    products     │
└────────┬────────┘
         │ 1:N
         ↓
┌─────────────────┐
│ inventory_logs  │
│  - id (PK)      │
│  - product_id   │
│  - type         │
│  - quantity     │
└─────────────────┘
```

## Performance Considerations

### Índices de Banco
- Índices em campos de busca frequente (slug, sku, is_active)
- Índices compostos para queries comuns (product_id + display_order)
- View materializada para estoque (product_inventory)

### Otimizações de Query
- Usar JOINs eficientes para incluir tecnologias e imagens
- Limitar campos retornados em listagens (SELECT específico)
- Paginação obrigatória em listagens

### CDN e Storage
- Imagens servidas via Supabase Storage (CDN global)
- URLs públicas com cache
- Thumbnails pré-gerados

## Security Considerations

### Upload de Imagens
- Validar formato e tamanho
- Sanitizar nomes de arquivo
- Limitar quantidade de uploads por requisição
- Verificar tipo MIME real do arquivo

### APIs Públicas
- Rate limiting mais permissivo (100 req/15min)
- Sem exposição de dados sensíveis
- Apenas produtos ativos visíveis

### APIs Administrativas
- Autenticação obrigatória
- Role admin obrigatória
- Validação de ownership (produto pertence ao sistema)
- Logs de todas as operações

## Testing Strategy

### Unit Tests
- ProductService methods
- ImageService upload/delete
- InventoryService calculations
- Validation schemas

### Integration Tests
- Fluxo completo de CRUD de produtos
- Upload e delete de imagens
- Movimentações de estoque
- APIs públicas e administrativas

## Seed Data

### 4 Produtos Fixos

```typescript
const products = [
  {
    name: 'Colchão Magnético Solteiro',
    width_cm: 88,
    length_cm: 188,
    height_cm: 28,
    price_cents: 319000, // R$ 3.190,00
    description: 'Ideal para uso individual...',
    is_featured: false,
    display_order: 1,
  },
  {
    name: 'Colchão Magnético Padrão',
    width_cm: 138,
    length_cm: 188,
    height_cm: 28,
    price_cents: 329000, // R$ 3.290,00
    description: 'Mais vendido! Perfeito para casais...',
    is_featured: true, // Destaque
    display_order: 2,
  },
  {
    name: 'Colchão Magnético Queen',
    width_cm: 158,
    length_cm: 198,
    height_cm: 30,
    price_cents: 349000, // R$ 3.490,00
    description: 'Conforto premium para casais...',
    is_featured: false,
    display_order: 3,
  },
  {
    name: 'Colchão Magnético King',
    width_cm: 193,
    length_cm: 203,
    height_cm: 30,
    price_cents: 489000, // R$ 4.890,00
    description: 'Máximo espaço e conforto...',
    is_featured: false,
    display_order: 4,
  },
];
```

### 8 Tecnologias Fixas

```typescript
const technologies = [
  {
    name: 'Sistema Magnético',
    description: '240 ímãs de 800 Gauss que melhoram a circulação sanguínea...',
    display_order: 1,
  },
  {
    name: 'Infravermelho Longo',
    description: 'Tecnologia que penetra profundamente nos tecidos...',
    display_order: 2,
  },
  {
    name: 'Energia Bioquântica',
    description: 'Harmoniza a energia do corpo...',
    display_order: 3,
  },
  {
    name: 'Vibromassagem',
    description: '8 motores para massagem relaxante...',
    display_order: 4,
  },
  {
    name: 'Densidade Progressiva',
    description: 'Diferentes densidades para suporte ideal...',
    display_order: 5,
  },
  {
    name: 'Cromoterapia',
    description: 'Cores terapêuticas integradas...',
    display_order: 6,
  },
  {
    name: 'Perfilado High-Tech',
    description: 'Design ergonômico avançado...',
    display_order: 7,
  },
  {
    name: 'Tratamento Sanitário',
    description: 'Proteção contra ácaros e bactérias...',
    display_order: 8,
  },
];
```
