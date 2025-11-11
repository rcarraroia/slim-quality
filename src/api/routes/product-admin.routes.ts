/**
 * Rotas Administrativas de Produtos
 * Sprint 2: Sistema de Produtos
 * 
 * Define rotas administrativas (requer autenticação + role admin) para gestão de produtos
 */

import { Router } from 'express';
import multer from 'multer';
import {
  createProductController,
  updateProductController,
  deleteProductController,
  listAllProductsController,
  getProductByIdController,
} from '../controllers/product-admin.controller';
import {
  uploadProductImagesController,
  deleteProductImageController,
  setPrimaryImageController,
  reorderImagesController,
} from '../controllers/image-admin.controller';
import {
  adjustInventoryController,
  getInventoryHistoryController,
  getInventoryController,
  adjustToQuantityController,
} from '../controllers/inventory-admin.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/authorize.middleware';

const router = Router();

// Configurar multer para upload de imagens
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 10, // Máximo 10 imagens por vez
  },
  fileFilter: (_req, file, cb) => {
    // Validar tipo de arquivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo inválido. Use JPEG, PNG ou WEBP'));
    }
  },
});

// Aplicar middlewares de autenticação e autorização em todas as rotas
router.use(requireAuth);
router.use(requireAdmin);

// ============================================
// ROTAS DE PRODUTOS
// ============================================

/**
 * GET /api/admin/products
 * Lista todos os produtos (incluindo inativos)
 */
router.get('/products', listAllProductsController);

/**
 * GET /api/admin/products/:id
 * Busca produto por ID
 */
router.get('/products/:id', getProductByIdController);

/**
 * POST /api/admin/products
 * Cria novo produto
 * Body: CreateProductInput
 */
router.post('/products', createProductController);

/**
 * PUT /api/admin/products/:id
 * Atualiza produto
 * Body: UpdateProductInput
 */
router.put('/products/:id', updateProductController);

/**
 * DELETE /api/admin/products/:id
 * Deleta produto (soft delete)
 */
router.delete('/products/:id', deleteProductController);

// ============================================
// ROTAS DE IMAGENS
// ============================================

/**
 * POST /api/admin/products/:id/images
 * Upload de imagens do produto
 * Content-Type: multipart/form-data
 * Fields:
 *   - files: File[] (imagens)
 *   - alt_text: string (opcional)
 *   - is_primary: boolean (opcional)
 */
router.post('/products/:id/images', upload.array('files', 10), uploadProductImagesController);

/**
 * DELETE /api/admin/products/:productId/images/:imageId
 * Deleta imagem do produto
 */
router.delete('/products/:productId/images/:imageId', deleteProductImageController);

/**
 * PUT /api/admin/products/:productId/images/:imageId/primary
 * Define imagem como principal
 */
router.put('/products/:productId/images/:imageId/primary', setPrimaryImageController);

/**
 * PUT /api/admin/products/:productId/images/reorder
 * Reordena imagens do produto
 * Body: { image_ids: string[] }
 */
router.put('/products/:productId/images/reorder', reorderImagesController);

// ============================================
// ROTAS DE ESTOQUE
// ============================================

/**
 * GET /api/admin/products/:id/inventory
 * Busca estoque atual do produto
 */
router.get('/products/:id/inventory', getInventoryController);

/**
 * POST /api/admin/products/:id/inventory
 * Ajusta estoque do produto
 * Body: InventoryMovementInput
 */
router.post('/products/:id/inventory', adjustInventoryController);

/**
 * GET /api/admin/products/:id/inventory/history
 * Busca histórico de movimentações de estoque
 * Query params:
 *   - limit: number (opcional, padrão: 50)
 */
router.get('/products/:id/inventory/history', getInventoryHistoryController);

/**
 * PUT /api/admin/products/:id/inventory/adjust-to
 * Ajusta estoque para quantidade específica
 * Body: { target_quantity: number, notes?: string }
 */
router.put('/products/:id/inventory/adjust-to', adjustToQuantityController);

export default router;
