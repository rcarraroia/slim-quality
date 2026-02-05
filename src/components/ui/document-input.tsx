/**
 * DocumentInput Component
 * Sistema de Validação por CPF/CNPJ para Afiliados
 * 
 * Componente de input com suporte dual para CPF e CNPJ:
 * - Detecção automática de tipo ao digitar
 * - Máscara dinâmica (CPF: XXX.XXX.XXX-XX | CNPJ: XX.XXX.XXX/XXXX-XX)
 * - Validação em tempo real por tipo
 * - Mensagens de erro específicas por tipo
 * 
 * @example
 * ```tsx
 * <DocumentInput
 *   value={document}
 *   onChange={setDocument}
 *   onValidation={(result) => console.log(result)}
 * />
 * ```
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { AsaasValidationIndicator } from "@/components/ui/asaas-validation-indicator";

export interface DocumentValidationResult {
  isValid: boolean;
  document: string;
  type: 'CPF' | 'CNPJ' | 'INVALID';
  errors: string[];
  isDuplicate: boolean;
}

export interface DocumentInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onValidation?: (result: DocumentValidationResult | null) => void;
  onAsaasValidation?: (result: any) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  label?: string;
  showValidationIcon?: boolean;
  validateOnChange?: boolean;
  debounceMs?: number;
  showAsaasValidation?: boolean;
  autoStartAsaasValidation?: boolean;
}

/**
 * Detecta o tipo de documento baseado no comprimento
 */
const detectDocumentType = (value: string): 'CPF' | 'CNPJ' | 'INVALID' => {
  const numbers = value.replace(/\D/g, '');
  
  if (numbers.length <= 11) return 'CPF';
  if (numbers.length <= 14) return 'CNPJ';
  return 'INVALID';
};

/**
 * Aplica máscara de CPF: XXX.XXX.XXX-XX
 */
const applyCPFMask = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
  if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
};

/**
 * Aplica máscara de CNPJ: XX.XXX.XXX/XXXX-XX
 */
const applyCNPJMask = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 5) return `${numbers.slice(0, 2)}.${numbers.slice(2)}`;
  if (numbers.length <= 8) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`;
  if (numbers.length <= 12) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`;
  return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12, 14)}`;
};

/**
 * Aplica máscara dinâmica baseada no tipo detectado
 */
const applyDocumentMask = (value: string): string => {
  const type = detectDocumentType(value);
  
  switch (type) {
    case 'CPF':
      return applyCPFMask(value);
    case 'CNPJ':
      return applyCNPJMask(value);
    default:
      return value.replace(/\D/g, '');
  }
};

/**
 * Valida documento via API
 */
const validateDocument = async (document: string): Promise<DocumentValidationResult | null> => {
  try {
    const response = await fetch('/api/affiliates/validate-document', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ document }),
    });

    if (!response.ok) {
      throw new Error('Erro na validação');
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Erro ao validar documento:', error);
    return null;
  }
};

/**
 * Hook para debounce
 */
const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export const DocumentInput = React.forwardRef<HTMLInputElement, DocumentInputProps>(
  ({
    value = '',
    onChange,
    onValidation,
    onAsaasValidation,
    placeholder = "Digite seu CPF ou CNPJ",
    disabled = false,
    className,
    label = "CPF ou CNPJ",
    showValidationIcon = true,
    validateOnChange = true,
    debounceMs = 500,
    showAsaasValidation = false,
    autoStartAsaasValidation = false,
    ...props
  }, ref) => {
    const [internalValue, setInternalValue] = React.useState(value);
    const [validationResult, setValidationResult] = React.useState<DocumentValidationResult | null>(null);
    const [isValidating, setIsValidating] = React.useState(false);
    
    // Debounce do valor para validação
    const debouncedValue = useDebounce(internalValue, debounceMs);
    
    // Sincronizar valor interno com prop externa
    React.useEffect(() => {
      setInternalValue(value);
    }, [value]);

    // Validação automática quando valor muda (com debounce)
    React.useEffect(() => {
      if (!validateOnChange || !debouncedValue.trim()) {
        setValidationResult(null);
        onValidation?.(null);
        return;
      }

      const numbers = debouncedValue.replace(/\D/g, '');
      
      // Só validar se tiver pelo menos 11 dígitos (CPF completo)
      if (numbers.length >= 11) {
        setIsValidating(true);
        
        validateDocument(debouncedValue)
          .then((result) => {
            setValidationResult(result);
            onValidation?.(result);
          })
          .finally(() => {
            setIsValidating(false);
          });
      } else {
        setValidationResult(null);
        onValidation?.(null);
      }
    }, [debouncedValue, validateOnChange, onValidation]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      const maskedValue = applyDocumentMask(rawValue);
      
      // Limitar tamanho máximo (CNPJ formatado = 18 caracteres)
      if (maskedValue.length <= 18) {
        setInternalValue(maskedValue);
        onChange?.(maskedValue);
      }
    };

    const getValidationIcon = () => {
      if (!showValidationIcon) return null;
      
      if (isValidating) {
        return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
      }
      
      if (validationResult) {
        if (validationResult.isValid && !validationResult.isDuplicate) {
          return <CheckCircle className="h-4 w-4 text-green-500" />;
        } else {
          return <XCircle className="h-4 w-4 text-red-500" />;
        }
      }
      
      return null;
    };

    const getValidationMessage = () => {
      if (!validationResult) return null;
      
      if (validationResult.isValid && !validationResult.isDuplicate) {
        return (
          <p className="text-sm text-green-600">
            {validationResult.type} válido
          </p>
        );
      }
      
      if (validationResult.errors.length > 0) {
        return (
          <p className="text-sm text-red-600">
            {validationResult.errors[0]}
          </p>
        );
      }
      
      return null;
    };

    const getPlaceholderByType = () => {
      const type = detectDocumentType(internalValue);
      
      switch (type) {
        case 'CPF':
          return 'XXX.XXX.XXX-XX';
        case 'CNPJ':
          return 'XX.XXX.XXX/XXXX-XX';
        default:
          return placeholder;
      }
    };

    return (
      <div className="space-y-2">
        {label && (
          <Label htmlFor="document-input">
            {label}
          </Label>
        )}
        
        <div className="relative">
          <Input
            id="document-input"
            ref={ref}
            type="text"
            value={internalValue}
            onChange={handleInputChange}
            placeholder={getPlaceholderByType()}
            disabled={disabled}
            className={cn(
              "pr-10", // Espaço para ícone de validação
              validationResult?.isValid && !validationResult.isDuplicate && "border-green-500",
              validationResult && (!validationResult.isValid || validationResult.isDuplicate) && "border-red-500",
              className
            )}
            {...props}
          />
          
          {/* Ícone de validação */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {getValidationIcon()}
          </div>
        </div>
        
        {/* Mensagem de validação */}
        {getValidationMessage()}
        
        {/* Informação sobre o tipo detectado */}
        {internalValue && (
          <p className="text-xs text-muted-foreground">
            Tipo detectado: {detectDocumentType(internalValue)}
          </p>
        )}

        {/* Validação Asaas */}
        {showAsaasValidation && validationResult?.isValid && !validationResult.isDuplicate && (
          <AsaasValidationIndicator
            document={internalValue}
            documentType={validationResult.type}
            onValidationComplete={onAsaasValidation}
            autoStart={autoStartAsaasValidation}
            className="mt-3"
          />
        )}
      </div>
    );
  }
);

DocumentInput.displayName = "DocumentInput";

export { DocumentInput };