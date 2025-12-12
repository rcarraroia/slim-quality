/**
 * Seletor de Método de Pagamento - PIX e Cartão de Crédito
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Smartphone, Clock, Zap } from 'lucide-react';

export interface PaymentMethod {
  type: 'pix' | 'credit_card';
  installments?: number;
}

interface PaymentMethodSelectorProps {
  amount: number; // Valor em centavos
  onSelect: (method: PaymentMethod) => void;
  selected?: PaymentMethod;
  className?: string;
}

export default function PaymentMethodSelector({ 
  amount, 
  onSelect, 
  selected,
  className 
}: PaymentMethodSelectorProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod['type']>(selected?.type || 'pix');
  const [selectedInstallments, setSelectedInstallments] = useState<number>(selected?.installments || 1);

  const amountInReais = amount / 100;

  // Calcular parcelas (sem juros até 12x)
  const installmentOptions = Array.from({ length: 12 }, (_, i) => {
    const installments = i + 1;
    const installmentValue = amountInReais / installments;
    
    return {
      installments,
      value: installmentValue,
      label: installments === 1 
        ? `À vista - R$ ${amountInReais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        : `${installments}x de R$ ${installmentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} sem juros`
    };
  });

  const handleMethodSelect = (type: PaymentMethod['type']) => {
    setSelectedMethod(type);
    
    if (type === 'pix') {
      onSelect({ type: 'pix' });
    } else {
      onSelect({ type: 'credit_card', installments: selectedInstallments });
    }
  };

  const handleInstallmentSelect = (installments: number) => {
    setSelectedInstallments(installments);
    onSelect({ type: 'credit_card', installments });
  };

  return (
    <div className={className}>
      <div className="space-y-4">
        <h4 className="font-semibold text-lg">Escolha a forma de pagamento:</h4>
        
        {/* Opção PIX */}
        <Card 
          className={`cursor-pointer transition-all ${
            selectedMethod === 'pix' 
              ? 'ring-2 ring-primary border-primary bg-primary/5' 
              : 'hover:border-primary/50'
          }`}
          onClick={() => handleMethodSelect('pix')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  selectedMethod === 'pix' ? 'bg-primary text-white' : 'bg-muted'
                }`}>
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    PIX
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      <Zap className="h-3 w-3 mr-1" />
                      Instantâneo
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Aprovação imediata • Sem taxas
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-lg text-primary">
                  R$ {amountInReais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground">à vista</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Opção Cartão de Crédito */}
        <Card 
          className={`cursor-pointer transition-all ${
            selectedMethod === 'credit_card' 
              ? 'ring-2 ring-primary border-primary bg-primary/5' 
              : 'hover:border-primary/50'
          }`}
          onClick={() => handleMethodSelect('credit_card')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  selectedMethod === 'credit_card' ? 'bg-primary text-white' : 'bg-muted'
                }`}>
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    Cartão de Crédito
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      <Clock className="h-3 w-3 mr-1" />
                      Até 12x
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Parcelamento sem juros • Todas as bandeiras
                  </p>
                </div>
              </div>
            </div>

            {/* Opções de Parcelamento */}
            {selectedMethod === 'credit_card' && (
              <div className="space-y-2 border-t pt-3">
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Escolha o parcelamento:
                </p>
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                  {installmentOptions.map((option) => (
                    <Button
                      key={option.installments}
                      variant={selectedInstallments === option.installments ? "default" : "outline"}
                      size="sm"
                      className="justify-between h-auto py-2 px-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInstallmentSelect(option.installments);
                      }}
                    >
                      <span className="text-left">{option.label}</span>
                      {option.installments === 1 && (
                        <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800">
                          Melhor preço
                        </Badge>
                      )}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resumo da Seleção */}
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">
                {selectedMethod === 'pix' ? (
                  <>
                    <Smartphone className="inline h-4 w-4 mr-1" />
                    PIX - Pagamento à vista
                  </>
                ) : (
                  <>
                    <CreditCard className="inline h-4 w-4 mr-1" />
                    Cartão - {selectedInstallments}x de R$ {(amountInReais / selectedInstallments).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </>
                )}
              </p>
              <p className="text-sm text-muted-foreground">
                {selectedMethod === 'pix' 
                  ? 'Aprovação instantânea após o pagamento'
                  : selectedInstallments === 1 
                    ? 'Pagamento à vista no cartão'
                    : 'Parcelamento sem juros'
                }
              </p>
            </div>
            <div className="text-right">
              <div className="font-bold text-lg">
                R$ {amountInReais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}