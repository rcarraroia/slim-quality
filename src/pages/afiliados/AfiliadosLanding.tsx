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

export default function AfiliadosLanding() {
  const [nivel1, setNivel1] = useState([10]);
  const [nivel2, setNivel2] = useState([5]);
  const [nivel3, setNivel3] = useState([3]);

  const ticketMedio = 3973;
  
  const calcularGanhos = () => {
    const n1 = nivel1[0] * ticketMedio * 0.10;
    const n2 = nivel2[0] * ticketMedio * 0.05;
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
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-24">
        <div className="container mx-auto px-6">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-8 items-center">
            <div className="space-y-8">
              <div className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
                💰 Ganhe até 10% por venda
              </div>
              
              <h1 className="text-5xl font-bold leading-tight lg:text-6xl">
                Transforme Indicações em
                <span className="block bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Renda Recorrente
                </span>
              </h1>
              
              <p className="text-xl text-muted-foreground">
                Ajude pessoas a dormirem melhor e construa uma renda extra 
                indicando nossos colchões terapêuticos magnéticos.
              </p>

              <div className="flex flex-wrap gap-4">
                <Button size="lg" asChild className="gap-2">
                  <Link to="/afiliados/cadastro">
                    Quero Ser Afiliado
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <a href="https://wa.me/553199999999">
                    Falar com Especialista
                  </a>
                </Button>
              </div>

              <div className="flex gap-8 pt-4">
                <div>
                  <p className="text-3xl font-bold text-primary">10%</p>
                  <p className="text-sm text-muted-foreground">Comissão Direta</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-primary">3 Níveis</p>
                  <p className="text-sm text-muted-foreground">De Ganhos</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-primary">R$ 12k+</p>
                  <p className="text-sm text-muted-foreground">Média Mensal</p>
                </div>
              </div>
            </div>

            <div className="relative">
              <Card className="border-2 shadow-2xl">
                <CardContent className="p-8">
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-primary/10 p-3">
                        <Zap className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">Cadastro Rápido</p>
                        <p className="text-sm text-muted-foreground">Comece em 5 minutos</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-primary/10 p-3">
                        <Shield className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">100% Seguro</p>
                        <p className="text-sm text-muted-foreground">Sistema confiável</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-primary/10 p-3">
                        <Clock className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">Pagamento Rápido</p>
                        <p className="text-sm text-muted-foreground">Saques semanais via PIX</p>
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

          <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
            <Card className="border-2 border-primary shadow-lg">
              <CardContent className="p-8 text-center space-y-4">
                <div className="flex items-center justify-center w-20 h-20 mx-auto rounded-full bg-primary text-primary-foreground text-3xl font-bold">
                  10%
                </div>
                <h3 className="text-2xl font-bold">Nível 1 (Direto)</h3>
                <p className="text-muted-foreground">
                  Suas indicações diretas
                </p>
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">Exemplo:</p>
                  <p className="text-lg font-semibold text-primary">
                    R$ 429,00
                  </p>
                  <p className="text-xs text-muted-foreground">por venda Queen</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-secondary shadow-lg">
              <CardContent className="p-8 text-center space-y-4">
                <div className="flex items-center justify-center w-20 h-20 mx-auto rounded-full bg-secondary text-secondary-foreground text-3xl font-bold">
                  5%
                </div>
                <h3 className="text-2xl font-bold">Nível 2</h3>
                <p className="text-muted-foreground">
                  Indicados dos seus indicados
                </p>
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">Exemplo:</p>
                  <p className="text-lg font-semibold text-secondary">
                    R$ 184,50
                  </p>
                  <p className="text-xs text-muted-foreground">por venda Casal</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 shadow-lg">
              <CardContent className="p-8 text-center space-y-4">
                <div className="flex items-center justify-center w-20 h-20 mx-auto rounded-full bg-muted text-foreground text-3xl font-bold">
                  2%
                </div>
                <h3 className="text-2xl font-bold">Nível 3</h3>
                <p className="text-muted-foreground">
                  Terceiro nível da sua rede
                </p>
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">Exemplo:</p>
                  <p className="text-lg font-semibold">
                    R$ 97,80
                  </p>
                  <p className="text-xs text-muted-foreground">por venda King</p>
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
              Veja quanto você pode ganhar mensalmente
            </p>
          </div>

          <Card className="max-w-4xl mx-auto border-2 shadow-xl">
            <CardContent className="p-8">
              <div className="grid gap-8 lg:grid-cols-2">
                <div className="space-y-8">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-medium">
                        Vendas Diretas (N1) - 10%
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
                        Vendas Nível 2 - 5%
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
                      <span className="text-muted-foreground">Nível 1:</span>
                      <span className="font-semibold">
                        R$ {ganhos.breakdown.n1.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Nível 2:</span>
                      <span className="font-semibold">
                        R$ {ganhos.breakdown.n2.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Nível 3:</span>
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
                description: "Até 10% de comissão em vendas diretas, muito acima da média do mercado"
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
                <Button size="lg" variant="outline" asChild>
                  <a href="https://wa.me/553199999999">
                    Ainda Tenho Dúvidas
                  </a>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground pt-4">
                ✓ Sem investimento inicial • ✓ Cadastro em 5 minutos • ✓ Pagamentos via PIX
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
