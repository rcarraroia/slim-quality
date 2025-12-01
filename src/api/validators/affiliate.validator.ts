/**
 * Affiliate Validators
 * Sprint 7: Correções Críticas
 * 
 * Schemas Zod para validação de dados de afiliados
 */

import { z } from 'zod';

/**
 * Schema para registro de afiliado
 */
export const RegisterAffiliateSchema = z.object({
  name: z.string()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  
  email: z.string()
    .email('Email inválido')
    .max(255, 'Email muito longo'),
  
  phone: z.string()
    .regex(/^\+?[1-9]\d{8,14}$/, 'Telefone inválido')
    .optional(),
  
  wallet_id: z.string()
    .regex(/^wal_[a-zA-Z0-9]{20}$/, 'Wallet ID inválido (formato: wal_XXXXXXXXXXXXXXXXXXXX)'),
  
  referral_code: z.string()
    .min(6, 'Código de indicação inválido')
    .max(20, 'Código de indicação inválido')
    .optional(),
  
  cpf_cnpj: z.string()
    .regex(/^[0-9]{11}$|^[0-9]{14}$/, 'CPF/CNPJ inválido')
    .optional(),
});

/**
 * Schema para atualização de status de afiliado
 */
export const UpdateAffiliateStatusSchema = z.object({
  status: z.enum(['active', 'inactive', 'pending'], {
    errorMap: () => ({ message: 'Status deve ser: active, inactive ou pending' }),
  }),
  
  reason: z.string()
    .min(10, 'Motivo deve ter no mínimo 10 caracteres')
    .max(500, 'Motivo deve ter no máximo 500 caracteres')
    .optional(),
});

/**
 * Schema para validação de Wallet ID
 */
export const ValidateWalletSchema = z.object({
  wallet_id: z.string()
    .regex(/^wal_[a-zA-Z0-9]{20}$/, 'Wallet ID inválido'),
});

/**
 * Schema para filtros de listagem de afiliados
 */
export const AffiliateFiltersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  status: z.enum(['active', 'inactive', 'pending']).optional(),
  search: z.string().max(255).optional(),
  sortBy: z.enum(['created_at', 'name', 'email', 'status']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Schema para solicitação de saque
 */
export const WithdrawalRequestSchema = z.object({
  amount_cents: z.number()
    .int('Valor deve ser um número inteiro')
    .positive('Valor deve ser positivo')
    .min(1000, 'Valor mínimo de saque: R$ 10,00'),
  
  bank_code: z.string()
    .regex(/^[0-9]{3}$/, 'Código do banco inválido (3 dígitos)'),
  
  bank_name: z.string()
    .min(3, 'Nome do banco inválido')
    .max(100, 'Nome do banco muito longo'),
  
  agency: z.string()
    .regex(/^[0-9]{4,5}$/, 'Agência inválida (4 ou 5 dígitos)'),
  
  account: z.string()
    .regex(/^[0-9]{5,13}$/, 'Conta inválida'),
  
  account_type: z.enum(['checking', 'savings'], {
    errorMap: () => ({ message: 'Tipo de conta deve ser: checking ou savings' }),
  }),
  
  account_holder_name: z.string()
    .min(3, 'Nome do titular inválido')
    .max(100, 'Nome do titular muito longo'),
  
  account_holder_document: z.string()
    .regex(/^[0-9]{11}$|^[0-9]{14}$/, 'CPF/CNPJ do titular inválido'),
});

/**
 * Schema para aprovação/rejeição de saque
 */
export const ProcessWithdrawalSchema = z.object({
  action: z.enum(['approve', 'reject'], {
    errorMap: () => ({ message: 'Ação deve ser: approve ou reject' }),
  }),
  
  reason: z.string()
    .min(10, 'Motivo deve ter no mínimo 10 caracteres')
    .max(500, 'Motivo deve ter no máximo 500 caracteres')
    .optional(),
});

/**
 * Tipos TypeScript derivados dos schemas
 */
export type RegisterAffiliateInput = z.infer<typeof RegisterAffiliateSchema>;
export type UpdateAffiliateStatusInput = z.infer<typeof UpdateAffiliateStatusSchema>;
export type ValidateWalletInput = z.infer<typeof ValidateWalletSchema>;
export type AffiliateFiltersInput = z.infer<typeof AffiliateFiltersSchema>;
export type WithdrawalRequestInput = z.infer<typeof WithdrawalRequestSchema>;
export type ProcessWithdrawalInput = z.infer<typeof ProcessWithdrawalSchema>;
