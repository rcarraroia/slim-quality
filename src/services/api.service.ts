/**
 * Serviço Base para APIs
 * BLOCO 4 - Frontend
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Interceptor para adicionar token JWT
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('admin_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Interceptor para tratar respostas
    this.client.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        // Se token expirou, redirecionar para login
        if (error.response?.status === 401) {
          localStorage.removeItem('admin_token');
          localStorage.removeItem('admin_refresh_token');
          window.location.href = '/admin/login';
        }
        return Promise.reject(error);
      }
    );
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.get(url, config);
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Erro desconhecido',
      };
    }
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.post(url, data, config);
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Erro desconhecido',
      };
    }
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.put(url, data, config);
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Erro desconhecido',
      };
    }
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.delete(url, config);
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Erro desconhecido',
      };
    }
  }

  // Método para download de arquivos
  async download(url: string, filename: string): Promise<ApiResponse<void>> {
    try {
      const response = await this.client.get(url, {
        responseType: 'blob',
      });

      // Criar link de download
      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      return {
        success: true,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Erro ao baixar arquivo',
      };
    }
  }
}

export const apiService = new ApiService();
export default apiService;