/**
 * Customer Routes
 * Sprint 5: Sistema de CRM e Gestão de Clientes
 * 
 * Rotas REST para operações de clientes
 */

import { Router } from 'express';
import { CustomerController, requireAuth, requireRole } from '../controllers/customer.controller';

const router = Router();

// Aplicar autenticação em todas as rotas
router.use(requireAuth);

// Rotas de listagem e busca
router.get('/', CustomerController.list);
router.get('/search', CustomerController.advancedSearch);
router.get('/quick-search', CustomerController.quickSearch);

// Rotas CRUD
router.get('/:id', CustomerController.getById);
router.post('/', CustomerController.create);
router.put('/:id', CustomerController.update);
router.delete('/:id', requireRole(['admin']), CustomerController.delete);

// Rotas de timeline e notas
router.get('/:id/timeline', CustomerController.getTimeline);
router.post('/:id/notes', CustomerController.addNote);

// Rotas de tags
router.get('/:id/tags', CustomerController.getTags);
router.post('/:id/tags', CustomerController.addTag);
router.delete('/:id/tags/:tagId', CustomerController.removeTag);

export default router;