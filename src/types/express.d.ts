/**
 * Extensão de tipos do Express
 * Sprint 1: Sistema de Autenticação e Gestão de Usuários
 * 
 * Adiciona propriedade 'user' ao Request do Express
 */

import { AuthenticatedUser } from './auth.types';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
