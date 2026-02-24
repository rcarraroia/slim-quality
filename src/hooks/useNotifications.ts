/**
 * Hook useNotifications
 * FASE 3 - Sistema de Notificações
 * Gerencia estado de notificações com polling e cache
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/services/api.service';
import type { NotificationLog, UnreadCountResponse } from '@/services/admin/notification.service';

// ========================================
// TIPOS
// ========================================

interface UseNotificationsOptions {
  enabled?: boolean;
  pollingInterval?: number; // em ms, padrão 30000 (30s)
}

interface NotificationsResponse {
  notifications: NotificationLog[];
  total: number;
  page: number;
  limit: number;
}

// ========================================
// HOOK
// ========================================

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { enabled = true, pollingInterval = 30000 } = options;
  const queryClient = useQueryClient();

  // Query: Listar notificações
  const {
    data: notificationsData,
    isLoading: isLoadingNotifications,
    error: notificationsError,
    refetch: refetchNotifications,
  } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await apiService.get<{ success: boolean; data: NotificationLog[] }>('/affiliates?action=notifications&subaction=list&limit=5');
      return { notifications: response.data.data, total: response.data.data.length, page: 1, limit: 5 };
    },
    enabled,
    refetchInterval: pollingInterval,
    staleTime: 25000, // 25s (menor que polling para garantir atualização)
  });

  // Query: Contador de não lidas
  const {
    data: unreadCountData,
    isLoading: isLoadingCount,
    refetch: refetchCount,
  } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const response = await apiService.get<{ success: boolean; data: number }>('/affiliates?action=notifications&subaction=unread-count');
      return { count: response.data.data };
    },
    enabled,
    refetchInterval: pollingInterval,
    staleTime: 25000,
  });

  // Mutation: Marcar como lida
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await apiService.put<{ success: boolean; message: string }>(`/affiliates?action=notifications&subaction=mark-read&id=${notificationId}`, {});
      return response.data;
    },
    onSuccess: () => {
      // Invalidar cache para atualizar lista e contador
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  // Mutation: Marcar todas como lidas
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await apiService.put<{ success: boolean; message: string }>('/affiliates?action=notifications&subaction=mark-all-read', {});
      return response.data;
    },
    onSuccess: () => {
      // Invalidar cache para atualizar lista e contador
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  return {
    // Dados
    notifications: notificationsData?.notifications || [],
    unreadCount: unreadCountData?.count || 0,
    total: notificationsData?.total || 0,

    // Estados de loading
    isLoading: isLoadingNotifications || isLoadingCount,
    isLoadingNotifications,
    isLoadingCount,

    // Erros
    error: notificationsError,

    // Ações
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    refetch: () => {
      refetchNotifications();
      refetchCount();
    },

    // Estados das mutations
    isMarkingAsRead: markAsReadMutation.isPending,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
  };
}

// Hook para página completa de notificações (com paginação)
export function useNotificationsPage(page: number = 1, limit: number = 20) {
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['notifications', 'page', page, limit],
    queryFn: async () => {
      const response = await apiService.get<{ success: boolean; data: NotificationLog[] }>(`/affiliates?action=notifications&subaction=list&limit=${limit}`);
      return { notifications: response.data.data, total: response.data.data.length, page, limit };
    },
    staleTime: 60000, // 1 minuto
  });

  // Mutation: Marcar como lida
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await apiService.put<{ success: boolean; message: string }>(`/affiliates?action=notifications&subaction=mark-read&id=${notificationId}`, {});
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  // Mutation: Marcar todas como lidas
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await apiService.put<{ success: boolean; message: string }>('/affiliates?action=notifications&subaction=mark-all-read', {});
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  return {
    notifications: data?.notifications || [],
    total: data?.total || 0,
    page: data?.page || 1,
    limit: data?.limit || 20,
    isLoading,
    error,
    refetch,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    isMarkingAsRead: markAsReadMutation.isPending,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
  };
}
