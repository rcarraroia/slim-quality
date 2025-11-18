/**
 * Rotas de Autenticação
 * Sprint 1: Sistema de Autenticação e Gestão de Usuários
 * 
 * Define rotas públicas de autenticação
 */

import { Router } from 'express';
import {
  registerController,
  loginController,
  logoutController,
  forgotPasswordController,
  meController,
} from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authRateLimiter } from '../middlewares/rate-limit.middleware';

const router = Router();

/**
 * POST /api/auth/register
 * Registra novo usuário
 * Rate limited: 10 requisições por 15 minutos
 */
router.post('/register', authRateLimiter, registerController);

/**
 * POST /api/auth/login
 * Autentica usuário
 * Rate limited: 10 requisições por 15 minutos
 */
router.post('/login', authRateLimiter, loginController);

/**
 * POST /api/auth/logout
 * Encerra sessão do usuário
 * Requer autenticação
 */
router.post('/logout', authenticate, logoutController);

/**
 * POST /api/auth/forgot-password
 * Solicita recuperação de senha
 * Rate limited: 10 requisições por 15 minutos
 */
router.post('/forgot-password', authRateLimiter, forgotPasswordController);

/**
 * GET /api/auth/me
 * Retorna dados do usuário autenticado
 * Requer autenticação
 */
router.get('/me', authenticate, meController);

export default router;
