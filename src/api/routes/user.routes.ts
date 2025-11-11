/**
 * Rotas de Usuário
 * Sprint 1: Sistema de Autenticação e Gestão de Usuários
 * 
 * Define rotas protegidas de gestão de perfil
 */

import { Router } from 'express';
import { updateProfileController } from '../controllers/user.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

/**
 * PUT /api/users/profile
 * Atualiza perfil do usuário autenticado
 * Requer autenticação
 */
router.put('/profile', requireAuth, updateProfileController);

export default router;
