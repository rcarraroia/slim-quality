import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WhatsAppButton } from "@/components/shared/WhatsAppButton";
import { Link } from "react-router-dom";

const ProductPage = () => {
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  const products = [
    {
      id: "solteiro",
      name: "Solteiro",
      dimensions: "88x188x28cm",
      pricePerDay: "7",
      comparison: "Menos que um café com pão de queijo",
      ideal: "Moradores de apartamentos compactos, quartos de solteiro",
      weight: "35kg",
      badge: null,
    },
    {
      id: "casal-padrao",
      name: "Casal Padrão",
      dimensions: "138x188x28cm",
      pricePerDay: "8,50",
      comparison: "Menos que uma pizza delivery",
      ideal: "Casais em quartos padrão, máximo custo-benefício",
      weight: "45kg",
      badge: "Mais Vendido",
    },
    {
      id: "queen",
      name: "Queen",
      dimensions: "158x198x28cm",
      pricePerDay: "9,80",
      comparison: "Menos que um combo de fast food",
      ideal: "Casais que valorizam mais espaço para dormir confortavelmente",
      weight: "52kg",
      badge: null,
    },
    {
      id: "king",
      name: "King",
      dimensions: "193x203x28cm",
      pricePerDay: "11,20",
      comparison: "Menos que um almoço no restaurante",
      ideal: "Quem busca máximo luxo, conforto e espaço disponível",
      weight: "62kg",
      badge: "Máximo Conforto",
    },
  ];

  return (
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
          {products.map((product) => (
            <Card 
              key={product.id}
              className={`transition-all duration-300 ${
                expandedProduct === product.id ? 'col-span-full shadow-2xl' : 'hover:shadow-xl hover:scale-[1.02]'
              }`}
            >
              <CardContent className="p-0">
                {expandedProduct !== product.id ? (
                  /* Card Collapsed */
                  <>
                    <div className="relative aspect-[4/3] bg-muted flex items-center justify-center">
                      <div className="text-center text-muted-foreground">
                        <div className="text-6xl mb-2">🛏️</div>
                        <p className="text-sm">Imagem lifestyle do colchão</p>
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
                        <h3 className="font-semibold text-2xl mb-1">Slim Quality {product.name}</h3>
                        <p className="text-sm text-muted-foreground">{product.ideal}</p>
                      </div>
                      <div>
                        <p className="text-4xl font-bold text-primary">R$ {product.pricePerDay}/dia</p>
                        <p className="text-sm text-muted-foreground">{product.comparison}</p>
                      </div>
                      <Button 
                        className="w-full" 
                        size="lg"
                        onClick={() => setExpandedProduct(product.id)}
                      >
                        Ver Detalhes
                      </Button>
                    </div>
                  </>
                ) : (
                  /* Card Expanded */
                  <div className="grid md:grid-cols-2 gap-8 p-8">
                    {/* Galeria */}
                    <div className="space-y-4">
                      <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                        <div className="text-center text-muted-foreground">
                          <div className="text-8xl mb-2">🛏️</div>
                          <p>Imagem principal</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                            <p className="text-xs text-muted-foreground">Foto {i}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Informações */}
                    <div className="space-y-6">
                      <div>
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h2 className="text-3xl font-bold mb-2">Slim Quality {product.name}</h2>
                            <p className="text-muted-foreground">{product.dimensions}</p>
                          </div>
                          {product.badge && (
                            <Badge className="bg-primary text-primary-foreground">{product.badge}</Badge>
                          )}
                        </div>

                        <div className="bg-primary/10 border-l-4 border-primary p-4 rounded-lg mb-6">
                          <p className="font-semibold mb-1">Ideal para:</p>
                          <p className="text-muted-foreground">{product.ideal}</p>
                        </div>

                        <div className="space-y-2">
                          <p className="text-4xl font-bold text-primary">
                            Invista em sua saúde por R$ {product.pricePerDay}/dia
                          </p>
                          <p className="text-lg text-muted-foreground">{product.comparison}</p>
                          <p className="text-sm text-muted-foreground">
                            Parcelamento disponível em até 12x
                          </p>
                        </div>
                      </div>

                      {/* Especificações */}
                      <div className="border rounded-lg p-4 space-y-2">
                        <h3 className="font-semibold mb-3">Especificações Técnicas</h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-muted-foreground">Dimensões</p>
                            <p className="font-medium">{product.dimensions}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Altura</p>
                            <p className="font-medium">28cm</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Peso</p>
                            <p className="font-medium">{product.weight}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Garantia</p>
                            <p className="font-medium">15 anos</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-muted-foreground">Tecnologias</p>
                            <p className="font-medium">8 incluídas</p>
                          </div>
                        </div>
                      </div>

                      <Link 
                        to="/tecnologias"
                        className="block text-center text-primary hover:underline font-medium"
                      >
                        Ver Todas as Tecnologias Incluídas →
                      </Link>

                      {/* CTAs */}
                      <div className="space-y-3 pt-4">
                        <WhatsAppButton
                          productName={`Slim Quality ${product.name}`}
                          message={`Olá BIA! Tenho interesse no Slim Quality ${product.name}`}
                          className="w-full"
                          size="lg"
                        />
                        <Button
                          variant="outline"
                          className="w-full"
                          size="lg"
                          onClick={() => setExpandedProduct(null)}
                        >
                          Comparar com outros tamanhos
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
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
              <WhatsAppButton
                message="Olá BIA! Preciso de ajuda para escolher o tamanho ideal do colchão"
                size="lg"
              />
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default ProductPage;
