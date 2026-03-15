/**
 * Serviço de integração com BIA v2 Agent API
 */
import { supabase } from '@/config/supabase';

const API_BASE_URL = 'https://slimquality-bia-agent-v2.wpjtfd.easypanel.host';

interface AgentConfig {
  agent_name: string;
  agent_personality?: string;
  tone: 'amigavel' | 'formal' | 'casual' | 'tecnico';
  knowledge_enabled: boolean;
  tts_enabled: boolean;
}

interface AgentStatus {
  state: 'connected' | 'disconnected' | 'connecting';
}

interface NapkinItem {
  id: string;
  content: string;
  last_updated_by: 'agent' | 'affiliate';
  created_at: string;
}

interface AgentMetrics {
  total_messages_received: number;
  total_messages_sent: number;
  total_conversations: number;
  active_conversations: number;
}

class AgentService {
  private async getAuthToken(): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Não autenticado');
    }
    return session.access_token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await this.getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Erro desconhecido' }));
      throw new Error(error.detail || 'Erro na requisição');
    }

    return response.json();
  }

  async activateAgent(): Promise<{ qr_code: string; instance_name: string }> {
    return this.request('/agent/activate', { method: 'POST' });
  }

  async getStatus(): Promise<AgentStatus> {
    const response = await this.request<{ status: AgentStatus }>('/agent/status');
    return response.status;
  }

  async regenerateQRCode(): Promise<{ qr_code: string }> {
    return this.request('/agent/qr-code', { method: 'POST' });
  }

  async disconnect(): Promise<void> {
    await this.request('/agent/disconnect', { method: 'POST' });
  }

  async getConfig(): Promise<AgentConfig> {
    return this.request('/agent/config');
  }

  async updateConfig(config: Partial<AgentConfig>): Promise<AgentConfig> {
    const response = await this.request<{ config: AgentConfig }>('/agent/config', {
      method: 'PUT',
      body: JSON.stringify(config),
    });
    return response.config;
  }

  async getNapkin(): Promise<NapkinItem[]> {
    const response = await this.request<{ napkin: NapkinItem[] }>('/agent/napkin');
    return response.napkin;
  }

  async deleteNapkin(napkinId: string): Promise<void> {
    await this.request(`/agent/napkin/${napkinId}`, { method: 'DELETE' });
  }

  async getMetrics(): Promise<AgentMetrics> {
    return this.request('/agent/metrics');
  }
}

export const agentService = new AgentService();
