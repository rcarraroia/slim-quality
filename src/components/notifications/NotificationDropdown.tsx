/**
 * Componente NotificationDropdown
 * FASE 3 - Sistema de Notificações
 * Dropdown com últimas 5 notificações
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCheck, Bell } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { NotificationBell } from './NotificationBell';
import { useNotifications } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface NotificationDropdownProps {
  dashboardPath?: string; // '/dashboard/notificacoes' ou '/afiliados/dashboard/notificacoes'
}

export function NotificationDropdown({ dashboardPath = '/dashboard/notificacoes' }: NotificationDropdownProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    isMarkingAllAsRead,
  } = useNotifications();

  const handleNotificationClick = (notificationId: string, isRead: boolean) => {
    if (!isRead) {
      markAsRead(notificationId);
    }
  };

  const handleMarkAllAsRead = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    markAllAsRead();
  };

  const handleViewAll = () => {
    navigate(dashboardPath);
  };

  // Função para obter ícone baseado no tipo
  const getNotificationIcon = (type: string) => {
    // Todos usam Bell por enquanto, mas pode ser expandido
    return <Bell className="h-4 w-4 text-primary" />;
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <NotificationBell unreadCount={unreadCount} isOpen={open} />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[380px]">
        {/* Header */}
        <div className="flex items-center justify-between px-2 py-2">
          <DropdownMenuLabel className="p-0">Notificações</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={handleMarkAllAsRead}
              disabled={isMarkingAllAsRead}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Marcar todas como lidas
            </Button>
          )}
        </div>

        <DropdownMenuSeparator />

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-2 p-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 p-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <Bell className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              Nenhuma notificação
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Você está em dia!
            </p>
          </div>
        )}

        {/* Notifications List */}
        {!isLoading && notifications.length > 0 && (
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.map((notification) => {
              const isRead = notification.read_at !== null;
              
              return (
                <DropdownMenuItem
                  key={notification.id}
                  className={cn(
                    "flex gap-3 p-3 cursor-pointer transition-colors duration-200",
                    !isRead && "bg-primary/5"
                  )}
                  onClick={() => handleNotificationClick(notification.id, isRead)}
                >
                  {/* Icon */}
                  <div className={cn(
                    "flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center",
                    isRead ? "bg-muted" : "bg-primary/10"
                  )}>
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm leading-tight mb-1",
                      isRead ? "text-muted-foreground" : "text-foreground font-semibold"
                    )}>
                      {notification.title}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </p>
                  </div>

                  {/* Unread Indicator */}
                  {!isRead && (
                    <div className="flex-shrink-0">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    </div>
                  )}
                </DropdownMenuItem>
              );
            })}
          </div>
        )}

        {/* Footer */}
        {!isLoading && notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button
                variant="ghost"
                className="w-full justify-center text-sm"
                onClick={handleViewAll}
              >
                Ver todas as notificações
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
