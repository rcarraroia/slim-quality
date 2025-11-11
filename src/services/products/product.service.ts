/**
 * ProductService - Serviço de Produtos
 * Sprint 2: Sistema de Produtos
 * 
 * Gerencia CRUD de produtos, listagem pública e administrativa
 */

import { supabase, supabaseAdmin } from '../../config/database';
import { logger } from '../../utils/logger';
import {
  Product,
  ProductListItem,
  ProductDetail,
  ProductFilters,
  ProductListResponse,
} from '../../types/product.types';
import {
  CreateProductInput,
  UpdateProductInput,
} from '../../api/validators/product.validators';

export class ProductService {
  /**
   * Lista produtos ativos (API pública)
   */
  async listProducts(filters: ProductFilters = {}): Promise<ProductListResponse> {
    try {
      const { featured, limit = 10, offset = 0 } = filters;

      logger.info('ProductService', 'Listing products', { filters });

      // Query base
      let query = supabase
        .from('products')
        .select(
          `
          id,
          name,
          slug,
          description,
          price_cents,
          width_cm,
          length_cm,
          height_cm,
          is_featured,
          product_images (
            image_url,
            is_primary
          ),
          product_technologies (
            technologies (
              id,
              name,
              icon_url
            )
          )
        `,
          { count: 'exact' }
        )
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('display_order', { ascending: true });

      // Filtro de featured
      if (featured !== undefined) {
        query = query.eq('is_featured', featured);
      }

      // Paginação
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        logger.error('ProductService', 'Failed to list products', error);
        throw error;
      }

      // Transformar dados para formato da API
      const products: ProductListItem[] = (data || []).map((product: any) => ({
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: product.price_cents / 100, // Converter centavos para reais
        dimensions: {
          width: product.width_cm,
          length: product.length_cm,
          height: product.height_cm,
        },
        primary_image:
          product.product_images?.find((img: any) => img.is_primary)?.image_url ||
          product.product_images?.[0]?.image_url ||
          null,
        is_featured: product.is_featured,
        technologies: product.product_technologies?.map((pt: any) => ({
          id: pt.technologies.id,
          name: pt.technologies.name,
          icon_url: pt.technologies.icon_url,
        })) || [],
      }));

      logger.info('ProductService', 'Products listed successfully', {
        count: products.length,
        total: count,
      });

      return {
        products,
        total: count || 0,
        limit,
        offset,
      };
    } catch (error) {
      logger.error('ProductService', 'List products error', error as Error);
      throw error;
    }
  }

  /**
   * Busca produto por slug (API pública)
   */
  async getProductBySlug(slug: string): Promise<ProductDetail | null> {
    try {
      logger.info('ProductService', 'Getting product by slug', { slug });

      const { data, error } = await supabase
        .from('products')
        .select(
          `
          *,
          product_images (
            id,
            image_url,
            thumbnail_url,
            alt_text,
            display_order,
            is_primary
          ),
          product_technologies (
            technologies (
              id,
              name,
              slug,
              description,
              icon_url
            )
          )
        `
        )
        .eq('slug', slug)
        .eq('is_active', true)
        .is('deleted_at', null)
        .single();

      if (error || !data) {
        logger.warn('ProductService', 'Product not found', { slug });
        return null;
      }

      // Buscar estoque
      const { data: inventoryData } = await supabase
        .from('product_inventory')
        .select('quantity_available, in_stock')
        .eq('product_id', data.id)
        .single();

      // Transformar para formato da API
      const product: ProductDetail = {
        id: data.id,
        name: data.name,
        slug: data.slug,
        sku: data.sku,
        description: data.description,
        price: data.price_cents / 100,
        dimensions: {
          width: data.width_cm,
          length: data.length_cm,
          height: data.height_cm,
          weight: data.weight_kg,
        },
        images: (data.product_images || [])
          .sort((a: any, b: any) => a.display_order - b.display_order),
        technologies: (data.product_technologies || [])
          .map((pt: any) => pt.technologies)
          .sort((a: any, b: any) => a.display_order - b.display_order),
        inventory: {
          available: inventoryData?.quantity_available || 0,
          in_stock: inventoryData?.in_stock || false,
        },
        created_at: data.created_at,
        updated_at: data.updated_at,
      };

      logger.info('ProductService', 'Product found', { productId: product.id });

      return product;
    } catch (error) {
      logger.error('ProductService', 'Get product by slug error', error as Error, { slug });
      throw error;
    }
  }

  /**
   * Cria novo produto (Admin)
   */
  async createProduct(input: CreateProductInput): Promise<Product> {
    try {
      logger.info('ProductService', 'Creating product', { name: input.name });

      // 1. Criar produto
      const { data: product, error: productError } = await supabaseAdmin
        .from('products')
        .insert({
          name: input.name,
          description: input.description,
          width_cm: input.width_cm,
          length_cm: input.length_cm,
          height_cm: input.height_cm,
          weight_kg: input.weight_kg,
          price_cents: input.price_cents,
          is_featured: input.is_featured,
          display_order: input.display_order,
        })
        .select()
        .single();

      if (productError || !product) {
        logger.error('ProductService', 'Failed to create product', productError as Error);
        throw productError || new Error('Product creation failed');
      }

      // 2. Associar todas as 8 tecnologias
      const { data: technologies } = await supabaseAdmin
        .from('technologies')
        .select('id')
        .eq('is_active', true);

      if (technologies && technologies.length > 0) {
        const productTechnologies = technologies.map((tech) => ({
          product_id: product.id,
          technology_id: tech.id,
        }));

        await supabaseAdmin
          .from('product_technologies')
          .insert(productTechnologies);
      }

      // 3. Inicializar estoque com quantidade zero
      await supabaseAdmin.from('inventory_logs').insert({
        product_id: product.id,
        type: 'ajuste',
        quantity: 0,
        quantity_before: 0,
        quantity_after: 0,
        notes: 'Estoque inicial',
      });

      logger.info('ProductService', 'Product created successfully', {
        productId: product.id,
      });

      return product as Product;
    } catch (error) {
      logger.error('ProductService', 'Create product error', error as Error);
      throw error;
    }
  }

  /**
   * Atualiza produto (Admin)
   */
  async updateProduct(id: string, input: UpdateProductInput): Promise<Product> {
    try {
      logger.info('ProductService', 'Updating product', { productId: id });

      const { data, error } = await supabaseAdmin
        .from('products')
        .update(input)
        .eq('id', id)
        .is('deleted_at', null)
        .select()
        .single();

      if (error || !data) {
        logger.error('ProductService', 'Failed to update product', error as Error);
        throw error || new Error('Product update failed');
      }

      logger.info('ProductService', 'Product updated successfully', { productId: id });

      return data as Product;
    } catch (error) {
      logger.error('ProductService', 'Update product error', error as Error, { productId: id });
      throw error;
    }
  }

  /**
   * Deleta produto (soft delete) (Admin)
   */
  async deleteProduct(id: string): Promise<void> {
    try {
      logger.info('ProductService', 'Deleting product', { productId: id });

      const { error } = await supabaseAdmin
        .from('products')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .is('deleted_at', null);

      if (error) {
        logger.error('ProductService', 'Failed to delete product', error);
        throw error;
      }

      logger.info('ProductService', 'Product deleted successfully', { productId: id });
    } catch (error) {
      logger.error('ProductService', 'Delete product error', error as Error, { productId: id });
      throw error;
    }
  }

  /**
   * Busca produto por ID (Admin)
   */
  async getProductById(id: string): Promise<Product | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('products')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error || !data) {
        return null;
      }

      return data as Product;
    } catch (error) {
      logger.error('ProductService', 'Get product by ID error', error as Error, { productId: id });
      return null;
    }
  }
}

// Exportar instância singleton
export const productService = new ProductService();
