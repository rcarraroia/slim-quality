/**
 * Schemas de Validação - Autenticação
 * Sprint 1: Sistema de Autenticação e Gestão de Usuários
 * 
 * Schemas Zod para validação de dados de entrada nas rotas de autenticação
 */

import { z } from 'zod';

/**
 * Schema para registro de novo usuário
 * POST /api/auth/register
 */
export const RegisterSchema = z.object({
  email: z
    .string({ required_error: 'Email é obrigatório' })
    .email('Email inválido')
    .toLowerCase()
    .trim(),
  
  password: z
    .string({ required_error: 'Senha é obrigatória' })
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .max(100, 'Senha deve ter no máximo 100 caracteres'),
  
  full_name: z
    .string({ required_error: 'Nome completo é obrigatório' })
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .trim(),
  
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Telefone inválido. Use formato internacional (ex: +5511999999999)')
    .optional()
    .or(z.literal('')),
});

/**
 * Schema para login
 * POST /api/auth/login
 */
export const LoginSchema = z.object({
  email: z
    .string({ required_error: 'Email é obrigatório' })
    .email('Email inválido')
    .toLowerCase()
    .trim(),
  
  password: z
    .string({ required_error: 'Senha é obrigatória' })
    .min(1, 'Senha é obrigatória'),
});

/**
 * Schema para recuperação de senha
 * POST /api/auth/forgot-password
 */
export const ForgotPasswordSchema = z.object({
  email: z
    .string({ required_error: 'Email é obrigatório' })
    .email('Email inválido')
    .toLowerCase()
    .trim(),
});

/**
 * Schema para reset de senha
 * POST /api/auth/reset-password
 */
export const ResetPasswordSchema = z.object({
  password: z
    .string({ required_error: 'Nova senha é obrigatória' })
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .max(100, 'Senha deve ter no máximo 100 caracteres'),
  
  token: z
    .string({ required_error: 'Token de reset é obrigatório' })
    .min(1, 'Token inválido'),
});

// Tipos TypeScript inferidos dos schemas
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
