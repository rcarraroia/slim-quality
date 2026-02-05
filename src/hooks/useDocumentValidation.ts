/**
 * useDocumentValidation Hook
 * Sistema de Validação por CPF/CNPJ para Afiliados
 * 
 * Hook personalizado para gerenciar validação de documentos
 * com debounce, cache e estados de loading.
 * 
 * @example
 * ```tsx
 * const { validate, result, isValidating, clearValidation } = useDocumentValidation();
 * 
 * const handleDocumentChange = (value: string) => {
 *   validate(value);
 * };
 * ```
 */

import { useState, useCallback, useRef } from 'react';

export interface DocumentValidationResult {
  isValid: boolean;
  document: string;
  type: 'CPF' | 'CNPJ' | 'INVALID';
  errors: string[];
  isDuplicate: boolean;
  validationId?: string;
}

export interface UseDocumentValidationOptions {
  debounceMs?: number;
  enableCache?: boolean;
  onValidation?: (result: DocumentValidationResult | null) => void;
}

export interface UseDocumentValidationReturn {
  validate: (document: string) => void;
  result: DocumentValidationResult | null;
  isValidating: boolean;
  error: string | null;
  clearValidation: () => void;
  clearCache: () => void;
}

/**
 * Cache simples para resultados de validação
 */
const validationCache = new Map<string, DocumentValidationResult>();

/**
 * Valida documento via API
 */
const validateDocumentAPI = async (document: string): Promise<DocumentValidationResult> => {
  const response = await fetch('/api/affiliates/validate-document', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ document }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Erro na validação do documento');
  }

  const result = await response.json();
  return result.data;
};

export const useDocumentValidation = (
  options: UseDocumentValidationOptions = {}
): UseDocumentValidationReturn => {
  const {
    debounceMs = 500,
    enableCache = true,
    onValidation
  } = options;

  const [result, setResult] = useState<DocumentValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const debounceRef = useRef<NodeJS.Timeout>();
  const abortControllerRef = useRef<AbortController>();

  const clearValidation = useCallback(() => {
    setResult(null);
    setError(null);
    setIsValidating(false);
    
    // Cancelar validação em andamento
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Limpar debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
  }, []);

  const clearCache = useCallback(() => {
    validationCache.clear();
  }, []);

  const performValidation = useCallback(async (document: string) => {
    // Cancelar validação anterior
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Verificar cache primeiro
    if (enableCache && validationCache.has(document)) {
      const cachedResult = validationCache.get(document)!;
      setResult(cachedResult);
      setError(null);
      onValidation?.(cachedResult);
      return;
    }

    setIsValidating(true);
    setError(null);
    
    // Criar novo AbortController
    abortControllerRef.current = new AbortController();

    try {
      const validationResult = await validateDocumentAPI(document);
      
      // Verificar se não foi cancelado
      if (!abortControllerRef.current.signal.aborted) {
        setResult(validationResult);
        setError(null);
        
        // Salvar no cache
        if (enableCache) {
          validationCache.set(document, validationResult);
        }
        
        onValidation?.(validationResult);
      }
    } catch (err) {
      if (!abortControllerRef.current.signal.aborted) {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido na validação';
        setError(errorMessage);
        setResult(null);
        onValidation?.(null);
      }
    } finally {
      if (!abortControllerRef.current.signal.aborted) {
        setIsValidating(false);
      }
    }
  }, [enableCache, onValidation]);

  const validate = useCallback((document: string) => {
    // Limpar debounce anterior
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Limpar resultado se documento vazio
    if (!document.trim()) {
      clearValidation();
      return;
    }

    // Verificar se tem pelo menos 11 dígitos (CPF mínimo)
    const numbers = document.replace(/\D/g, '');
    if (numbers.length < 11) {
      setResult(null);
      setError(null);
      onValidation?.(null);
      return;
    }

    // Aplicar debounce
    debounceRef.current = setTimeout(() => {
      performValidation(document);
    }, debounceMs);
  }, [debounceMs, performValidation, clearValidation, onValidation]);

  return {
    validate,
    result,
    isValidating,
    error,
    clearValidation,
    clearCache
  };
};