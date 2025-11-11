/**
 * Rotas Públicas de Produtos
 * Sprint 2: Sistema de Produtos
 * 
 * Define rotas públicas (sem autenticação) para consulta de produtos
 */

import { Router } from 'express';
import {
  listProductsController,
  getProductBySlugController,
} from '../controllers/product-public.controller';
import {
  listTechnologiesController,
  getTechnologyBySlugController,
} from '../controllers/technology-public.controller';

const router = Router();

// ============================================
// ROTAS DE PRODUTOS
// ============================================

/**
 * GET /api/products
 * Lista produtos ativos
 * Query params:
 *   - featured: boolean (opcional)
 *   - limit: number (opcional, padrão: 10)
 *   - offset: number (opcional, padrão: 0)
 */
router.get('/products', listProductsController);

/**
 * GET /api/products/:slug
 * Busca detalhes do produto por slug
 */
router.get('/products/:slug', getProductBySlugController);

// ============================================
// ROTAS DE TECNOLOGIAS
// ============================================

/**
 * GET /api/technologies
 * Lista todas as tecnologias ativas
 */
router.get('/technologies', listTechnologiesController);

/**
 * GET /api/technologies/:slug
 * Busca tecnologia por slug
 */
router.get('/technologies/:slug', getTechnologyBySlugController);

export default router;
