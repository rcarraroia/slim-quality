/**
 * Rotas Administrativas
 * Sprint 1: Sistema de Autenticação e Gestão de Usuários
 * 
 * Define rotas protegidas para administradores
 */

import { Router } from 'express';
import {
  listUsersController,
  getUserByIdController,
  assignRoleController,
  removeRoleController,
} from '../controllers/user.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/authorize.middleware';

const router = Router();

// Todas as rotas requerem autenticação e role de admin
router.use(requireAuth, requireAdmin);

/**
 * GET /api/admin/users
 * Lista todos os usuários
 * Requer: admin
 */
router.get('/users', listUsersController);

/**
 * GET /api/admin/users/:id
 * Busca usuário por ID
 * Requer: admin
 */
router.get('/users/:id', getUserByIdController);

/**
 * POST /api/admin/users/:id/roles
 * Atribui role a usuário
 * Requer: admin
 * Body: { role: 'admin' | 'vendedor' | 'afiliado' | 'cliente' }
 */
router.post('/users/:id/roles', assignRoleController);

/**
 * DELETE /api/admin/users/:id/roles/:role
 * Remove role de usuário
 * Requer: admin
 */
router.delete('/users/:id/roles/:role', removeRoleController);

export default router;
