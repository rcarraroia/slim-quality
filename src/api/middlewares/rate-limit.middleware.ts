import { Request, Response, NextFunction } from 'express';

// Simple in-memory rate limiting (for development)
// In production, use Redis or similar
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  max: number; // Maximum requests per window
  message?: string;
  skipSuccessfulRequests?: boolean;
}

/**
 * Middleware para rate limiting
 */
export const rateLimitMiddleware = (options: RateLimitOptions) => {
  const { windowMs, max, message = 'Muitas tentativas. Tente novamente mais tarde.' } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.ip}-${req.path}`;
    const now = Date.now();

    const current = rateLimitStore.get(key);

    if (!current || now > current.resetTime) {
      // First request or window expired
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      next();
    } else if (current.count < max) {
      // Within limit
      current.count++;
      rateLimitStore.set(key, current);
      next();
    } else {
      // Rate limit exceeded
      const resetIn = Math.ceil((current.resetTime - now) / 1000);

      res.status(429).json({
        error: message,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: resetIn,
      });
    }
  };
};

/**
 * Limpa entradas expiradas do store (chamar periodicamente)
 */
export const cleanupRateLimitStore = () => {
  const now = Date.now();

  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
};

// Limpar store a cada 5 minutos
setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
