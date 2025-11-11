/**
 * Schemas de validação Zod para Estoque
 * Sprint 2 - Sistema de Produtos
 */

import { z } from 'zod';

// ============================================
// SCHEMAS DE ESTOQUE
// ============================================

/**
 * Schema para movimentação de estoque
 */
export const InventoryMovementSchema = z.object({
  type: z.enum(['entrada', 'saida', 'ajuste'], {
    errorMap: () => ({ message: 'Tipo deve ser: entrada, saida ou ajuste' }),
  }),
  
  quantity: z
    .number()
    .int('Quantidade deve ser um número inteiro')
    .refine(
      (val) => val !== 0,
      'Quantidade não pode ser zero'
    ),
  
  notes: z
    .string()
    .max(500, 'Observações devem ter no máximo 500 caracteres')
    .trim()
    .optional(),
});

/**
 * Schema para validar ajuste de estoque
 * Valida que quantidade é positiva para entrada e negativa para saída
 */
export const ValidateInventoryAdjustmentSchema = InventoryMovementSchema.refine(
  (data) => {
    if (data.type === 'entrada' && data.quantity < 0) {
      return false;
    }
    if (data.type === 'saida' && data.quantity > 0) {
      return false;
    }
    return true;
  },
  {
    message: 'Quantidade deve ser positiva para entrada e negativa para saída',
    path: ['quantity'],
  }
);

// ============================================
// TIPOS TYPESCRIPT
// ============================================

export type InventoryMovementInput = z.infer<typeof InventoryMovementSchema>;
export type InventoryMovementType = 'entrada' | 'saida' | 'ajuste' | 'venda' | 'devolucao';
