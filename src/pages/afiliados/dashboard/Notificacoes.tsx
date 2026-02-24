/**
 * Página de Notificações Afiliados
 * FASE 4 - Sistema de Notificações
 * Lista completa de notificações do afiliado com filtros
 */

import { useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useNotificationsPage } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type FilterType = 'all' | 'unread' | 'read';

export default function NotificacoesAfiliado() {
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState<FilterType>('all');

  const {
    notifications,
    total,
    page,
    limit,
    isLoading,
    markAsRead,
    markAllAsRead,
    isMarkingAllAsRead,
  } = useNotificationsPage(currentPage, 20);

  // Filtrar notificações localmente
  const filteredNotifications = notifications.filter((notification) => {
    if (filter === 'unread') return notification.read_at === null;
    if (filter === 'read') return notification.read_at !== null;
    return true;
  });

  const unreadCount = notifications.filter((n) => n.read_at === null).length;
  const totalPages = Math.ceil(total / limit);

  const handleNotificationClick = (notificationId: string, isRead: boolean) => {
    if (!isRead) {
      markAsRead(notificationId);
    }
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  // Função para obter ícone baseado no tipo
  const getNotificationIcon = (type: string) => {
    return <Bell className="h-5 w-5 text-primary" />;
  };

  // Função para obter label do tipo
  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      commission_paid: 'Comissão Paga',
      withdrawal_processed: 'Saque Processado',
      broadcast: 'Comunicado',
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Notificações</h1>
        <p className="text-muted-foreground mt-1">
          Acompanhe suas comissões, saques e comunicados importantes
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Notificações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Não Lidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{unreadCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Lidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">
              {total - unreadCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Todas as Notificações</CardTitle>
              <CardDescription>
                {filteredNotifications.length} notificação(ões) encontrada(s)
              </CardDescription>
            </div>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={isMarkingAllAsRead}
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                Marcar todas como lidas
              </Button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mt-4">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              Todas
            </Button>
            <Button
              variant={filter === 'unread' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('unread')}
            >
              Não Lidas
              {unreadCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {unreadCount}
                </Badge>
              )}
            </Button>
            <Button
              variant={filter === 'read' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('read')}
            >
              Lidas
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {/* Loading State */}
          {isLoading && (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex gap-4 p-4 border rounded-lg">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && filteredNotifications.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {filter === 'unread' && 'Nenhuma notificação não lida'}
                {filter === 'read' && 'Nenhuma notificação lida'}
                {filter === 'all' && 'Nenhuma notificação'}
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                {filter === 'unread' && 'Você está em dia com todas as notificações!'}
                {filter === 'read' && 'Ainda não há notificações lidas.'}
                {filter === 'all' && 'Você receberá notificações sobre comissões, saques e comunicados importantes.'}
              </p>
            </div>
          )}

          {/* Notifications List */}
          {!isLoading && filteredNotifications.length > 0 && (
            <div className="space-y-3">
              {filteredNotifications.map((notification) => {
                const isRead = notification.read_at !== null;

                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "flex gap-4 p-4 border rounded-lg cursor-pointer transition-colors duration-200 hover:bg-accent",
                      !isRead && "bg-primary/5 border-primary/20"
                    )}
                    onClick={() => handleNotificationClick(notification.id, isRead)}
                  >
                    {/* Icon */}
                    <div
                      className={cn(
                        "flex-shrink-0 h-12 w-12 rounded-full flex items-center justify-center",
                        isRead ? "bg-muted" : "bg-primary/10"
                      )}
                    >
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4
                          className={cn(
                            "text-base leading-tight",
                            isRead ? "text-muted-foreground" : "text-foreground font-semibold"
                          )}
                        >
                          {notification.title}
                        </h4>
                        <Badge variant="outline" className="flex-shrink-0">
                          {getTypeLabel(notification.type)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                        {!isRead && (
                          <Badge variant="default" className="text-xs">
                            Não lida
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Unread Indicator */}
                    {!isRead && (
                      <div className="flex-shrink-0 flex items-center">
                        <div className="h-3 w-3 rounded-full bg-primary" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {!isLoading && filteredNotifications.length > 0 && totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t">
              <p className="text-sm text-muted-foreground">
                Página {page} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
