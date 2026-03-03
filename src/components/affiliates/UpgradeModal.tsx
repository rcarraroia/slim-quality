import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Store, Bot, Check, AlertCircle } from 'lucide-react';
import { useState } from 'react';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  monthlyFee: number;
}

export function UpgradeModal({ open, onOpenChange, onConfirm, monthlyFee }: UpgradeModalProps) {
  const [loading, setLoading] = useState(false);
  
  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upgrade para Plano Premium</DialogTitle>
          <DialogDescription>
            Tenha acesso à vitrine pública e agente IA
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Benefits List */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Check className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Vitrine Pública</p>
                <p className="text-sm text-muted-foreground">
                  Sua loja visível em /lojas/:seu-slug
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Check className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Agente IA (Bia)</p>
                <p className="text-sm text-muted-foreground">
                  Atendimento automatizado via WhatsApp
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Check className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Comissionamento</p>
                <p className="text-sm text-muted-foreground">
                  Mensalidade gera comissão para sua rede
                </p>
              </div>
            </div>
          </div>
          
          {/* Pricing */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-semibold">Valor da Mensalidade</p>
              <p className="text-2xl font-bold text-primary mt-1">
                R$ {(monthlyFee / 100).toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Cobrado mensalmente via Asaas
              </p>
            </AlertDescription>
          </Alert>
          
          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirm}
              className="flex-1"
              disabled={loading}
            >
              {loading ? 'Processando...' : 'Confirmar Upgrade'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
