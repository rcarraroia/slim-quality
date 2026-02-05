/**
 * AsaasValidationIndicator Component
 * Sistema de Validação por CPF/CNPJ para Afiliados
 * 
 * Componente para exibir status de validação assíncrona com Asaas
 * Mostra progresso, resultados e permite ações do usuário
 * 
 * @example
 * ```tsx
 * <AsaasValidationIndicator
 *   document="123.456.789-01"
 *   documentType="CPF"
 *   onValidationStart={(document, type) => console.log('Started')}
 * />
 * ```
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  RefreshCw,
  X,
  Shield,
  Loader2
} from "lucide-react";
import { useAsaasValidation, AsaasValidationStatus } from "@/hooks/useAsaasValidation";

export interface AsaasValidationIndicatorProps {
  document?: string;
  documentType?: 'CPF' | 'CNPJ';
  onValidationStart?: (document: string, type: 'CPF' | 'CNPJ') => void;
  onValidationComplete?: (result: any) => void;
  className?: string;
  showManualTrigger?: boolean;
  autoStart?: boolean;
}

const getStatusIcon = (status: AsaasValidationStatus) => {
  switch (status) {
    case 'validating':
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    case 'completed':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'timeout':
      return <Clock className="h-4 w-4 text-orange-500" />;
    default:
      return <Shield className="h-4 w-4 text-gray-400" />;
  }
};

const getStatusColor = (status: AsaasValidationStatus) => {
  switch (status) {
    case 'validating':
      return 'bg-blue-50 border-blue-200';
    case 'completed':
      return 'bg-green-50 border-green-200';
    case 'failed':
      return 'bg-red-50 border-red-200';
    case 'timeout':
      return 'bg-orange-50 border-orange-200';
    default:
      return 'bg-gray-50 border-gray-200';
  }
};

const getStatusMessage = (status: AsaasValidationStatus, progress: any, result: any, error: string | null) => {
  switch (status) {
    case 'validating':
      return progress?.message || 'Validando com Asaas...';
    case 'completed':
      if (result?.isValid && result?.titularityConfirmed) {
        return 'Documento validado e titularidade confirmada';
      } else if (result?.isValid) {
        return 'Documento válido, titularidade pendente';
      } else {
        return 'Documento não validado pelo Asaas';
      }
    case 'failed':
      return error || 'Erro na validação Asaas';
    case 'timeout':
      return 'Validação expirou. Tente novamente.';
    default:
      return 'Validação Asaas disponível';
  }
};

export const AsaasValidationIndicator = React.forwardRef<
  HTMLDivElement,
  AsaasValidationIndicatorProps
>(({
  document,
  documentType,
  onValidationStart,
  onValidationComplete,
  className,
  showManualTrigger = true,
  autoStart = false,
  ...props
}, ref) => {
  const {
    validateWithAsaas,
    status,
    result,
    progress,
    error,
    cancel,
    retry
  } = useAsaasValidation({
    autoNotify: false, // Controlamos as notificações aqui
    onResult: onValidationComplete
  });

  // Auto-start quando documento estiver completo
  React.useEffect(() => {
    if (autoStart && document && documentType && status === 'idle') {
      // Verificar se documento está completo
      const numbers = document.replace(/\D/g, '');
      const isComplete = (documentType === 'CPF' && numbers.length === 11) ||
                        (documentType === 'CNPJ' && numbers.length === 14);
      
      if (isComplete) {
        handleValidationStart();
      }
    }
  }, [document, documentType, autoStart, status]);

  const handleValidationStart = () => {
    if (!document || !documentType) return;
    
    onValidationStart?.(document, documentType);
    validateWithAsaas(document, documentType);
  };

  const canStartValidation = document && documentType && status === 'idle';
  const isValidating = status === 'validating';
  const canRetry = status === 'failed' || status === 'timeout';

  if (status === 'idle' && !showManualTrigger) {
    return null;
  }

  return (
    <div
      ref={ref}
      className={cn(
        "rounded-lg border p-4 transition-all duration-200",
        getStatusColor(status),
        className
      )}
      {...props}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {getStatusIcon(status)}
          <span className="text-sm font-medium">
            Validação Asaas
          </span>
          
          {/* Status Badge */}
          {status !== 'idle' && (
            <Badge 
              variant={status === 'completed' ? 'default' : 
                      status === 'failed' ? 'destructive' : 
                      status === 'timeout' ? 'secondary' : 'outline'}
              className="text-xs"
            >
              {status === 'validating' ? 'Validando' :
               status === 'completed' ? 'Concluído' :
               status === 'failed' ? 'Falhou' :
               status === 'timeout' ? 'Expirou' : 'Idle'}
            </Badge>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-1">
          {canRetry && (
            <Button
              size="sm"
              variant="ghost"
              onClick={retry}
              className="h-6 w-6 p-0"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          )}
          
          {isValidating && (
            <Button
              size="sm"
              variant="ghost"
              onClick={cancel}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {isValidating && progress && (
        <div className="mb-3">
          <Progress 
            value={progress.percentage} 
            className="h-2"
          />
        </div>
      )}

      {/* Status Message */}
      <p className="text-sm text-muted-foreground mb-3">
        {getStatusMessage(status, progress, result, error)}
      </p>

      {/* Result Details */}
      {result && status === 'completed' && (
        <div className="space-y-2 mb-3">
          {result.details?.holderName && (
            <div className="text-xs">
              <span className="font-medium">Titular:</span> {result.details.holderName}
            </div>
          )}
          
          {result.details?.businessName && (
            <div className="text-xs">
              <span className="font-medium">Empresa:</span> {result.details.businessName}
            </div>
          )}
          
          {result.details?.registrationStatus && (
            <div className="text-xs">
              <span className="font-medium">Status:</span> {result.details.registrationStatus}
            </div>
          )}
        </div>
      )}

      {/* Error Details */}
      {error && status === 'failed' && (
        <div className="text-xs text-red-600 mb-3">
          {error}
        </div>
      )}

      {/* Action Button */}
      {showManualTrigger && (
        <div className="flex gap-2">
          {canStartValidation && (
            <Button
              size="sm"
              onClick={handleValidationStart}
              className="flex-1"
            >
              <Shield className="h-3 w-3 mr-1" />
              Validar com Asaas
            </Button>
          )}
          
          {canRetry && (
            <Button
              size="sm"
              variant="outline"
              onClick={retry}
              className="flex-1"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Tentar Novamente
            </Button>
          )}
        </div>
      )}

      {/* Info */}
      {status === 'idle' && (
        <div className="text-xs text-muted-foreground mt-2">
          A validação Asaas confirma a titularidade do documento junto à Receita Federal
        </div>
      )}
    </div>
  );
});

AsaasValidationIndicator.displayName = "AsaasValidationIndicator";

export { AsaasValidationIndicator };