/**
 * InventoryService - Serviço de Estoque
 * Sprint 2: Sistema de Produtos
 * 
 * Gerencia movimentações e consultas de estoque
 */

import { supabaseAdmin } from '../../config/database';
import { logger } from '../../utils/logger';
import {
  InventoryLog,
  ProductInventory,
  InventoryHistoryResponse,
  InventoryAdjustmentResponse,
} from '../../types/product.types';
import { InventoryMovementInput } from '../../api/validators/inventory.validators';

export class InventoryService {
  /**
   * Busca estoque atual do produto
   */
  async getProductInventory(productId: string): Promise<ProductInventory | null> {
    try {
      logger.info('InventoryService', 'Getting product inventory', { productId });

      const { data, error } = await supabaseAdmin
        .from('product_inventory')
        .select('*')
        .eq('product_id', productId)
        .single();

      if (error || !data) {
        logger.warn('InventoryService', 'Inventory not found', { productId });
        return null;
      }

      return data as ProductInventory;
    } catch (error) {
      logger.error('InventoryService', 'Get inventory error', error as Error, { productId });
      return null;
    }
  }

  /**
   * Registra movimentação de estoque
   */
  async recordMovement(
    productId: string,
    input: InventoryMovementInput,
    userId?: string
  ): Promise<InventoryAdjustmentResponse> {
    try {
      logger.info('InventoryService', 'Recording inventory movement', {
        productId,
        type: input.type,
        quantity: input.quantity,
      });

      // 1. Buscar estoque atual
      const currentInventory = await this.getProductInventory(productId);
      const quantityBefore = currentInventory?.quantity_available || 0;

      // 2. Calcular nova quantidade
      let quantityChange = input.quantity;

      // Ajustar sinal baseado no tipo
      if (input.type === 'saida' && quantityChange > 0) {
        quantityChange = -quantityChange;
      } else if (input.type === 'entrada' && quantityChange < 0) {
        quantityChange = Math.abs(quantityChange);
      }

      const quantityAfter = quantityBefore + quantityChange;

      // 3. Validar estoque negativo (permitir mas registrar warning)
      if (quantityAfter < 0) {
        logger.warn('InventoryService', 'Negative inventory detected', {
          productId,
          quantityAfter,
        });
      }

      // 4. Criar registro de movimentação
      const { data: movement, error } = await supabaseAdmin
        .from('inventory_logs')
        .insert({
          product_id: productId,
          type: input.type,
          quantity: quantityChange,
          quantity_before: quantityBefore,
          quantity_after: quantityAfter,
          notes: input.notes,
          created_by: userId,
        })
        .select()
        .single();

      if (error || !movement) {
        logger.error('InventoryService', 'Failed to record movement', error);
        throw error || new Error('Movement record failed');
      }

      logger.info('InventoryService', 'Movement recorded successfully', {
        movementId: movement.id,
        productId,
        quantityBefore,
        quantityAfter,
      });

      return {
        product_id: productId,
        quantity_before: quantityBefore,
        quantity_after: quantityAfter,
        movement: movement as InventoryLog,
      };
    } catch (error) {
      logger.error('InventoryService', 'Record movement error', error as Error, { productId });
      throw error;
    }
  }

  /**
   * Busca histórico de movimentações
   */
  async getMovementHistory(productId: string, limit = 50): Promise<InventoryHistoryResponse> {
    try {
      logger.info('InventoryService', 'Getting movement history', { productId, limit });

      // 1. Buscar produto
      const { data: product, error: productError } = await supabaseAdmin
        .from('products')
        .select('id, name, sku')
        .eq('id', productId)
        .is('deleted_at', null)
        .single();

      if (productError || !product) {
        throw new Error('Product not found');
      }

      // 2. Buscar estoque atual
      const currentInventory = await this.getProductInventory(productId);

      // 3. Buscar histórico
      const { data: history, error: historyError } = await supabaseAdmin
        .from('inventory_logs')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (historyError) {
        logger.error('InventoryService', 'Failed to get history', historyError);
        throw historyError;
      }

      return {
        product: {
          id: product.id,
          name: product.name,
          sku: product.sku,
        },
        current_quantity: currentInventory?.quantity_available || 0,
        history: (history || []) as InventoryLog[],
      };
    } catch (error) {
      logger.error('InventoryService', 'Get history error', error as Error, { productId });
      throw error;
    }
  }

  /**
   * Ajusta estoque para quantidade específica
   */
  async adjustToQuantity(
    productId: string,
    targetQuantity: number,
    notes: string,
    userId?: string
  ): Promise<InventoryAdjustmentResponse> {
    try {
      logger.info('InventoryService', 'Adjusting inventory to quantity', {
        productId,
        targetQuantity,
      });

      // 1. Buscar estoque atual
      const currentInventory = await this.getProductInventory(productId);
      const currentQuantity = currentInventory?.quantity_available || 0;

      // 2. Calcular diferença
      const difference = targetQuantity - currentQuantity;

      if (difference === 0) {
        throw new Error('Target quantity is same as current quantity');
      }

      // 3. Registrar movimentação
      return await this.recordMovement(
        productId,
        {
          type: 'ajuste',
          quantity: difference,
          notes: notes || `Ajuste para quantidade ${targetQuantity}`,
        },
        userId
      );
    } catch (error) {
      logger.error('InventoryService', 'Adjust to quantity error', error as Error, { productId });
      throw error;
    }
  }

  /**
   * Registra venda (reduz estoque)
   */
  async recordSale(
    productId: string,
    quantity: number,
    orderId: string,
    userId?: string
  ): Promise<InventoryAdjustmentResponse> {
    try {
      logger.info('InventoryService', 'Recording sale', { productId, quantity, orderId });

      // Criar registro de movimentação
      const { data: movement, error } = await supabaseAdmin
        .from('inventory_logs')
        .insert({
          product_id: productId,
          type: 'venda',
          quantity: -Math.abs(quantity), // Sempre negativo
          quantity_before: 0, // Será calculado pela view
          quantity_after: 0, // Será calculado pela view
          reference_type: 'order',
          reference_id: orderId,
          notes: `Venda - Pedido ${orderId}`,
          created_by: userId,
        })
        .select()
        .single();

      if (error || !movement) {
        logger.error('InventoryService', 'Failed to record sale', error);
        throw error || new Error('Sale record failed');
      }

      // Buscar estoque atualizado
      const inventory = await this.getProductInventory(productId);

      logger.info('InventoryService', 'Sale recorded successfully', {
        movementId: movement.id,
        productId,
        orderId,
      });

      return {
        product_id: productId,
        quantity_before: (movement as InventoryLog).quantity_before,
        quantity_after: inventory?.quantity_available || 0,
        movement: movement as InventoryLog,
      };
    } catch (error) {
      logger.error('InventoryService', 'Record sale error', error as Error, {
        productId,
        orderId,
      });
      throw error;
    }
  }

  /**
   * Registra devolução (aumenta estoque)
   */
  async recordReturn(
    productId: string,
    quantity: number,
    orderId: string,
    userId?: string
  ): Promise<InventoryAdjustmentResponse> {
    try {
      logger.info('InventoryService', 'Recording return', { productId, quantity, orderId });

      return await this.recordMovement(
        productId,
        {
          type: 'devolucao' as any, // Type assertion pois devolucao não está no enum do validator
          quantity: Math.abs(quantity), // Sempre positivo
          notes: `Devolução - Pedido ${orderId}`,
        },
        userId
      );
    } catch (error) {
      logger.error('InventoryService', 'Record return error', error as Error, {
        productId,
        orderId,
      });
      throw error;
    }
  }
}

// Exportar instância singleton
export const inventoryService = new InventoryService();
