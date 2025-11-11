/**
 * Tipos TypeScript para Sistema de Produtos
 * Sprint 2 - Sistema de Produtos
 */

// ============================================
// ENTIDADES DO BANCO DE DADOS
// ============================================

/**
 * Produto (colchão magnético)
 */
export interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string | null;
  
  // Dimensões
  width_cm: number;
  length_cm: number;
  height_cm: number;
  weight_kg: number | null;
  
  // Preço
  price_cents: number;
  
  // Status
  is_active: boolean;
  is_featured: boolean;
  display_order: number;
  
  // Metadados
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/**
 * Tecnologia terapêutica
 */
export interface Technology {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon_url: string | null;
  
  // Exibição
  is_active: boolean;
  display_order: number;
  
  // Metadados
  created_at: string;
  updated_at: string;
}

/**
 * Relacionamento Produto-Tecnologia
 */
export interface ProductTechnology {
  id: string;
  product_id: string;
  technology_id: string;
  created_at: string;
}

/**
 * Imagem do produto
 */
export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  thumbnail_url: string | null;
  alt_text: string | null;
  display_order: number;
  is_primary: boolean;
  created_at: string;
}

/**
 * Log de movimentação de estoque
 */
export interface InventoryLog {
  id: string;
  product_id: string;
  type: 'entrada' | 'saida' | 'ajuste' | 'venda' | 'devolucao';
  quantity: number;
  quantity_before: number;
  quantity_after: number;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

/**
 * Estoque atual do produto (view)
 */
export interface ProductInventory {
  product_id: string;
  product_name: string;
  sku: string;
  quantity_available: number;
  last_movement_at: string | null;
  in_stock: boolean;
}

// ============================================
// DTOs (Data Transfer Objects)
// ============================================

/**
 * Produto com tecnologias e imagem principal (listagem pública)
 */
export interface ProductListItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number; // em reais
  dimensions: {
    width: number;
    length: number;
    height: number;
  };
  primary_image: string | null;
  is_featured: boolean;
  technologies: TechnologySummary[];
}

/**
 * Detalhes completos do produto
 */
export interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string | null;
  price: number; // em reais
  dimensions: {
    width: number;
    length: number;
    height: number;
    weight: number | null;
  };
  images: ProductImage[];
  technologies: Technology[];
  inventory: {
    available: number;
    in_stock: boolean;
  };
  created_at: string;
  updated_at: string;
}

/**
 * Resumo de tecnologia (para listagem)
 */
export interface TechnologySummary {
  id: string;
  name: string;
  icon_url: string | null;
}

/**
 * Resposta de listagem paginada de produtos
 */
export interface ProductListResponse {
  products: ProductListItem[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Resposta de histórico de estoque
 */
export interface InventoryHistoryResponse {
  product: {
    id: string;
    name: string;
    sku: string;
  };
  current_quantity: number;
  history: InventoryLog[];
}

/**
 * Resposta de ajuste de estoque
 */
export interface InventoryAdjustmentResponse {
  product_id: string;
  quantity_before: number;
  quantity_after: number;
  movement: InventoryLog;
}

/**
 * Resposta de upload de imagens
 */
export interface ImageUploadResponse {
  uploaded: number;
  images: ProductImage[];
}

// ============================================
// FILTROS E QUERIES
// ============================================

/**
 * Filtros para listagem de produtos
 */
export interface ProductFilters {
  featured?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Opções de upload de imagem
 */
export interface ImageUploadOptions {
  alt_text?: string;
  is_primary?: boolean;
}
