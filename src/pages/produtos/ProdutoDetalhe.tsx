import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { WhatsAppButton } from "@/components/shared/WhatsAppButton";

const productDetails = {
  solteiro: { name: "Solteiro", price: "2.990", features: ["8 Tecnologias", "15 Anos de Garantia", "Ideal para 1 pessoa"] },
  casal: { name: "Casal Padrão", price: "3.690", features: ["8 Tecnologias", "15 Anos de Garantia", "Mais Vendido"] },
  queen: { name: "Queen", price: "4.290", features: ["8 Tecnologias", "15 Anos de Garantia", "Máximo Conforto"] },
  king: { name: "King", price: "4.890", features: ["8 Tecnologias", "15 Anos de Garantia", "Luxo e Espaço"] },
};

export default function ProdutoDetalhe() {
  const { slug } = useParams<{ slug: keyof typeof productDetails }>();
  const product = slug ? productDetails[slug] : null;

  if (!product) {
    return (
      <div className="container py-24 text-center">
        <h1 className="text-4xl font-bold">Produto Não Encontrado</h1>
        <p className="text-muted-foreground mt-4">Verifique o link ou volte para a lista de produtos.</p>
        <Link to="/produtos">
          <Button className="mt-6">Ver Todos os Produtos</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container px-4 py-24">
      <div className="max-w-4xl mx-auto space-y-12">
        <h1 className="text-5xl font-bold text-center">Slim Quality {product.name}</h1>
        
        <div className="grid md:grid-cols-2 gap-8">
          <div className="aspect-square bg-muted rounded-xl flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <div className="text-9xl mb-4">🛏️</div>
              <p>Imagem do Colchão {product.name}</p>
            </div>
          </div>
          
          <Card className="p-6 space-y-6">
            <p className="text-4xl font-bold text-primary">
              R$ {product.price.toLocaleString('pt-BR')}
            </p>
            
            <div className="space-y-3">
              {product.features.map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-success shrink-0" />
                  <span className="text-lg">{feature}</span>
                </div>
              ))}
            </div>
            
            <WhatsAppButton 
              productName={`Slim Quality ${product.name}`}
              message={`Olá! Tenho interesse no modelo ${product.name} (R$ ${product.price})`}
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