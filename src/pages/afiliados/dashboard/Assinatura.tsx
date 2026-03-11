import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { 
  Sparkles, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Store,
  Bot
} from "lucide-react";
import { supabase } from "@/config/supabase";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { UpgradeModal } from "@/components/affiliates/UpgradeModal";
import { CancelSubscriptionModal } from "@/components/affiliates/CancelSubscriptionModal";

export default function Assinatura() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [affiliate, setAffiliate] = useState<any>(null);
  const [subscriptionProduct, setSubscriptionProduct] = useState<any>(null);
  const [nextPayment, setNextPayment] = useState<any>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Carregar dados do afiliado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: affiliateData } = await supabase
        .from('affiliates')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setAffiliate(affiliateData);

      // Carregar produto de assinatura
      const { data: productData } = await supabase
        .from('products')
        .select('*')
        .eq('category', 'adesao_afiliado')
        .eq('eligible_affiliate_type', affiliateData.affiliate_type)
        .eq('is_subscription', true)
        .eq('is_active', true)
        .maybeSingle();

      setSubscriptionProduct(productData);

      // Carregar próximo pagamento
      if (affiliateData.has_subscription) {
        const { data: paymentData } = await supabase
          .from('affiliate_payments')
          .select('*')
          .eq('affiliate_id', affiliateData.id)
          .eq('status', 'pending')
          .order('due_date', { ascending: true })
          .limit(1)
          .maybeSingle();

        setNextPayment(paymentData);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar informações da assinatura",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    try {
      if (!affiliate || !subscriptionProduct) {
        toast({
          title: "Erro",
          description: "Dados não carregados. Tente novamente.",
          variant: "destructive"
        });
        return;
      }

      // Criar assinatura via API
      const response = await fetch('/api/create-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          action: 'create-subscription',
          affiliateId: affiliate.id,
          productId: subscriptionProduct.id
        })
      });

      if (!response.ok) {
        throw new Error('Erro ao criar assinatura');
      }

      const data = await response.json();

      if (data.success && data.invoiceUrl) {
        // Redirecionar para pagamento
        window.location.href = data.invoiceUrl;
      } else {
        throw new Error(data.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('Erro ao fazer upgrade:', error);
      toast({
        title: "Erro ao processar upgrade",
        description: error instanceof Error ? error.message : "Tente novamente mais tarde",
        variant: "destructive"
      });
      setShowUpgradeModal(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      if (!affiliate) {
        toast({
          title: "Erro",
          description: "Dados não carregados. Tente novamente.",
          variant: "destructive"
        });
        return;
      }

      // Cancelar assinatura via API
      const response = await fetch('/api/create-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          action: 'cancel-subscription',
          affiliateId: affiliate.id
        })
      });

      if (!response.ok) {
        throw new Error('Erro ao cancelar assinatura');
      }

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Assinatura cancelada",
          description: "Sua assinatura foi cancelada com sucesso. Você ainda terá acesso até o fim do período pago.",
        });

        // Recarregar dados
        await loadData();
        setShowCancelModal(false);
      } else {
        throw new Error(data.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('Erro ao cancelar assinatura:', error);
      toast({
        title: "Erro ao cancelar assinatura",
        description: error instanceof Error ? error.message : "Tente novamente mais tarde",
        variant: "destructive"
      });
      setShowCancelModal(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Card de Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Status da Assinatura
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Status Badge */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Status Atual</p>
                <div className="flex items-center gap-2 mt-1">
                  {affiliate.has_subscription ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-semibold">Plano Premium Ativo</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-muted-foreground" />
                      <span className="font-semibold">Plano Básico</span>
                    </>
                  )}
                </div>
              </div>
              
              {affiliate.has_subscription && (
                <Badge variant={
                  affiliate.payment_status === 'active' ? 'default' :
                  affiliate.payment_status === 'pending' ? 'secondary' :
                  'destructive'
                }>
                  {affiliate.payment_status === 'active' ? 'Em dia' :
                   affiliate.payment_status === 'pending' ? 'Pendente' :
                   affiliate.payment_status === 'overdue' ? 'Vencido' :
                   'Suspenso'}
                </Badge>
              )}
            </div>

            {/* Benefícios */}
            {affiliate.has_subscription && (
              <div className="pt-4 border-t">
                <p className="text-sm font-semibold mb-3">Benefícios Ativos:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Vitrine Pública</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Agente IA (Bia)</span>
                  </div>
                  {affiliate.affiliate_type === 'logista' && (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>Show Room</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Mensalidade */}
            {affiliate.has_subscription && subscriptionProduct && (
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Valor da Mensalidade</p>
                    <p className="text-2xl font-bold text-primary">
                      R$ {(subscriptionProduct.monthly_fee_cents / 100).toFixed(2)}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate('/afiliados/dashboard/pagamentos')}>
                    Ver Histórico
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Card de Upgrade - Só para Individual SEM assinatura */}
      {!affiliate.has_subscription && affiliate.affiliate_type === 'individual' && subscriptionProduct && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Upgrade para Plano Premium
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  Tenha sua própria vitrine pública e agente IA para atender clientes 24/7
                </p>
              </div>
              <Badge variant="secondary">Novo</Badge>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              {/* Benefícios */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Store className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm">Vitrine Pública</p>
                    <p className="text-sm text-muted-foreground">
                      Sua loja visível em /lojas com produtos e contatos
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Bot className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm">Agente IA (Bia)</p>
                    <p className="text-sm text-muted-foreground">
                      Atendimento automatizado via WhatsApp 24/7
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Pricing e Ação */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Mensalidade</p>
                  <p className="text-2xl font-bold text-primary">
                    R$ {(subscriptionProduct.monthly_fee_cents / 100).toFixed(2)}
                  </p>
                </div>
                
                <Button onClick={() => setShowUpgradeModal(true)} size="lg">
                  Fazer Upgrade Agora
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Card de Gerenciamento - Para quem TEM assinatura */}
      {affiliate.has_subscription && (
        <Card>
          <CardHeader>
            <CardTitle>Gerenciar Assinatura</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Próxima Cobrança */}
              {nextPayment && (
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Próxima Cobrança</p>
                    <p className="text-lg font-semibold">
                      {format(new Date(nextPayment.due_date), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Valor</p>
                    <p className="text-lg font-semibold text-primary">
                      R$ {(nextPayment.amount_cents / 100).toFixed(2)}
                    </p>
                  </div>
                </div>
              )}

              {/* Ações */}
              <div className="flex gap-3 pt-4">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => navigate('/afiliados/dashboard/pagamentos')}
                >
                  Ver Histórico de Pagamentos
                </Button>
                
                <Button 
                  variant="destructive" 
                  className="flex-1"
                  onClick={() => setShowCancelModal(true)}
                >
                  Cancelar Assinatura
                </Button>
              </div>

              {/* Aviso de Cancelamento */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Ao cancelar, você perderá acesso à vitrine e agente IA. 
                  Seus dados serão mantidos caso deseje reativar no futuro.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modais */}
      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        onConfirm={handleUpgrade}
        monthlyFee={subscriptionProduct?.monthly_fee_cents || 0}
      />

      <CancelSubscriptionModal
        open={showCancelModal}
        onOpenChange={setShowCancelModal}
        onConfirm={handleCancelSubscription}
      />
    </div>
  );
}
