/**
 * Middleware de Autenticação para Afiliados
 * Sistema de Notificações - Fase 2
 * Created: 2026-02-24
 */

import { Request, Response, NextFunction } from 'express';
import { supabase } from '../../config/supabase';

export interface AffiliateRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
  affiliate?: {
    id: string;
    name: string;
    email: string;
  };
}

/**
 * Middleware para verificar autenticação de afiliados
 * Valida token JWT via Supabase Auth
 */
export const verifyAffiliate = async (
  req: AffiliateRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Extrair token do header Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Token de autorização ausente ou inválido' 
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verificar token via Supabase Auth
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ 
        error: 'Token inválido ou expirado' 
      });
    }
    
    // Adicionar dados do usuário ao request
    req.user = {
      id: user.id,
      email: user.email!
    };
    
    next();
  } catch (error) {
    console.error('Erro na autenticação de afiliado:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor' 
    });
  }
};

/**
 * Middleware opcional para carregar dados completos do afiliado
 * Usa após verifyAffiliate para ter acesso aos dados do afiliado
 */
export const loadAffiliateData = async (
  req: AffiliateRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ 
        error: 'Usuário não autenticado' 
      });
    }

    // Buscar dados do afiliado
    const { data: affiliate, error } = await supabase
      .from('affiliates')
      .select('id, name, email, status')
      .eq('user_id', req.user.id)
      .is('deleted_at', null)
      .single();

    if (error || !affiliate) {
      return res.status(404).json({ 
        error: 'Afiliado não encontrado' 
      });
    }

    // Verificar se afiliado está ativo
    if (affiliate.status !== 'active') {
      return res.status(403).json({ 
        error: 'Afiliado inativo ou suspenso' 
      });
    }

    // Adicionar dados do afiliado ao request
    req.affiliate = {
      id: affiliate.id,
      name: affiliate.name,
      email: affiliate.email
    };

    next();
  } catch (error) {
    console.error('Erro ao carregar dados do afiliado:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor' 
    });
  }
};
