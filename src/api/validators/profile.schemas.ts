/**
 * Schemas de Validação - Perfil de Usuário
 * Sprint 1: Sistema de Autenticação e Gestão de Usuários
 * 
 * Schemas Zod para validação de dados de perfil
 */

import { z } from 'zod';

/**
 * Schema para atualização de perfil
 * PUT /api/users/profile
 */
export const UpdateProfileSchema = z.object({
  full_name: z
    .string()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .trim()
    .optional(),
  
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Telefone inválido. Use formato internacional (ex: +5511999999999)')
    .optional()
    .or(z.literal(''))
    .or(z.null()),
  
  avatar_url: z
    .string()
    .url('URL do avatar inválida')
    .optional()
    .or(z.literal(''))
    .or(z.null()),
});

/**
 * Schema para atribuição de role (admin)
 * POST /api/admin/users/:id/roles
 */
export const AssignRoleSchema = z.object({
  role: z.enum(['admin', 'vendedor', 'afiliado', 'cliente'], {
    errorMap: () => ({ message: 'Role inválida. Opções: admin, vendedor, afiliado, cliente' }),
  }),
});

/**
 * Schema para validação de UUID
 * Usado em params de rotas
 */
export const UUIDSchema = z.string().uuid('ID inválido');

// Tipos TypeScript inferidos dos schemas
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type AssignRoleInput = z.infer<typeof AssignRoleSchema>;
