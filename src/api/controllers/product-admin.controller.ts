/**
 * Controllers Administrativos de Produtos
 * Sprint 2: Sistema de Produtos
 * 
 * Endpoints administrativos (requer autenticação + role admin) para gestão de produtos
 */

import { Request, Response } from 'express';
import { productService } from '../../services/products/product.service';
import { logger } from '../../utils/logger';
import {
  CreateProductSchema,
  UpdateProductSchema,
} from '../validators/product.validators';

/**
 * POST /api/admin/products
 * Cria novo produto (admin)
 */
export async function createProductController(req: Request, res: Response): Promise<void> {
  try {
    // 1. Validar dados de entrada
    const validatedData = CreateProductSchema.parse(req.body);

    // 2. Criar produto
    const product = await productService.createProduct(validatedData);

    // 3. Retornar resposta
    res.status(201).json({
      success: true,
      data: product,
      message: 'Produto criado com sucesso',
    });
  } catch (error) {
    logger.error('CreateProductController', 'Error creating product', error as Error);
    
    // Tratar erro de validação Zod
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        details: error,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Erro ao criar produto',
      message: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
}

/**
 * PUT /api/admin/products/:id
 * Atualiza produto (admin)
 */
export async function updateProductController(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // 1. Validar dados de entrada
    const validatedData = UpdateProductSchema.parse(req.body);

    // 2. Verificar se produto existe
    const existingProduct = await productService.getProductById(id);
    if (!existingProduct) {
      res.status(404).json({
        success: false,
        error: 'Produto não encontrado',
      });
      return;
    }

    // 3. Atualizar produto
    const product = await productService.updateProduct(id, validatedData);

    // 4. Retornar resposta
    res.status(200).json({
      success: true,
      data: product,
      message: 'Produto atualizado com sucesso',
    });
  } catch (error) {
    logger.error('UpdateProductController', 'Error updating product', error as Error, {
      productId: req.params.id,
    });

    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        details: error,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Erro ao atualizar produto',
      message: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
}

/**
 * DELETE /api/admin/products/:id
 * Deleta produto (soft delete) (admin)
 */
export async function deleteProductController(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // 1. Verificar se produto existe
    const existingProduct = await productService.getProductById(id);
    if (!existingProduct) {
      res.status(404).json({
        success: false,
        error: 'Produto não encontrado',
      });
      return;
    }

    // 2. Deletar produto
    await productService.deleteProduct(id);

    // 3. Retornar resposta
    res.status(200).json({
      success: true,
      message: 'Produto deletado com sucesso',
    });
  } catch (error) {
    logger.error('DeleteProductController', 'Error deleting product', error as Error, {
      productId: req.params.id,
    });
    res.status(500).json({
      success: false,
      error: 'Erro ao deletar produto',
      message: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
}

/**
 * GET /api/admin/products
 * Lista todos os produtos (incluindo inativos) (admin)
 */
export async function listAllProductsController(req: Request, res: Response): Promise<void> {
  try {
    // Buscar todos os produtos (sem filtro de is_active)
    const result = await productService.listProducts({
      limit: 100,
      offset: 0,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('ListAllProductsController', 'Error listing all products', error as Error);
    res.status(500).json({
      success: false,
      error: 'Erro ao listar produtos',
      message: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
}

/**
 * GET /api/admin/products/:id
 * Busca produto por ID (admin)
 */
export async function getProductByIdController(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const product = await productService.getProductById(id);

    if (!product) {
      res.status(404).json({
        success: false,
        error: 'Produto não encontrado',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    logger.error('GetProductByIdController', 'Error getting product', error as Error, {
      productId: req.params.id,
    });
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar produto',
      message: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
}
