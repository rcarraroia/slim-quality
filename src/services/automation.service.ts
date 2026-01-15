/**
 * Serviço para Automações
 * Conecta frontend às APIs de automação do backend
 */

import { apiService, ApiResponse } from './api.service';

export interface AutomationRule {
  id: number;
  nome: string;
  status: 'ativa' | 'pausada' | 'rascunho';
  gatilho: string;
  acao: string;
  disparosMes: number;
  taxaAbertura: string;
  created_at?: string;
  updated_at?: string;
}

export interface AutomationStats {
  fluxosAtivos: number;
  mensagensEnviadasHoje: number;
  taxaMediaAbertura: string;
}

export interface CreateAutomationData {
  nome: string;
  descricao?: string;
  gatilho: string;
  acao: string;
  agendamento?: {
    aguardar: boolean;
    tempo: number;
    unidade: 'horas' | 'dias';
  };
}

export interface AutomationLog {
  id: number;
  rule_id: number;
  status: 'success' | 'error' | 'pending';
  executed_at: string;
  error_message?: string;
  details?: any;
}

class AutomationService {
  private baseUrl = '/automations';

  /**
   * Busca todas as regras de automação
   */
  async getRules(): Promise<ApiResponse<AutomationRule[]>> {
    return await apiService.get<AutomationRule[]>(`${this.baseUrl}/rules`);
  }

  /**
   * Busca estatísticas das automações
   */
  async getStats(): Promise<ApiResponse<AutomationStats>> {
    return await apiService.get<AutomationStats>(`${this.baseUrl}/stats`);
  }

  /**
   * Cria nova regra de automação
   */
  async createRule(data: CreateAutomationData): Promise<ApiResponse<AutomationRule>> {
    return await apiService.post<AutomationRule>(`${this.baseUrl}/rules`, data);
  }

  /**
   * Atualiza regra de automação existente
   */
  async updateRule(id: number, data: Partial<CreateAutomationData>): Promise<ApiResponse<AutomationRule>> {
    return await apiService.put<AutomationRule>(`${this.baseUrl}/rules/${id}`, data);
  }

  /**
   * Deleta regra de automação
   */
  async deleteRule(id: number): Promise<ApiResponse<void>> {
    return await apiService.delete<void>(`${this.baseUrl}/rules/${id}`);
  }

  /**
   * Ativa/Pausa regra de automação
   */
  async toggleRuleStatus(id: number, status: 'ativa' | 'pausada'): Promise<ApiResponse<AutomationRule>> {
    return await apiService.put<AutomationRule>(`${this.baseUrl}/rules/${id}/status`, { status });
  }

  /**
   * Busca logs de execução de uma regra específica
   */
  async getRuleLogs(ruleId: number, page = 1, limit = 20): Promise<ApiResponse<{
    logs: AutomationLog[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>> {
    return await apiService.get<any>(`${this.baseUrl}/logs?rule_id=${ruleId}&page=${page}&limit=${limit}`);
  }

  /**
   * Busca todos os logs de automação
   */
  async getAllLogs(page = 1, limit = 20): Promise<ApiResponse<{
    logs: AutomationLog[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>> {
    return await apiService.get<any>(`${this.baseUrl}/logs?page=${page}&limit=${limit}`);
  }

  /**
   * Executa regra manualmente (para testes)
   */
  async executeRule(id: number): Promise<ApiResponse<{ message: string; executionId: string }>> {
    return await apiService.post<any>(`${this.baseUrl}/rules/${id}/execute`);
  }
}

// Instância singleton
export const automationService = new AutomationService();
export default automationService;