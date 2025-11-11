/**
 * Controllers Administrativos de Imagens
 * Sprint 2: Sistema de Produtos
 * 
 * Endpoints administrativos para upload e gestão de imagens de produtos
 */

import { Request, Response } from 'express';
import { imageService } from '../../services/products/image.service';
import { productService } from '../../services/products/product.service';
import { logger } from '../../utils/logger';
import { ImageUploadSchema } from '../validators/image.validators';

/**
 * POST /api/admin/products/:id/images
 * Upload de imagens do produto (admin)
 * 
 * Espera multipart/form-data com:
 * - files: File[] (imagens)
 * - alt_text: string (opcional)
 * - is_primary: boolean (opcional)
 */
export async function uploadProductImagesController(req: Request, res: Response): Promise<void> {
  try {
    const { id: productId } = req.params;

    // 1. Verificar se produto existe
    const product = await productService.getProductById(productId);
    if (!product) {
      res.status(404).json({
        success: false,
        error: 'Produto não encontrado',
      });
      return;
    }

    // 2. Verificar se há arquivos
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Nenhuma imagem foi enviada',
      });
      return;
    }

    // 3. Validar opções de upload
    const options = ImageUploadSchema.parse({
      alt_text: req.body.alt_text,
      is_primary: req.body.is_primary === 'true' || req.body.is_primary === true,
    });

    // 4. Upload de cada imagem
    const uploadedImages = [];
    const errors = [];

    for (const file of req.files as Express.Multer.File[]) {
      try {
        // Converter Express.Multer.File para File-like object
        const fileBlob = new Blob([file.buffer], { type: file.mimetype });
        const fileObject = new File([fileBlob], file.originalname, { type: file.mimetype });

        const image = await imageService.uploadProductImage(productId, fileObject, options);
        uploadedImages.push(image);
      } catch (error) {
        logger.error('UploadProductImagesController', 'Error uploading image', error as Error, {
          fileName: file.originalname,
        });
        errors.push({
          file: file.originalname,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
      }
    }

    // 5. Retornar resposta
    res.status(201).json({
      success: true,
      data: {
        uploaded: uploadedImages.length,
        images: uploadedImages,
        errors: errors.length > 0 ? errors : undefined,
      },
      message: `${uploadedImages.length} imagem(ns) enviada(s) com sucesso`,
    });
  } catch (error) {
    logger.error('UploadProductImagesController', 'Error in upload process', error as Error, {
      productId: req.params.id,
    });
    res.status(500).json({
      success: false,
      error: 'Erro ao fazer upload de imagens',
      message: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
}

/**
 * DELETE /api/admin/products/:productId/images/:imageId
 * Deleta imagem do produto (admin)
 */
export async function deleteProductImageController(req: Request, res: Response): Promise<void> {
  try {
    const { productId, imageId } = req.params;

    // 1. Verificar se produto existe
    const product = await productService.getProductById(productId);
    if (!product) {
      res.status(404).json({
        success: false,
        error: 'Produto não encontrado',
      });
      return;
    }

    // 2. Deletar imagem
    await imageService.deleteProductImage(imageId);

    // 3. Retornar resposta
    res.status(200).json({
      success: true,
      message: 'Imagem deletada com sucesso',
    });
  } catch (error) {
    logger.error('DeleteProductImageController', 'Error deleting image', error as Error, {
      productId: req.params.productId,
      imageId: req.params.imageId,
    });

    if (error instanceof Error && error.message === 'Image not found') {
      res.status(404).json({
        success: false,
        error: 'Imagem não encontrada',
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Erro ao deletar imagem',
      message: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
}

/**
 * PUT /api/admin/products/:productId/images/:imageId/primary
 * Define imagem como principal (admin)
 */
export async function setPrimaryImageController(req: Request, res: Response): Promise<void> {
  try {
    const { productId, imageId } = req.params;

    // 1. Verificar se produto existe
    const product = await productService.getProductById(productId);
    if (!product) {
      res.status(404).json({
        success: false,
        error: 'Produto não encontrado',
      });
      return;
    }

    // 2. Definir imagem como principal
    await imageService.setPrimaryImage(productId, imageId);

    // 3. Retornar resposta
    res.status(200).json({
      success: true,
      message: 'Imagem principal definida com sucesso',
    });
  } catch (error) {
    logger.error('SetPrimaryImageController', 'Error setting primary image', error as Error, {
      productId: req.params.productId,
      imageId: req.params.imageId,
    });
    res.status(500).json({
      success: false,
      error: 'Erro ao definir imagem principal',
      message: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
}

/**
 * PUT /api/admin/products/:productId/images/reorder
 * Reordena imagens do produto (admin)
 * 
 * Body: { image_ids: string[] }
 */
export async function reorderImagesController(req: Request, res: Response): Promise<void> {
  try {
    const { productId } = req.params;
    const { image_ids } = req.body;

    // 1. Verificar se produto existe
    const product = await productService.getProductById(productId);
    if (!product) {
      res.status(404).json({
        success: false,
        error: 'Produto não encontrado',
      });
      return;
    }

    // 2. Validar image_ids
    if (!Array.isArray(image_ids) || image_ids.length === 0) {
      res.status(400).json({
        success: false,
        error: 'image_ids deve ser um array não vazio',
      });
      return;
    }

    // 3. Reordenar imagens
    await imageService.reorderImages(productId, image_ids);

    // 4. Retornar resposta
    res.status(200).json({
      success: true,
      message: 'Imagens reordenadas com sucesso',
    });
  } catch (error) {
    logger.error('ReorderImagesController', 'Error reordering images', error as Error, {
      productId: req.params.productId,
    });
    res.status(500).json({
      success: false,
      error: 'Erro ao reordenar imagens',
      message: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
}
