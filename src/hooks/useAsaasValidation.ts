/**
 * useAsaasValidation Hook
 * Sistema de Validação por CPF/CNPJ para Afiliados
 * 
 * Hook para gerenciar validação assíncrona com Asaas
 * Simula processo de validação de titularidade de documento
 * 
 * @example
 * ```tsx
 * const { validateWithAsaas, status, result, progress } = useAsaasValidation();
 * 
 * const handleAsaasValidation = (document: string) => {
 *   validateWithAsaas(document);
 * };
 * ```
 */

import { useState, useCallback, useRef } from 'react';
import { toast } from '@/components/ui/sonner';

export type AsaasValidationStatus = 
  | 'idle' 
  | 'validating' 
  | 'completed' 
  | 'failed' 
  | 'timeout';

export interface AsaasValidationResult {
  isValid: boolean;
  document: string;
  type: 'CPF' | 'CNPJ';
  titularityConfirmed: boolean;
  asaasJobId: string;
  validatedAt: string;
  details?: {
    holderName?: string;
    businessName?: string;
    registrationStatus?: string;
  };
  errors?: string[];
}

export interface AsaasValidationProgress {
  step: 'initiating' | 'processing' | 'finalizing';
  message: string;
  percentage: number;
}

export interface UseAsaasValidationOptions {
  autoNotify?: boolean;
  timeoutMs?: number;
  onStatusChange?: (status: AsaasValidationStatus) => void;
  onResult?: (result: AsaasValidationResult | null) => void;
}

export interface UseAsaasValidationReturn {
  validateWithAsaas: (document: string, type: 'CPF' | 'CNPJ') => void;
  status: AsaasValidationStatus;
  result: AsaasValidationResult | null;
  progress: AsaasValidationProgress | null;
  error: string | null;
  cancel: () => void;
  retry: () => void;
}

/**
 * Simula validação com Asaas (será substituído por integração real)
 */
const simulateAsaasValidation = async (
  document: string, 
  type: 'CPF' | 'CNPJ',
  onProgress: (progress: AsaasValidationProgress) => void
): Promise<AsaasValidationResult> => {
  const jobId = `asaas_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Simular progresso
  onProgress({
    step: 'initiating',
    message: 'Iniciando validação com Asaas...',
    percentage: 10
  });
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  onProgress({
    step: 'processing',
    message: 'Validando titularidade do documento...',
    percentage: 50
  });
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  onProgress({
    step: 'finalizing',
    message: 'Finalizando validação...',
    percentage: 90
  });
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Simular resultado (80% de sucesso)
  const isValid = Math.random() > 0.2;
  const titularityConfirmed = isValid && Math.random() > 0.1;
  
  return {
    isValid,
    document,
    type,
    titularityConfirmed,
    asaasJobId: jobId,
    validatedAt: new Date().toISOString(),
    details: isValid ? {
      holderName: type === 'CPF' ? 'João Silva Santos' : undefined,
      businessName: type === 'CNPJ' ? 'Empresa Exemplo LTDA' : undefined,
      registrationStatus: 'ATIVO'
    } : undefined,
    errors: !isValid ? ['Documento não encontrado na base da Receita Federal'] : undefined
  };
};

export const useAsaasValidation = (
  options: UseAsaasValidationOptions = {}
): UseAsaasValidationReturn => {
  const {
    autoNotify = true,
    timeoutMs = 30000, // 30 segundos
    onStatusChange,
    onResult
  } = options;

  const [status, setStatus] = useState<AsaasValidationStatus>('idle');
  const [result, setResult] = useState<AsaasValidationResult | null>(null);
  const [progress, setProgress] = useState<AsaasValidationProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const abortControllerRef = useRef<AbortController>();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastDocumentRef = useRef<{ document: string; type: 'CPF' | 'CNPJ' } | null>(null);

  const updateStatus = useCallback((newStatus: AsaasValidationStatus) => {
    setStatus(newStatus);
    onStatusChange?.(newStatus);
  }, [onStatusChange]);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    updateStatus('idle');
    setProgress(null);
    setError(null);
    
    if (autoNotify) {
      toast.info('Validação Asaas cancelada');
    }
  }, [updateStatus, autoNotify]);

  const retry = useCallback(() => {
    if (lastDocumentRef.current) {
      validateWithAsaas(lastDocumentRef.current.document, lastDocumentRef.current.type);
    }
  }, []);

  const validateWithAsaas = useCallback(async (document: string, type: 'CPF' | 'CNPJ') => {
    // Cancelar validação anterior
    cancel();
    
    // Salvar para retry
    lastDocumentRef.current = { document, type };
    
    // Resetar estados
    setResult(null);
    setError(null);
    setProgress(null);
    updateStatus('validating');
    
    // Criar novo AbortController
    abortControllerRef.current = new AbortController();
    
    // Configurar timeout
    timeoutRef.current = setTimeout(() => {
      if (status === 'validating') {
        updateStatus('timeout');
        setError('Timeout na validação Asaas');
        
        if (autoNotify) {
          toast.error('Validação Asaas expirou', {
            description: 'A validação demorou mais que o esperado. Tente novamente.',
            action: {
              label: 'Tentar novamente',
              onClick: retry
            }
          });
        }
      }
    }, timeoutMs);

    if (autoNotify) {
      toast.loading('Validando com Asaas...', {
        description: 'Verificando titularidade do documento',
        id: 'asaas-validation'
      });
    }

    try {
      const validationResult = await simulateAsaasValidation(
        document, 
        type,
        (progressUpdate) => {
          if (!abortControllerRef.current?.signal.aborted) {
            setProgress(progressUpdate);
          }
        }
      );
      
      // Verificar se não foi cancelado
      if (!abortControllerRef.current?.signal.aborted) {
        setResult(validationResult);
        updateStatus('completed');
        setProgress(null);
        onResult?.(validationResult);
        
        if (autoNotify) {
          toast.dismiss('asaas-validation');
          
          if (validationResult.isValid && validationResult.titularityConfirmed) {
            toast.success('Validação Asaas concluída', {
              description: `${type} validado com sucesso. Titularidade confirmada.`
            });
          } else if (validationResult.isValid && !validationResult.titularityConfirmed) {
            toast.warning('Documento válido, titularidade pendente', {
              description: 'O documento é válido, mas a titularidade não pôde ser confirmada.'
            });
          } else {
            toast.error('Validação Asaas falhou', {
              description: validationResult.errors?.[0] || 'Documento não validado'
            });
          }
        }
      }
    } catch (err) {
      if (!abortControllerRef.current?.signal.aborted) {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido na validação Asaas';
        setError(errorMessage);
        updateStatus('failed');
        setProgress(null);
        onResult?.(null);
        
        if (autoNotify) {
          toast.dismiss('asaas-validation');
          toast.error('Erro na validação Asaas', {
            description: errorMessage,
            action: {
              label: 'Tentar novamente',
              onClick: retry
            }
          });
        }
      }
    } finally {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    }
  }, [updateStatus, autoNotify, onResult, timeoutMs, cancel, retry, status]);

  return {
    validateWithAsaas,
    status,
    result,
    progress,
    error,
    cancel,
    retry
  };
};