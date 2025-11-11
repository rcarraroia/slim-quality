/**
 * Validadores Zod para Pagamentos
 * Sprint 3: Sistema de Vendas
 * 
 * Baseado na documentação oficial do Asaas
 * ⚠️ remoteIp é OBRIGATÓRIO para pagamentos com cartão
 */

import { z } from 'zod';

// ============================================
// SCHEMAS DE PAGAMENTO
// ============================================

/**
 * Schema para pagamento PIX
 */
export const CreatePixPaymentSchema = z.object({
  payment_method: z.literal('pix'),
});

/**
 * Schema para pagamento com Cartão de Crédito
 * ⚠️ remoteIp é OBRIGATÓRIO (IP do cliente, não do servidor)
 * ⚠️ Parcelamento até 21x para Visa/Mastercard, 12x para outras bandeiras
 */
export const CreateCreditCardPaymentSchema = z.object({
  payment_method: z.literal('credit_card'),
  
  card: z.object({
    number: z.string().regex(/^\d{13,19}$/, 'Número do cartão inválido (13-19 dígitos)'),
    holder_name: z.string().min(3, 'Nome do titular deve ter no mínimo 3 caracteres').max(100),
    expiry_month: z.string().regex(/^(0[1-9]|1[0-2])$/, 'Mês inválido (01-12)'),
    expiry_year: z.string().regex(/^\d{4}$/, 'Ano inválido (formato: YYYY)'),
    ccv: z.string().regex(/^\d{3,4}$/, 'CVV inválido (3-4 dígitos)'),
  }),
  
  installments: z.number()
    .int('Parcelas deve ser um número inteiro')
    .min(1, 'Mínimo 1 parcela')
    .max(21, 'Máximo 21 parcelas (Visa/Mastercard)')
    .default(1)
    .optional(),
  
  // ⚠️ OBRIGATÓRIO: IP do cliente (não do servidor!)
  remote_ip: z.string().ip('IP inválido'),
});

/**
 * Schema unificado para criar pagamento (PIX ou Cartão)
 */
export const CreatePaymentSchema = z.discriminatedUnion('payment_method', [
  CreatePixPaymentSchema,
  CreateCreditCardPaymentSchema,
]);

/**
 * Schema para consultar status de pagamento
 */
export const PaymentStatusSchema = z.object({
  payment_id: z.string().uuid('ID do pagamento deve ser um UUID válido'),
});

// ============================================
// SCHEMAS AUXILIARES
// ============================================

/**
 * Schema para dados do titular do cartão (Asaas)
 * Usado internamente ao criar cobrança no Asaas
 */
export const CreditCardHolderInfoSchema = z.object({
  name: z.string().min(3).max(100),
  email: z.string().email('Email inválido'),
  cpfCnpj: z.string().regex(/^\d{11}$|^\d{14}$/, 'CPF/CNPJ inválido'),
  postalCode: z.string().regex(/^\d{5}-?\d{3}$/, 'CEP inválido'),
  addressNumber: z.string().min(1).max(20),
  addressComplement: z.string().max(100).optional(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Telefone inválido'),
  mobilePhone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Celular inválido').optional(),
});

// ============================================
// TIPOS TYPESCRIPT (inferidos dos schemas)
// ============================================

export type CreatePixPaymentInput = z.infer<typeof CreatePixPaymentSchema>;
export type CreateCreditCardPaymentInput = z.infer<typeof CreateCreditCardPaymentSchema>;
export type CreatePaymentInput = z.infer<typeof CreatePaymentSchema>;
export type PaymentStatusInput = z.infer<typeof PaymentStatusSchema>;
export type CreditCardHolderInfo = z.infer<typeof CreditCardHolderInfoSchema>;
