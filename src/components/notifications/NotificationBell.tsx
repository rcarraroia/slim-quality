/**
 * Componente NotificationBell
 * FASE 3 - Sistema de Notificações
 * Sino com contador dinâmico de notificações não lidas
 */

import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface NotificationBellProps {
  unreadCount: number;
  onClick?: () => void;
  isOpen?: boolean;
  className?: string;
}

export function NotificationBell({ 
  unreadCount, 
  onClick, 
  isOpen = false,
  className 
}: NotificationBellProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "relative transition-colors duration-200",
        isOpen && "bg-accent",
        className
      )}
      onClick={onClick}
      aria-label={`Notificações${unreadCount > 0 ? ` (${unreadCount} não lidas)` : ''}`}
    >
      <Bell className={cn(
        "h-5 w-5 transition-colors duration-200",
        unreadCount > 0 && "text-primary"
      )} />
      
      {unreadCount > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-1 -right-1 h-5 min-w-[20px] flex items-center justify-center px-1 text-xs font-semibold rounded-full animate-in fade-in zoom-in duration-200"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}
    </Button>
  );
}
