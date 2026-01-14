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
  Loader2,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { affiliateFrontendService } from "@/services/frontend/affiliate.service";

export default function AffiliateDashboardInicio() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showQRCode, setShowQRCode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [referralLink, setReferralLink] = useState<string>("");
  
  useEffect(() => {
    loadDashboardData();
  }, []);

  // Recarregar quando voltar para a página (detectar mudanças no slug)
  useEffect(() => {
    const handleFocus = () => {
      loadDashboardData();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Carregar dados do dashboard
      const dashboardResponse = await affiliateFrontendService.getDashboard();
      setDashboardData(dashboardResponse);
      
      // Carregar link de indicação
      const linkResponse = await affiliateFrontendService.getReferralLink();
      setReferralLink(linkResponse.link);
      
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
      
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados do dashboard. Usando dados de exemplo.",
        variant: "destructive"
      });
      
      // Fallback para dados mock em caso de erro
      setDashboardData({
        affiliate: {
          name: "Usuário",
          status: "active"
        },
        stats: {
          totalCommissions: 0,
          totalClicks: 0,
          totalConversions: 0,
          conversionRate: 0
        },
        commissions: [],
        network: []
      });
      // Não definir link de fallback - deixar vazio para mostrar "Carregando..."
      setReferralLink("");
      
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
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
        url: referralLink
      });
    } else {
      handleCopyLink();
    }
  };

  // Estados de loading e erro
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

  if (error && !dashboardData) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <div className="text-center">
          <h3 className="text-lg font-semibold">Erro ao carregar dashboard</h3>
          <p className="text-muted-foreground">{error}</p>
        </div>
        <Button onClick={loadDashboardData}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  // Extrair dados com fallbacks seguros
  const stats = dashboardData?.stats || {};
  const commissions = dashboardData?.commissions || [];
  const network = dashboardData?.network || [];
  const affiliate = dashboardData?.affiliate || {};

  return (
    <div className="space-y-6">
      {/* Aviso se usando dados de fallback */}
      {error && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">
                Exibindo dados de exemplo. Verifique sua conexão com o backend.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Métricas Principais */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={DollarSign}
          label="Total em Comissões"
          value={`R$ ${(stats.totalCommissions || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          iconColor="text-primary"
        />
        <StatCard
          icon={Users}
          label="Indicados Ativos"
          value={(network.length || 0).toString()}
          iconColor="text-secondary"
        />
        <StatCard
          icon={TrendingUp}
          label="Vendas Geradas"
          value={(stats.totalConversions || 0).toString()}
          iconColor="text-success"
        />
        <StatCard
          icon={LinkIcon}
          label="Taxa de Conversão"
          value={`${(stats.conversionRate || 0).toFixed(1)}%`}
          iconColor="text-muted-foreground"
        />
      </div>

      {/* Link de Indicação */}
      <Card className="border-2 border-primary/20 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-primary" />
            Seus Links de Indicação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Link de Vendas */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              LINK DE VENDAS:
            </label>
            <div className="flex gap-2">
              <Input 
                value={referralLink || "Carregando..."} 
                readOnly 
                className="font-mono text-sm"
              />
              <Button onClick={handleCopyLink} variant="outline" size="icon" disabled={!referralLink} title="Copiar link">
                <Copy className="h-4 w-4" />
              </Button>
              <Button onClick={handleShare} variant="outline" size="icon" disabled={!referralLink} title="Compartilhar">
                <Share2 className="h-4 w-4" />
              </Button>
              <Button 
                onClick={() => setShowQRCode(!showQRCode)} 
                variant="outline"
                size="icon"
                disabled={!referralLink}
                title="QR Code"
              >
                <QrCode className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Use este link para divulgar os produtos e gerar vendas
            </p>
          </div>

          {/* Link de Cadastro Direto */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              LINK DE CADASTRO DIRETO:
            </label>
            <div className="flex gap-2">
              <Input 
                value={referralLink ? `https://slimquality.com.br/afiliados/cadastro?ref=${referralLink.split('?ref=')[1]}` : "Carregando..."} 
                readOnly 
                className="font-mono text-sm"
              />
              <Button 
                onClick={() => {
                  const cadastroLink = `https://slimquality.com.br/afiliados/cadastro?ref=${referralLink.split('?ref=')[1]}`;
                  navigator.clipboard.writeText(cadastroLink);
                  toast({
                    title: "Link copiado!",
                    description: "Link de cadastro direto copiado para a área de transferência.",
                  });
                }} 
                variant="outline" 
                size="icon" 
                disabled={!referralLink}
                title="Copiar link"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button 
                onClick={() => {
                  const cadastroLink = `https://slimquality.com.br/afiliados/cadastro?ref=${referralLink.split('?ref=')[1]}`;
                  if (navigator.share) {
                    navigator.share({
                      title: "Seja um Afiliado Slim Quality",
                      text: "Cadastre-se como afiliado e comece a ganhar comissões!",
                      url: cadastroLink
                    });
                  } else {
                    navigator.clipboard.writeText(cadastroLink);
                    toast({
                      title: "Link copiado!",
                      description: "Link de cadastro direto copiado para a área de transferência.",
                    });
                  }
                }} 
                variant="outline" 
                size="icon" 
                disabled={!referralLink}
                title="Compartilhar"
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Use este link para recrutar novos afiliados diretamente
            </p>
          </div>

          {showQRCode && referralLink && (
            <div className="flex flex-col items-center gap-3 p-6 bg-muted rounded-lg">
              <div className="w-48 h-48 bg-white p-4 rounded-lg border-2 flex items-center justify-center">
                {/* QR Code usando API externa gratuita */}
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(referralLink)}`}
                  alt="QR Code do link de indicação"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    // Fallback se API externa falhar
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.nextElementSibling!.classList.remove('hidden');
                  }}
                />
                <div className="hidden w-full h-full bg-foreground/10 flex items-center justify-center text-xs text-center">
                  QR Code
                  <br />
                  {referralLink}
                </div>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Escaneie o QR Code para acessar seu link de vendas
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
              {commissions.length > 0 ? (
                commissions.slice(0, 5).map((comissao: any, i: number) => (
                  <div key={comissao.id || i} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                        comissao.level === 1 ? "bg-primary/10 text-primary" :
                        comissao.level === 2 ? "bg-secondary/10 text-secondary" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        N{comissao.level || 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{comissao.order?.customer_name || 'Cliente'}</p>
                        <p className="text-xs text-muted-foreground">
                          Colchão • {new Date(comissao.created_at || Date.now()).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">
                        R$ {((comissao.amount_cents || 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <StatusBadge status={comissao.status || 'pending'} />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Nenhuma comissão ainda</p>
                  <p className="text-xs">Suas comissões aparecerão aqui quando houver vendas</p>
                </div>
              )}
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
              {network.length > 0 ? (
                network.slice(0, 5).map((afiliado: any, i: number) => (
                  <div key={afiliado.id || i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                      {(afiliado.name || 'U').split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{afiliado.name || 'Usuário'}</span>
                        {' '}entrou para sua rede
                        {afiliado.sales_count > 0 && (
                          <span className="font-medium"> • {afiliado.sales_count} vendas</span>
                        )}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          afiliado.level === 1 ? "bg-primary/10 text-primary" :
                          afiliado.level === 2 ? "bg-secondary/10 text-secondary" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          N{afiliado.level || 1}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(afiliado.created_at || Date.now()).toLocaleDateString('pt-BR')}
                        </span>
                        {afiliado.commission_generated > 0 && (
                          <span className="text-xs text-success font-medium">
                            +R$ {afiliado.commission_generated.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Sua rede está vazia</p>
                  <p className="text-xs">Compartilhe seu link para começar a construir sua rede</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}