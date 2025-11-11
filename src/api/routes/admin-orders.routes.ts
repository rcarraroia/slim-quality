/**
 * Admin Orders Routes
 * Sprint 3: Sistema de Vendas
 * 
 * Rotas administrativas para gestão de pedidos
 */

import { Router } from 'express';
import { authenticate } from '@/api/middlewares/auth.middleware';
import {
  requireAdmin,
  getAllOrders,
  getOrderDetails,
  updateOrderStatus,
  getOrderStats,
  cancelOrder,
} from '@/api/controllers/admin-orders.controller';

const router = Router();

// Todas as rotas requerem autenticação + role admin
router.use(authenticate);
router.use(requireAdmin);

/**
 * GET /api/admin/orders
 * Lista todos os pedidos com filtros
 */
router.get('/', getAllOrders);

/**
 * GET /api/admin/orders/stats
 * Retorna estatísticas de pedidos
 * Nota: Deve vir antes de /:id para não conflitar
 */
router.get('/stats', getOrderStats);

/**
 * GET /api/admin/orders/:id
 * Busca detalhes completos de um pedido
 */
router.get('/:id', getOrderDetails);

/**
 * PUT /api/admin/orders/:id/status
 * Atualiza status de um pedido
 */
router.put('/:id/status', updateOrderStatus);

/**
 * POST /api/admin/orders/:id/cancel
 * Cancela um pedido
 */
router.post('/:id/cancel', cancelOrder);

export default router;
