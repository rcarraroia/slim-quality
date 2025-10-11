import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WhatsAppButton } from "@/components/shared/WhatsAppButton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Package, Zap, Star, CheckCircle, AlertTriangle } from "lucide-react";
import { useParams } from "react-router-dom";

interface ProductData {
  name: string;
  slug: string;
  price: number;
  dimensions: string;
  weight: string;
  badge?: string;
  rating: number;
  reviews: number;
}

const products: Record<string, ProductData> = {
  "solteiro": {
    name: "Solteiro",
    slug: "solteiro",
    price: 2990,
    dimensions: "88cm x 188cm x 28cm",
    weight: "35kg",
    rating: 4.9,
    reviews: 847,
  },
  "casal-padrao": {
    name: "Casal Padrão",
    slug: "casal-padrao",
    price: 3690,
    dimensions: "138cm x 188cm x 28cm",
    weight: "45kg",
    badge: "Mais Vendido",
    rating: 4.9,
    reviews: 1247,
  },
  "queen": {
    name: "Queen",
    slug: "queen",
    price: 4290,
    dimensions: "158cm x 198cm x 28cm",
    weight: "52kg",
    rating: 4.8,
    reviews: 623,
  },
  "king": {
    name: "King",
    slug: "king",
    price: 4890,
    dimensions: "193cm x 203cm x 28cm",
    weight: "58kg",
    rating: 4.9,
    reviews: 412,
  },
};

const technologies = [
  { icon: "🧲", title: "Sistema Magnético", description: "240 ímãs de 800 Gauss para circulação", badge: "Exclusivo" },
  { icon: "🌡️", title: "Infravermelho Longo", description: "Penetração profunda nos tecidos" },
  { icon: "⚡", title: "Energia Bioquântica", description: "Equilíbrio energético celular" },
  { icon: "📳", title: "Vibromassagem", description: "8 motores para relaxamento total" },
  { icon: "🔷", title: "Densidade Progressiva", description: "7 camadas de conforto adaptativo" },
  { icon: "🌈", title: "Cromoterapia", description: "Cores terapêuticas integradas" },
  { icon: "📐", title: "Perfilado Rabatan", description: "Design ergonômico para coluna" },
  { icon: "🦠", title: "Tratamento Sanitário", description: "Antiácaro e antifungo permanente" },
];

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const product = slug ? products[slug] : null;

  if (!product) {
    return (
      <div className="container px-4 py-16 text-center">
        <h1 className="text-4xl font-bold mb-4">Produto não encontrado</h1>
        <Button asChild>
          <a href="/">Voltar para Home</a>
        </Button>
      </div>
    );
  }

  const installmentValue = (product.price / 12).toFixed(2);
  const pixPrice = (product.price * 0.9).toFixed(2);

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="bg-muted py-12">
        <div className="container px-4">
          <div className="grid md:grid-cols-[60%_40%] gap-8 items-start">
            {/* Product Image */}
            <div className="relative aspect-square bg-background rounded-lg overflow-hidden flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <div className="text-8xl mb-4">🛏️</div>
                <p>Imagem do Slim Quality {product.name}</p>
              </div>
            </div>

            {/* Product Info Box */}
            <Card className="sticky top-20">
              <CardContent className="p-6 space-y-4">
                {product.badge && (
                  <Badge className="bg-accent text-accent-foreground">{product.badge}</Badge>
                )}
                <h1 className="text-3xl font-bold">Slim Quality {product.name}</h1>
                <p className="text-muted-foreground">{product.dimensions}</p>
                
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    ({product.rating}/5) {product.reviews.toLocaleString()} avaliações
                  </span>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-4xl font-bold">
                    R$ {product.price.toLocaleString('pt-BR')}
                  </p>
                  <p className="text-muted-foreground mt-1">
                    ou 12x de R$ {installmentValue} sem juros
                  </p>
                  <div className="bg-success/10 text-success p-3 rounded-md mt-3 flex items-center gap-2">
                    <span className="text-2xl">💰</span>
                    <div>
                      <p className="font-semibold">R$ {pixPrice} à vista no PIX</p>
                      <p className="text-sm">10% de desconto</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-4">
                  <WhatsAppButton 
                    productName={`Slim Quality ${product.name}`}
                    size="lg"
                    className="w-full"
                  />
                  <Button size="lg" variant="outline" className="w-full">
                    Comprar Agora
                  </Button>
                </div>

                <div className="space-y-2 pt-4 border-t text-sm">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <span>15 anos de garantia</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    <span>Frete grátis para sua região</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Ideal Para Section */}
      <section className="container px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Ideal Para Você Que...</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6 text-center space-y-3">
              <div className="text-4xl">💪</div>
              <h3 className="font-semibold text-lg">Sofre com Dores na Coluna</h3>
              <p className="text-sm text-muted-foreground">
                Sistema magnético e densidade progressiva aliviam dores e melhoram postura
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center space-y-3">
              <div className="text-4xl">😴</div>
              <h3 className="font-semibold text-lg">Tem Problemas de Sono</h3>
              <p className="text-sm text-muted-foreground">
                Tecnologias terapêuticas promovem relaxamento e sono profundo
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center space-y-3">
              <div className="text-4xl">❤️</div>
              <h3 className="font-semibold text-lg">Busca Bem-Estar</h3>
              <p className="text-sm text-muted-foreground">
                Combine saúde, conforto e tecnologia para melhor qualidade de vida
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Technologies Section */}
      <section className="bg-muted py-16">
        <div className="container px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            8 Tecnologias Que Transformam Seu Sono
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {technologies.map((tech, index) => (
              <Card key={index}>
                <CardContent className="p-6 space-y-3">
                  <div className="text-4xl">{tech.icon}</div>
                  {tech.badge && (
                    <Badge variant="secondary">{tech.badge}</Badge>
                  )}
                  <h3 className="font-semibold">{tech.title}</h3>
                  <p className="text-sm text-muted-foreground">{tech.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Specifications Section */}
      <section className="container px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Especificações Completas</h2>
        <Card className="max-w-3xl mx-auto">
          <CardContent className="p-0">
            <table className="w-full">
              <tbody className="divide-y">
                <tr className="hover:bg-muted/50 transition-colors">
                  <td className="p-4 font-medium">Dimensões</td>
                  <td className="p-4 text-muted-foreground">{product.dimensions}</td>
                </tr>
                <tr className="hover:bg-muted/50 transition-colors">
                  <td className="p-4 font-medium">Peso</td>
                  <td className="p-4 text-muted-foreground">{product.weight}</td>
                </tr>
                <tr className="hover:bg-muted/50 transition-colors">
                  <td className="p-4 font-medium">Ímãs</td>
                  <td className="p-4 text-muted-foreground">240 unidades de 800 Gauss</td>
                </tr>
                <tr className="hover:bg-muted/50 transition-colors">
                  <td className="p-4 font-medium">Camadas</td>
                  <td className="p-4 text-muted-foreground">7 camadas de conforto</td>
                </tr>
                <tr className="hover:bg-muted/50 transition-colors">
                  <td className="p-4 font-medium">Revestimento</td>
                  <td className="p-4 text-muted-foreground">Antiácaros permanente</td>
                </tr>
                <tr className="hover:bg-muted/50 transition-colors">
                  <td className="p-4 font-medium">Voltagem</td>
                  <td className="p-4 text-muted-foreground">Bivolt (110V/220V)</td>
                </tr>
                <tr className="hover:bg-muted/50 transition-colors">
                  <td className="p-4 font-medium">Garantia</td>
                  <td className="p-4 text-muted-foreground">15 anos estrutura</td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>

      {/* Warranties Section */}
      <section className="bg-muted py-16">
        <div className="container px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Garantias</h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Card>
              <CardContent className="p-6 text-center space-y-3">
                <Shield className="h-12 w-12 mx-auto text-primary" />
                <h3 className="font-semibold">15 Anos de Garantia</h3>
                <p className="text-sm text-muted-foreground">Estrutura e imantação</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center space-y-3">
                <Package className="h-12 w-12 mx-auto text-primary" />
                <h3 className="font-semibold">120 Dias de Garantia</h3>
                <p className="text-sm text-muted-foreground">Revestimento</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center space-y-3">
                <Zap className="h-12 w-12 mx-auto text-primary" />
                <h3 className="font-semibold">1 Ano de Garantia</h3>
                <p className="text-sm text-muted-foreground">Sistema eletrônico</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Contraindication Alert */}
      <section className="container px-4 py-8">
        <Alert className="max-w-3xl mx-auto border-warning bg-warning/10">
          <AlertTriangle className="h-5 w-5 text-warning" />
          <AlertDescription className="text-warning-foreground">
            <strong>IMPORTANTE:</strong> Contraindicado para portadores de marca-passo devido aos ímãs de 800 Gauss.
          </AlertDescription>
        </Alert>
      </section>

      {/* Final CTA */}
      <section className="bg-gradient-to-r from-primary to-secondary py-16">
        <div className="container px-4 text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Pronto Para Ter o Seu?
          </h2>
          <p className="text-lg text-white/90">
            Fale com nosso especialista e tire todas as suas dúvidas
          </p>
          <WhatsAppButton 
            productName={`Slim Quality ${product.name}`}
            size="lg"
            variant="secondary"
            className="bg-white text-primary hover:bg-white/90"
          />
        </div>
      </section>
    </div>
  );
}
