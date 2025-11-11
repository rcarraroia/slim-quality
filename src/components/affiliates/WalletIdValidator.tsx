/**
 * Wallet ID Validator Component
 * Sprint 4: Sistema de Afiliados Multinível
 */

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { affiliateService } from '@/services/affiliate-frontend.service';
import { useDebounce } from '@/hooks/use-debounce';

interface WalletIdValidatorProps {
  value: string;
  onChange: (value: string) => void;
  onValidationChange: (isValid: boolean, walletName?: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export const WalletIdValidator = ({
  value,
  onChange,
  onValidationChange,
  label = 'Wallet ID do Asaas',
  placeholder = 'wal_1234567890123456789',
  className,
  required = true,
}: WalletIdValidatorProps) => {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    walletName?: string;
    error?: string;
  } | null>(null);

  // Debounce do valor para evitar muitas chamadas à API
  const debouncedValue = useDebounce(value, 500);

  // Validar formato básico
  const isValidFormat = (walletId: string) => {
    return /^wal_[a-zA-Z0-9]{20}$/.test(walletId);
  };

  // Validar via API
  const validateWalletId = async (walletId: string) => {
    if (!walletId || !isValidFormat(walletId)) {
      setValidationResult({
        isValid: false,
        error: 'Formato inválido. Use: wal_1234567890123456789',
      });
      onValidationChange(false);
      return;
    }

    setIsValidating(true);

    try {
      const result = await affiliateService.validateWalletId(walletId);
      
      setValidationResult({
        isValid: result.valid,
        walletName: result.name,
        error: result.error,
      });

      onValidationChange(result.valid, result.name);
    } catch (error) {
      console.error('Error validating wallet ID:', error);
      setValidationResult({
        isValid: false,
        error: 'Erro ao validar Wallet ID. Tente novamente.',
      });
      onValidationChange(false);
    } finally {
      setIsValidating(false);
    }
  };

  // Effect para validar quando o valor mudar
  useEffect(() => {
    if (debouncedValue) {
      validateWalletId(debouncedValue);
    } else {
      setValidationResult(null);
      onValidationChange(false);
    }
  }, [debouncedValue]);

  // Determinar estado visual
  const getValidationState = () => {
    if (!value) return 'default';
    if (isValidating) return 'validating';
    if (validationResult?.isValid) return 'valid';
    return 'invalid';
  };

  const validationState = getValidationState();

  return (
    <div className="space-y-2">
      <Label htmlFor="wallet-id" className="text-sm font-medium">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      
      <div className="relative">
        <Input
          id="wallet-id"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            'pr-10',
            validationState === 'valid' && 'border-green-500 focus:border-green-500',
            validationState === 'invalid' && 'border-red-500 focus:border-red-500',
            className
          )}
        />
        
        {/* Ícone de status */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {validationState === 'validating' && (
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          )}
          {validationState === 'valid' && (
            <CheckCircle className="h-4 w-4 text-green-500" />
          )}
          {validationState === 'invalid' && (
            <XCircle className="h-4 w-4 text-red-500" />
          )}
        </div>
      </div>

      {/* Mensagens de feedback */}
      {validationResult && (
        <div className="text-sm">
          {validationResult.isValid ? (
            <div className="text-green-600 flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Wallet ID válida
              {validationResult.walletName && (
                <span className="font-medium">({validationResult.walletName})</span>
              )}
            </div>
          ) : (
            <div className="text-red-600 flex items-center gap-1">
              <XCircle className="h-3 w-3" />
              {validationResult.error}
            </div>
          )}
        </div>
      )}

      {/* Dica de formato */}
      {!value && (
        <p className="text-xs text-gray-500">
          Formato: wal_ seguido de 20 caracteres alfanuméricos
        </p>
      )}
    </div>
  );
};

// Hook personalizado para debounce
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}