/**
 * Componente: AffiliateStatusBanner
 * 
 * Exibe banner de alerta quando afiliado tem status financeiro pendente.
 * Orienta o usuário a configurar sua carteira digital para começar a receber comissões.
 * 
 * Feature: etapa-1-tipos-afiliados
 * Phase: 4 - Frontend Update
 * Task: 4.2
 */

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface AffiliateStatusBannerProps {
  financialStatus: 'financeiro_pendente' | 'ativo';
  onConfigureWallet?: () => void;
}

export function AffiliateStatusBanner({ 
  financialStatus, 
  onConfigureWallet 
}: AffiliateStatusBannerProps) {
  // Não renderizar nada se status for ativo
  if (financialStatus === 'ativo') {
    return null;
  }

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
