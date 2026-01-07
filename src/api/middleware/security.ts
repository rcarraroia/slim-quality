/**
 * Middleware de Segurança
 * Task 3.3: Configurar Middleware de Segurança
 * BLOCO 3 - Segurança e Permissões
 */

import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';

/**
 * Rate Limiting para APIs gerais
 * 100 requests por 15 minutos por IP
 */
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requests por IP
  message: {
    error: 'Muitas requisições deste IP. Tente novamente em 15 minutos.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true, // Retorna rate limit info nos headers
  legacyHeaders: false, // Desabilita headers X-RateLimit-*
  skip: (req: Request) => {
    // Pular rate limiting para health check
    return req.path === '/api/health';
  }
});

/**
 * Rate Limiting mais restritivo para autenticação
 * 5 tentativas por 15 minutos por IP
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 tentativas de login por IP
  message: {
    error: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true // Não contar requests bem-sucedidos
});

/**
 * Rate Limiting para APIs administrativas
 * 50 requests por 15 minutos por IP
 */
export const adminRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 50, // 50 requests por IP
  message: {
    error: 'Limite de requisições administrativas excedido. Tente novamente em 15 minutos.',
    code: 'ADMIN_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Configuração do Helmet para segurança de headers
 */
export const helmetConfig = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.asaas.com", "wss:"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    }
  },
  
  // Cross Origin Embedder Policy
  crossOriginEmbedderPolicy: false, // Desabilitado para compatibilidade
  
  // Cross Origin Opener Policy
  crossOriginOpenerPolicy: { policy: "same-origin" },
  
  // Cross Origin Resource Policy
  crossOriginResourcePolicy: { policy: "cross-origin" },
  
  // DNS Prefetch Control
  dnsPrefetchControl: { allow: false },
  
  // Frame Options
  frameguard: { action: 'deny' },
  
  // Hide Powered By
  hidePoweredBy: true,
  
  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 ano
    includeSubDomains: true,
    preload: true
  },
  
  // IE No Open
  ieNoOpen: true,
  
  // No Sniff
  noSniff: true,
  
  // Origin Agent Cluster
  originAgentCluster: true,
  
  // Permitted Cross Domain Policies
  permittedCrossDomainPolicies: false,
  
  // Referrer Policy
  referrerPolicy: { policy: "no-referrer" },
  
  // X-Content-Type-Options
  xssFilter: true
});

/**
 * Middleware para logging de segurança
 */
export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
  // Log de tentativas suspeitas
  const suspiciousPatterns = [
    /\.\./,           // Path traversal
    /<script/i,       // XSS
    /union.*select/i, // SQL injection
    /javascript:/i,   // JavaScript injection
    /vbscript:/i,     // VBScript injection
    /onload=/i,       // Event handler injection
    /onerror=/i       // Event handler injection
  ];
  
  const userAgent = req.get('User-Agent') || '';
  const url = req.url;
  const body = JSON.stringify(req.body);
  
  // Verificar padrões suspeitos
  const isSuspicious = suspiciousPatterns.some(pattern => 
    pattern.test(url) || pattern.test(body) || pattern.test(userAgent)
  );
  
  if (isSuspicious) {
    console.warn('🚨 SECURITY WARNING:', {
      timestamp: new Date().toISOString(),
      ip: req.ip,
      method: req.method,
      url: req.url,
      userAgent,
      body: req.body,
      headers: req.headers
    });
  }
  
  next();
};

/**
 * Middleware para validação de Content-Type
 */
export const validateContentType = (req: Request, res: Response, next: NextFunction) => {
  // Apenas para requests com body
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.get('Content-Type');
    
    if (!contentType || !contentType.includes('application/json')) {
      return res.status(400).json({
        error: 'Content-Type deve ser application/json',
        code: 'INVALID_CONTENT_TYPE'
      });
    }
  }
  
  next();
};

/**
 * Middleware para sanitização de input
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Função para sanitizar strings
  const sanitizeString = (str: string): string => {
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
      .replace(/javascript:/gi, '') // Remove javascript:
      .replace(/vbscript:/gi, '') // Remove vbscript:
      .replace(/onload\s*=/gi, '') // Remove onload
      .replace(/onerror\s*=/gi, '') // Remove onerror
      .trim();
  };
  
  // Sanitizar recursivamente
  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return sanitizeString(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
      return sanitized;
    }
    
    return obj;
  };
  
  // Sanitizar body, query e params
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  
  next();
};

/**
 * Configuração CORS melhorada
 */
export const corsConfig = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Lista de origens permitidas
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://slimquality.com.br',
      'https://www.slimquality.com.br',
      'https://admin.slimquality.com.br'
    ];
    
    // Permitir requests sem origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn('🚨 CORS BLOCKED:', { origin, timestamp: new Date().toISOString() });
      callback(new Error('Não permitido pelo CORS'), false);
    }
  },
  credentials: true, // Permitir cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma'
  ],
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset'
  ],
  maxAge: 86400 // 24 horas
};

export default {
  generalRateLimit,
  authRateLimit,
  adminRateLimit,
  helmetConfig,
  securityLogger,
  validateContentType,
  sanitizeInput,
  corsConfig
};