/**
 * Conversation Routes
 * Sprint 5: Sistema de CRM e Gestão de Clientes
 * 
 * Rotas REST para operações de conversas e mensagens
 */

import { Router } from 'express';
import { ConversationController } from '../controllers/conversation.controller';
import { requireAuth, requireRole } from '../controllers/customer.controller';

const router = Router();

// Aplicar autenticação em todas as rotas
router.use(requireAuth);

// Rotas de conversas
router.get('/', ConversationController.list);
router.get('/stats', ConversationController.getStats);
router.get('/:id', ConversationController.getById);
router.post('/', ConversationController.create);
router.put('/:id', ConversationController.update);

// Rotas de atribuição
router.post('/:id/assign', ConversationController.assign);
router.delete('/:id/assign', ConversationController.unassign);

// Rotas de status
router.post('/:id/close', ConversationController.close);

// Rotas de mensagens
router.get('/:id/messages', ConversationController.getMessages);
router.post('/:id/messages', ConversationController.sendMessage);
router.put('/:conversationId/messages/:messageId/read', ConversationController.markMessageAsRead);
router.put('/:conversationId/messages/read', ConversationController.markMessageAsRead);

export default router;