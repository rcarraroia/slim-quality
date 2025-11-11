/**
 * Controllers Públicos de Tecnologias
 * Sprint 2: Sistema de Produtos
 * 
 * Endpoints públicos (sem autenticação) para consulta de tecnologias
 */

import { Request, Response } from 'express';
import { technologyService } from '../../services/products/technology.service';
import { logger } from '../../utils/logger';

/**
 * GET /api/technologies
 * Lista todas as tecnologias ativas (público)
 */
export async function listTechnologiesController(req: Request, res: Response): Promise<void> {
  try {
    // 1. Buscar tecnologias
    const technologies = await technologyService.listTechnologies();

    // 2. Retornar resposta
    res.status(200).json({
      success: true,
      data: technologies,
    });
  } catch (error) {
    logger.error('ListTechnologiesController', 'Error listing technologies', error as Error);
    res.status(500).json({
      success: false,
      error: 'Erro ao listar tecnologias',
      message: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
}

/**
 * GET /api/technologies/:slug
 * Busca tecnologia por slug (público)
 */
export async function getTechnologyBySlugController(req: Request, res: Response): Promise<void> {
  try {
    const { slug } = req.params;

    // 1. Buscar tecnologia
    const technology = await technologyService.getTechnologyBySlug(slug);

    if (!technology) {
      res.status(404).json({
        success: false,
        error: 'Tecnologia não encontrada',
      });
      return;
    }

    // 2. Retornar resposta
    res.status(200).json({
      success: true,
      data: technology,
    });
  } catch (error) {
    logger.error('GetTechnologyBySlugController', 'Error getting technology', error as Error, {
      slug: req.params.slug,
    });
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar tecnologia',
      message: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
}
