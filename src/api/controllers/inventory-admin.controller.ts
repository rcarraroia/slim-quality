/**
 * Controllers Administrativos de Estoque
 * Sprint 2: Sistema de Produtos
 * 
 * Endpoints administrativos para gestão de estoque
 */

import { Request, Response } from 'express';
import { inventoryService } from '../../services/products/inventory.service';
import { productService } from '../../services/products/product.service';
import { logger } from '../../utils/logger';
import { InventoryMovementSchema } from '../validators/inventory.validators';

/**
 * POST /api/admin/products/:id/inventory
 * Ajusta estoque do produto (admin)
 * 
 * Body: {
 *   type: 'entrada' | 'saida' | 'ajuste',
 *   quantity: number,
 *   notes?: string
 * }
 */
export async function adjustInventoryController(req: Request, res: Response): Promise<void> {
  try {
    const { id: productId } = req.params;
    const userId = req.user?.id; // Assumindo que middleware de auth adiciona user ao request

    // 1. Verificar se produto existe
    const product = await productService.getProductById(productId);
    if (!product) {
      res.status(404).json({
        success: false,
        error: 'Produto não encontrado',
      });
      return;
    }

    // 2. Validar dados de entrada
    const validatedData = InventoryMovementSchema.parse(req.body);

    // 3. Registrar movimentação
    const result = await inventoryService.recordMovement(productId, validatedData, userId);

    // 4. Retornar resposta
    res.status(200).json({
      success: true,
      data: result,
      message: 'Estoque atualizado com sucesso',
    });
  } catch (error) {
    logger.error('AdjustInventoryController', 'Error adjusting inventory', error as Error, {
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
      error: 'Erro ao ajustar estoque',
      message: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
}

/**
 * GET /api/admin/products/:id/inventory/history
 * Busca histórico de movimentações de estoque (admin)
 */
export async function getInventoryHistoryController(req: Request, res: Response): Promise<void> {
  try {
    const { id: productId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

    // 1. Verificar se produto existe
    const product = await productService.getProductById(productId);
    if (!product) {
      res.status(404).json({
        success: false,
        error: 'Produto não encontrado',
      });
      return;
    }

    // 2. Buscar histórico
    const result = await inventoryService.getMovementHistory(productId, limit);

    // 3. Retornar resposta
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('GetInventoryHistoryController', 'Error getting inventory history', error as Error, {
      productId: req.params.id,
    });
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar histórico de estoque',
      message: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
}

/**
 * GET /api/admin/products/:id/inventory
 * Busca estoque atual do produto (admin)
 */
export async function getInventoryController(req: Request, res: Response): Promise<void> {
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

    // 2. Buscar estoque
    const inventory = await inventoryService.getProductInventory(productId);

    if (!inventory) {
      res.status(404).json({
        success: false,
        error: 'Estoque não encontrado',
      });
      return;
    }

    // 3. Retornar resposta
    res.status(200).json({
      success: true,
      data: inventory,
    });
  } catch (error) {
    logger.error('GetInventoryController', 'Error getting inventory', error as Error, {
      productId: req.params.id,
    });
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar estoque',
      message: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
}

/**
 * PUT /api/admin/products/:id/inventory/adjust-to
 * Ajusta estoque para quantidade específica (admin)
 * 
 * Body: {
 *   target_quantity: number,
 *   notes?: string
 * }
 */
export async function adjustToQuantityController(req: Request, res: Response): Promise<void> {
  try {
    const { id: productId } = req.params;
    const { target_quantity, notes } = req.body;
    const userId = req.user?.id;

    // 1. Verificar se produto existe
    const product = await productService.getProductById(productId);
    if (!product) {
      res.status(404).json({
        success: false,
        error: 'Produto não encontrado',
      });
      return;
    }

    // 2. Validar target_quantity
    if (typeof target_quantity !== 'number' || target_quantity < 0) {
      res.status(400).json({
        success: false,
        error: 'target_quantity deve ser um número maior ou igual a zero',
      });
      return;
    }

    // 3. Ajustar estoque
    const result = await inventoryService.adjustToQuantity(
      productId,
      target_quantity,
      notes || `Ajuste para quantidade ${target_quantity}`,
      userId
    );

    // 4. Retornar resposta
    res.status(200).json({
      success: true,
      data: result,
      message: 'Estoque ajustado com sucesso',
    });
  } catch (error) {
    logger.error('AdjustToQuantityController', 'Error adjusting to quantity', error as Error, {
      productId: req.params.id,
    });
    res.status(500).json({
      success: false,
      error: 'Erro ao ajustar estoque',
      message: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
}
