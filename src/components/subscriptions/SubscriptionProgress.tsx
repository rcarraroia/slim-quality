/**
 * Componente de progresso para fluxo de assinatura
 * Task 14.2: Implementar indicadores de progresso durante processamento
 * 
 * Mostra feedback visual durante criação e polling de pagamento
 */

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle2, CreditCard, Smartphone, Clock } from 'lucide-react';

interface SubscriptionProgressProps {
  step: 'processing' | 'polling';
  paymentMethod: 'CREDIT_CARD' | 'PIX';
  progress?: {
    current: number;
    total: number;
  };
}

export default function SubscriptionProgress({
  step,
  paymentMethod,
  progress = { current: 0, total: 15 }
}: SubscriptionProgressProps) {
  const [dots, setDots] = useState('');

  // Animação de pontos
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // Calcular porcentagem do progresso
  const progressPercentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  // Mensagens baseadas no step e método de pagamento
  const getStepInfo = () => {
    if (step === 'processing') {
      return {
        title: 'Processando Assinatura',
        description: paymentMethod === 'PIX' 
          ? 'Criando cobrança PIX para sua assinatura...'
          : 'Processando pagamento no cartão de crédito...',
        icon: paymentMethod === 'PIX' ? Smartphone : CreditCard,
        showProgress: false
      };
    }

    if (step === 'polling') {
      return {
        title: 'Aguardando Confirmação',
        description: paymentMethod === 'PIX'
          ? 'Aguardando pagamento do PIX...'
          : 'Confirmando pagamento do cartão...',
        icon: Clock,
        showProgress: true
      };
    }

    return {
      title: 'Processando',
      description: 'Aguarde...',
      icon: Loader2,
      showProgress: false
    };
  };

  const stepInfo = getStepInfo();
  const IconComponent = stepInfo.icon;

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="text-center space-y-6">
          {/* Ícone animado */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
                <IconComponent className={`h-8 w-8 text-primary ${
                  stepInfo.icon === Loader2 ? 'animate-spin' : ''
                }`} />
              </div>
              {step === 'polling' && (
                <div className="absolute -inset-2 border-2 border-primary/20 rounded-full animate-pulse" />
              )}
            </div>
          </div>

          {/* Título e descrição */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">{stepInfo.title}{dots}</h3>
            <p className="text-sm text-muted-foreground">
              {stepInfo.description}
            </p>
          </div>

          {/* Barra de progresso para polling */}
          {stepInfo.showProgress && (
            <div className="space-y-3">
              <Progress value={progressPercentage} className="w-full" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Tentativa {progress.current} de {progress.total}</span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
            </div>
          )}

          {/* Instruções específicas por método de pagamento */}
          {step === 'polling' && (
            <div className="space-y-3">
              {paymentMethod === 'PIX' ? (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Smartphone className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="text-left">
                      <h4 className="font-medium text-blue-900 text-sm">Como pagar com PIX:</h4>
                      <ul className="text-xs text-blue-700 mt-1 space-y-1">
                        <li>• Abra seu app do banco</li>
                        <li>• Escaneie o QR Code ou copie o código</li>
                        <li>• Confirme o pagamento</li>
                        <li>• Aguarde a confirmação automática</li>
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <CreditCard className="h-5 w-5 text-green-600 mt-0.5" />
                    <div className="text-left">
                      <h4 className="font-medium text-green-900 text-sm">Processando cartão:</h4>
                      <p className="text-xs text-green-700 mt-1">
                        Estamos confirmando seu pagamento com a operadora do cartão. 
                        Isso pode levar alguns segundos.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Indicadores de etapas */}
          <div className="flex justify-center space-x-4">
            <div className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full ${
                step === 'processing' ? 'bg-primary animate-pulse' : 'bg-primary'
              }`} />
              <span className="text-xs text-muted-foreground">Criando</span>
            </div>
            
            <div className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full ${
                step === 'polling' ? 'bg-primary animate-pulse' : 
                step === 'processing' ? 'bg-muted' : 'bg-primary'
              }`} />
              <span className="text-xs text-muted-foreground">Confirmando</span>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-muted" />
              <span className="text-xs text-muted-foreground">Concluído</span>
            </div>
          </div>

          {/* Tempo estimado */}
          <div className="text-xs text-muted-foreground">
            {paymentMethod === 'PIX' ? (
              <span>⏱️ Confirmação instantânea após pagamento</span>
            ) : (
              <span>⏱️ Tempo estimado: 30-60 segundos</span>
            )}
          </div>

          {/* Aviso de não fechar a página */}
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800">
              <strong>⚠️ Não feche esta página</strong><br />
              Aguarde a confirmação do pagamento para ativar sua assinatura.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}