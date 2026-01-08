/**
 * Serviço de Autenticação Admin
 * Usando Supabase Auth diretamente
 */

import { supabase } from '@/config/supabase';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'super_admin';
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: AdminUser;
  token: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RefreshTokenResponse {
  token: string;
  expiresIn: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class AdminAuthService {
  /**
   * Fazer login usando Supabase Auth
   */
  async login(credentials: LoginCredentials): Promise<ApiResponse<LoginResponse>> {
    try {
      // Login via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      });

      if (authError || !authData.user || !authData.session) {
        return {
          success: false,
          error: authError?.message || 'Credenciais inválidas'
        };
      }

      // Buscar dados do admin na tabela admins
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('*')
        .eq('user_id', authData.user.id)
        .single();

      if (adminError || !adminData) {
        // Usuário não é admin
        await supabase.auth.signOut();
        return {
          success: false,
          error: 'Usuário não tem permissão de administrador'
        };
      }

      if (!adminData.is_active) {
        await supabase.auth.signOut();
        return {
          success: false,
          error: 'Conta de administrador desativada'
        };
      }

      // Montar objeto do usuário admin
      const adminUser: AdminUser = {
        id: adminData.id,
        email: authData.user.email || '',
        name: adminData.name || authData.user.email?.split('@')[0] || 'Admin',
        role: adminData.role || 'admin',
        is_active: adminData.is_active,
        last_login_at: new Date().toISOString(),
        created_at: adminData.created_at
      };

      // Atualizar último login
      await supabase
        .from('admins')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', adminData.id);

      // Salvar dados no localStorage
      localStorage.setItem('admin_token', authData.session.access_token);
      localStorage.setItem('admin_refresh_token', authData.session.refresh_token);
      localStorage.setItem('admin_user', JSON.stringify(adminUser));
      
      const expirationTime = Date.now() + (authData.session.expires_in || 3600) * 1000;
      localStorage.setItem('admin_token_expires', expirationTime.toString());

      return {
        success: true,
        data: {
          user: adminUser,
          token: authData.session.access_token,
          refreshToken: authData.session.refresh_token,
          expiresIn: authData.session.expires_in || 3600
        }
      };
    } catch (error: any) {
      console.error('Erro no login:', error);
      return {
        success: false,
        error: error.message || 'Erro interno no login'
      };
    }
  }

  /**
   * Fazer logout usando Supabase Auth
   */
  async logout(): Promise<ApiResponse<{ message: string }>> {
    try {
      // Logout via Supabase Auth
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.warn('Erro ao fazer logout no Supabase:', error);
      }

      // Limpar dados do localStorage independente da resposta
      this.clearAuthData();

      return {
        success: true,
        data: { message: 'Logout realizado com sucesso' }
      };
    } catch (error: any) {
      console.error('Erro no logout:', error);
      // Mesmo com erro, limpar dados locais
      this.clearAuthData();
      return {
        success: true,
        data: { message: 'Logout realizado' }
      };
    }
  }

  /**
   * Renovar token usando Supabase Auth
   */
  async refreshToken(): Promise<ApiResponse<RefreshTokenResponse>> {
    try {
      const { data, error } = await supabase.auth.refreshSession();

      if (error || !data.session) {
        this.clearAuthData();
        return {
          success: false,
          error: error?.message || 'Falha ao renovar sessão'
        };
      }

      // Atualizar tokens no localStorage
      localStorage.setItem('admin_token', data.session.access_token);
      localStorage.setItem('admin_refresh_token', data.session.refresh_token);
      
      const expirationTime = Date.now() + (data.session.expires_in || 3600) * 1000;
      localStorage.setItem('admin_token_expires', expirationTime.toString());

      return {
        success: true,
        data: {
          token: data.session.access_token,
          expiresIn: data.session.expires_in || 3600
        }
      };
    } catch (error: any) {
      console.error('Erro ao renovar token:', error);
      this.clearAuthData();
      return {
        success: false,
        error: error.message || 'Erro ao renovar sessão'
      };
    }
  }

  /**
   * Buscar dados do usuário atual
   */
  async getCurrentUser(): Promise<ApiResponse<AdminUser>> {
    try {
      // Verificar sessão atual no Supabase
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        return {
          success: false,
          error: 'Usuário não autenticado'
        };
      }

      // Buscar dados do admin
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (adminError || !adminData) {
        return {
          success: false,
          error: 'Dados do administrador não encontrados'
        };
      }

      const adminUser: AdminUser = {
        id: adminData.id,
        email: user.email || '',
        name: adminData.name || user.email?.split('@')[0] || 'Admin',
        role: adminData.role || 'admin',
        is_active: adminData.is_active,
        last_login_at: adminData.last_login_at,
        created_at: adminData.created_at
      };

      return {
        success: true,
        data: adminUser
      };
    } catch (error: any) {
      console.error('Erro ao buscar usuário:', error);
      return {
        success: false,
        error: error.message || 'Erro ao buscar dados do usuário'
      };
    }
  }

  /**
   * Verificar se está autenticado
   */
  isAuthenticated(): boolean {
    const token = localStorage.getItem('admin_token');
    const expiresAt = localStorage.getItem('admin_token_expires');
    
    if (!token || !expiresAt) {
      return false;
    }
    
    // Verificar se token não expirou
    const now = Date.now();
    const expiration = parseInt(expiresAt);
    
    if (now >= expiration) {
      this.clearAuthData();
      return false;
    }
    
    return true;
  }

  /**
   * Obter usuário do localStorage
   */
  getStoredUser(): AdminUser | null {
    const userStr = localStorage.getItem('admin_user');
    if (!userStr) return null;
    
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  /**
   * Obter token do localStorage
   */
  getToken(): string | null {
    return localStorage.getItem('admin_token');
  }

  /**
   * Verificar se token está próximo do vencimento (5 minutos)
   */
  isTokenExpiringSoon(): boolean {
    const expiresAt = localStorage.getItem('admin_token_expires');
    if (!expiresAt) return true;
    
    const now = Date.now();
    const expiration = parseInt(expiresAt);
    const fiveMinutes = 5 * 60 * 1000;
    
    return (expiration - now) <= fiveMinutes;
  }

  /**
   * Limpar dados de autenticação
   */
  clearAuthData(): void {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_refresh_token');
    localStorage.removeItem('admin_user');
    localStorage.removeItem('admin_token_expires');
  }

  /**
   * Verificar permissão do usuário
   */
  hasPermission(requiredRole: 'admin' | 'super_admin'): boolean {
    const user = this.getStoredUser();
    if (!user || !user.is_active) return false;
    
    if (requiredRole === 'admin') {
      return user.role === 'admin' || user.role === 'super_admin';
    }
    
    if (requiredRole === 'super_admin') {
      return user.role === 'super_admin';
    }
    
    return false;
  }

  /**
   * Auto-renovar token se necessário
   */
  async autoRefreshToken(): Promise<boolean> {
    if (!this.isAuthenticated()) {
      return false;
    }
    
    if (this.isTokenExpiringSoon()) {
      const response = await this.refreshToken();
      return response.success;
    }
    
    return true;
  }
}

export const adminAuthService = new AdminAuthService();
export default adminAuthService;
