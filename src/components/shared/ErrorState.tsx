/**
 * ErrorState Component
 * Sprint 7: Correções Críticas
 * 
 * Componente para exibir estados de erro
 */

import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorState({ 
  title = 'Erro ao carregar dados',
  message, 
  onRetry,
  retryLabel = 'Tentar novamente'
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Alert variant="destructive" className="max-w-md">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription className="mt-2">
          {message}
        </AlertDescription>
        {onRetry && (
          <div className="mt-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onRetry}
              className="w-full"
            >
              {retryLabel}
            </Button>
          </div>
        )}
      </Alert>
    </div>
  );
}
