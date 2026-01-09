/**
 * Hook de Autenticação de Clientes
 * Gerencia estado de autenticação para clientes e afiliados
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { customerAuthService, CustomerUser, RegisterData, RegisterAffiliateData } from '@/services/customer-auth.service';

interface UseCustomerAuthReturn {
  user: CustomerUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAffiliate: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  registerWithAffiliate: (data: RegisterAffiliateData) => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
  updateUser: (updates: Partial<CustomerUser>) => void;
}

export function useCustomerAuth(): UseCustomerAuthReturn {
  const [user, setUser] = useState<CustomerUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Carregar usuário inicial
  useEffect(() => {
    const loadUser = async () => {
      setIsLoading(true);
      
      // Primeiro tentar do localStorage
      const storedUser = customerAuthService.getStoredUser();
      
      if (storedUser && customerAuthService.isAuthenticated()) {
        setUser(storedUser);
        
        // Atualizar dados em background
        const freshUser = await customerAuthService.getCurrentUser();
        if (freshUser) {
          setUser(freshUser);
          customerAuthService.updateStoredUser(freshUser);
        }
      } else {
        // Tentar recuperar sessão do Supabase
        const freshUser = await customerAuthService.getCurrentUser();
        if (freshUser) {
          setUser(freshUser);
        }
      }
      
      setIsLoading(false);
    };

    loadUser();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    
    const result = await customerAuthService.login(email, password);
    
    if (result.success && result.data) {
      setUser(result.data.user);
      setIsLoading(false);
      return { success: true };
    }
    
    setIsLoading(false);
    return { success: false, error: result.error };
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    await customerAuthService.logout();
    setUser(null);
    setIsLoading(false);
    navigate('/entrar');
  }, [navigate]);

  const register = useCallback(async (data: RegisterData) => {
    setIsLoading(true);
    
    const result = await customerAuthService.register(data);
    
    if (result.success && result.data) {
      setUser(result.data.user);
      setIsLoading(false);
      return { success: true };
    }
    
    setIsLoading(false);
    return { success: false, error: result.error };
  }, []);

  const registerWithAffiliate = useCallback(async (data: RegisterAffiliateData) => {
    setIsLoading(true);
    
    const result = await customerAuthService.registerWithAffiliate(data);
    
    if (result.success && result.data) {
      setUser(result.data.user);
      setIsLoading(false);
      return { success: true };
    }
    
    setIsLoading(false);
    return { success: false, error: result.error };
  }, []);

  const refreshUser = useCallback(async () => {
    const freshUser = await customerAuthService.getCurrentUser();
    if (freshUser) {
      setUser(freshUser);
      customerAuthService.updateStoredUser(freshUser);
    }
  }, []);

  const updateUser = useCallback((updates: Partial<CustomerUser>) => {
    setUser(prev => prev ? { ...prev, ...updates } : null);
    customerAuthService.updateStoredUser(updates);
  }, []);

  return {
    user,
    isAuthenticated: !!user && customerAuthService.isAuthenticated(),
    isLoading,
    isAffiliate: user?.isAffiliate || false,
    login,
    logout,
    register,
    registerWithAffiliate,
    refreshUser,
    updateUser
  };
}

export default useCustomerAuth;
