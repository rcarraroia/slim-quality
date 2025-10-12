import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WhatsAppButton } from "@/components/shared/WhatsAppButton";
import { CheckCircle, Star, Moon, Heart, Brain, Wind, User } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  const scrollToNext = () => {
    document.getElementById('problems')?.scrollIntoView({ behavior: 'smooth' });
  };

  const problems = [
    {
      icon: Moon,
      title: "Insônia e Fadiga Crônica",
      description: "Dificuldade para dormir, acordar cansado, sono não reparador",
      link: "/tecnologias#bioquantica"
    },
    {
      icon: User,
      title: "Dores Musculares e Coluna",
      description: "Cervical, lombar, tensões, contraturas, fibromialgia",
      link: "/tecnologias#magnetico"
    },
    {
      icon: Heart,
      title: "Problemas Circulatórios",
      description: "Pernas pesadas, câimbras, formigamentos, varizes",
      link: "/tecnologias#magnetico"
    },
    {
      icon: Brain,
      title: "Estresse e Ansiedade",
      description: "Tensão mental, irritabilidade, esgotamento emocional",
      link: "/tecnologias#vibromassagem"
    },
    {
      icon: Wind,
      title: "Alergias e Problemas Respiratórios",
      description: "Rinite, asma, sensibilidade a ácaros e fungos",
      link: "/tecnologias#sanitario"
    },
  ];

  const products = [
    { 
      name: "Solteiro", 
      dimensions: "88x188x28cm", 
      pricePerDay: "7",
      comparison: "Menos que um café com pão de queijo",
      ideal: "Ideal para 1 pessoa, quartos compactos",
      badge: null 
    },
    { 
      name: "Casal Padrão", 
      dimensions: "138x188x28cm", 
      pricePerDay: "8,50",
      comparison: "Menos que uma pizza delivery",
      ideal: "Casais em quartos padrão, máximo custo-benefício",
      badge: "Mais Vendido" 
    },
    { 
      name: "Queen", 
      dimensions: "158x198x28cm", 
      pricePerDay: "9,80",
      comparison: "Menos que um combo de fast food",
      ideal: "Casais que valorizam mais espaço",
      badge: null 
    },
    { 
      name: "King", 
      dimensions: "193x203x28cm", 
      pricePerDay: "11,20",
      comparison: "Menos que um almoço no restaurante",
      ideal: "Máximo luxo, conforto e espaço",
      badge: "Máximo Conforto" 
    },
  ];

  const testimonials = [
    {
      name: "Maria Silva",
      age: "52 anos",
      problem: "Insônia",
      text: "Sofria com insônia há 15 anos. Após 3 semanas no Slim Quality, durmo 8 horas por noite pela primeira vez.",
      avatar: "MS",
    },
    {
      name: "João Pereira",
      age: "45 anos",
      problem: "Dores na Lombar",
      text: "Trabalhava sentado 10h por dia. Minhas dores na lombar desapareceram em 1 mês.",
      avatar: "JP",
    },
    {
      name: "Ana Costa",
      age: "38 anos",
      problem: "Má Circulação",
      text: "Minhas pernas não ficam mais pesadas. As câimbras noturnas acabaram completamente.",
      avatar: "AC",
    },
    {
      name: "Carlos Santos",
      age: "60 anos",
      problem: "Fibromialgia",
      text: "Convivia com dores generalizadas há 20 anos. Hoje acordo sem dor e com disposição.",
      avatar: "CS",
    },
  ];

  return (
    <div className="flex flex-col">
      {/* Hero Consultivo */}
      <section className="min-h-[90vh] flex items-center bg-gradient-to-b from-primary/10 via-background to-background">
        <div className="container px-4 py-24">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <h1 className="text-6xl md:text-7xl font-bold tracking-tight leading-tight">
                Você Merece Acordar Sem Dores
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed">
                Descubra como a magnetoterapia pode transformar suas noites e seus dias
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button size="lg" onClick={scrollToNext} className="text-lg px-8 py-6">
                  Descubra Como
                </Button>
                <WhatsAppButton 
                  size="lg" 
                  variant="outline"
                  message="Olá! Quero conhecer os colchões Slim Quality"
                  className="text-lg px-8 py-6"
                />
              </div>
            </div>
            <div className="relative aspect-square md:aspect-auto md:h-[600px] rounded-2xl bg-muted overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <div className="text-8xl mb-4">😊</div>
                  <p className="text-lg">Imagem: Pessoa acordando feliz</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problemas que Resolvemos */}
      <section id="problems" className="container px-4 py-24">
        <h2 className="text-5xl md:text-6xl font-bold text-center mb-8">
          Problemas que Transformamos em Bem-Estar
        </h2>
        <p className="text-xl text-center text-muted-foreground mb-16 max-w-3xl mx-auto">
          Identifique-se com algum destes desafios? Nós temos a solução.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {problems.map((problem, index) => (
            <Card key={index} className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <CardContent className="p-8 space-y-4">
                <problem.icon className="h-16 w-16 text-primary" />
                <h3 className="text-2xl font-semibold">{problem.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {problem.description}
                </p>
                <Link 
                  to={problem.link}
                  className="inline-flex items-center text-primary hover:underline font-medium"
                >
                  Saiba como resolver →
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Como a Magnetoterapia Funciona */}
      <section className="bg-muted py-24">
        <div className="container px-4">
          <div className="grid md:grid-cols-2 gap-16 items-center max-w-6xl mx-auto">
            <div className="space-y-6">
              <h2 className="text-5xl font-bold leading-tight">
                A Ciência Por Trás da Transformação
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                A magnetoterapia utiliza campos magnéticos para estimular a circulação sanguínea, 
                reduzir inflamações e promover o equilíbrio natural do corpo. Combinada com outras 
                7 tecnologias terapêuticas, cria um ambiente perfeito para regeneração durante o sono.
              </p>
              <div className="bg-primary/10 border-l-4 border-primary p-6 rounded-lg">
                <p className="text-2xl font-bold">
                  240 ímãs + 7 tecnologias = alívio comprovado
                </p>
              </div>
              <Link 
                to="/tecnologias"
                className="inline-flex items-center text-primary hover:underline font-semibold text-lg"
              >
                Conheça todas as 8 tecnologias →
              </Link>
            </div>
            <div className="relative aspect-square rounded-2xl bg-background flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <div className="text-9xl mb-4">🧲</div>
                <p className="text-lg">Infográfico: Campo magnético terapêutico</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Escolha Seu Tamanho */}
      <section className="container px-4 py-24">
        <div className="text-center mb-16">
          <h2 className="text-5xl md:text-6xl font-bold mb-6">
            Escolha o Tamanho Ideal para Você
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Todos os modelos incluem as mesmas 8 tecnologias terapêuticas
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
          {products.map((product, index) => (
            <Card key={index} className="hover:shadow-xl transition-all duration-300 hover:scale-[1.02] overflow-hidden">
              <CardContent className="p-0">
                <div className="relative aspect-[3/4] bg-muted flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <div className="text-6xl mb-2">🛏️</div>
                    <p className="text-sm px-4">Imagem lifestyle do colchão</p>
                  </div>
                  <Badge className="absolute top-4 right-4 bg-muted text-muted-foreground border">
                    {product.dimensions}
                  </Badge>
                  {product.badge && (
                    <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground">
                      {product.badge}
                    </Badge>
                  )}
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <h3 className="font-semibold text-xl mb-1">Slim Quality {product.name}</h3>
                    <p className="text-sm text-muted-foreground">{product.ideal}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-4xl font-bold text-primary">
                      R$ {product.pricePerDay}/dia
                    </p>
                    <p className="text-sm text-muted-foreground">{product.comparison}</p>
                  </div>
                  <Link to="/produtos">
                    <Button className="w-full" size="lg">
                      Conhecer Detalhes
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Depoimentos Reais */}
      <section className="bg-muted py-24">
        <div className="container px-4">
          <h2 className="text-5xl md:text-6xl font-bold text-center mb-16">
            Histórias de Transformação
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-l-4 border-l-primary">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <p className="font-semibold">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.age}</p>
                    </div>
                  </div>
                  <p className="text-lg leading-relaxed italic">"{testimonial.text}"</p>
                  <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                    {testimonial.problem}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="bg-gradient-to-br from-primary/20 via-secondary/20 to-primary/20 py-24">
        <div className="container px-4 text-center space-y-8">
          <h2 className="text-5xl md:text-6xl font-bold max-w-4xl mx-auto leading-tight">
            Pronta para Transformar Suas Noites?
          </h2>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            Converse com a BIA, nossa especialista virtual, sem compromisso
          </p>
          <div className="pt-4">
            <WhatsAppButton 
              size="lg"
              message="Olá BIA! Quero saber mais sobre os colchões Slim Quality"
              className="text-lg px-10 py-7 shadow-xl"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Atendimento personalizado • Tire todas as suas dúvidas
          </p>
        </div>
      </section>
    </div>
  );
};

export default Index;
