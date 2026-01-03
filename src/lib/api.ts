/**
 * Configuração da API para produção e desenvolvimento
 */

// URL base da API baseada no ambiente
const getApiBaseUrl = (): string => {
  // Em produção (build), usar a URL da API de produção
  if (import.meta.env.PROD) {
    return 'https://api.slimquality.com.br';
  }
  
  // Em desenvolvimento, usar variável de ambiente ou localhost
  return import.meta.env.VITE_API_URL || 'http://localhost:8000';
};

export const API_BASE_URL = getApiBaseUrl();

// Configuração do axios para usar a URL correta
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para logs em desenvolvimento
if (import.meta.env.DEV) {
  apiClient.interceptors.request.use((config) => {
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  });

  apiClient.interceptors.response.use(
    (response) => {
      console.log(`✅ API Response: ${response.status} ${response.config.url}`);
      return response;
    },
    (error) => {
      console.error(`❌ API Error: ${error.response?.status} ${error.config?.url}`, error.response?.data);
      return Promise.reject(error);
    }
  );
}