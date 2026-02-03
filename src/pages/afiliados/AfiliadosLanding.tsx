import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import {
  DollarSign,
  Users,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  Zap,
  Shield,
  Clock
} from "lucide-react";
import { ChatWidget } from "@/components/chat/ChatWidget";

export default function AfiliadosLanding() {
  const [nivel1, setNivel1] = useState([10]);
  const [nivel2, setNivel2] = useState([5]);
  const [nivel3, setNivel3] = useState([15]); // Aumentei o mock para N3 para refletir o exemplo
  const [showChatWidget, setShowChatWidget] = useState(false);

  // Ticket médio = Baseado no colchão padrão R$ 4.400,00
  const ticketMedio = 4400;

  const calcularGanhos = () => {
    // N1: 15%
    const n1 = nivel1[0] * ticketMedio * 0.15;
    // N2: 3%
    const n2 = nivel2[0] * ticketMedio * 0.03;
    // N3: 2%
    const n3 = nivel3[0] * ticketMedio * 0.02;

    return {
      mensal: n1 + n2 + n3,
      anual: (n1 + n2 + n3) * 12,
      breakdown: { n1, n2, n3 }
    };
  };

  const ganhos = calcularGanhos();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-background to-secondary/10 py-24">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:20px_20px]" />
        <div className="container relative mx-auto px-6">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:gap-12 items-center">
            <div className="space-y-8 animate-in fade-in slide-in-from-left duration-1000">
              <div className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary ring-1 ring-primary/20">
                💰 Ganhe até 15% por venda
              </div>

              <h1 className="text-3xl font-bold leading-tight lg:text-5xl tracking-tight max-w-2xl">
                Transforme Indicações em
                <span className="block bg-gradient-to-r from-primary via-primary/80 to-secondary bg-clip-text text-transparent">
                  Rendimento Exponencial
                </span>
              </h1>

              <p className="text-xl text-muted-foreground max-w-lg">
                Ajude pessoas a dormirem melhor e construa uma rede de rendimentos
                indicando nossos colchões terapêuticos magnéticos.
              </p>

              <div className="flex flex-wrap gap-4">
                <Button size="lg" asChild className="gap-2 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300">
                  <Link to="/afiliados/cadastro">
                    Quero Ser Afiliado
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" onClick={() => setShowChatWidget(true)} className="backdrop-blur-sm bg-background/50">
                  Falar com Especialista
                </Button>
              </div>

              <div className="flex gap-8 pt-4">
                <div className="space-y-1">
                  <p className="text-3xl font-bold text-primary">15%</p>
                  <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Comissão Direta</p>
                </div>
                <div className="space-y-1">
                  <p className="text-3xl font-bold text-primary">3 Níveis</p>
                  <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">De Ganhos</p>
                </div>
                <div className="space-y-1">
                  <p className="text-3xl font-bold text-primary">R$ 9.2k+</p>
                  <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Média Mensal</p>
                </div>
              </div>
            </div>

            <div className="relative animate-in fade-in slide-in-from-right duration-1000 delay-200">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-secondary/30 rounded-2xl blur-2xl opacity-50" />
              <Card className="relative border-primary/10 shadow-2xl backdrop-blur-md bg-background/80 overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl" />
                <CardContent className="p-6 lg:p-8">
                  <div className="space-y-6 lg:space-y-8">
                    <div className="flex items-center gap-4 group">
                      <div className="rounded-2xl bg-primary/10 p-3 lg:p-4 ring-1 ring-primary/20 group-hover:bg-primary/20 transition-colors shrink-0">
                        <Zap className="h-5 w-5 lg:h-6 lg:w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold text-base lg:text-lg">Cadastro Rápido</p>
                        <p className="text-sm text-muted-foreground">Sua rede pronta em 5 minutos</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 group">
                      <div className="rounded-2xl bg-primary/10 p-3 lg:p-4 ring-1 ring-primary/20 group-hover:bg-primary/20 transition-colors shrink-0">
                        <Shield className="h-5 w-5 lg:h-6 lg:w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold text-base lg:text-lg">Transparência Total</p>
                        <p className="text-sm text-muted-foreground">Acompanhe comissões em tempo real</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 group">
                      <div className="rounded-2xl bg-primary/10 p-3 lg:p-4 ring-1 ring-primary/20 group-hover:bg-primary/20 transition-colors shrink-0">
                        <Clock className="h-5 w-5 lg:h-6 lg:w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold text-base lg:text-lg">Liquidez Semanal</p>
                        <p className="text-sm text-muted-foreground">Receba seus lucros via PIX</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Como Funciona */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Como Funciona?</h2>
            <p className="text-xl text-muted-foreground">
              3 passos simples para começar a ganhar
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <Card className="relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary" />
              <CardContent className="p-8 space-y-4">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary text-2xl font-bold">
                  1
                </div>
                <h3 className="text-2xl font-bold">Cadastre-se</h3>
                <p className="text-muted-foreground">
                  Preencha o formulário com seus dados e informações bancárias.
                  Em poucos minutos você terá seu link de afiliado.
                </p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary" />
              <CardContent className="p-8 space-y-4">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary text-2xl font-bold">
                  2
                </div>
                <h3 className="text-2xl font-bold">Indique</h3>
                <p className="text-muted-foreground">
                  Compartilhe seu link nas redes sociais, grupos de WhatsApp
                  ou diretamente com pessoas que possam se beneficiar.
                </p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary" />
              <CardContent className="p-8 space-y-4">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary text-2xl font-bold">
                  3
                </div>
                <h3 className="text-2xl font-bold">Receba</h3>
                <p className="text-muted-foreground">
                  A cada venda realizada através do seu link, você recebe
                  comissão automaticamente. Saque via PIX quando quiser.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Estrutura de Comissões */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Estrutura de Comissões</h2>
            <p className="text-xl text-muted-foreground">
              Ganhe em até 3 níveis de profundidade
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
            <Card className="relative group border-primary/20 shadow-xl backdrop-blur-sm bg-background/50 hover:bg-background/80 transition-all duration-300 hover:-translate-y-2">
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary to-primary/60 rounded-t-xl" />
              <CardContent className="p-8 text-center space-y-4">
                <div className="flex items-center justify-center w-24 h-24 mx-auto rounded-2xl bg-primary text-primary-foreground text-4xl font-black shadow-lg shadow-primary/20">
                  15%
                </div>
                <h3 className="text-2xl font-bold">Nível 1 (Direto)</h3>
                <p className="text-muted-foreground font-medium">
                  Suas indicações diretas
                </p>
                <div className="pt-6 mt-4 border-t border-primary/10">
                  <p className="text-sm text-muted-foreground mb-1">Exemplo (Venda Padrão R$ 4.400,00):</p>
                  <p className="text-3xl font-black text-primary">
                    R$ 660,00
                  </p>
                  <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-tighter mt-1">por venda finalizada</p>
                </div>
              </CardContent>
            </Card>

            <Card className="relative group border-secondary/20 shadow-xl backdrop-blur-sm bg-background/50 hover:bg-background/80 transition-all duration-300 hover:-translate-y-2">
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-secondary to-secondary/60 rounded-t-xl" />
              <CardContent className="p-8 text-center space-y-4">
                <div className="flex items-center justify-center w-24 h-24 mx-auto rounded-2xl bg-secondary text-secondary-foreground text-4xl font-black shadow-lg shadow-secondary/20">
                  3%
                </div>
                <h3 className="text-2xl font-bold">Nível 2</h3>
                <p className="text-muted-foreground font-medium">
                  Indicados dos seus indicados
                </p>
                <div className="pt-6 mt-4 border-t border-secondary/10">
                  <p className="text-sm text-muted-foreground mb-1">Exemplo (Venda Padrão R$ 4.400,00):</p>
                  <p className="text-3xl font-black text-secondary">
                    R$ 132,00
                  </p>
                  <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-tighter mt-1">por venda da rede</p>
                </div>
              </CardContent>
            </Card>

            <Card className="relative group border-muted shadow-xl backdrop-blur-sm bg-background/50 hover:bg-background/80 transition-all duration-300 hover:-translate-y-2">
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-muted-foreground/20 to-muted-foreground/10 rounded-t-xl" />
              <CardContent className="p-8 text-center space-y-4">
                <div className="flex items-center justify-center w-24 h-24 mx-auto rounded-2xl bg-muted text-foreground text-4xl font-black shadow-lg">
                  2%
                </div>
                <h3 className="text-2xl font-bold">Nível 3</h3>
                <p className="text-muted-foreground font-medium">
                  Terceiro nível da sua rede
                </p>
                <div className="pt-6 mt-4 border-t border-muted">
                  <p className="text-sm text-muted-foreground mb-1">Exemplo (Venda Padrão R$ 4.400,00):</p>
                  <p className="text-3xl font-black text-foreground">
                    R$ 88,00
                  </p>
                  <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-tighter mt-1">por venda da expansão</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Simulador Interativo */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Simule Seus Ganhos</h2>
            <p className="text-xl text-muted-foreground">
              Veja quanto você pode ganhar mensalmente (Ticket Médio R$ 4.400,00)
            </p>
          </div>

          <Card className="max-w-4xl mx-auto border-2 shadow-xl">
            <CardContent className="p-8">
              <div className="grid gap-8 lg:grid-cols-2">
                <div className="space-y-8">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-medium">
                        Vendas Diretas (N1) - 15%
                      </label>
                      <span className="text-2xl font-bold text-primary">
                        {nivel1[0]}
                      </span>
                    </div>
                    <Slider
                      value={nivel1}
                      onValueChange={setNivel1}
                      max={50}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-medium">
                        Vendas Nível 2 - 3%
                      </label>
                      <span className="text-2xl font-bold text-secondary">
                        {nivel2[0]}
                      </span>
                    </div>
                    <Slider
                      value={nivel2}
                      onValueChange={setNivel2}
                      max={50}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-medium">
                        Vendas Nível 3 - 2%
                      </label>
                      <span className="text-2xl font-bold">
                        {nivel3[0]}
                      </span>
                    </div>
                    <Slider
                      value={nivel3}
                      onValueChange={setNivel3}
                      max={50}
                      step={1}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="space-y-6 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-lg p-6">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Ganho Mensal Estimado
                    </p>
                    <p className="text-5xl font-bold text-primary">
                      R$ {ganhos.mensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>

                  <div className="space-y-3 pt-4 border-t">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Nível 1 (15%):</span>
                      <span className="font-semibold">
                        R$ {ganhos.breakdown.n1.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Nível 2 (3%):</span>
                      <span className="font-semibold">
                        R$ {ganhos.breakdown.n2.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Nível 3 (2%):</span>
                      <span className="font-semibold">
                        R$ {ganhos.breakdown.n3.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-2">
                      Potencial Anual
                    </p>
                    <p className="text-3xl font-bold">
                      R$ {ganhos.anual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Benefícios */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Por Que Ser Nosso Afiliado?</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: DollarSign,
                title: "Comissões Generosas",
                description: "Até 15% de comissão em vendas diretas, muito acima da média do mercado"
              },
              {
                icon: Users,
                title: "Rede Multinível",
                description: "Ganhe em até 3 níveis de profundidade da sua rede de indicados"
              },
              {
                icon: TrendingUp,
                title: "Produto de Alta Conversão",
                description: "Colchões terapêuticos com benefícios comprovados e alta demanda"
              },
              {
                icon: CheckCircle2,
                title: "Suporte Completo",
                description: "Materiais de divulgação, treinamentos e suporte dedicado"
              },
              {
                icon: Zap,
                title: "Pagamentos Rápidos",
                description: "Saques via PIX disponíveis semanalmente, sem burocracia"
              },
              {
                icon: Shield,
                title: "Sistema Transparente",
                description: "Dashboard completo para acompanhar vendas e comissões em tempo real"
              }
            ].map((benefit, i) => (
              <Card key={i} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                    <benefit.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold">{benefit.title}</h3>
                  <p className="text-muted-foreground">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Depoimentos */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">O Que Dizem Nossos Afiliados</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                name: "Carlos Mendes",
                role: "Afiliado Nível 3",
                message: "Em 6 meses consegui construir uma rede de 15 pessoas e hoje ganho mais de R$ 12 mil por mês. Mudou minha vida!",
                earnings: "R$ 12.450/mês"
              },
              {
                name: "Marina Silva",
                role: "Afiliada Nível 2",
                message: "O produto vende sozinho! As pessoas realmente melhoram de saúde e isso faz toda diferença na hora de indicar.",
                earnings: "R$ 8.750/mês"
              },
              {
                name: "Roberto Costa",
                role: "Afiliado Nível 1",
                message: "Comecei há 3 meses e já estou com uma renda extra consistente. O suporte da equipe é excepcional!",
                earnings: "R$ 4.290/mês"
              }
            ].map((depo, i) => (
              <Card key={i} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6 space-y-4">
                  <p className="text-muted-foreground italic">"{depo.message}"</p>
                  <div className="flex items-center gap-3 pt-4 border-t">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                      {depo.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="font-semibold">{depo.name}</p>
                      <p className="text-sm text-muted-foreground">{depo.role}</p>
                      <p className="text-sm font-semibold text-primary">{depo.earnings}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <Card className="border-2 shadow-2xl bg-gradient-to-br from-primary/10 via-background to-secondary/10">
            <CardContent className="p-12 text-center space-y-6">
              <h2 className="text-4xl font-bold">
                Pronto para Começar a Ganhar?
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Cadastre-se agora e comece a construir sua renda recorrente
                ajudando pessoas a dormirem melhor
              </p>
              <div className="flex flex-wrap gap-4 justify-center pt-4">
                <Button size="lg" asChild className="gap-2">
                  <Link to="/afiliados/cadastro">
                    Quero Ser Afiliado Agora
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" onClick={() => setShowChatWidget(true)}>
                  Ainda Tenho Dúvidas
                </Button>
              </div>
              <p className="text-sm text-muted-foreground pt-4">
                ✓ Sem investimento inicial • ✓ Cadastro em 5 minutos • ✓ Pagamentos via PIX
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Chat Widget */}
      {showChatWidget && (
        <ChatWidget
          autoOpen={true}
          onClose={() => setShowChatWidget(false)}
        />
      )}
    </div>
  );
}