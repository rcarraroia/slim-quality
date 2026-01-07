/**
 * AuthContext - Sistema de Autenticação JWT Real
 * Integração com APIs de autenticação admin
 */

import React, { createContext, useContext } from 'react';
import { useAuth as useAuthHook } from '@/hooks/useAuth';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'super_admin';
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: () => boolean;
  isSuperAdmin: () => boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshUser,
    hasPermission
  } = useAuthHook();

  const isAdmin = () => hasPermission('admin');
  const isSuperAdmin = () => hasPermission('super_admin');
  
  const signIn = async (email: string, password: string) => {
    try {
      const success = await login({ email, password });
      return { success };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      };
    }
  };
  
  const signOut = async () => {
    await logout();
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    isAdmin,
    isSuperAdmin,
    signIn,
    signOut,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}