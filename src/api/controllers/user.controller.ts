/**
 * Controllers de Usuário
 * Sprint 1: Sistema de Autenticação e Gestão de Usuários
 * 
 * Gerencia endpoints de gestão de usuários
 */

import { Request, Response } from 'express';
import { authService } from '../../services/auth/auth.service';
import { supabaseAdmin } from '../../config/database';
import { handleAuthError, successResponse } from '../../utils/auth-errors';
import { UpdateProfileSchema, AssignRoleSchema, UUIDSchema } from '../validators/profile.schemas';

/**
 * PUT /api/users/profile
 * Atualiza perfil do usuário autenticado
 */
export async function updateProfileController(req: Request, res: Response): Promise<void> {
  try {
    // 1. Verificar autenticação
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    // 2. Validar dados de entrada
    const validatedData = UpdateProfileSchema.parse(req.body);

    // 3. Atualizar perfil
    const updatedProfile = await authService.updateProfile(req.user.id, validatedData);

    // 4. Retornar resposta de sucesso
    res.status(200).json(successResponse(updatedProfile, 'Perfil atualizado com sucesso'));
  } catch (error) {
    handleAuthError(error, res, 'UpdateProfileController');
  }
}

/**
 * GET /api/admin/users
 * Lista todos os usuários (apenas admin)
 */
export async function listUsersController(_req: Request, res: Response): Promise<void> {
  try {
    // Middleware já validou que é admin
    
    // Buscar usuários (implementação simplificada)
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select(`
        *,
        user_roles(role)
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Formatar resposta
    const users = data.map((profile: any) => ({
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      phone: profile.phone,
      is_affiliate: profile.is_affiliate,
      affiliate_status: profile.affiliate_status,
      roles: profile.user_roles.map((r: any) => r.role),
      created_at: profile.created_at,
      last_login_at: profile.last_login_at,
    }));

    res.status(200).json(successResponse(users));
  } catch (error) {
    handleAuthError(error, res, 'ListUsersController');
  }
}

/**
 * POST /api/admin/users/:id/roles
 * Atribui role a usuário (apenas admin)
 */
export async function assignRoleController(req: Request, res: Response): Promise<void> {
  try {
    // 1. Validar ID do usuário
    const userId = UUIDSchema.parse(req.params.id);

    // 2. Validar role
    const { role } = AssignRoleSchema.parse(req.body);

    // 3. Atribuir role
    await authService.assignRole(userId, role);

    // 4. Retornar resposta de sucesso
    res.status(200).json(successResponse(null, `Role '${role}' atribuída com sucesso`));
  } catch (error) {
    handleAuthError(error, res, 'AssignRoleController');
  }
}

/**
 * DELETE /api/admin/users/:id/roles/:role
 * Remove role de usuário (apenas admin)
 */
export async function removeRoleController(req: Request, res: Response): Promise<void> {
  try {
    // 1. Validar ID do usuário
    const userId = UUIDSchema.parse(req.params.id);

    // 2. Validar role
    const role = req.params.role;
    if (!['admin', 'vendedor', 'afiliado', 'cliente'].includes(role)) {
      res.status(400).json({ error: 'Role inválida' });
      return;
    }

    // 3. Remover role
    await authService.removeRole(userId, role);

    // 4. Retornar resposta de sucesso
    res.status(200).json(successResponse(null, `Role '${role}' removida com sucesso`));
  } catch (error) {
    handleAuthError(error, res, 'RemoveRoleController');
  }
}

/**
 * GET /api/admin/users/:id
 * Busca usuário por ID (apenas admin)
 */
export async function getUserByIdController(req: Request, res: Response): Promise<void> {
  try {
    // 1. Validar ID do usuário
    const userId = UUIDSchema.parse(req.params.id);

    // 2. Buscar perfil
    const profile = await authService.getUserProfile(userId);

    if (!profile) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }

    // 3. Buscar roles
    const roles = await authService.getUserRoles(userId);

    // 4. Retornar dados
    const userData = {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      phone: profile.phone,
      avatar_url: profile.avatar_url,
      is_affiliate: profile.is_affiliate,
      affiliate_status: profile.affiliate_status,
      wallet_id: profile.wallet_id,
      roles,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
      last_login_at: profile.last_login_at,
    };

    res.status(200).json(successResponse(userData));
  } catch (error) {
    handleAuthError(error, res, 'GetUserByIdController');
  }
}
