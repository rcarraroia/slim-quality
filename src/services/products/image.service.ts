/**
 * ImageService - Serviço de Imagens de Produtos
 * Sprint 2: Sistema de Produtos
 * 
 * Gerencia upload, delete e reordenação de imagens no Supabase Storage
 */

import { supabase, supabaseAdmin } from '../../config/database';
import { logger } from '../../utils/logger';
import { ProductImage, ImageUploadOptions } from '../../types/product.types';

export class ImageService {
  private readonly BUCKET_NAME = 'product-images';
  private readonly MAX_FILE_SIZE = 5242880; // 5MB

  /**
   * Upload de imagem para Supabase Storage
   */
  async uploadProductImage(
    productId: string,
    file: File,
    options: ImageUploadOptions = {}
  ): Promise<ProductImage> {
    try {
      logger.info('ImageService', 'Uploading product image', { productId });

      // 1. Validar tamanho do arquivo
      if (file.size > this.MAX_FILE_SIZE) {
        throw new Error('File size exceeds 5MB limit');
      }

      // 2. Gerar nome único para o arquivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${productId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `products/original/${fileName}`;

      // 3. Upload para Supabase Storage
      const { error: uploadError } = await supabaseAdmin.storage
        .from(this.BUCKET_NAME)
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        logger.error('ImageService', 'Failed to upload image to storage', uploadError as Error);
        throw uploadError;
      }

      // 4. Obter URL pública
      const { data: urlData } = supabaseAdmin.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(filePath);

      const imageUrl = urlData.publicUrl;

      // 5. Gerar thumbnail (simplificado - apenas usar mesma imagem por enquanto)
      // TODO: Implementar geração real de thumbnail
      const thumbnailUrl = imageUrl;

      // 6. Determinar display_order
      const { data: existingImages } = await supabaseAdmin
        .from('product_images')
        .select('display_order')
        .eq('product_id', productId)
        .order('display_order', { ascending: false })
        .limit(1);

      const displayOrder = existingImages && existingImages.length > 0
        ? existingImages[0].display_order + 1
        : 0;

      // 7. Criar registro no banco
      const { data: imageRecord, error: dbError } = await supabaseAdmin
        .from('product_images')
        .insert({
          product_id: productId,
          image_url: imageUrl,
          thumbnail_url: thumbnailUrl,
          alt_text: options.alt_text,
          display_order: displayOrder,
          is_primary: options.is_primary || false,
        })
        .select()
        .single();

      if (dbError || !imageRecord) {
        // Rollback: deletar imagem do storage
        await supabaseAdmin.storage.from(this.BUCKET_NAME).remove([filePath]);
        logger.error('ImageService', 'Failed to create image record', dbError as Error);
        throw dbError || new Error('Image record creation failed');
      }

      // 8. Se is_primary, remover flag de outras imagens
      if (options.is_primary) {
        await supabaseAdmin
          .from('product_images')
          .update({ is_primary: false })
          .eq('product_id', productId)
          .neq('id', imageRecord.id);
      }

      logger.info('ImageService', 'Image uploaded successfully', {
        imageId: imageRecord.id,
        productId,
      });

      return imageRecord as ProductImage;
    } catch (error) {
      logger.error('ImageService', 'Upload image error', error as Error, { productId });
      throw error;
    }
  }

  /**
   * Deleta imagem do produto
   */
  async deleteProductImage(imageId: string): Promise<void> {
    try {
      logger.info('ImageService', 'Deleting product image', { imageId });

      // 1. Buscar imagem
      const { data: image, error: fetchError } = await supabaseAdmin
        .from('product_images')
        .select('*')
        .eq('id', imageId)
        .single();

      if (fetchError || !image) {
        logger.warn('ImageService', 'Image not found', { imageId });
        throw new Error('Image not found');
      }

      // 2. Extrair path do storage da URL
      const url = new URL(image.image_url);
      const pathParts = url.pathname.split('/');
      const storagePath = pathParts.slice(pathParts.indexOf('product-images') + 1).join('/');

      // 3. Deletar do Supabase Storage
      const { error: storageError } = await supabaseAdmin.storage
        .from(this.BUCKET_NAME)
        .remove([storagePath]);

      if (storageError) {
        logger.warn('ImageService', 'Failed to delete from storage (non-critical)', storageError);
        // Não lançar erro - continuar com delete do banco
      }

      // 4. Deletar registro do banco
      const { error: dbError } = await supabaseAdmin
        .from('product_images')
        .delete()
        .eq('id', imageId);

      if (dbError) {
        logger.error('ImageService', 'Failed to delete image record', dbError);
        throw dbError;
      }

      logger.info('ImageService', 'Image deleted successfully', { imageId });
    } catch (error) {
      logger.error('ImageService', 'Delete image error', error as Error, { imageId });
      throw error;
    }
  }

  /**
   * Reordena imagens do produto
   */
  async reorderImages(productId: string, imageIds: string[]): Promise<void> {
    try {
      logger.info('ImageService', 'Reordering images', { productId, count: imageIds.length });

      // Atualizar display_order de cada imagem
      const updates = imageIds.map((imageId, index) =>
        supabaseAdmin
          .from('product_images')
          .update({ display_order: index })
          .eq('id', imageId)
          .eq('product_id', productId)
      );

      await Promise.all(updates);

      logger.info('ImageService', 'Images reordered successfully', { productId });
    } catch (error) {
      logger.error('ImageService', 'Reorder images error', error as Error, { productId });
      throw error;
    }
  }

  /**
   * Define imagem como principal
   */
  async setPrimaryImage(productId: string, imageId: string): Promise<void> {
    try {
      logger.info('ImageService', 'Setting primary image', { productId, imageId });

      // 1. Remover flag de todas as imagens
      await supabaseAdmin
        .from('product_images')
        .update({ is_primary: false })
        .eq('product_id', productId);

      // 2. Definir nova imagem principal
      const { error } = await supabaseAdmin
        .from('product_images')
        .update({ is_primary: true })
        .eq('id', imageId)
        .eq('product_id', productId);

      if (error) {
        logger.error('ImageService', 'Failed to set primary image', error);
        throw error;
      }

      logger.info('ImageService', 'Primary image set successfully', { productId, imageId });
    } catch (error) {
      logger.error('ImageService', 'Set primary image error', error as Error, {
        productId,
        imageId,
      });
      throw error;
    }
  }

  /**
   * Lista imagens do produto
   */
  async getProductImages(productId: string): Promise<ProductImage[]> {
    try {
      const { data, error } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', productId)
        .order('display_order', { ascending: true });

      if (error) {
        logger.error('ImageService', 'Failed to get product images', error);
        throw error;
      }

      return (data || []) as ProductImage[];
    } catch (error) {
      logger.error('ImageService', 'Get product images error', error as Error, { productId });
      throw error;
    }
  }
}

// Exportar instância singleton
export const imageService = new ImageService();
