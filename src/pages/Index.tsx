import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { SEOHead } from "@/components/seo/SEOHead";
import { SchemaOrg } from "@/components/seo/SchemaOrg";
import { SectionBenefits } from "@/components/seo/SectionBenefits";
import { SectionHowItWorks } from "@/components/seo/SectionHowItWorks";
import { FAQ } from "@/components/seo/FAQ";
import { Moon, Heart, Brain, Wind, User, Droplet, Package } from "lucide-react";
import { Link } from "react-router-dom";
import { useProducts } from "@/hooks/useProducts";
import { useState } from "react";

const Index = () => {
  const { products, loading: productsLoading, error: productsError } = useProducts();
  const [showChatWidget, setShowChatWidget] = useState(false);
  
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
      icon: Droplet,
      title: "Inchaço nas Pernas e Retenção de Líquidos",
      description: "Sintomas como peso nas pernas e tornozelos inchados.",
      link: "/tecnologias#magnetico"
    },
    {
      icon: Wind,
      title: "Alergias e Problemas Respiratórios",
      description: "Rinite, asma, sensibilidade a ácaros e fungos",
      link: "/tecnologias#sanitario"
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
    <>
      {/* SEO Head */}
      <SEOHead 
        title="Colchão Magnético Terapêutico Slim Quality - Alívio de Dores e Melhor Sono"
        description="Colchão magnético terapêutico com 240 ímãs, infravermelho longo e vibromassagem. Alívio de dores, melhora da circulação e sono profundo. Entrega em todo Brasil."
        keywords="colchão magnético, colchão terapêutico, magnetoterapia, alívio dores, insônia, circulação sanguínea, colchão ortopédico, fibromialgia, artrite"
        ogImage="https://slimquality.com.br/og-image.jpg"
        ogUrl="https://slimquality.com.br"
        canonical="https://slimquality.com.br"
        type="website"
      />
      
      {/* Schema.org Organization */}
      <SchemaOrg type="organization" />
      
      <div className="flex flex-col">
      {/* Hero Consultivo */}
      <section className="min-h-[90vh] flex items-center bg-gradient-to-b from-primary/10 via-background to-background">
        <div className="container px-4 py-16 md:py-24">
          <div className="grid md:grid-cols-[60%_40%] md:gap-16 items-center">
            <div className="space-y-6 md:space-y-8 md:pr-8">
              <h1 className="text-4xl sm:text-5xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Colchão Magnético<br />Terapêutico
              </h1>
              <h2 className="text-3xl md:text-4xl font-medium text-primary mt-4">
                Você Merece Acordar Sem Dores
              </h2>
              <p className="text-lg text-gray-600 mt-6 leading-relaxed">
                Descubra como a magnetoterapia com 240 ímãs pode transformar suas noites e seus dias. 
                Alívio comprovado para dores crônicas, insônia e problemas circulatórios.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button size="lg" onClick={scrollToNext} className="text-lg px-8 py-6 transition-all duration-300 hover:scale-[1.02]">
                  Descubra Como
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={() => setShowChatWidget(true)}
                  className="text-lg px-8 py-6 transition-all duration-300 hover:scale-[1.02]"
                >
                  Fale com Especialista
                </Button>
              </div>
            </div>
            <div className="relative aspect-square md:aspect-auto md:h-[500px] rounded-2xl bg-muted overflow-hidden order-first md:order-last">
              {/* Video Element */}
              <video
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
                // Poster é recomendado para fallback, mas usaremos o placeholder.svg como exemplo
                poster="/placeholder.svg" 
              >
                <source src="/videos/acordando_feliz.mp4" type="video/mp4" />
                Seu navegador não suporta o elemento de vídeo.
              </video>
              {/* Fim do Video Element */}
            </div>
          </div>
        </div>
      </section>

      {/* Problemas que Resolvemos */}
      <section id="problems" className="container px-4 py-16 md:py-24">
        <h2 className="text-3xl md:text-5xl font-bold text-center mb-8">
          Problemas que Transformamos em Bem-Estar
        </h2>
        <p className="text-lg text-center text-muted-foreground mb-12 md:mb-16 max-w-3xl mx-auto">
          Identifique-se com algum destes desafios? Nós temos a solução.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
          {problems.map((problem, index) => (
            <Card key={index} className="transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
              <CardContent className="p-6 md:p-8 space-y-4">
                <problem.icon className="h-12 w-12 md:h-16 md:w-16 text-primary" />
                <h3 className="text-xl md:text-2xl font-semibold">{problem.title}</h3>
                <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
                  {problem.description}
                </p>
                <Link 
                  to={problem.link}
                  className="inline-flex items-center text-primary hover:underline font-medium text-sm"
                >
                  Saiba como resolver →
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Como a Magnetoterapia Funciona */}
      <section className="bg-muted py-16 md:py-24">
        <div className="container px-4">
          <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center max-w-6xl mx-auto">
            <div className="space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold leading-tight">
                A Ciência Por Trás da Transformação
              </h2>
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                A magnetoterapia utiliza campos magnéticos para estimular a circulação sanguínea, 
                reduzir inflamações e promover o equilíbrio natural do corpo. Combinada com outras 
                7 tecnologias terapêuticas, cria um ambiente perfeito para regeneração durante o sono.
              </p>
              <div className="bg-primary/10 border-l-4 border-primary p-4 md:p-6 rounded-lg">
                <p className="text-xl md:text-2xl font-bold">
                  240 ímãs + 7 tecnologias = alívio comprovado
                </p>
              </div>
              <Link 
                to="/tecnologias"
                className="inline-flex items-center text-primary hover:underline font-semibold text-lg transition-colors"
              >
                Conheça todas as 8 tecnologias →
              </Link>
            </div>
            <div className="relative rounded-2xl bg-background flex items-center justify-center shadow-lg overflow-hidden">
              <img 
                src="/images/infografico-magnetoterapia.png" 
                alt="Infográfico: 240 ímãs + 7 tecnologias = alívio comprovado" 
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Escolha Seu Tamanho */}
      <section id="products" className="container px-4 py-16 md:py-24">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Escolha o Tamanho Ideal para Você
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Todos os modelos incluem as mesmas 8 tecnologias terapêuticas
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-6 md:gap-8 max-w-5xl mx-auto">
          {productsLoading ? (
            // Loading skeleton
            Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} className="overflow-hidden animate-pulse">
                <CardContent className="p-0">
                  <div className="aspect-[4/3] bg-muted" />
                  <div className="p-6 space-y-4">
                    <div className="h-6 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                    <div className="h-10 bg-muted rounded w-full" />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : productsError ? (
            // Error state
            <div className="col-span-full text-center py-12">
              <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Erro ao carregar produtos</h3>
              <p className="text-muted-foreground">Tente recarregar a página</p>
            </div>
          ) : products.length === 0 ? (
            // Empty state
            <div className="col-span-full text-center py-12">
              <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum produto disponível</h3>
              <p className="text-muted-foreground">Em breve novos produtos serão adicionados</p>
            </div>
          ) : (
            // Products from database
            products.map((product) => (
              <Card key={product.id} className="transition-all duration-300 hover:shadow-xl hover:scale-[1.02] overflow-hidden">
                <CardContent className="p-0">
                  <div className="relative aspect-[4/3] bg-muted flex items-center justify-center overflow-hidden">
                    {product.image ? (
                      <img 
                        src={product.image} 
                        alt={`Slim Quality ${product.name}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center text-muted-foreground">
                        <div className="text-6xl mb-2">🛏️</div>
                        <p className="text-sm px-4">Imagem lifestyle do colchão</p>
                      </div>
                    )}
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <h3 className="font-semibold text-xl mb-2">Slim Quality {product.name}</h3>
                      <p className="text-sm text-muted-foreground">{product.dimensions}</p>
                    </div>
                    <Link to={`/produtos/${product.slug}`}>
                      <Button className="w-full transition-all duration-300" size="lg">
                        Conhecer Detalhes
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>

      {/* Seção Benefícios - SEO Otimizada */}
      <SectionBenefits />

      {/* Seção Como Funciona - SEO Otimizada */}
      <SectionHowItWorks />

      {/* Depoimentos Reais */}
      <section className="bg-muted py-16 md:py-24">
        <div className="container px-4">
          <h2 className="text-3xl md:text-5xl font-bold text-center mb-12 md:mb-16">
            Histórias de Transformação
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 max-w-7xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-l-4 border-l-primary transition-all duration-300 hover:shadow-xl">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm flex-shrink-0">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <p className="font-semibold">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.age}</p>
                    </div>
                  </div>
                  <p className="text-base leading-relaxed italic">"{testimonial.text}"</p>
                  <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                    {testimonial.problem}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ - SEO Otimizada */}
      <FAQ />

      {/* CTA Final */}
      <section className="bg-gradient-to-br from-primary/20 via-secondary/20 to-primary/20 py-16 md:py-24">
        <div className="container px-4 text-center space-y-6 md:space-y-8">
          <h2 className="text-3xl md:text-5xl font-bold max-w-4xl mx-auto leading-tight">
            Pronta para Transformar Suas Noites?
          </h2>
          <p className="text-lg md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            Converse com a BIA, nossa especialista virtual, sem compromisso
          </p>
          <div className="pt-4">
            <Button 
              size="lg"
              onClick={() => setShowChatWidget(true)}
              className="text-lg px-10 py-7 shadow-xl transition-all duration-300 hover:scale-[1.05]"
            >
              Fale com Especialista
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Atendimento personalizado • Tire todas as suas dúvidas
          </p>
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
    </>
  );
};

export default Index;