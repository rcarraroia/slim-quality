import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, XCircle } from 'lucide-react';
import { useState } from 'react';

interface CancelSubscriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
}

export function CancelSubscriptionModal({ open, onOpenChange, onConfirm }: CancelSubscriptionModalProps) {
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
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Cancelar Assinatura
          </DialogTitle>
          <DialogDescription>
            Tem certeza que deseja cancelar sua assinatura?
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Consequências */}
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-semibold mb-2">Você perderá acesso a:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Vitrine pública (/lojas/:seu-slug)</li>
                <li>Agente IA (Bia) via WhatsApp</li>
                <li>Comissionamento de mensalidades</li>
              </ul>
            </AlertDescription>
          </Alert>
          
          {/* Informação */}
          <Alert>
            <AlertDescription className="text-sm">
              <p className="font-semibold mb-1">O que acontece após o cancelamento:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Seus dados serão mantidos</li>
                <li>Você pode reativar a qualquer momento</li>
                <li>Não haverá mais cobranças mensais</li>
              </ul>
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
              Manter Assinatura
            </Button>
            <Button 
              variant="destructive"
              onClick={handleConfirm}
              className="flex-1"
              disabled={loading}
            >
              {loading ? 'Cancelando...' : 'Confirmar Cancelamento'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
