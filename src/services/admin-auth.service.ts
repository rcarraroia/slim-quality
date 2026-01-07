/**
 * Serviço de Autenticação Admin
 * BLOCO 4 - Frontend
 */

import { apiService, ApiResponse } from './api.service';

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

class AdminAuthService {
  /**
   * Fazer login
   */
  async login(credentials: LoginCredentials): Promise<ApiResponse<LoginResponse>> {
    const response = await apiService.post<{
      accessToken: string;
      refreshToken: string;
      admin: AdminUser;
    }>('/auth/login', credentials);
    
    if (response.success && response.data) {
      // Adaptar resposta da API para formato esperado
      const adaptedResponse: LoginResponse = {
        user: response.data.admin,
        token: response.data.accessToken,
        refreshToken: response.data.refreshToken,
        expiresIn: 24 * 60 * 60 // 1 dia em segundos
      };
      
      // Salvar tokens no localStorage
      localStorage.setItem('admin_token', adaptedResponse.token);
      localStorage.setItem('admin_refresh_token', adaptedResponse.refreshToken);
      localStorage.setItem('admin_user', JSON.stringify(adaptedResponse.user));
      
      // Configurar expiração do token
      const expirationTime = Date.now() + (adaptedResponse.expiresIn * 1000);
      localStorage.setItem('admin_token_expires', expirationTime.toString());
      
      return {
        success: true,
        data: adaptedResponse
      };
    }
    
    return response as ApiResponse<LoginResponse>;
  }

  /**
   * Fazer logout
   */
  async logout(): Promise<ApiResponse<{ message: string }>> {
    const response = await apiService.post<{ message: string }>('/auth/logout');
    
    // Limpar dados do localStorage independente da resposta
    this.clearAuthData();
    
    return response;
  }

  /**
   * Renovar token
   */
  async refreshToken(): Promise<ApiResponse<RefreshTokenResponse>> {
    const refreshToken = localStorage.getItem('admin_refresh_token');
    
    if (!refreshToken) {
      return {
        success: false,
        error: 'Refresh token não encontrado'
      };
    }

    const response = await apiService.post<{ accessToken: string }>('/auth/refresh', { refreshToken });
    
    if (response.success && response.data) {
      // Adaptar resposta
      const adaptedResponse: RefreshTokenResponse = {
        token: response.data.accessToken,
        expiresIn: 24 * 60 * 60 // 1 dia em segundos
      };
      
      // Atualizar token no localStorage
      localStorage.setItem('admin_token', adaptedResponse.token);
      
      // Atualizar expiração
      const expirationTime = Date.now() + (adaptedResponse.expiresIn * 1000);
      localStorage.setItem('admin_token_expires', expirationTime.toString());
      
      return {
        success: true,
        data: adaptedResponse
      };
    } else {
      // Se refresh falhou, limpar dados
      this.clearAuthData();
    }
    
    return response as ApiResponse<RefreshTokenResponse>;
  }

  /**
   * Buscar dados do usuário atual
   */
  async getCurrentUser(): Promise<ApiResponse<AdminUser>> {
    const response = await apiService.get<{ admin: AdminUser }>('/auth/me');
    
    if (response.success && response.data) {
      return {
        success: true,
        data: response.data.admin
      };
    }
    
    return response as ApiResponse<AdminUser>;
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
    const fiveMinutes = 5 * 60 * 1000; // 5 minutos em ms
    
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