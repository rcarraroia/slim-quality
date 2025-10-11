import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WhatsAppButton } from "@/components/shared/WhatsAppButton";
import { Truck, Shield, CreditCard, Scale, CheckCircle, Star } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  const scrollToProducts = () => {
    document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
  };

  const benefits = [
    { icon: Truck, title: "Entrega em Todo Brasil", subtitle: "7 a 30 dias úteis" },
    { icon: Shield, title: "15 Anos de Garantia", subtitle: "Certificado de fábrica" },
    { icon: CreditCard, title: "12x Sem Juros", subtitle: "Ou PIX com desconto" },
    { icon: Scale, title: "Suporta até 400kg", subtitle: "Estrutura reforçada" },
  ];

  const products = [
    { name: "Solteiro", price: 2990, dimensions: "88x188x28cm", badge: null },
    { name: "Casal Padrão", price: 3690, dimensions: "138x188x28cm", badge: "Mais Vendido" },
    { name: "Queen", price: 4290, dimensions: "158x198x28cm", badge: null },
    { name: "King", price: 4890, dimensions: "193x203x28cm", badge: null },
  ];

  const technologies = [
    {
      icon: "🧲",
      title: "Sistema Magnético - 240 Ímãs",
      description: "Melhora circulação sanguínea, reduz dores e acelera recuperação muscular",
      benefits: ["Reduz processos inflamatórios", "Melhora oxigenação dos tecidos", "Alivia dores musculares"],
    },
    {
      icon: "🌡️",
      title: "Infravermelho Longo",
      description: "Tecnologia que penetra profundamente nos tecidos promovendo bem-estar",
      benefits: ["Acelera recuperação celular", "Melhora qualidade do sono", "Reduz fadiga muscular"],
    },
    {
      icon: "📳",
      title: "Vibromassagem - 8 Motores",
      description: "Sistema de massagem que relaxa todo o corpo",
      benefits: ["Relaxamento profundo", "Reduz tensão muscular", "Melhora circulação"],
    },
    {
      icon: "🦠",
      title: "Antiácaro e Antifungo",
      description: "Tratamento sanitário permanente para sua proteção",
      benefits: ["Proteção contra ácaros", "Previne alergias", "Ambiente mais saudável"],
    },
  ];

  const testimonials = [
    {
      name: "Maria Silva",
      age: "52 anos",
      rating: 5,
      text: "Depois de 30 anos com dores na coluna, finalmente durmo sem acordar com dor. Melhor investimento que já fiz!",
      badge: "Cliente há 2 anos",
      avatar: "MS",
    },
    {
      name: "João Santos",
      age: "45 anos",
      rating: 5,
      text: "Minha insônia acabou! Durmo a noite toda e acordo revigorado. Recomendo demais!",
      badge: "Cliente há 1 ano",
      avatar: "JS",
    },
    {
      name: "Ana Costa",
      age: "38 anos",
      rating: 5,
      text: "O sistema de vibromassagem é incrível. Relaxo em minutos e durmo como nunca!",
      badge: "Cliente há 6 meses",
      avatar: "AC",
    },
  ];

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="container px-4 py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
              Transforme Suas Noites, Renove Sua Vida
            </h1>
            <p className="text-xl text-muted-foreground">
              Colchões magnéticos com 8 tecnologias terapêuticas. 15 anos de garantia.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <WhatsAppButton size="lg" />
              <Button size="lg" variant="outline" onClick={scrollToProducts}>
                Conhecer Produtos
              </Button>
            </div>
          </div>
          <div className="relative aspect-square md:aspect-auto md:h-[500px] rounded-lg bg-muted overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <div className="text-6xl mb-4">🛏️</div>
                <p>Imagem: Pessoa dormindo tranquila</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-muted py-16">
        <div className="container px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center space-y-3">
                  <benefit.icon className="h-12 w-12 mx-auto text-primary" />
                  <h3 className="font-semibold">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">{benefit.subtitle}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="products" className="container px-4 py-16">
        <h2 className="text-4xl font-bold text-center mb-12">
          Escolha o Colchão Ideal Para Você
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product, index) => (
            <Card key={index} className="hover:shadow-xl transition-all hover:scale-[1.02]">
              <CardContent className="p-0">
                <div className="relative aspect-square bg-muted flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <div className="text-4xl mb-2">🛏️</div>
                    <p className="text-sm">Imagem do produto</p>
                  </div>
                  {product.badge && (
                    <Badge className="absolute top-4 right-4 bg-accent text-accent-foreground">
                      {product.badge}
                    </Badge>
                  )}
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg">Slim Quality {product.name}</h3>
                    <p className="text-sm text-muted-foreground">{product.dimensions}</p>
                  </div>
                  <p className="text-3xl font-bold">
                    R$ {product.price.toLocaleString('pt-BR')}
                  </p>
                  <WhatsAppButton 
                    productName={`Slim Quality ${product.name}`}
                    className="w-full"
                  />
                  <Link 
                    to={`/produtos/${product.name.toLowerCase().replace(' ', '-')}`}
                    className="block text-center text-sm text-primary hover:underline"
                  >
                    Ver Detalhes
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Technologies Section */}
      <section className="bg-muted py-16">
        <div className="container px-4">
          <h2 className="text-4xl font-bold text-center mb-16">
            8 Tecnologias Terapêuticas
          </h2>
          <div className="space-y-24">
            {technologies.map((tech, index) => (
              <div 
                key={index}
                className={`grid md:grid-cols-2 gap-12 items-center ${
                  index % 2 === 1 ? 'md:flex-row-reverse' : ''
                }`}
              >
                <div className={`${index % 2 === 1 ? 'md:order-2' : ''}`}>
                  <div className="aspect-square bg-background rounded-lg flex items-center justify-center text-8xl">
                    {tech.icon}
                  </div>
                </div>
                <div className={`space-y-6 ${index % 2 === 1 ? 'md:order-1' : ''}`}>
                  <div>
                    <div className="text-4xl mb-4">{tech.icon}</div>
                    <h3 className="text-2xl font-bold mb-4">{tech.title}</h3>
                    <p className="text-muted-foreground">{tech.description}</p>
                  </div>
                  <ul className="space-y-3">
                    {tech.benefits.map((benefit, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-success shrink-0 mt-0.5" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="container px-4 py-16">
        <h2 className="text-4xl font-bold text-center mb-12">
          O Que Nossos Clientes Dizem
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="border-l-4 border-l-primary">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.age}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                  ))}
                </div>
                <p className="text-muted-foreground italic">"{testimonial.text}"</p>
                <Badge variant="secondary">{testimonial.badge}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gradient-to-r from-primary to-secondary py-24">
        <div className="container px-4 text-center space-y-6">
          <h2 className="text-4xl md:text-5xl font-bold text-white">
            Pronto Para Transformar Suas Noites?
          </h2>
          <p className="text-xl text-white/90 max-w-2xl mx-auto">
            Fale com nossos especialistas e descubra o colchão ideal
          </p>
          <Button 
            asChild 
            size="lg" 
            variant="secondary"
            className="bg-white text-primary hover:bg-white/90 shadow-lg"
          >
            <a 
              href="https://wa.me/5533998384177?text=Olá!%20Quero%20saber%20mais%20sobre%20os%20colchões%20Slim%20Quality"
              target="_blank"
              rel="noopener noreferrer"
            >
              Fale com Especialista Agora
            </a>
          </Button>
          <p className="text-sm text-white/80">
            Atendimento via WhatsApp • Sem compromisso
          </p>
        </div>
      </section>
    </div>
  );
};

export default Index;
