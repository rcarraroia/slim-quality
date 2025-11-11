/**
 * Inventory Service
 * Sprint 3: Sistema de Vendas
 * 
 * Gerencia estoque de produtos
 */

import { supabase } from '@/config/supabase';
import { Logger } from '@/utils/logger';
import type { ServiceResponse } from '@/types/sales.types';

export class InventoryService {
  /**
   * Reduz estoque quando pedido é confirmado
   */
  async reduceStock(
    orderId: string
  ): Promise<ServiceResponse<void>> {
    try {
      Logger.info('InventoryService', 'Reduzindo estoque', { orderId });

      // 1. Buscar items do pedido
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('product_id, quantity')
        .eq('order_id', orderId);

      if (itemsError || !orderItems || orderItems.length === 0) {
        Logger.error('InventoryService', 'Erro ao buscar items', itemsError);
        return {
          success: false,
          error: 'Erro ao buscar items do pedido',
          code: 'ORDER_ITEMS_ERROR',
        };
      }

      // 2. Reduzir estoque de cada produto
      for (const item of orderItems) {
        // Buscar produto atual
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('id, stock_quantity')
          .eq('id', item.product_id)
          .single();

        if (productError || !product) {
          Logger.error('InventoryService', 'Produto não encontrado', productError, {
            productId: item.product_id,
          });
          continue; // Continuar com próximo item
        }

        // Calcular novo estoque
        const newStock = product.stock_quantity - item.quantity;

        if (newStock < 0) {
          Logger.warn('InventoryService', 'Estoque ficará negativo', {
            productId: item.product_id,
            currentStock: product.stock_quantity,
            quantity: item.quantity,
            newStock,
          });
        }

        // Atualizar estoque
        const { error: updateError } = await supabase
          .from('products')
          .update({ stock_quantity: newStock })
          .eq('id', item.product_id);

        if (updateError) {
          Logger.error('InventoryService', 'Erro ao atualizar estoque', updateError, {
            productId: item.product_id,
          });
          continue;
        }

        // Registrar movimentação no log
        const { error: logError } = await supabase
          .from('inventory_logs')
          .insert({
            product_id: item.product_id,
            type: 'saida',
            quantity: item.quantity,
            previous_quantity: product.stock_quantity,
            new_quantity: newStock,
            reference_type: 'order',
            reference_id: orderId,
            notes: `Venda - Pedido ${orderId}`,
          });

        if (logError) {
          Logger.error('InventoryService', 'Erro ao registrar log', logError);
          // Não falhar a operação por causa do log
        }

        Logger.info('InventoryService', 'Estoque reduzido', {
          productId: item.product_id,
          quantity: item.quantity,
          previousStock: product.stock_quantity,
          newStock,
        });
      }

      Logger.info('InventoryService', 'Estoque reduzido com sucesso', {
        orderId,
        itemsCount: orderItems.length,
      });

      return { success: true };
    } catch (error) {
      Logger.error('InventoryService', 'Erro inesperado ao reduzir estoque', error as Error);
      return {
        success: false,
        error: 'Erro inesperado ao reduzir estoque',
        code: 'UNEXPECTED_ERROR',
      };
    }
  }

  /**
   * Devolve estoque quando pedido é cancelado
   */
  async restoreStock(
    orderId: string
  ): Promise<ServiceResponse<void>> {
    try {
      Logger.info('InventoryService', 'Devolvendo estoque', { orderId });

      // 1. Buscar items do pedido
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('product_id, quantity')
        .eq('order_id', orderId);

      if (itemsError || !orderItems || orderItems.length === 0) {
        Logger.error('InventoryService', 'Erro ao buscar items', itemsError);
        return {
          success: false,
          error: 'Erro ao buscar items do pedido',
          code: 'ORDER_ITEMS_ERROR',
        };
      }

      // 2. Devolver estoque de cada produto
      for (const item of orderItems) {
        // Buscar produto atual
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('id, stock_quantity')
          .eq('id', item.product_id)
          .single();

        if (productError || !product) {
          Logger.error('InventoryService', 'Produto não encontrado', productError, {
            productId: item.product_id,
          });
          continue;
        }

        // Calcular novo estoque
        const newStock = product.stock_quantity + item.quantity;

        // Atualizar estoque
        const { error: updateError } = await supabase
          .from('products')
          .update({ stock_quantity: newStock })
          .eq('id', item.product_id);

        if (updateError) {
          Logger.error('InventoryService', 'Erro ao atualizar estoque', updateError, {
            productId: item.product_id,
          });
          continue;
        }

        // Registrar movimentação no log
        const { error: logError } = await supabase
          .from('inventory_logs')
          .insert({
            product_id: item.product_id,
            type: 'devolucao',
            quantity: item.quantity,
            previous_quantity: product.stock_quantity,
            new_quantity: newStock,
            reference_type: 'order',
            reference_id: orderId,
            notes: `Devolução - Pedido ${orderId} cancelado`,
          });

        if (logError) {
          Logger.error('InventoryService', 'Erro ao registrar log', logError);
        }

        Logger.info('InventoryService', 'Estoque devolvido', {
          productId: item.product_id,
          quantity: item.quantity,
          previousStock: product.stock_quantity,
          newStock,
        });
      }

      Logger.info('InventoryService', 'Estoque devolvido com sucesso', {
        orderId,
        itemsCount: orderItems.length,
      });

      return { success: true };
    } catch (error) {
      Logger.error('InventoryService', 'Erro inesperado ao devolver estoque', error as Error);
      return {
        success: false,
        error: 'Erro inesperado ao devolver estoque',
        code: 'UNEXPECTED_ERROR',
      };
    }
  }

  /**
   * Verifica se há estoque suficiente para um pedido
   */
  async checkStock(
    items: Array<{ product_id: string; quantity: number }>
  ): Promise<ServiceResponse<boolean>> {
    try {
      for (const item of items) {
        const { data: product, error } = await supabase
          .from('products')
          .select('stock_quantity')
          .eq('id', item.product_id)
          .single();

        if (error || !product) {
          return {
            success: false,
            error: `Produto ${item.product_id} não encontrado`,
            code: 'PRODUCT_NOT_FOUND',
          };
        }

        if (product.stock_quantity < item.quantity) {
          return {
            success: false,
            error: `Estoque insuficiente para produto ${item.product_id}`,
            code: 'INSUFFICIENT_STOCK',
          };
        }
      }

      return { success: true, data: true };
    } catch (error) {
      Logger.error('InventoryService', 'Erro ao verificar estoque', error as Error);
      return {
        success: false,
        error: 'Erro ao verificar estoque',
        code: 'UNEXPECTED_ERROR',
      };
    }
  }
}

export const inventoryService = new InventoryService();
