/**
 * Controllers de Autenticação
 * Sprint 1: Sistema de Autenticação e Gestão de Usuários
 * 
 * Gerencia endpoints de autenticação
 */

import { Request, Response } from 'express';
import { authService } from '../../services/auth/auth.service';
import { logger } from '../../utils/logger';
import { handleAuthError, successResponse } from '../../utils/auth-errors';
import {
  RegisterSchema,
  LoginSchema,
  ForgotPasswordSchema,
} from '../validators/auth.schemas';

/**
 * POST /api/auth/register
 * Registra novo usuário no sistema
 */
export async function registerController(req: Request, res: Response): Promise<void> {
  try {
    // 1. Validar dados de entrada
    const validatedData = RegisterSchema.parse(req.body);

    // 2. Registrar usuário
    const result = await authService.register(validatedData);

    // 3. Retornar resposta de sucesso
    res.status(201).json(successResponse(result, 'Usuário registrado com sucesso'));
  } catch (error) {
    handleAuthError(error, res, 'RegisterController');
  }
}

/**
 * POST /api/auth/login
 * Autentica usuário e retorna tokens
 */
export async function loginController(req: Request, res: Response): Promise<void> {
  try {
    // 1. Validar dados de entrada
    const validatedData = LoginSchema.parse(req.body);

    // 2. Autenticar usuário
    const result = await authService.login(validatedData);

    // 3. Retornar resposta de sucesso
    res.status(200).json(successResponse(result, 'Login realizado com sucesso'));
  } catch (error) {
    handleAuthError(error, res, 'LoginController');
  }
}

/**
 * POST /api/auth/logout
 * Encerra sessão do usuário
 */
export async function logoutController(req: Request, res: Response): Promise<void> {
  try {
    // 1. Extrair token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Token não fornecido' });
      return;
    }

    const token = authHeader.substring(7);

    // 2. Fazer logout
    await authService.logout(token);

    // 3. Registrar evento
    if (req.user) {
      await authService.logAuthEvent('logout', req.user.id);
    }

    // 4. Retornar resposta de sucesso
    res.status(200).json(successResponse(null, 'Logout realizado com sucesso'));
  } catch (error) {
    handleAuthError(error, res, 'LogoutController');
  }
}

/**
 * POST /api/auth/forgot-password
 * Solicita recuperação de senha
 */
export async function forgotPasswordController(req: Request, res: Response): Promise<void> {
  try {
    // 1. Validar dados de entrada
    const validatedData = ForgotPasswordSchema.parse(req.body);

    // 2. Solicitar recuperação
    await authService.forgotPassword(validatedData.email);

    // 3. Retornar resposta de sucesso (sempre, por segurança)
    res.status(200).json(
      successResponse(
        null,
        'Se o email existir, você receberá instruções para redefinir sua senha'
      )
    );
  } catch (error) {
    // Sempre retornar sucesso, mesmo com erro
    logger.error('ForgotPasswordController', 'Error in forgot password', error as Error);
    res.status(200).json(
      successResponse(
        null,
        'Se o email existir, você receberá instruções para redefinir sua senha'
      )
    );
  }
}

/**
 * GET /api/auth/me
 * Retorna dados do usuário autenticado
 */
export async function meController(req: Request, res: Response): Promise<void> {
  try {
    // 1. Verificar se usuário está autenticado (middleware já validou)
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    // 2. Retornar dados do usuário
    const userData = {
      id: req.user.id,
      email: req.user.email,
      full_name: req.user.profile.full_name,
      phone: req.user.profile.phone,
      avatar_url: req.user.profile.avatar_url,
      is_affiliate: req.user.profile.is_affiliate,
      affiliate_status: req.user.profile.affiliate_status,
      roles: req.user.roles,
      created_at: req.user.profile.created_at,
      last_login_at: req.user.profile.last_login_at,
    };

    res.status(200).json(successResponse(userData));
  } catch (error) {
    handleAuthError(error, res, 'MeController');
  }
}
