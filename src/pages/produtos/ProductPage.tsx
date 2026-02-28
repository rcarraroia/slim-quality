import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageCircle } from "lucide-react";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { Link } from "react-router-dom";
import { useProducts } from "@/hooks/useProducts";
import { Package } from "lucide-react";
import { SEOHead } from "@/components/seo/SEOHead";

const ProductPage = () => {
  const [showChatWidget, setShowChatWidget] = useState(false);
  const { products, loading, error } = useProducts();

  return (
    <>
      <SEOHead 
        title="Colchões Magnéticos Terapêuticos | Todos os Tamanhos | Slim Quality"
        description="Escolha o tamanho ideal: Solteiro, Casal, Queen ou King. Colchões magnéticos com 240 ímãs, infravermelho longo e vibromassagem. A partir de R$ 3.190. Entrega grátis."
        keywords="colchão magnético solteiro, colchão magnético casal, colchão magnético queen, colchão magnético king, preço colchão magnético, comprar colchão terapêutico"
        canonical="https://slimquality.com.br/produtos"
        type="website"
      />
      
      <div className="flex flex-col">
      {/* Hero */}
      <section className="container px-4 py-16">
        <div className="text-center mb-12 space-y-4">
          <h1 className="text-5xl md:text-6xl font-bold">
            Encontre o Tamanho Ideal para Você
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Todos os modelos incluem as mesmas 8 tecnologias terapêuticas
          </p>
          <p className="text-sm text-muted-foreground">
            A diferença está apenas no tamanho e espaço disponível
          </p>
        </div>

        {/* Grid Interativo */}
        <div className="grid sm:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {loading ? (
            // Loading skeleton
            Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} className="animate-pulse">
                <CardContent className="p-0">
                  <div className="aspect-[4/3] bg-muted" />
                  <div className="p-6 space-y-4">
                    <div className="h-6 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-full" />
                    <div className="h-8 bg-muted rounded w-1/2" />
                    <div className="h-10 bg-muted rounded w-full" />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : error ? (
            <div className="col-span-full text-center py-12">
              <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Erro ao carregar produtos</h3>
              <p className="text-muted-foreground">Tente recarregar a página</p>
            </div>
          ) : products.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum produto disponível</h3>
              <p className="text-muted-foreground">Em breve novos produtos serão adicionados</p>
            </div>
          ) : (
            products.map((product) => (
              <Card 
                key={product.id}
                className="transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
              >
                <CardContent className="p-0">
                  <div className="relative aspect-[4/3] bg-muted flex items-center justify-center">
                    {product.image ? (
                      <img 
                        src={product.image} 
                        alt={`Colchão magnético terapêutico Slim Quality ${product.name} - ${product.dimensions} - 240 ímãs de 800 Gauss`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="text-center text-muted-foreground">
                        <div className="text-6xl mb-2">🛏️</div>
                        <p className="text-sm">Imagem lifestyle do colchão</p>
                      </div>
                    )}
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
                      <h3 className="font-semibold text-2xl mb-1">Slim Quality {product.name}</h3>
                      <p className="text-sm text-muted-foreground">{product.ideal}</p>
                    </div>
                    <Link to={`/produtos/${product.slug}`}>
                      <Button 
                        className="w-full" 
                        size="lg"
                      >
                        Ver Detalhes
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>

      {/* Rodapé */}
      <section className="bg-muted py-16">
        <div className="container px-4">
          <Card className="max-w-2xl mx-auto text-center">
            <CardContent className="p-8 space-y-4">
              <h3 className="text-2xl font-bold">Não sabe qual tamanho escolher?</h3>
              <p className="text-muted-foreground">
                A BIA pode ajudar você a encontrar o modelo ideal
              </p>
              <Button
                onClick={() => setShowChatWidget(true)}
                size="lg"
                className="transition-all duration-300 hover:scale-[1.05]"
              >
                <MessageCircle className="mr-2 h-5 w-5" />
                Falar com BIA
              </Button>
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
    </>
  );
};

export default ProductPage;