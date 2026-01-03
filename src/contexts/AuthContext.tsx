/**
 * AuthContext - Sistema de Autenticação Slim Quality
 * Versão: MOCK - Autenticação simplificada para desenvolvimento
 * TODO: Reimplementar autenticação real após finalizar sistema
 */

import React, { createContext, useContext } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'super_admin';
}

interface AuthContextType {
  user: User;
  isAuthenticated: boolean;
  isAdmin: () => boolean;
  isSuperAdmin: () => boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Mock user - sempre logado como admin
  const user: User = {
    id: 'mock-admin-id',
    email: 'admin@slimquality.com',
    name: 'Admin Slim Quality',
    role: 'admin'
  };

  const isAdmin = () => true;
  const isSuperAdmin = () => user.role === 'super_admin';
  
  const signIn = async (email: string, password: string) => {
    // Mock login - sempre sucesso
    console.log('🔐 Mock login para:', email);
    return { success: true };
  };
  
  const signOut = () => {
    // Mock logout - apenas recarrega a página
    window.location.href = '/login';
  };

  const value = {
    user,
    isAuthenticated: true,
    isAdmin,
    isSuperAdmin,
    signIn,
    signOut,
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