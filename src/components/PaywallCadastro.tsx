import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/config/supabase';
import { Copy, CheckCircle2, Clock, QrCode, CreditCard } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PaywallCadastroProps {
  affiliateId: string;
  affiliateType: 'individual' | 'logista';
  onPaymentConfirmed: () => void;
  onCancel: () => void;
}

interface PaymentData {
  qrCode: string;
  pixCopyPaste: string;
  invoiceUrl: string;
  value: number;
  paymentId: string;
}

export default function PaywallCadastro({
  affiliateId,
  affiliateType,
  onPaymentConfirmed,
  onCancel
}: PaywallCadastroProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [billingType, setBillingType] = useState<'PIX' | 'CREDIT_CARD'>('PIX');
  const [polling, setPolling] = useState(false);
  const [timeoutProgress, setTimeoutProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(900); // 15 minutos em segundos

  // Criar cobrança ao montar componente
  useEffect(() => {
    const createPayment = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/subscriptions/create-payment?action=create-membership-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            affiliate_id: affiliateId,
            billing_type: billingType
          })
        });

        const result = await response.json();

        if (result.success) {
          setPaymentData({
            qrCode: result.qrCode,
            pixCopyPaste: result.pixCopyPaste,
            invoiceUrl: result.invoiceUrl,
            value: result.value,
            paymentId: result.paymentId
          });
          startPolling();
        } else {
          toast({
            title: 'Erro ao criar cobrança',
            description: result.error || 'Não foi possível gerar o pagamento',
            variant: 'destructive'
          });
        }
      } catch (error) {
        console.error('Erro ao criar pagamento:', error);
        toast({
          title: 'Erro',
          description: 'Falha ao criar cobrança. Tente novamente.',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    createPayment();
  }, [affiliateId, billingType, toast]);

  // Polling de status do pagamento
  const startPolling = () => {
    setPolling(true);
    const startTime = Date.now();
    const timeout = 15 * 60 * 1000; // 15 minutos

    const interval = setInterval(async () => {
      // Atualizar progress bar e tempo restante
      const elapsed = Date.now() - startTime;
      const progress = (elapsed / timeout) * 100;
      const remaining = Math.max(0, Math.floor((timeout - elapsed) / 1000));
      
      setTimeoutProgress(progress);
      setTimeRemaining(remaining);

      // Timeout atingido
      if (elapsed >= timeout) {
        clearInterval(interval);
        setPolling(false);
        toast({
          title: 'Tempo esgotado',
          description: 'O pagamento não foi confirmado. Você pode tentar novamente.',
          variant: 'destructive'
        });
        return;
      }

      // Verificar status no Supabase
      try {
        const { data, error } = await supabase
          .from('affiliate_payments')
          .select('status')
          .eq('affiliate_id', affiliateId)
          .eq('payment_type', 'membership_fee')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (error) {
          console.error('Erro ao verificar status:', error);
          return;
        }

        if (data?.status === 'paid') {
          clearInterval(interval);
          setPolling(false);
          toast({
            title: 'Pagamento confirmado!',
            description: 'Bem-vindo ao programa de afiliados',
            variant: 'default'
          });
          setTimeout(() => {
            onPaymentConfirmed();
          }, 1500);
        }
      } catch (error) {
        console.error('Erro no polling:', error);
      }
    }, 5000); // A cada 5 segundos
  };

  // Copiar código PIX
  const handleCopyPix = () => {
    if (paymentData?.pixCopyPaste) {
      navigator.clipboard.writeText(paymentData.pixCopyPaste);
      toast({
        title: 'Código copiado!',
        description: 'Cole no app do seu banco para pagar',
        variant: 'default'
      });
    }
  };

  // Formatar tempo restante
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-lg">
            <CardHeader className="text-center space-y-2">
              <CardTitle className="text-2xl">Preparando Pagamento...</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center gap-4">
                <Skeleton className="h-64 w-64 rounded-lg" />
                <Skeleton className="h-10 w-full max-w-md" />
                <Skeleton className="h-12 w-48" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Erro ao carregar
  if (!paymentData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-lg">
            <CardHeader className="text-center space-y-2">
              <CardTitle className="text-2xl text-destructive">Erro ao Gerar Pagamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-center">
              <p className="text-muted-foreground">
                Não foi possível gerar a cobrança. Por favor, tente novamente.
              </p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={onCancel}>
                  Voltar
                </Button>
                <Button onClick={() => window.location.reload()}>
                  Tentar Novamente
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader className="text-center space-y-2 pb-6">
            <div className="mx-auto h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
              <QrCode className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold">Taxa de Adesão</CardTitle>
            <p className="text-muted-foreground">
              Complete o pagamento para ativar sua conta
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Valor */}
            <div className="bg-gradient-to-r from-primary/10 to-secondary/10 border-2 border-primary/30 rounded-lg p-6 text-center">
              <p className="text-sm text-muted-foreground mb-1">Valor da Taxa</p>
              <p className="text-4xl font-bold text-primary">
                R$ {paymentData.value.toFixed(2).replace('.', ',')}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {affiliateType === 'individual' ? 'Pagamento único' : 'Taxa de adesão + mensalidade'}
              </p>
            </div>

            {/* Tabs PIX/Cartão */}
            <Tabs value={billingType} onValueChange={(value) => setBillingType(value as 'PIX' | 'CREDIT_CARD')} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="PIX" className="gap-2">
                  <QrCode className="h-4 w-4" />
                  PIX
                </TabsTrigger>
                <TabsTrigger value="CREDIT_CARD" className="gap-2">
                  <CreditCard className="h-4 w-4" />
                  Cartão
                </TabsTrigger>
              </TabsList>

              {/* Conteúdo PIX */}
              <TabsContent value="PIX" className="space-y-4 mt-6">
                {/* QR Code */}
                <div className="flex flex-col items-center gap-4">
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <img
                      src={`data:image/png;base64,${paymentData.qrCode}`}
                      alt="QR Code PIX"
                      className="w-64 h-64"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    Escaneie o QR Code com o app do seu banco
                  </p>
                </div>

                {/* Código Copia e Cola */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">Ou copie o código:</p>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-muted p-3 rounded-lg">
                      <p className="text-xs break-all font-mono">
                        {paymentData.pixCopyPaste}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleCopyPix}
                      className="shrink-0"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* Conteúdo Cartão */}
              <TabsContent value="CREDIT_CARD" className="space-y-4 mt-6">
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    Pagamento via cartão será implementado em breve
                  </p>
                  <Button variant="outline" onClick={() => setBillingType('PIX')}>
                    Voltar para PIX
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            {/* Status do Pagamento */}
            {polling && (
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4 animate-pulse" />
                    <span>Aguardando pagamento...</span>
                  </div>
                  <span className="font-mono text-muted-foreground">
                    {formatTime(timeRemaining)}
                  </span>
                </div>
                <Progress value={timeoutProgress} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">
                  Verificando automaticamente a cada 5 segundos
                </p>
              </div>
            )}

            {/* Botões */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={onCancel}
                className="flex-1"
                disabled={polling}
              >
                Cancelar
              </Button>
              <Button
                variant="default"
                onClick={() => window.open(paymentData.invoiceUrl, '_blank')}
                className="flex-1"
              >
                Ver Fatura
              </Button>
            </div>

            {/* Informação */}
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Pagamento Seguro
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Após a confirmação do pagamento, você terá acesso imediato ao painel de afiliados.
                    O processo é automático e leva apenas alguns segundos.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
