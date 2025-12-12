import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/dashboard/StatCard";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import {
  Users,
  DollarSign,
  TrendingUp,
  Link as LinkIcon,
  Copy,
  QrCode,
  Share2,
  ChevronRight,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { AffiliateFrontendService } from "@/services/frontend/affiliate.service";

export default function AffiliateDashboardInicio() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showQRCode, setShowQRCode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  
  const linkAfiliado = dashboardData?.referral_link || "https://slimquality.com.br/?ref=loading";

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const data = await AffiliateFrontendService.getDashboard();
      if (data.success) {
        setDashboardData(data.data);
      } else {
        toast({
          title: "Erro ao carregar dados",
          description: "Não foi possível carregar os dados do dashboard",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Ocorreu um erro inesperado",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(linkAfiliado);
    toast({
      title: "Link copiado!",
      description: "Seu link de afiliado foi copiado para a área de transferência.",
    });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: "Slim Quality - Colchões Terapêuticos",
        text: "Conheça os colchões magnéticos que transformam o sono!",
        url: linkAfiliado
      });
    } else {
      handleCopyLink();
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-muted animate-pulse rounded" />
                  <div className="h-8 bg-muted animate-pulse rounded" />
                </div>
                <div className="h-8 w-8 bg-muted animate-pulse rounded" />
              </div>
            </Card>
          ))}
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Carregando dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Métricas Principais */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={DollarSign}
          label="Total em Comissões"
          value={`R$ ${(dashboardData?.stats?.total_commissions || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          trend={{ value: "+15% este mês", positive: true }}
          iconColor="text-primary"
        />
        <StatCard
          icon={Users}
          label="Indicados Ativos"
          value={dashboardData?.stats?.active_referrals?.toString() || "0"}
          trend={{ value: "+3 esta semana", positive: true }}
          iconColor="text-secondary"
        />
        <StatCard
          icon={TrendingUp}
          label="Vendas Geradas"
          value={dashboardData?.stats?.total_sales?.toString() || "0"}
          trend={{ value: "+8 este mês", positive: true }}
          iconColor="text-success"
        />
        <StatCard
          icon={LinkIcon}
          label="Taxa de Conversão"
          value={`${(dashboardData?.stats?.conversion_rate || 0).toFixed(1)}%`}
          iconColor="text-muted-foreground"
        />
      </div>

      {/* Link de Indicação */}
      <Card className="border-2 border-primary/20 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-primary" />
            Seu Link de Indicação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input 
              value={linkAfiliado} 
              readOnly 
              className="font-mono text-sm"
            />
            <Button onClick={handleCopyLink} variant="outline" size="icon">
              <Copy className="h-4 w-4" />
            </Button>
            <Button onClick={handleShare} variant="outline" size="icon">
              <Share2 className="h-4 w-4" />
            </Button>
            <Button 
              onClick={() => setShowQRCode(!showQRCode)} 
              variant="outline"
              size="icon"
            >
              <QrCode className="h-4 w-4" />
            </Button>
          </div>

          {showQRCode && (
            <div className="flex flex-col items-center gap-3 p-6 bg-muted rounded-lg">
              <div className="w-48 h-48 bg-white p-4 rounded-lg border-2">
                {/* QR Code placeholder */}
                <div className="w-full h-full bg-foreground/10 flex items-center justify-center text-xs text-center">
                  QR Code
                  <br />
                  {linkAfiliado}
                </div>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Escaneie o QR Code para acessar seu link de indicação
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1">
              Compartilhar no WhatsApp
            </Button>
            <Button variant="outline" className="flex-1">
              Baixar Materiais
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Comissões Recentes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Comissões Recentes</CardTitle>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate("/afiliados/dashboard/comissoes")}
            >
              Ver todas
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(dashboardData?.recent_commissions || []).map((comissao: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                      comissao.level === 1 ? "bg-primary/10 text-primary" :
                      comissao.level === 2 ? "bg-secondary/10 text-secondary" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      N{comissao.level}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{comissao.customer_name || 'Cliente'}</p>
                      <p className="text-xs text-muted-foreground">
                        {comissao.product_name || 'Produto'} • {new Date(comissao.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">
                      R$ {(comissao.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <StatusBadge status={comissao.status as any} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Atividade da Rede */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Atividade da Rede</CardTitle>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate("/afiliados/dashboard/rede")}
            >
              Ver rede
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(dashboardData?.network_activity || []).map((atividade: any, i: number) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                    {(atividade.affiliate_name || 'U').split(' ').map((n: string) => n[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{atividade.affiliate_name || 'Usuário'}</span>
                      {' '}{atividade.action_type === 'sale' ? 'realizou uma venda' : 'entrou para sua rede'}
                      {atividade.product_name && (
                        <span className="font-medium"> {atividade.product_name}</span>
                      )}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        atividade.level === 1 ? "bg-primary/10 text-primary" :
                        atividade.level === 2 ? "bg-secondary/10 text-secondary" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        N{atividade.level}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(atividade.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Metas e Desafios */}
      <Card>
        <CardHeader>
          <CardTitle>Metas do Mês</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Vendas Diretas (N1)</span>
                <span className="text-sm text-muted-foreground">8 / 15</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: '53%' }} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Faltam 7 vendas para bater a meta e ganhar bônus de R$ 500
              </p>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Novos Indicados</span>
                <span className="text-sm text-muted-foreground">3 / 5</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-secondary rounded-full" style={{ width: '60%' }} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Indique mais 2 pessoas e ganhe acesso ao curso de vendas
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}