/**
 * API Client - Cliente HTTP com Interceptors
 * Integração Frontend/Backend
 * 
 * Configuração centralizada para todas as chamadas à API
 */

import axios from 'axios';

// Criar instância do axios com configuração base
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:3000'),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 segundos
});

// Interceptor de Request - Adiciona token JWT automaticamente
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor de Response - Trata erros globalmente
apiClient.interceptors.response.use(
  (response) => {
    // Retorna resposta bem-sucedida
    return response;
  },
  (error) => {
    // Trata erros de resposta
    if (error.response) {
      const status = error.response.status;
      
      // 401 Unauthorized - Token inválido ou expirado
      if (status === 401) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        
        // Redireciona para login apenas se não estiver já na página de login
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
      
      // 403 Forbidden - Sem permissão
      if (status === 403) {
        console.error('Acesso negado: Você não tem permissão para esta ação');
      }
      
      // 404 Not Found
      if (status === 404) {
        console.error('Recurso não encontrado');
      }
      
      // 500 Internal Server Error
      if (status === 500) {
        console.error('Erro interno do servidor');
      }
    } else if (error.request) {
      // Requisição foi feita mas não houve resposta
      console.error('Erro de rede: Servidor não respondeu');
    } else {
      // Erro ao configurar a requisição
      console.error('Erro ao fazer requisição:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
