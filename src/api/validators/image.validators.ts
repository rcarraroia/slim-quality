/**
 * Schemas de validação Zod para Upload de Imagens
 * Sprint 2 - Sistema de Produtos
 */

import { z } from 'zod';

// ============================================
// SCHEMAS DE IMAGEM
// ============================================

/**
 * Schema para upload de imagem
 */
export const ImageUploadSchema = z.object({
  alt_text: z
    .string()
    .max(200, 'Texto alternativo deve ter no máximo 200 caracteres')
    .trim()
    .optional(),
  
  is_primary: z
    .boolean()
    .optional()
    .default(false),
});

/**
 * Schema para validação de arquivo de imagem
 * Usado no middleware de upload
 */
export const ImageFileSchema = z.object({
  mimetype: z.enum(['image/jpeg', 'image/png', 'image/webp'], {
    errorMap: () => ({ message: 'Formato de imagem inválido. Use JPEG, PNG ou WEBP' }),
  }),
  
  size: z
    .number()
    .max(5242880, 'Tamanho máximo de 5MB excedido'), // 5MB em bytes
});

/**
 * Schema para reordenação de imagens
 */
export const ReorderImagesSchema = z.object({
  image_ids: z
    .array(z.string().uuid('ID de imagem inválido'))
    .min(1, 'Deve haver pelo menos uma imagem')
    .max(10, 'Máximo de 10 imagens por produto'),
});

// ============================================
// CONSTANTES
// ============================================

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_IMAGE_SIZE = 5242880; // 5MB
export const MAX_IMAGES_PER_PRODUCT = 10;

// ============================================
// TIPOS TYPESCRIPT
// ============================================

export type ImageUploadInput = z.infer<typeof ImageUploadSchema>;
export type ImageFileInput = z.infer<typeof ImageFileSchema>;
export type ReorderImagesInput = z.infer<typeof ReorderImagesSchema>;
