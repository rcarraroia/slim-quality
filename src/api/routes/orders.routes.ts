/**
 * Orders Routes
 * Sprint 3: Sistema de Vendas
 * 
 * Rotas públicas para pedidos
 */

import { Router } from 'express';
import { authenticate } from '@/api/middlewares/auth.middleware';
import {
  createOrder,
  createPayment,
  getMyOrders,
  getOrderById,
  getOrderStatus,
} from '@/api/controllers/orders.controller';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

/**
 * POST /api/orders
 * Cria um novo pedido
 */
router.post('/', createOrder);

/**
 * POST /api/orders/:id/payment
 * Gera pagamento para um pedido
 */
router.post('/:id/payment', createPayment);

/**
 * GET /api/orders/my-orders
 * Lista pedidos do usuário autenticado
 */
router.get('/my-orders', getMyOrders);

/**
 * GET /api/orders/:id
 * Busca detalhes de um pedido específico
 */
router.get('/:id', getOrderById);

/**
 * GET /api/orders/:id/status
 * Busca status e histórico de um pedido
 */
router.get('/:id/status', getOrderStatus);

export default router;
