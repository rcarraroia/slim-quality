/**
 * Middleware de Rate Limiting
 * Sprint 1: Sistema de Autenticação e Gestão de Usuários
 * 
 * Protege contra ataques de força bruta e abuso de API
 */

import rateLimit from 'express-rate-limit';
import { logger } from '../../utils/logger';

/**
 * Rate limiter para rotas de autenticação
 * Limita tentativas de login/registro por IP
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // 10 requisições por janela
  message: {
    error: 'Muitas tentativas. Tente novamente em 15 minutos.',
  },
  standardHeaders: true, // Retorna info de rate limit nos headers
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('RateLimiter', 'Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    res.status(429).json({
      error: 'Muitas tentativas. Tente novamente em 15 minutos.',
    });
  },
});

/**
 * Rate limiter para rotas de API em geral
 * Mais permissivo que o de autenticação
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requisições por janela
  message: {
    error: 'Muitas requisições. Tente novamente em alguns minutos.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('RateLimiter', 'API rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    res.status(429).json({
      error: 'Muitas requisições. Tente novamente em alguns minutos.',
    });
  },
});

/**
 * Rate limiter estrito para operações sensíveis
 * Ex: alteração de senha, exclusão de conta
 */
export const strictRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // 3 requisições por hora
  message: {
    error: 'Limite de operações sensíveis atingido. Tente novamente em 1 hora.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('RateLimiter', 'Strict rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    res.status(429).json({
      error: 'Limite de operações sensíveis atingido. Tente novamente em 1 hora.',
    });
  },
});
