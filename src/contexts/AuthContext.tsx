/**
 * Auth Context - Gerenciamento de Autenticação Global
 * Integração Frontend/Backend
 * 
 * Gerencia estado do usuário logado, login, logout e verificação de permissões
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/config/supabase';

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
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authUser) {
        throw new Error('Usuário não autenticado');
      }

      // Buscar perfil e roles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profileError) throw profileError;

      // Buscar roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', authUser.id)
        .is('deleted_at', null);

      if (rolesError) throw rolesError;

      const roles = userRoles?.map(r => r.role) || [];

      const userData = {
        id: authUser.id,
        email: authUser.email!,
        full_name: profile.full_name,
        phone: profile.phone,
        avatar_url: profile.avatar_url,
        is_affiliate: profile.is_affiliate,
        roles,
      };

      setUser(userData);
      
      // Salvar no localStorage para acesso rápido
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (error) {
      console.error('Erro ao carregar usuário:', error);
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
      // Login direto com Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Armazenar tokens
      if (data.session) {
        localStorage.setItem('access_token', data.session.access_token);
        if (data.session.refresh_token) {
          localStorage.setItem('refresh_token', data.session.refresh_token);
        }
      }

      // Carregar dados completos do usuário
      await loadUser();
    } catch (error) {
      console.error('Erro no login:', error);
      throw error;
    }
  };

  // Função de logout
  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Erro no logout:', error);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
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
