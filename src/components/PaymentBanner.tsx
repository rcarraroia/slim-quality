import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, X, CreditCard } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PaymentBannerProps {
  paymentStatus: 'active' | 'overdue' | 'suspended';
  onClose?: () => void;
}

export default function PaymentBanner({ paymentStatus, onClose }: PaymentBannerProps) {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(true);

  // Não exibir banner se status for ativo
  if (paymentStatus === 'active' || !isVisible) {
    return null;
  }

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  const handleRegularize = () => {
    navigate('/afiliados/dashboard/pagamentos');
  };

  return (
    <Alert variant="destructive" className="mb-6 relative">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle className="font-semibold">Pagamento Pendente</AlertTitle>
      <AlertDescription className="mt-2">
        {paymentStatus === 'overdue' && (
          <p className="text-sm mb-3">
            Você possui pagamentos em atraso. Regularize sua situação para continuar aproveitando todos os benefícios do programa de afiliados.
          </p>
        )}
        {paymentStatus === 'suspended' && (
          <p className="text-sm mb-3">
            Sua conta está suspensa devido a pagamentos em atraso. Regularize sua situação para reativar sua conta e voltar a receber comissões.
          </p>
        )}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRegularize}
            className="bg-background hover:bg-background/90"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Regularizar Pagamento
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="text-destructive-foreground hover:bg-destructive/90"
          >
            Fechar
          </Button>
        </div>
      </AlertDescription>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6 text-destructive-foreground hover:bg-destructive/90"
        onClick={handleClose}
      >
        <X className="h-4 w-4" />
      </Button>
    </Alert>
  );
}
