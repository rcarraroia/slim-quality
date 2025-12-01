/**
 * Conversations Hook
 * Hook para gerenciar conversas do admin
 */

import { useState, useEffect, useCallback } from 'react';
import { conversationFrontendService } from '@/services/frontend/conversation-frontend.service';
import { useToast } from '@/hooks/use-toast';

interface UseConversationsOptions {
  limit?: number;
  autoLoad?: boolean;
}

export const useConversations = (options: UseConversationsOptions = {}) => {
  const { limit = 5, autoLoad = true } = options;
  const { toast } = useToast();

  // Estados
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dados
  const [conversations, setConversations] = useState<any[]>([]);

  // Carregar conversas
  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await conversationFrontendService.getConversations({ limit });
      const data = result.data.map(conv => ({
        id: conv.id,
        nome: conv.customer?.name || 'Cliente',
        status: conv.status,
        ultimaMensagem: conv.subject || 'Sem assunto',
        hora: new Date(conv.updated_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      }));
      setConversations(data);
    } catch (err) {
      const errorMessage = 'Erro ao carregar conversas';
      setError(errorMessage);

      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [limit, toast]);

  // Carregar dados automaticamente
  useEffect(() => {
    if (autoLoad) {
      loadConversations();
    }
  }, [autoLoad, loadConversations]);

  return {
    // Estados
    loading,
    error,

    // Dados
    conversations,

    // Ações
    loadConversations,

    // Refresh
    refresh: loadConversations
  };
};