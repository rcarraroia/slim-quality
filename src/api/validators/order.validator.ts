/**
 * Validadores Zod para Pedidos
 * Sprint 3: Sistema de Vendas
 * 
 * Baseado na documentação oficial do Asaas
 */

import { z } from 'zod';

// ============================================
// SCHEMAS DE PEDIDO
// ============================================

/**
 * Schema para criar pedido
 * Valida dados do pedido, itens e endereço de entrega
 */
export const CreateOrderSchema = z.object({
  items: z.array(z.object({
    product_id: z.string().uuid('ID do produto deve ser um UUID válido'),
    quantity: z.number().int().positive('Quantidade deve ser um número positivo'),
  })).min(1, 'Pedido deve ter pelo menos 1 item'),
  
  shipping_address: z.object({
    recipient_name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres').max(100),
    street: z.string().min(3).max(200),
    number: z.string().min(1).max(20),
    complement: z.string().max(100).optional(),
    neighborhood: z.string().min(2).max(100),
    city: z.string().min(2).max(100),
    state: z.string().length(2, 'Estado deve ter 2 caracteres (ex: SP)'),
    postal_code: z.string().regex(/^\d{5}-?\d{3}$/, 'CEP inválido (formato: 12345-678)'),
    phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Telefone inválido'),
  }),
  
  customer_cpf: z.string().regex(/^\d{11}$/, 'CPF deve ter 11 dígitos').optional(),
  notes: z.string().max(500).optional(),
});

/**
 * Schema para atualizar status do pedido
 */
export const UpdateOrderStatusSchema = z.object({
  status: z.enum([
    'pending', 
    'paid', 
    'processing', 
    'shipped', 
    'delivered', 
    'cancelled'
  ], {
    errorMap: () => ({ message: 'Status inválido' })
  }),
  notes: z.string().max(500).optional(),
});

/**
 * Schema para filtros de listagem de pedidos
 */
export const OrderFiltersSchema = z.object({
  status: z.enum([
    'pending', 
    'paid', 
    'processing', 
    'shipped', 
    'delivered', 
    'cancelled'
  ]).optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(100).default(10),
  offset: z.number().int().min(0).default(0),
});

// ============================================
// TIPOS TYPESCRIPT (inferidos dos schemas)
// ============================================

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof UpdateOrderStatusSchema>;
export type OrderFilters = z.infer<typeof OrderFiltersSchema>;
