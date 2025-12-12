import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Package } from "lucide-react";
import { WhatsAppButton } from "@/components/shared/WhatsAppButton";
import { useProducts } from "@/hooks/useProducts";

export default function ProdutoDetalhe() {
  const { slug } = useParams<{ slug: string }>();
  const { products, loading, error } = useProducts();
  
  // Encontrar produto pelo slug
  const product = products.find(p => p.slug === slug);

  if (loading) {
    return (
      <div className="container py-24">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="h-12 bg-muted rounded animate-pulse" />
          <div className="grid md:grid-cols-2 gap-8">
            <div className="aspect-square bg-muted rounded-xl animate-pulse" />
            <div className="space-y-4">
              <div className="h-8 bg-muted rounded animate-pulse" />
              <div className="h-6 bg-muted rounded animate-pulse" />
              <div className="h-6 bg-muted rounded animate-pulse" />
              <div className="h-12 bg-muted rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {

  if (error || !product) {
    return (
      <div className="container py-24 text-center">
        <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-4xl font-bold">Produto Não Encontrado</h1>
        <p className="text-muted-foreground mt-4">
          {error ? 'Erro ao carregar produto.' : 'Verifique o link ou volte para a lista de produtos.'}
        </p>
        <Link to="/produtos">
          <Button className="mt-6">Ver Todos os Produtos</Button>
        </Link>
      </div>
    );
  }

  // Calcular preço formatado
  const priceFormatted = (product.price / 100).toLocaleString('pt-BR', { 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2 
  });

  // Features baseadas nos dados reais do produto
  const features = [
    "8 Tecnologias Terapêuticas",
    "15 Anos de Garantia",
    `Dimensões: ${product.dimensions}`,
    product.badge || "Qualidade Premium"
  ];

  return (
    <div className="container px-4 py-24">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold">Slim Quality {product.name}</h1>
          {product.badge && (
            <Badge className="bg-primary text-primary-foreground text-lg px-4 py-2">
              {product.badge}
            </Badge>
          )}
        </div>
        
        <div className="grid md:grid-cols-2 gap-8">
          {/* Imagem do Produto */}
          <div className="aspect-square bg-muted rounded-xl flex items-center justify-center overflow-hidden">
            {product.image ? (
              <img 
                src={product.image} 
                alt={`Slim Quality ${product.name}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center text-muted-foreground">
                <div className="text-9xl mb-4">🛏️</div>
                <p>Imagem do Colchão {product.name}</p>
              </div>
            )}
          </div>
          
          {/* Informações do Produto */}
          <Card className="p-6 space-y-6">
            <div className="space-y-2">
              <p className="text-4xl font-bold text-primary">
                R$ {priceFormatted}
              </p>
              <p className="text-lg text-muted-foreground">
                Ou R$ {product.pricePerDay}/dia
              </p>
              <p className="text-sm text-muted-foreground">
                {product.comparison}
              </p>
            </div>
            
            <div className="space-y-3">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-success shrink-0" />
                  <span className="text-lg">{feature}</span>
                </div>
              ))}
            </div>

            <div className="bg-primary/10 border-l-4 border-primary p-4 rounded-lg">
              <p className="font-semibold mb-1">Ideal para:</p>
              <p className="text-muted-foreground">{product.ideal}</p>
            </div>
            
            <WhatsAppButton 
              productName={`Slim Quality ${product.name}`}
              message={`Olá BIA! Tenho interesse no Slim Quality ${product.name} (${product.dimensions}) - R$ ${priceFormatted}`}
              className="w-full"
              size="lg"
            />
            
            <Link to="/produtos">
              <Button variant="outline" className="w-full">
                Comparar Modelos
              </Button>
            </Link>
          </Card>
        </div>

        {/* Especificações Técnicas */}
        <Card className="p-6">
          <h3 className="text-2xl font-bold mb-6">Especificações Técnicas</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold text-primary">{product.dimensions}</p>
              <p className="text-sm text-muted-foreground">Dimensões</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold text-primary">28cm</p>
              <p className="text-sm text-muted-foreground">Altura</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold text-primary">240</p>
              <p className="text-sm text-muted-foreground">Ímãs Terapêuticos</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold text-primary">15 anos</p>
              <p className="text-sm text-muted-foreground">Garantia</p>
            </div>
          </div>
        </Card>
        
        <div className="text-center pt-8">
          <Link 
            to="/tecnologias"
            className="inline-flex items-center text-primary hover:underline font-semibold text-lg"
          >
            Conheça as 8 Tecnologias Terapêuticas Incluídas →
          </Link>
        </div>
      </div>
    </div>
  );
}