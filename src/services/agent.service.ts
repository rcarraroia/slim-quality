/**
 * Agent Service - Serviço para gerenciamento de agentes e sub-agentes
 * Prioridade 3 - Tornar Nodes Configuráveis
 */

import { apiService, ApiResponse } from './api.service';

export interface SubAgent {
  id: string;
  agent_name: string;
  domain: string;
  system_prompt: string;
  model: string;
  temperature: number;
  max_tokens: number;
  is_active: boolean;
}

export interface AgentConfig {
  model: string;
  temperature: number;
  max_tokens: number;
  system_prompt: string;
}

export interface TestPromptRequest {
  prompt: string;
  temperature: number;
  max_tokens: number;
}

export interface TestPromptResponse {
  response: string;
  tokens_used: number;
  response_time_ms: number;
  model_used: string;
}

class AgentService {
  /**
   * Buscar configuração geral do agente
   */
  async getConfig(): Promise<ApiResponse<AgentConfig>> {
    return apiService.get<AgentConfig>('/agent/config');
  }

  /**
   * Atualizar configuração geral do agente
   */
  async updateConfig(config: AgentConfig): Promise<ApiResponse<AgentConfig>> {
    return apiService.post<AgentConfig>('/agent/config', config);
  }

  /**
   * Testar prompt com configurações específicas
   */
  async testPrompt(request: TestPromptRequest): Promise<ApiResponse<TestPromptResponse>> {
    return apiService.post<TestPromptResponse>('/agent/test-prompt', request);
  }

  /**
   * Listar todos os sub-agentes
   */
  async getSubAgents(): Promise<ApiResponse<SubAgent[]>> {
    return apiService.get<SubAgent[]>('/agent/sub-agents');
  }

  /**
   * Buscar um sub-agente específico
   */
  async getSubAgent(id: string): Promise<ApiResponse<SubAgent>> {
    return apiService.get<SubAgent>(`/agent/sub-agents/${id}`);
  }

  /**
   * Atualizar configuração de um sub-agente
   */
  async updateSubAgent(id: string, data: Partial<SubAgent>): Promise<ApiResponse<SubAgent>> {
    return apiService.put<SubAgent>(`/agent/sub-agents/${id}`, data);
  }

  /**
   * Restaurar configuração padrão de um sub-agente
   */
  async resetSubAgent(id: string): Promise<ApiResponse<SubAgent>> {
    return apiService.post<SubAgent>(`/agent/sub-agents/${id}/reset`, {});
  }
}

export const agentService = new AgentService();
export default agentService;
