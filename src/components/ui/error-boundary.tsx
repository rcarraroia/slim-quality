/**
 * Error Boundary para capturar erros React
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
      }

      return <DefaultErrorFallback error={this.state.error} resetError={this.resetError} />;
    }

    return this.props.children;
  }
}

// Componente de fallback padrão
function DefaultErrorFallback({ error, resetError }: { error?: Error; resetError: () => void }) {
  return (
    <Card className="w-full max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Ops! Algo deu errado
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground">
          Encontramos um problema inesperado. Nossa equipe foi notificada.
        </p>
        
        {error && (
          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground">
              Detalhes técnicos
            </summary>
            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
              {error.message}
            </pre>
          </details>
        )}
        
        <div className="flex gap-2">
          <Button onClick={resetError} variant="outline" className="flex-1">
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar Novamente
          </Button>
          <Button 
            onClick={() => window.location.reload()} 
            className="flex-1"
          >
            Recarregar Página
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Hook para usar error boundary programaticamente
export function useErrorHandler() {
  return (error: Error, errorInfo?: { componentStack: string }) => {
    console.error('Error caught by useErrorHandler:', error, errorInfo);
    // Aqui você pode enviar para serviço de monitoramento
  };
}

export { ErrorBoundary, DefaultErrorFallback };