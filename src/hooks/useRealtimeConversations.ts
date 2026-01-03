import { useEffect, useState } from 'react';
import { supabase } from '@/config/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { limit = 50, status, channel, assigned_to, customer_id } = options;

  // Função para carregar dados iniciais
  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('conversations')
        .select(`
          *,
          customers!inner(
            id,
            name,
            email,
            phone
          )
        `)
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(limit);

      // Aplicar filtros
      if (status && status.length > 0) {
        query = query.in('status', status);
      }

      if (channel && channel.length > 0) {
        query = query.in('channel', channel);
      }

      if (assigned_to) {
        query = query.eq('assigned_to', assigned_to);
      }

      if (customer_id) {
        query = query.eq('customer_id', customer_id);
      }

      const { data, error: queryError } = await query;

      if (queryError) {
        throw queryError;
      }

      // Transformar dados para o formato esperado
      const transformedData: Conversation[] = (data || []).map((item: any) => ({
        ...item,
        customer: item.customers,
        assigned_user: null, // Remover por enquanto até corrigir estrutura
        unread_count: 0 // TODO: Implementar contagem de não lidas
      }));

      setConversations(transformedData);
    } catch (err) {
      console.error('Erro ao carregar conversas:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  // Função para refetch manual
  const refetch = async () => {
    await loadInitialData();
  };

  // Função para lidar com atualizações em tempo real
  const handleRealtimeUpdate = (payload: any) => {
    console.log('Realtime update:', payload);

    switch (payload.eventType) {
      case 'INSERT':
        // Nova conversa criada
        setConversations(prev => {
          // Evitar duplicatas
          if (prev.some(c => c.id === payload.new.id)) {
            return prev;
          }
          return [payload.new, ...prev].slice(0, limit);
        });
        break;

      case 'UPDATE':
        // Conversa atualizada
        setConversations(prev => 
          prev.map(c => 
            c.id === payload.new.id 
              ? { ...c, ...payload.new }
              : c
          )
        );
        break;

      case 'DELETE':
        // Conversa deletada
        setConversations(prev => 
          prev.filter(c => c.id !== payload.old.id)
        );
        break;

      default:
        console.warn('Evento Realtime não tratado:', payload.eventType);
    }
  };

  useEffect(() => {
    // Carregar dados iniciais
    loadInitialData();

    // Configurar subscription Realtime
    const channel = supabase
      .channel('conversations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations'
        },
        handleRealtimeUpdate
      )
      .subscribe((status) => {
        console.log('Supabase Realtime status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Conectado ao Supabase Realtime - Conversas');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Erro na conexão Realtime');
          setError('Erro na conexão em tempo real');
        }
      });

    // Cleanup
    return () => {
      console.log('🔌 Desconectando Supabase Realtime - Conversas');
      supabase.removeChannel(channel);
    };
  }, [limit, status?.join(','), channel?.join(','), assigned_to, customer_id]);

  // Calcular contagens por canal
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

// Hook específico para badge de aprendizados pendentes
export function usePendingLearningBadge() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let channel: RealtimeChannel;

    const setupSubscription = async () => {
      try {
        // Buscar contagem inicial de aprendizados pendentes
        const { count: initialCount, error } = await supabase
          .from('learning_logs')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');

        if (error) {
          console.error('Erro ao buscar aprendizados pendentes:', error);
          setCount(0);
        } else {
          setCount(initialCount || 0);
        }

        // Configurar subscription para mudanças em tempo real
        channel = supabase
          .channel('learning-logs-changes')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'learning_logs'
          }, async (payload) => {
            console.log('Learning logs change:', payload);
            
            // Recarregar contagem após qualquer mudança
            const { count: newCount, error: countError } = await supabase
              .from('learning_logs')
              .select('*', { count: 'exact', head: true })
              .eq('status', 'pending');

            if (!countError) {
              setCount(newCount || 0);
            }
          })
          .subscribe((status) => {
            console.log('Learning logs subscription status:', status);
          });

        setLoading(false);
      } catch (error) {
        console.error('Erro ao configurar subscription de aprendizados:', error);
        setCount(0);
        setLoading(false);
      }
    };

    setupSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  return { count, loading };
}