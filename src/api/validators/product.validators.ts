/**
 * Schemas de validação Zod para Produtos
 * Sprint 2 - Sistema de Produtos
 */

import { z } from 'zod';

// ============================================
// SCHEMAS DE PRODUTO
// ============================================

/**
 * Schema para criação de produto
 */
export const CreateProductSchema = z.object({
  name: z
    .string()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .trim(),
  
  description: z
    .string()
    .min(10, 'Descrição deve ter no mínimo 10 caracteres')
    .max(5000, 'Descrição deve ter no máximo 5000 caracteres')
    .trim(),
  
  width_cm: z
    .number()
    .positive('Largura deve ser um número positivo')
    .max(500, 'Largura deve ser menor que 500cm'),
  
  length_cm: z
    .number()
    .positive('Comprimento deve ser um número positivo')
    .max(500, 'Comprimento deve ser menor que 500cm'),
  
  height_cm: z
    .number()
    .positive('Altura deve ser um número positivo')
    .max(100, 'Altura deve ser menor que 100cm'),
  
  weight_kg: z
    .number()
    .positive('Peso deve ser um número positivo')
    .max(200, 'Peso deve ser menor que 200kg')
    .optional(),
  
  price_cents: z
    .number()
    .int('Preço deve ser um número inteiro')
    .positive('Preço deve ser maior que zero')
    .max(100000000, 'Preço deve ser menor que R$ 1.000.000,00'),
  
  is_featured: z
    .boolean()
    .optional()
    .default(false),
  
  display_order: z
    .number()
    .int('Ordem de exibição deve ser um número inteiro')
    .min(0, 'Ordem de exibição deve ser maior ou igual a zero')
    .optional()
    .default(0),
});

/**
 * Schema para atualização de produto
 * Todos os campos são opcionais
 */
export const UpdateProductSchema = CreateProductSchema.partial();

/**
 * Schema para query params de listagem de produtos
 */
export const ListProductsQuerySchema = z.object({
  featured: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
  
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .pipe(z.number().int().min(1).max(100)),
  
  offset: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 0))
    .pipe(z.number().int().min(0)),
});

// ============================================
// TIPOS TYPESCRIPT
// ============================================

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;
export type ListProductsQuery = z.infer<typeof ListProductsQuerySchema>;
