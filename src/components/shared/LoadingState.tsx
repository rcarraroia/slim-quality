/**
 * LoadingState Component
 * Sprint 7: Correções Críticas
 * 
 * Componente para exibir estados de carregamento
 */

import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface LoadingStateProps {
  type?: 'spinner' | 'skeleton';
  message?: string;
  rows?: number;
}

export function LoadingState({ 
  type = 'spinner', 
  message = 'Carregando...', 
  rows = 3 
}: LoadingStateProps) {
  if (type === 'skeleton') {
    return (
      <div className="space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
