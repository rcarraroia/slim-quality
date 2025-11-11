/**
 * Admin Orders Controller
 * Sprint 3: Sistema de Vendas
 * 
 * Controllers administrativos para gestão de pedidos
 */

import { Request, Response } from 'express';
import { orderService } from '@/services/sales/order.service';
import { Logger } from '@/utils/logger';
import { UpdateOrderSchema } from '@/api/validators/order.validator';
import type { OrderStatus } from '@/types/sales.types';

/**
 * Middleware para verificar se usuário é admin
 */
export function requireAdmin(req: Request, res: Response, next: Function) {
  const userRole = req.user?.role;
  
  if (userRole !== 'admin') {
    return res.status(403).json({
      error: 'Acesso negado',
      code: 'FORBIDDEN',
    });
  }
  
  next();
}

/**
 * GET /api/admin/orders
 * Lista todos os pedidos (admin)
 */
export async function getAllOrders(req: Request, res: Response) {
  try {
    const filters = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      status: req.query.status as OrderStatus,
      customer_id: req.query.customer_id as string,
      order_number: req.query.order_number as string,
      date_from: req.query.date_from as string,
      date_to: req.query.date_to as string,
    };

    Logger.info('AdminOrdersController', 'Listando todos os pedidos', {
      userId: req.user?.id,
      filters,
    });

    const result = await orderService.getAllOrders(filters);

    if (!result.success) {
      return res.status(500).json({
        error: result.error,
        code: result.code,
      });
    }

    return res.status(200).json(result.data);
  } catch (error) {
    Logger.error('AdminOrdersController', 'Erro ao listar pedidos', error as Error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

/**
 * GET /api/admin/orders/:id
 * Busca detalhes completos de um pedido (admin)
 */
export async function getOrderDetails(req: Request, res: Response) {
  try {
    const orderId = req.params.id;

    Logger.info('AdminOrdersController', 'Buscando detalhes do pedido', {
      userId: req.user?.id,
      orderId,
    });

    // Admin pode ver qualquer pedido (sem validar userId)
    const orderResult = await orderService.getOrderById(orderId);

    if (!orderResult.success) {
      return res.status(404).json({
        error: orderResult.error,
        code: orderResult.code,
      });
    }

    // Buscar histórico
    const historyResult = await orderService.getOrderStatusHistory(orderId);

    return res.status(200).json({
      order: orderResult.data,
      history: historyResult.success ? historyResult.data : [],
    });
  } catch (error) {
    Logger.error('AdminOrdersController', 'Erro ao buscar pedido', error as Error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

/**
 * PUT /api/admin/orders/:id/status
 * Atualiza status de um pedido (admin)
 */
export async function updateOrderStatus(req: Request, res: Response) {
  try {
    const orderId = req.params.id;
    const userId = req.user?.id;

    // Validar dados
    const validation = UpdateOrderSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: validation.error.issues,
      });
    }

    const { status, notes } = validation.data;

    if (!status) {
      return res.status(400).json({
        error: 'Status é obrigatório',
        code: 'STATUS_REQUIRED',
      });
    }

    Logger.info('AdminOrdersController', 'Atualizando status do pedido', {
      userId,
      orderId,
      newStatus: status,
    });

    const result = await orderService.updateOrderStatus(
      orderId,
      status as OrderStatus,
      userId,
      notes
    );

    if (!result.success) {
      return res.status(400).json({
        error: result.error,
        code: result.code,
      });
    }

    return res.status(200).json({
      message: 'Status atualizado com sucesso',
      order: result.data,
    });
  } catch (error) {
    Logger.error('AdminOrdersController', 'Erro ao atualizar status', error as Error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

/**
 * GET /api/admin/orders/stats
 * Retorna estatísticas de pedidos (admin)
 */
export async function getOrderStats(req: Request, res: Response) {
  try {
    Logger.info('AdminOrdersController', 'Buscando estatísticas', {
      userId: req.user?.id,
    });

    const result = await orderService.getOrderStats();

    if (!result.success) {
      return res.status(500).json({
        error: result.error,
        code: result.code,
      });
    }

    return res.status(200).json(result.data);
  } catch (error) {
    Logger.error('AdminOrdersController', 'Erro ao buscar estatísticas', error as Error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

/**
 * POST /api/admin/orders/:id/cancel
 * Cancela um pedido (admin)
 */
export async function cancelOrder(req: Request, res: Response) {
  try {
    const orderId = req.params.id;
    const userId = req.user?.id;
    const { reason } = req.body;

    Logger.info('AdminOrdersController', 'Cancelando pedido', {
      userId,
      orderId,
      reason,
    });

    // Admin pode cancelar qualquer pedido
    const result = await orderService.updateOrderStatus(
      orderId,
      'cancelled',
      userId,
      reason || 'Cancelado pelo administrador'
    );

    if (!result.success) {
      return res.status(400).json({
        error: result.error,
        code: result.code,
      });
    }

    return res.status(200).json({
      message: 'Pedido cancelado com sucesso',
      order: result.data,
    });
  } catch (error) {
    Logger.error('AdminOrdersController', 'Erro ao cancelar pedido', error as Error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
