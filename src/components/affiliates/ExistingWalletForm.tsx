/**
 * ExistingWalletForm - ETAPA 2
 * 
 * Formulário para afiliados que já possuem conta no Asaas
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { validateWalletIdFormat } from '@/utils/validators';
import { asaasWalletService } from '@/services/asaas-wallet.service';
import { toast } from 'sonner';

interface ExistingWalletFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function ExistingWalletForm({ onSuccess, onCancel }: ExistingWalletFormProps) {
  const [walletId, setWalletId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handleWalletIdChange(value: string) {
    setWalletId(value.toLowerCase());
    setError('');
  }

  function validateForm(): boolean {
    if (!walletId.trim()) {
      setError('Wallet ID é obrigatório');
      return false;
    }

    if (!validateWalletIdFormat(walletId)) {
      setError('Formato de Wallet ID inválido. Use formato UUID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
      return false;
    }

    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError('');

      await asaasWalletService.configureWallet(walletId);

      toast.success('Wallet configurada com sucesso!', {
        description: 'Você agora pode gerar seu link de indicação e receber comissões.'
      });

      onSuccess();
    } catch (err: any) {
      console.error('Erro ao configurar wallet:', err);
      const errorMessage = err.message || 'Erro ao configurar wallet. Tente novamente.';
      setError(errorMessage);
      toast.error('Erro ao configurar wallet', {
        description: errorMessage
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Informe o Wallet ID da sua conta Asaas. Você pode encontrá-lo no painel do Asaas em Configurações → Dados da Conta.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label htmlFor="walletId">
          Wallet ID <span className="text-destructive">*</span>
        </Label>
        <Input
          id="walletId"
          type="text"
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          value={walletId}
          onChange={(e) => handleWalletIdChange(e.target.value)}
          disabled={loading}
          className={error ? 'border-destructive' : ''}
        />
        <p className="text-xs text-muted-foreground">
          Formato UUID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (letras minúsculas)
        </p>
        {error && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {error}
          </p>
        )}
      </div>

      <Alert className="border-blue-200 bg-blue-50">
        <CheckCircle2 className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          Após salvar, sua wallet será validada na primeira tentativa de recebimento de comissão.
        </AlertDescription>
      </Alert>

      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
          className="flex-1"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="flex-1"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            'Salvar Wallet'
          )}
        </Button>
      </div>
    </form>
  );
}
