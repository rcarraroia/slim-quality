import { z } from 'zod';

// Schema para criação de afiliado
export const CreateAffiliateSchema = z.object({
  name: z.string()
    .min(3, 'Nome deve ter pelo menos 3 caracteres')
    .max(100, 'Nome muito longo')
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Nome deve conter apenas letras e espaços'),

  email: z.string()
    .email('Email inválido')
    .max(255, 'Email muito longo')
    .toLowerCase(),

  phone: z.string()
    .regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, 'Telefone deve estar no formato (11) 99999-9999')
    .optional()
    .or(z.literal('')),

  document: z.string()
    .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, 'CPF ou CNPJ inválido')
    .optional()
    .or(z.literal('')),

  walletId: z.string()
    .regex(/^wal_[a-zA-Z0-9]{26}$/, 'Wallet ID deve estar no formato wal_XXXXXXXXXXXXXXXXXXXXXXXXXX')
    .max(30, 'Wallet ID muito longa'),

  referralCode: z.string()
    .regex(/^[A-Z0-9]{8}$/, 'Código de referência deve ter 8 caracteres alfanuméricos maiúsculos')
    .optional()
    .or(z.literal('')),
});

// Schema para atualização de afiliado
export const UpdateAffiliateSchema = z.object({
  name: z.string()
    .min(3, 'Nome deve ter pelo menos 3 caracteres')
    .max(100, 'Nome muito longo')
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Nome deve conter apenas letras e espaços')
    .optional(),

  phone: z.string()
    .regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, 'Telefone deve estar no formato (11) 99999-9999')
    .optional()
    .or(z.literal('')),

  notificationEmail: z.boolean().optional(),
  notificationWhatsapp: z.boolean().optional(),
});

// Schema para validação de wallet
export const ValidateWalletSchema = z.object({
  walletId: z.string()
    .regex(/^wal_[a-zA-Z0-9]{26}$/, 'Wallet ID deve estar no formato wal_XXXXXXXXXXXXXXXXXXXXXXXXXX')
    .max(30, 'Wallet ID muito longa'),
});

// Schema para validação de código de referência
export const ValidateReferralCodeSchema = z.object({
  code: z.string()
    .regex(/^[A-Z0-9]{8}$/, 'Código de referência deve ter 8 caracteres alfanuméricos maiúsculos'),
});

// Tipos inferidos dos schemas
export type CreateAffiliateInput = z.infer<typeof CreateAffiliateSchema>;
export type UpdateAffiliateInput = z.infer<typeof UpdateAffiliateSchema>;
export type ValidateWalletInput = z.infer<typeof ValidateWalletSchema>;
export type ValidateReferralCodeInput = z.infer<typeof ValidateReferralCodeSchema>;