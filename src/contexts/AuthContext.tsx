/**
 * Auth Context - Gerenciamento de Autenticação Global
 * Integração Frontend/Backend
 * 
 * Gerencia estado do usuário logado, login, logout e verificação de permissões
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import apiClient from '@/lib/api-client';

// Tipos
interface User {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  is_affiliate: boolean;
  roles: string[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  hasRole: (role: string) => boolean;
  refreshUser: () => Promise<void>;
}

// Criar Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider Component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Carregar usuário ao iniciar (se tiver token)
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    
    if (token) {
      loadUser();
    } else {
      setLoading(false);
    }
  }, []);

  // Função para carregar dados do usuário
  const loadUser = async () => {
    try {
      const response = await apiClient.get('/api/auth/me');
      const userData = response.data.data;
      
      setUser(userData);
    } catch (error) {
      console.error('Erro ao carregar usuário:', error);
      // Se falhar, limpar token
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Função de login
  const login = async (email: string, password: string) => {
    try {
      const response = await apiClient.post('/api/auth/login', {
        email,
        password,
      });

      const { data } = response.data;
      const { session, user: userData } = data;

      // Armazenar tokens
      localStorage.setItem('access_token', session.access_token);
      if (session.refresh_token) {
        localStorage.setItem('refresh_token', session.refresh_token);
      }

      // Atualizar estado do usuário
      setUser(userData);
    } catch (error) {
      console.error('Erro no login:', error);
      throw error;
    }
  };

  // Função de logout
  const logout = async () => {
    try {
      // Chamar API de logout
      await apiClient.post('/api/auth/logout');
    } catch (error) {
      console.error('Erro no logout:', error);
    } finally {
      // Sempre limpar dados locais
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
    }
  };

  // Verificar se usuário tem role específica
  const hasRole = (role: string): boolean => {
    if (!user) return false;
    return user.roles.includes(role);
  };

  // Função para atualizar dados do usuário
  const refreshUser = async () => {
    if (user) {
      await loadUser();
    }
  };

  // Valor do contexto
  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    hasRole,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook para usar o contexto
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};
