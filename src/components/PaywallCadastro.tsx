import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/config/supabase';
import { Loader2, CheckCircle2, XCircle, ArrowLeft, Copy, QrCode, CreditCard, Clock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface PaywallCadastroProps {
  sessionToken: string;
  affiliateType: 'individual' | 'logista';
  email: string;
  password: string;
  onPaymentConfirmed: () => void;
  onBack: () => void;
}

interface Product {
  id: string;
  name: string;
  entry_fee_cents: number;
  eligible_affiliate_type: string;
}

interface PaymentData {
  success: boolean;
  payment_id: string;
  payment_method: string;
  amount: number;
  qr_code: string | null;
  qr_code_image: string | null;
  invoice_url: string;
  external_reference: string;
}

export default function PaywallCadastro({
  sessionToken,
  affiliateType,
  email,
  password,
  onPaymentConfirmed,
  onBack
}: PaywallCadastroProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card'>('pix');
  const [polling, setPolling] = useState(false);
  const [pollingAttempts, setPollingAttempts] = useState(0);
  const [timeoutProgress, setTimeoutProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(900); // 15 minutos em segundos
  const [error, setError] = useState<string | null>(null);

  // Buscar produto de adesão
  useEffect(() => {
    async function fetchProduct() {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('category', 'adesao_afiliado')
          .eq('eligible_affiliate_type', affiliateType)
          .eq('is_active', true)
          .single();

        if (error) throw error;
        setProduct(data);
      } catch (err: any) {
        setError('Erro ao buscar produto de adesão');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchProduct();
  }, [affiliateType]);

  // Criar pagamento
  const handleCreatePayment = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        '/api/subscriptions/create-payment?action=create-affiliate-membership',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_token: sessionToken,
            payment_method: paymentMethod
          })
        }
      );

      const result = await response.json();

      if (result.success) {
        setPaymentData(result);

        // Iniciar polling após 5 segundos
        setTimeout(() => {
          startPolling();
        }, 5000);
      } else {
        setError(result.error || 'Erro ao criar pagamento');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao criar pagamento');
    } finally {
      setLoading(false);
    }
  };

  // Polling para verificar se conta foi criada
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
        setError('Tempo esgotado. Gere um novo QR code ou tente novamente.');
        return;
      }

      try {
        // Tentar autenticar com email + senha
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (data.user && !error) {
          // Conta criada! Webhook processou o pagamento
          clearInterval(interval);
          setPolling(false);
          toast({
            title: 'Pagamento confirmado!',
            description: 'Sua conta foi ativada com sucesso. Bem-vindo!',
          });
          setTimeout(() => {
            onPaymentConfirmed();
          }, 1500);
        }
      } catch (err) {
        // Conta ainda não existe, continuar polling
        console.log('Tentativa de autenticação:', pollingAttempts + 1);
      }

      setPollingAttempts(prev => prev + 1);
    }, 5000); // Polling a cada 5 segundos
  };

  // Copiar código PIX
  const handleCopyPix = () => {
    if (paymentData?.qr_code) {
      navigator.clipboard.writeText(paymentData.qr_code);
      toast({
        title: 'Código copiado!',
        description: 'Cole no app do seu banco para pagar',
      });
    }
  };

  // Formatar tempo restante
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Loading inicial
  if (loading && !product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Carregando informações...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Erro ao carregar produto
  if (error && !paymentData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Erro
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={onBack} variant="outline" className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Tela de seleção de pagamento
  if (!paymentData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-lg">
            <CardHeader className="text-center space-y-2 pb-6">
              <div className="mx-auto h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-3xl font-bold">Taxa de Adesão</CardTitle>
              <p className="text-muted-foreground">
                Complete o pagamento para ativar sua conta
              </p>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Informações do produto */}
              <div className="bg-gradient-to-r from-primary/10 to-secondary/10 border-2 border-primary/30 rounded-lg p-6 text-center">
                <p className="text-sm text-muted-foreground mb-1">{product?.name}</p>
                <p className="text-4xl font-bold text-primary">
                  R$ {((product?.entry_fee_cents || 0) / 100).toFixed(2).replace('.', ',')}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {affiliateType === 'individual' ? 'Pagamento único' : 'Taxa de adesão'}
                </p>
              </div>

              {/* Método de pagamento */}
              <div className="space-y-3">
                <label className="text-sm font-semibold">Método de Pagamento</label>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    variant={paymentMethod === 'pix' ? 'default' : 'outline'}
                    onClick={() => setPaymentMethod('pix')}
                    className="h-auto py-6 flex flex-col gap-2"
                  >
                    <QrCode className="h-6 w-6" />
                    <div className="text-center">
                      <div className="font-semibold">PIX</div>
                      <div className="text-xs opacity-80">Aprovação imediata</div>
                    </div>
                  </Button>
                  <Button
                    variant={paymentMethod === 'credit_card' ? 'default' : 'outline'}
                    onClick={() => setPaymentMethod('credit_card')}
                    className="h-auto py-6 flex flex-col gap-2"
                  >
                    <CreditCard className="h-6 w-6" />
                    <div className="text-center">
                      <div className="font-semibold">Cartão</div>
                      <div className="text-xs opacity-80">Crédito ou débito</div>
                    </div>
                  </Button>
                </div>
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

              {/* Botões */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={onBack}
                  disabled={loading}
                  className="flex-1"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
                <Button
                  onClick={handleCreatePayment}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    'Continuar'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Tela de aguardando pagamento
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader className="text-center space-y-2 pb-6">
            <div className="mx-auto h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
              {polling ? (
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              ) : (
                <QrCode className="h-6 w-6 text-primary" />
              )}
            </div>
            <CardTitle className="text-3xl font-bold">
              {polling ? 'Aguardando Confirmação' : 'Pagamento Gerado'}
            </CardTitle>
            <p className="text-muted-foreground">
              {polling ? 'Verificando pagamento automaticamente' : 'Complete o pagamento para ativar sua conta'}
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* QR Code PIX */}
            {paymentMethod === 'pix' && paymentData.qr_code_image && (
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-4">
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <img
                      src={paymentData.qr_code_image}
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
                        {paymentData.qr_code}
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
              </div>
            )}

            {/* Link para cartão */}
            {paymentMethod === 'credit_card' && paymentData.invoice_url && (
              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  Clique no botão abaixo para pagar com cartão
                </p>
                <Button
                  onClick={() => window.open(paymentData.invoice_url, '_blank')}
                  size="lg"
                  className="w-full"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Pagar com Cartão
                </Button>
              </div>
            )}

            {/* Status de polling */}
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

            {/* Erro */}
            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              </div>
            )}

            {/* Informação de segurança */}
            {!error && (
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex gap-3">
                  <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      Pagamento Seguro
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Após a confirmação do pagamento, você será redirecionado automaticamente para o painel de afiliados.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Botão de voltar */}
            {!polling && (
              <Button
                variant="outline"
                onClick={onBack}
                className="w-full"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
