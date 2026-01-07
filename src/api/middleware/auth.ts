/**
 * Middleware de Autenticação JWT
 * Task 0.3: Middleware para proteger rotas admin
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AdminRequest extends Request {
  admin?: {
    id: string;
    adminId: string;
    email: string;
    role: string;
  };
}

export const verifyAdmin = (
  req: AdminRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Token de autorização ausente ou inválido' 
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET não configurado');
      return res.status(500).json({ error: 'Erro de configuração do servidor' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as {
      id: string;
      adminId: string;
      email: string;
      role: string;
    };
    
    req.admin = {
      id: decoded.adminId, // Para compatibilidade
      adminId: decoded.adminId,
      email: decoded.email,
      role: decoded.role
    };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Token expirado' });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Token inválido' });
    }
    console.error('Erro na verificação do token:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const requireSuperAdmin = (
  req: AdminRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.admin?.role !== 'super_admin') {
    return res.status(403).json({ 
      error: 'Acesso restrito a super administradores' 
    });
  }
  next();
};