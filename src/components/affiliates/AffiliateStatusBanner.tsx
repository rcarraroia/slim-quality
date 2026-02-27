/**
 * Componente: AffiliateStatusBanner
 * 
 * Exibe banner de alerta quando afiliado não tem wallet_id configurado.
 * Orienta o usuário a configurar sua carteira digital para começar a receber comissões.
 * 
 * Feature: etapa-1-tipos-afiliados + etapa-5-monetizacao
 * Phase: 4 - Frontend Update
 * Task: 4.2
 */

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, AlertTriangle } from "lucide-react";

interface AffiliateStatusBannerProps {
  paymentStatus?: 'active' | 'overdue' | 'suspended' | 'pending';
  hasWalletId: boolean;
  onConfigureWallet?: () => void;
}

export function AffiliateStatusBanner({ 
  paymentStatus = 'pending',
  hasWalletId,
  onConfigureWallet 
}: AffiliateStatusBannerProps) {
  // Banner de inadimplência (prioridade máxima)
  if (paymentStatus === 'overdue' || paymentStatus === 'suspended') {
    return (
      <Alert variant="destructive" className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 transition-colors">
        <AlertTriangle className="h-5 w-5" />
        <AlertDescription className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <p className="font-semibold text-red-800 dark:text-red-200">
              {paymentStatus === 'overdue' ? 'Pagamento em atraso' : 'Conta suspensa'}
            </p>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
              {paymentStatus === 'overdue' 
                ? 'Regularize seu pagamento para continuar recebendo comissões e manter sua vitrine ativa.'
                : 'Sua conta foi suspensa por inadimplência. Entre em contato com o suporte.'}
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={onConfigureWallet}
            disabled={!onConfigureWallet}
            className="shrink-0 border-red-300 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-900 transition-colors"
          >
            Ver Pagamentos
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Banner de wallet não configurado
  if (!hasWalletId) {
    return (
      <Alert variant="default" className="bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800 transition-colors">
        <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
        <AlertDescription className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <p className="font-semibold text-yellow-800 dark:text-yellow-200">
              Configure sua carteira digital para começar a receber comissões
            </p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
              Você precisa configurar sua Wallet ID do Asaas para ativar o recebimento de comissões e gerar seu link de indicação.
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={onConfigureWallet}
            disabled={!onConfigureWallet}
            className="shrink-0 border-yellow-300 dark:border-yellow-700 hover:bg-yellow-100 dark:hover:bg-yellow-900 transition-colors"
          >
            Configurar Wallet
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Não renderizar nada se tudo estiver OK
  return null;
}
