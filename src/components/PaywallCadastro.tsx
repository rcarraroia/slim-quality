import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/config/supabase';
import { Loader2, CheckCircle2, XCircle, ArrowLeft, QrCode, CreditCard } from 'lucide-react';

interface PaywallCadastroProps {
  sessionToken: string;
  affiliateType: 'individual' | 'logista';
  email: string;
  password: string | null;
  isExistingCustomer?: boolean;
  wantsSubscription?: boolean;
  onPaymentConfirmed: () => void;
  onBack: () => void;
}

interface Product {
  id: string;
  name: string;
  entry_fee_cents: number;
  eligible_affiliate_type: string;
}

export default function PaywallCadastro({
  sessionToken,
  affiliateType,
  email,
  password,
  isExistingCustomer = false,
  wantsSubscription = false,
  onPaymentConfirmed,
  onBack
}: PaywallCadastroProps) {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card'>('pix');
  const [error, setError] = useState<string | null>(null);

  // Buscar produto de adesão
  useEffect(() => {
    async function fetchProduct() {
      try {
        const needsSubscription = affiliateType === 'logista' || wantsSubscription;
        
        const { data, error } = await supabase
          .from('products')
          .select(`
            *,
            product_images(image_url, is_primary)
          `)
          .eq('category', 'adesao_afiliado')
          .eq('eligible_affiliate_type', affiliateType)
          .eq('is_subscription', needsSubscription)
          .eq('is_active', true)
          .maybeSingle();

        if (error) throw error;
        
        if (!data) {
          throw new Error(`Produto não encontrado para ${affiliateType} com is_subscription=${needsSubscription}`);
        }
        
        setProduct(data);
      } catch (err: any) {
        setError('Erro ao buscar produto de adesão');
        console.error('[PaywallCadastro] Erro ao buscar produto:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchProduct();
  }, [affiliateType, wantsSubscription]);

  // Criar pagamento
  const handleCreatePayment = async () => {
    setLoading(true);
    setError(null);

    try {
      const paymentMethodUpperCase = paymentMethod === 'pix' ? 'PIX' : 'CREDIT_CARD';
      
      const response = await fetch(
        '/api/create-payment?action=create-affiliate-membership',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_token: sessionToken,
            payment_method: paymentMethodUpperCase,
            has_subscription: affiliateType === 'logista' || wantsSubscription
          })
        }
      );

      const result = await response.json();

      if (result.success && result.payment_url) {
        // Exibir toast de sucesso
        toast({
          title: 'Pagamento gerado!',
          description: 'Redirecionando para pagamento seguro...'
        });

        // Redirecionar para Asaas após 2 segundos
        setTimeout(() => {
          window.location.href = result.payment_url;
        }, 2000);
      } else {
        setError(result.error || 'Erro ao criar pagamento');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao criar pagamento');
    } finally {
      setLoading(false);
    }
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
  if (error && !product) {
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

            {/* Erro */}
            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              </div>
            )}

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
