/**
 * Hook de Autenticação
 * BLOCO 4 - Frontend
 */

import { useState, useEffect, useCallback } from 'react';
import { adminAuthService, AdminUser, LoginCredentials } from '@/services/admin-auth.service';
import { useToast } from '@/hooks/use-toast';

interface UseAuthReturn {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasPermission: (role: 'admin' | 'super_admin') => boolean;
}

export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Verificar autenticação inicial
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (adminAuthService.isAuthenticated()) {
          // Tentar auto-renovar token se necessário
          const refreshed = await adminAuthService.autoRefreshToken();
          
          if (refreshed) {
            // Buscar dados atualizados do usuário
            const response = await adminAuthService.getCurrentUser();
            if (response.success && response.data) {
              setUser(response.data);
              // Atualizar localStorage com dados atualizados
              localStorage.setItem('admin_user', JSON.stringify(response.data));
            } else {
              // Se falhou ao buscar usuário, usar dados do localStorage
              const storedUser = adminAuthService.getStoredUser();
              setUser(storedUser);
            }
          } else {
            // Se refresh falhou, limpar dados
            adminAuthService.clearAuthData();
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Erro ao inicializar autenticação:', error);
        adminAuthService.clearAuthData();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  // Auto-renovar token periodicamente
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      try {
        await adminAuthService.autoRefreshToken();
      } catch (error) {
        console.error('Erro ao renovar token automaticamente:', error);
        // Se falhou, fazer logout
        await logout();
      }
    }, 4 * 60 * 1000); // Verificar a cada 4 minutos

    return () => clearInterval(interval);
  }, [user]);

  const login = useCallback(async (credentials: LoginCredentials): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      const response = await adminAuthService.login(credentials);
      
      if (response.success && response.data) {
        setUser(response.data.user);
        
        toast({
          title: "Login realizado com sucesso",
          description: `Bem-vindo, ${response.data.user.name}!`,
        });
        
        return true;
      } else {
        toast({
          title: "Erro no login",
          description: response.error || "Credenciais inválidas",
          variant: "destructive"
        });
        
        return false;
      }
    } catch (error) {
      console.error('Erro no login:', error);
      
      toast({
        title: "Erro no login",
        description: "Erro interno do servidor",
        variant: "destructive"
      });
      
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const logout = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      
      // Fazer logout no servidor
      await adminAuthService.logout();
      
      // Limpar estado local
      setUser(null);
      
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso",
      });
      
      // Redirecionar para home
      window.location.href = '/';
    } catch (error) {
      console.error('Erro no logout:', error);
      
      // Mesmo com erro, limpar dados locais
      adminAuthService.clearAuthData();
      setUser(null);
      
      window.location.href = '/';
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      const response = await adminAuthService.getCurrentUser();
      
      if (response.success && response.data) {
        setUser(response.data);
        localStorage.setItem('admin_user', JSON.stringify(response.data));
      }
    } catch (error) {
      console.error('Erro ao atualizar dados do usuário:', error);
    }
  }, []);

  const hasPermission = useCallback((role: 'admin' | 'super_admin'): boolean => {
    return adminAuthService.hasPermission(role);
  }, []);

  const isAuthenticated = !!user && adminAuthService.isAuthenticated();

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshUser,
    hasPermission
  };
};

export default useAuth;