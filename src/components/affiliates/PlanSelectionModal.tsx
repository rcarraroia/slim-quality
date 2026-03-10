import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check } from "lucide-react";
import { useState } from "react";

interface PlanSelectionModalProps {
  open: boolean;
  onClose: () => void;
  onPlanSelected: (wantsSubscription: boolean) => void;
}

export function PlanSelectionModal({ open, onClose, onPlanSelected }: PlanSelectionModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'premium' | null>(null);

  const handleContinue = () => {
    if (selectedPlan) {
      onPlanSelected(selectedPlan === 'premium');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Escolha Seu Plano de Afiliado</DialogTitle>
        </DialogHeader>
        
        <div className="grid md:grid-cols-2 gap-4 py-4">
          {/* Plano Básico */}
          <Card 
            className={`cursor-pointer transition-colors ${
              selectedPlan === 'basic' ? 'border-primary' : ''
            }`}
            onClick={() => setSelectedPlan('basic')}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg">Plano Básico</h3>
                  <p className="text-2xl font-bold text-primary mt-2">R$ 97,00</p>
                  <p className="text-sm text-muted-foreground">Pagamento único</p>
                </div>
                {selectedPlan === 'basic' && (
                  <Check className="h-6 w-6 text-primary" />
                )}
              </div>
              
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-600 mt-0.5" />
                  <span>Ganhe comissões indicando</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-600 mt-0.5" />
                  <span>Link exclusivo de indicação</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-600 mt-0.5" />
                  <span>Dashboard de afiliado</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Plano Premium */}
          <Card 
            className={`cursor-pointer transition-colors ${
              selectedPlan === 'premium' ? 'border-primary' : ''
            }`}
            onClick={() => setSelectedPlan('premium')}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg">Plano Premium</h3>
                  <p className="text-2xl font-bold text-primary mt-2">R$ 97,00</p>
                  <p className="text-sm text-muted-foreground">+ R$ 97,00/mês</p>
                </div>
                {selectedPlan === 'premium' && (
                  <Check className="h-6 w-6 text-primary" />
                )}
              </div>
              
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-600 mt-0.5" />
                  <span>Tudo do Plano Básico +</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-600 mt-0.5" />
                  <span>Vitrine pública da sua loja</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-600 mt-0.5" />
                  <span>Agente IA 24/7</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-600 mt-0.5" />
                  <span>Link personalizado</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleContinue}
            disabled={!selectedPlan}
          >
            Continuar para Pagamento
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
