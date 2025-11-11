/**
 * Product Service - Frontend
 * Integração Frontend/Backend
 * 
 * Serviço de produtos para o frontend
 */

import apiClient from '@/lib/api-client';

export interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string;
  price: number; // em reais
  dimensions: {
    width: number;
    length: number;
    height: number;
    weight?: number;
  };
  primary_image: string | null;
  is_featured: boolean;
  technologies: Array<{
    id: string;
    name: string;
    icon_url: string;
  }>;
}

export interface ProductDetail extends Product {
  images: Array<{
    id: string;
    url: string;
    thumbnail_url: string;
    alt_text: string;
    is_primary: boolean;
  }>;
  inventory: {
    available: number;
    in_stock: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface CreateProductInput {
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

export interface UpdateProductInput extends Partial<CreateProductInput> {}

export interface InventoryMovement {
  type: 'entrada' | 'saida' | 'ajuste';
  quantity: number;
  notes?: string;
}

export const productService = {
  // ============================================
  // APIs PÚBLICAS
  // ============================================

  /**
   * Listar produtos
   */
  async getProducts(params?: { featured?: boolean; limit?: number; offset?: number }) {
    const response = await apiClient.get('/api/products', { params });
    return response.data.data;
  },

  /**
   * Buscar produto por slug
   */
  async getProductBySlug(slug: string): Promise<ProductDetail> {
    const response = await apiClient.get(`/api/products/${slug}`);
    return response.data.data;
  },

  /**
   * Listar tecnologias
   */
  async getTechnologies() {
    const response = await apiClient.get('/api/technologies');
    return response.data.data;
  },

  // ============================================
  // APIs ADMINISTRATIVAS
  // ============================================

  /**
   * Listar todos os produtos (admin)
   */
  async getAllProducts() {
    const response = await apiClient.get('/api/admin/products');
    return response.data.data;
  },

  /**
   * Buscar produto por ID (admin)
   */
  async getProductById(id: string) {
    const response = await apiClient.get(`/api/admin/products/${id}`);
    return response.data.data;
  },

  /**
   * Criar produto (admin)
   */
  async createProduct(data: CreateProductInput) {
    const response = await apiClient.post('/api/admin/products', data);
    return response.data.data;
  },

  /**
   * Atualizar produto (admin)
   */
  async updateProduct(id: string, data: UpdateProductInput) {
    const response = await apiClient.put(`/api/admin/products/${id}`, data);
    return response.data.data;
  },

  /**
   * Deletar produto (admin)
   */
  async deleteProduct(id: string) {
    const response = await apiClient.delete(`/api/admin/products/${id}`);
    return response.data;
  },

  // ============================================
  // GESTÃO DE IMAGENS
  // ============================================

  /**
   * Upload de imagens (admin)
   */
  async uploadImages(productId: string, files: File[], options?: { alt_text?: string; is_primary?: boolean }) {
    const formData = new FormData();
    
    files.forEach((file) => {
      formData.append('files', file);
    });
    
    if (options?.alt_text) {
      formData.append('alt_text', options.alt_text);
    }
    
    if (options?.is_primary !== undefined) {
      formData.append('is_primary', String(options.is_primary));
    }

    const response = await apiClient.post(`/api/admin/products/${productId}/images`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data.data;
  },

  /**
   * Deletar imagem (admin)
   */
  async deleteImage(productId: string, imageId: string) {
    const response = await apiClient.delete(`/api/admin/products/${productId}/images/${imageId}`);
    return response.data;
  },

  /**
   * Definir imagem principal (admin)
   */
  async setPrimaryImage(productId: string, imageId: string) {
    const response = await apiClient.put(`/api/admin/products/${productId}/images/${imageId}/primary`);
    return response.data;
  },

  /**
   * Reordenar imagens (admin)
   */
  async reorderImages(productId: string, imageIds: string[]) {
    const response = await apiClient.put(`/api/admin/products/${productId}/images/reorder`, {
      image_ids: imageIds,
    });
    return response.data;
  },

  // ============================================
  // GESTÃO DE ESTOQUE
  // ============================================

  /**
   * Consultar estoque (admin)
   */
  async getInventory(productId: string) {
    const response = await apiClient.get(`/api/admin/products/${productId}/inventory`);
    return response.data.data;
  },

  /**
   * Ajustar estoque (admin)
   */
  async adjustInventory(productId: string, movement: InventoryMovement) {
    const response = await apiClient.post(`/api/admin/products/${productId}/inventory`, movement);
    return response.data.data;
  },

  /**
   * Ajustar para quantidade específica (admin)
   */
  async adjustToQuantity(productId: string, targetQuantity: number, notes?: string) {
    const response = await apiClient.put(`/api/admin/products/${productId}/inventory/adjust-to`, {
      target_quantity: targetQuantity,
      notes,
    });
    return response.data.data;
  },

  /**
   * Histórico de movimentações (admin)
   */
  async getInventoryHistory(productId: string, limit = 50) {
    const response = await apiClient.get(`/api/admin/products/${productId}/inventory/history`, {
      params: { limit },
    });
    return response.data.data;
  },
};
