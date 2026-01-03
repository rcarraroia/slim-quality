/**
 * useRealtimeConversations - Versão MOCK Simplificada
 * Hook desabilitado temporariamente para evitar loops de reconexão
 * TODO: Reimplementar após finalizar sistema de auth
 */

import { useState } from 'react';

export interface Conversation {
  id: string;
  customer_id: string;
  channel: 'whatsapp' | 'site' | 'email' | 'chat' | 'phone';
  status: 'new' | 'open' | 'pending' | 'resolved' | 'closed';
  subject?: string;
  assigned_to?: string;
  priority: number;
  session_id?: string;
  external_id?: string;
  metadata?: Record<string, any>;
  last_message_at?: string;
  last_customer_message_at?: string;
  last_agent_message_at?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
  // Campos calculados/relacionados
  customer?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  assigned_user?: {
    id: string;
    name: string;
  };
  unread_count?: number;
}

interface UseRealtimeConversationsOptions {
  limit?: number;
  status?: string[];
  channel?: string[];
  assigned_to?: string;
  customer_id?: string;
}

interface UseRealtimeConversationsReturn {
  conversations: Conversation[];
  data: Conversation[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  channelCounts: {
    whatsapp: number;
    site: number;
    email: number;
    chat: number;
    phone: number;
  };
}

export function useRealtimeConversations(
  options: UseRealtimeConversationsOptions = {}
): UseRealtimeConversationsReturn {
  // Mock data - conversas de exemplo
  const mockConversations: Conversation[] = [
    {
      id: 'conv-1',
      customer_id: 'cust-1',
      channel: 'whatsapp',
      status: 'open',
      subject: 'Dúvida sobre colchão magnético',
      priority: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_message_at: new Date().toISOString(),
      customer: {
        id: 'cust-1',
        name: 'Maria Silva',
        phone: '(11) 99999-9999'
      },
      unread_count: 2
    },
    {
      id: 'conv-2',
      customer_id: 'cust-2',
      channel: 'site',
      status: 'new',
      subject: 'Interesse em compra',
      priority: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_message_at: new Date().toISOString(),
      customer: {
        id: 'cust-2',
        name: 'João Santos',
        email: 'joao@email.com'
      },
      unread_count: 1
    }
  ];

  const [conversations] = useState<Conversation[]>(mockConversations);
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);

  const refetch = async () => {
    console.log('🔄 Mock refetch - dados não alterados');
  };

  const channelCounts = {
    whatsapp: conversations.filter(c => c.channel === 'whatsapp').length,
    site: conversations.filter(c => c.channel === 'site').length,
    email: conversations.filter(c => c.channel === 'email').length,
    chat: conversations.filter(c => c.channel === 'chat').length,
    phone: conversations.filter(c => c.channel === 'phone').length,
  };

  return {
    conversations,
    data: conversations,
    loading,
    error,
    refetch,
    channelCounts
  };
}

// Hook específico para badge de aprendizados pendentes - MOCK
export function usePendingLearningBadge() {
  const [count] = useState(3); // Mock: 3 aprendizados pendentes
  const [loading] = useState(false);

  return { count, loading };
}