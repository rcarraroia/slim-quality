import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Package, ShoppingCart, MessageCircle } from "lucide-react";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { useProducts } from "@/hooks/useProducts";
import { AffiliateAwareCheckout } from "@/components/checkout/AffiliateAwareCheckout";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";

export default function ProdutoDetalhe() {
  const { slug } = useParams<{ slug: string }>();
  const { products, rawProducts, loading, error } = useProducts();
  const [showCheckout, setShowCheckout] = useState(false);
  const [showChatWidget, setShowChatWidget] = useState(false);
  
  // Encontrar produto pelo slug (usar dados formatados para exibição)
  const displayProduct = products.find(p => p.slug === slug);
  // Encontrar produto real pelo slug (usar dados reais para checkout)
  const rawProduct = rawProducts.find(p => p.slug === slug);

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

  if (error || !displayProduct || !rawProduct) {
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
  const priceFormatted = (rawProduct.price_cents / 100).toLocaleString('pt-BR', { 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2 
  });

  // Preparar dados do produto para checkout
  const checkoutProduct = {
    id: rawProduct.id,
    name: rawProduct.name,
    sku: rawProduct.sku,
    price_cents: rawProduct.price_cents,
    image: rawProduct.product_images?.[0]?.image_url
  };

  const handleOrderComplete = (orderId: string) => {
    console.log('Pedido criado:', orderId);
    setShowCheckout(false);
    // Aqui você pode redirecionar para página de confirmação
  };

  // Features baseadas nos dados reais do produto
  const features = [
    (rawProduct as any).therapeutic_technologies && `${(rawProduct as any).therapeutic_technologies} Tecnologias Terapêuticas`,
    (rawProduct as any).warranty_years && `${(rawProduct as any).warranty_years} Anos de Garantia`,
    `Dimensões: ${rawProduct.width_cm}×${rawProduct.length_cm}×${rawProduct.height_cm}cm`,
    (rawProduct as any).magnetic_count && `${(rawProduct as any).magnetic_count} Ímãs Terapêuticos`,
    "Qualidade Premium"
  ].filter(Boolean);

  return (
    <div className="container px-4 py-24">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold">Slim Quality {displayProduct.name}</h1>
          {displayProduct.badge && (
            <Badge className="bg-primary text-primary-foreground text-lg px-4 py-2">
              {displayProduct.badge}
            </Badge>
          )}
        </div>
        
        <div className="grid md:grid-cols-2 gap-8">
          {/* Imagem do Produto */}
          <div className="aspect-[4/3] bg-muted rounded-xl flex items-center justify-center overflow-hidden">
            {displayProduct.image ? (
              <img 
                src={displayProduct.image} 
                alt={`Slim Quality ${displayProduct.name}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center text-muted-foreground">
                <div className="text-9xl mb-4">🛏️</div>
                <p>Imagem do Colchão {displayProduct.name}</p>
              </div>
            )}
          </div>
          
          {/* Informações do Produto */}
          <Card className="p-6 space-y-6">
            <div className="space-y-2">
              <p className="text-4xl font-bold text-primary">
                R$ {priceFormatted}
              </p>
              <p className="text-sm text-muted-foreground">
                Parcelamento disponível em até 12x
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
              <p className="text-muted-foreground">
                Pessoas que buscam alívio de dores, melhora do sono e bem-estar geral
              </p>
            </div>
            
            {/* Botões de Ação */}
            <div className="space-y-3">
              <Button 
                onClick={() => setShowCheckout(true)}
                className="w-full"
                size="lg"
              >
                <ShoppingCart className="mr-2 h-5 w-5" />
                Comprar Agora
              </Button>
              
              <Button 
                onClick={() => setShowChatWidget(true)}
                variant="outline"
                className="w-full"
                size="lg"
              >
                <MessageCircle className="mr-2 h-5 w-5" />
                Falar com BIA sobre este produto
              </Button>
            </div>
            

          </Card>
        </div>

        {/* Especificações Técnicas */}
        <Card className="p-6">
          <h3 className="text-2xl font-bold mb-6">Especificações Técnicas</h3>
          {(() => {
            const specs = [
              {
                value: `${rawProduct.width_cm}×${rawProduct.length_cm}×${rawProduct.height_cm}cm`,
                label: 'Dimensões (L×C×A)',
                show: true
              },
              {
                value: (rawProduct as any).magnetic_count,
                label: 'Ímãs Terapêuticos',
                show: (rawProduct as any).magnetic_count != null
              },
              {
                value: `${(rawProduct as any).warranty_years} anos`,
                label: 'Garantia',
                show: (rawProduct as any).warranty_years != null
              },
              {
                value: (rawProduct as any).therapeutic_technologies,
                label: 'Tecnologias Terapêuticas',
                show: (rawProduct as any).therapeutic_technologies != null
              },
              {
                value: `${rawProduct.weight_kg}kg`,
                label: 'Peso',
                show: rawProduct.weight_kg != null
              }
            ].filter(spec => spec.show);

            // Grid responsivo baseado na quantidade de specs
            const gridCols = specs.length === 2 ? 'sm:grid-cols-2' :
                           specs.length === 3 ? 'sm:grid-cols-3' :
                           specs.length === 4 ? 'sm:grid-cols-2 lg:grid-cols-4' :
                           'sm:grid-cols-2 lg:grid-cols-3';

            return (
              <div className={`grid ${gridCols} gap-6`}>
                {specs.map((spec, index) => (
                  <div key={index} className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold text-primary">{spec.value}</p>
                    <p className="text-sm text-muted-foreground">{spec.label}</p>
                  </div>
                ))}
              </div>
            );
          })()}
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

      {/* Modal de Checkout */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Finalizar Compra</DialogTitle>
          </DialogHeader>
          <AffiliateAwareCheckout
            product={checkoutProduct}
            onOrderComplete={handleOrderComplete}
            onClose={() => setShowCheckout(false)}
          />
        </DialogContent>
      </Dialog>

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