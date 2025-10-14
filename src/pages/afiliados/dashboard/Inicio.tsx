import { useState } from "react";
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
  ChevronRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export default function AffiliateDashboardInicio() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showQRCode, setShowQRCode] = useState(false);
  
  const linkAfiliado = "https://slimquality.com.br/?ref=CM001";

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

  return (
    <div className="space-y-6">
      {/* Métricas Principais */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={DollarSign}
          label="Total em Comissões"
          value="R$ 12.450,00"
          trend={{ value: "+15% este mês", positive: true }}
          iconColor="text-primary"
        />
        <StatCard
          icon={Users}
          label="Indicados Ativos"
          value="15"
          trend={{ value: "+3 esta semana", positive: true }}
          iconColor="text-secondary"
        />
        <StatCard
          icon={TrendingUp}
          label="Vendas Geradas"
          value="42"
          trend={{ value: "+8 este mês", positive: true }}
          iconColor="text-success"
        />
        <StatCard
          icon={LinkIcon}
          label="Taxa de Conversão"
          value="34,2%"
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
              {[
                { tipo: "N1", valor: 429.00, cliente: "Maria Silva", produto: "Queen", data: "Hoje, 10:34", status: "pago" },
                { tipo: "N2", valor: 184.50, cliente: "João Pereira", produto: "Casal", data: "Ontem, 15:20", status: "pago" },
                { tipo: "N1", valor: 489.00, cliente: "Ana Costa", produto: "King", data: "Há 2 dias", status: "pendente" },
                { tipo: "N3", valor: 97.80, cliente: "Carlos Santos", produto: "King", data: "Há 3 dias", status: "pago" },
              ].map((comissao, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                      comissao.tipo === "N1" ? "bg-primary/10 text-primary" :
                      comissao.tipo === "N2" ? "bg-secondary/10 text-secondary" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {comissao.tipo}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{comissao.cliente}</p>
                      <p className="text-xs text-muted-foreground">{comissao.produto} • {comissao.data}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">
                      R$ {comissao.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
              {[
                { nome: "Marina Silva", acao: "realizou uma venda", produto: "Casal", nivel: "N1", tempo: "Há 2 horas" },
                { nome: "Roberto Costa", acao: "entrou para sua rede", produto: null, nivel: "N2", tempo: "Há 5 horas" },
                { nome: "Juliana Rocha", acao: "realizou uma venda", produto: "Queen", nivel: "N2", tempo: "Ontem" },
                { nome: "Paulo Santos", acao: "entrou para sua rede", produto: null, nivel: "N1", tempo: "Há 2 dias" },
              ].map((atividade, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                    {atividade.nome.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{atividade.nome}</span>
                      {' '}{atividade.acao}
                      {atividade.produto && (
                        <span className="font-medium"> {atividade.produto}</span>
                      )}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        atividade.nivel === "N1" ? "bg-primary/10 text-primary" :
                        atividade.nivel === "N2" ? "bg-secondary/10 text-secondary" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {atividade.nivel}
                      </span>
                      <span className="text-xs text-muted-foreground">{atividade.tempo}</span>
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
