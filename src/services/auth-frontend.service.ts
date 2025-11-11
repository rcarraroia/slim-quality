/**
 * Auth Service - Frontend
 * Integração Frontend/Backend
 * 
 * Serviço de autenticação para o frontend (não confundir com o backend)
 */

import apiClient from '@/lib/api-client';

export interface RegisterData {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
}

export interface UpdateProfileData {
  full_name?: string;
  phone?: string;
  avatar_url?: string;
}

export const authService = {
  /**
   * Registrar novo usuário
   */
  async register(data: RegisterData) {
    const response = await apiClient.post('/api/auth/register', data);
    return response.data;
  },

  /**
   * Solicitar recuperação de senha
   */
  async forgotPassword(email: string) {
    const response = await apiClient.post('/api/auth/forgot-password', { email });
    return response.data;
  },

  /**
   * Atualizar perfil do usuário
   */
  async updateProfile(data: UpdateProfileData) {
    const response = await apiClient.put('/api/users/profile', data);
    return response.data;
  },

  /**
   * Buscar dados do usuário atual
   */
  async getMe() {
    const response = await apiClient.get('/api/auth/me');
    return response.data.data;
  },
};
