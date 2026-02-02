/**
 * Seletor de Método de Pagamento - PIX e Cartão de Crédito
 * Inclui formulário de checkout transparente para cartão
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard, Smartphone, Clock, Zap, Lock } from 'lucide-react';

export interface CreditCardData {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
}

export interface PaymentMethod {
  type: 'pix' | 'credit_card';
  installments?: number;
  creditCard?: CreditCardData;
}

interface PaymentMethodSelectorProps {
  amount: number; // Valor em centavos
  onSelect: (method: PaymentMethod) => void;
  selected?: PaymentMethod;
  className?: string;
  maxInstallments?: number; // ✅ NOVO: Limitar parcelas (ex: 1 para assinaturas)
}

export default function PaymentMethodSelector({
  amount,
  onSelect,
  selected,
  className,
  maxInstallments = 12 // Default 12x
}: PaymentMethodSelectorProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod['type']>(selected?.type || 'pix');
  const [selectedInstallments, setSelectedInstallments] = useState<number>(selected?.installments || 1);
  const [creditCardData, setCreditCardData] = useState<CreditCardData>({
    holderName: '',
    number: '',
    expiryMonth: '',
    expiryYear: '',
    ccv: ''
  });

  const amountInReais = amount / 100;

  // Calcular parcelas (sem juros até o limite definido)
  const installmentOptions = Array.from({ length: Math.min(12, maxInstallments) }, (_, i) => {
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
      onSelect({
        type: 'credit_card',
        installments: selectedInstallments,
        creditCard: creditCardData.number ? creditCardData : undefined
      });
    }
  };

  const handleInstallmentSelect = (installments: number) => {
    setSelectedInstallments(installments);
    onSelect({
      type: 'credit_card',
      installments,
      creditCard: creditCardData.number ? creditCardData : undefined
    });
  };

  const handleCreditCardChange = (field: keyof CreditCardData, value: string) => {
    let formattedValue = value;

    // Formatação do número do cartão (adiciona espaços a cada 4 dígitos)
    if (field === 'number') {
      formattedValue = value.replace(/\D/g, '').slice(0, 16);
    }

    // Formatação do mês (apenas 2 dígitos)
    if (field === 'expiryMonth') {
      formattedValue = value.replace(/\D/g, '').slice(0, 2);
      if (parseInt(formattedValue) > 12) formattedValue = '12';
    }

    // Formatação do ano (apenas 4 dígitos)
    if (field === 'expiryYear') {
      formattedValue = value.replace(/\D/g, '').slice(0, 4);
    }

    // Formatação do CVV (apenas 3-4 dígitos)
    if (field === 'ccv') {
      formattedValue = value.replace(/\D/g, '').slice(0, 4);
    }

    const newCardData = { ...creditCardData, [field]: formattedValue };
    setCreditCardData(newCardData);

    // Atualizar seleção com dados do cartão
    onSelect({
      type: 'credit_card',
      installments: selectedInstallments,
      creditCard: newCardData.number ? newCardData : undefined
    });
  };

  // Formatar número do cartão para exibição
  const formatCardNumber = (number: string) => {
    return number.replace(/(\d{4})/g, '$1 ').trim();
  };

  return (
    <div className={className}>
      <div className="space-y-4">
        <h4 className="font-semibold text-lg">Escolha a forma de pagamento:</h4>

        {/* Opção PIX */}
        <Card
          className={`cursor-pointer transition-all ${selectedMethod === 'pix'
              ? 'ring-2 ring-primary border-primary bg-primary/5'
              : 'hover:border-primary/50'
            }`}
          onClick={() => handleMethodSelect('pix')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${selectedMethod === 'pix' ? 'bg-primary text-white' : 'bg-muted'
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
          className={`cursor-pointer transition-all ${selectedMethod === 'credit_card'
              ? 'ring-2 ring-primary border-primary bg-primary/5'
              : 'hover:border-primary/50'
            }`}
          onClick={() => handleMethodSelect('credit_card')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${selectedMethod === 'credit_card' ? 'bg-primary text-white' : 'bg-muted'
                  }`}>
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    Cartão de Crédito
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      <Clock className="h-3 w-3 mr-1" />
                      {maxInstallments === 1 ? 'À vista' : `Até ${maxInstallments}x`}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Parcelamento sem juros • Todas as bandeiras
                  </p>
                </div>
              </div>
            </div>

            {/* Formulário do Cartão e Parcelamento */}
            {selectedMethod === 'credit_card' && (
              <div className="space-y-4 border-t pt-4" onClick={(e) => e.stopPropagation()}>
                {/* Formulário do Cartão */}
                <div className="space-y-3 bg-slate-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Lock className="h-4 w-4" />
                    <span>Dados do cartão (ambiente seguro)</span>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cardHolder" className="text-sm">Nome no cartão</Label>
                    <Input
                      id="cardHolder"
                      placeholder="Como está impresso no cartão"
                      value={creditCardData.holderName}
                      onChange={(e) => handleCreditCardChange('holderName', e.target.value.toUpperCase())}
                      className="bg-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cardNumber" className="text-sm">Número do cartão</Label>
                    <Input
                      id="cardNumber"
                      placeholder="0000 0000 0000 0000"
                      value={formatCardNumber(creditCardData.number)}
                      onChange={(e) => handleCreditCardChange('number', e.target.value)}
                      maxLength={19}
                      className="bg-white font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-2">
                      <Label htmlFor="expiryMonth" className="text-sm">Mês</Label>
                      <Input
                        id="expiryMonth"
                        placeholder="MM"
                        value={creditCardData.expiryMonth}
                        onChange={(e) => handleCreditCardChange('expiryMonth', e.target.value)}
                        maxLength={2}
                        className="bg-white text-center"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expiryYear" className="text-sm">Ano</Label>
                      <Input
                        id="expiryYear"
                        placeholder="AAAA"
                        value={creditCardData.expiryYear}
                        onChange={(e) => handleCreditCardChange('expiryYear', e.target.value)}
                        maxLength={4}
                        className="bg-white text-center"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ccv" className="text-sm">CVV</Label>
                      <Input
                        id="ccv"
                        placeholder="123"
                        value={creditCardData.ccv}
                        onChange={(e) => handleCreditCardChange('ccv', e.target.value)}
                        maxLength={4}
                        type="password"
                        className="bg-white text-center"
                      />
                    </div>
                  </div>
                </div>

                {/* Opções de Parcelamento */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
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