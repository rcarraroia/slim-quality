/**
 * Controllers Públicos de Produtos
 * Sprint 2: Sistema de Produtos
 * 
 * Endpoints públicos (sem autenticação) para consulta de produtos
 */

import { Request, Response } from 'express';
import { productService } from '../../services/products/product.service';
import { logger } from '../../utils/logger';
import { ListProductsQuerySchema } from '../validators/product.validators';

/**
 * GET /api/products
 * Lista produtos ativos (público)
 */
export async function listProductsController(req: Request, res: Response): Promise<void> {
  try {
    // 1. Validar query params
    const validatedQuery = ListProductsQuerySchema.parse(req.query);

    // 2. Buscar produtos
    const result = await productService.listProducts(validatedQuery);

    // 3. Retornar resposta
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('ListProductsController', 'Error listing products', error as Error);
    res.status(500).json({
      success: false,
      error: 'Erro ao listar produtos',
      message: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
}

/**
 * GET /api/products/:slug
 * Busca detalhes do produto por slug (público)
 */
export async function getProductBySlugController(req: Request, res: Response): Promise<void> {
  try {
    const { slug } = req.params;

    // 1. Buscar produto
    const product = await productService.getProductBySlug(slug);

    if (!product) {
      res.status(404).json({
        success: false,
        error: 'Produto não encontrado',
      });
      return;
    }

    // 2. Retornar resposta
    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    logger.error('GetProductBySlugController', 'Error getting product', error as Error, {
      slug: req.params.slug,
    });
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar produto',
      message: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
}
