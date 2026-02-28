import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/config/supabase";
import { Loader2, Package, AlertCircle, ShoppingCart, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AffiliateAwareCheckout from "@/components/checkout/AffiliateAwareCheckout";
import { affiliateFrontendService } from "@/services/frontend/affiliate.service";

interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string;
  price_cents: number;
  image_url?: string;
  alreadyPurchased?: boolean; // Flag para indicar se já foi comprado
}

export default function ShowRow() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [affiliateId, setAffiliateId] = useState<string | null>(null);

  useEffect(() => {
    validateAccess();
    loadProducts();
  }, []);

  /**
   * Valida se o usuário é Logista
   * Redireciona Individual para dashboard
   */
  const validateAccess = async () => {
    try {
      const { isAffiliate, affiliate } = await affiliateFrontendService.checkAffiliateStatus();

      if (!isAffiliate || affiliate?.affiliate_type !== 'logista') {
        toast.error('Acesso negado. Esta seção é exclusiva para Logistas.');
        navigate('/afiliados/dashboard');
        return;
      }

      // Armazenar ID do afiliado para verificações posteriores
      if (affiliate?.id) {
        setAffiliateId(affiliate.id);
      }
    } catch (error) {
      console.error('Erro ao validar acesso:', error);
      navigate('/afiliados/dashboard');
    }
  };

  /**
   * Verifica se o logista já comprou um produto específico
   */
  const checkIfAlreadyPurchased = async (productId: string): Promise<boolean> => {
    if (!affiliateId) return false;

    try {
      const { data, error } = await supabase
        .from('show_room_purchases')
        .select('id')
        .eq('affiliate_id', affiliateId)
        .eq('product_id', productId)
        .maybeSingle();

      if (error) {
        console.error('Erro ao verificar compra:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Erro ao verificar compra:', error);
      return false;
    }
  };

  /**
   * Carrega produtos Show Row ativos e verifica quais já foram comprados
   */
  const loadProducts = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('products')
        .select(`
          id, 
          name, 
          slug, 
          sku, 
          description, 
          price_cents,
          product_images!inner(image_url, is_primary)
        `)
        .eq('category', 'show_row')
        .eq('is_active', true)
        .eq('product_images.is_primary', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transformar dados para incluir image_url no nível do produto
      const productsWithImages = (data || []).map(product => ({
        ...product,
        image_url: product.product_images?.[0]?.image_url || null
      }));
      
      // Verificar quais produtos já foram comprados
      if (affiliateId) {
        const productsWithPurchaseStatus = await Promise.all(
          productsWithImages.map(async (product) => ({
            ...product,
            alreadyPurchased: await checkIfAlreadyPurchased(product.id)
          }))
        );
        setProducts(productsWithPurchaseStatus);
      } else {
        setProducts(productsWithImages);
      }
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      toast.error('Não foi possível carregar os produtos.');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Empty state
  if (products.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-bold tracking-tight">Show Room</h2>
          <p className="text-muted-foreground">
            Produtos exclusivos para Logistas parceiros.
          </p>
        </div>

        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum produto Show Room disponível no momento.</p>
            <p className="text-sm mt-2">Novos produtos serão adicionados em breve.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main content
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Show Room</h2>
        <p className="text-muted-foreground">
          Produtos exclusivos para Logistas parceiros da Slim Quality.
        </p>
      </div>

      {/* Grid de produtos */}
      <div className="grid gap-6 md:grid-cols-2">
        {products.map((product) => (
          <Card key={product.id} className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="relative w-full h-48 bg-muted rounded-lg mb-4 overflow-hidden">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error('Erro ao carregar imagem:', product.image_url);
                      // Mostrar fallback
                      e.currentTarget.style.display = 'none';
                      const fallback = e.currentTarget.nextElementSibling;
                      if (fallback) fallback.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className={`absolute inset-0 flex items-center justify-center ${product.image_url ? 'hidden' : ''}`}>
                  <Package className="h-16 w-16 text-muted-foreground opacity-50" />
                </div>
                {/* Badge "Já adquirido" */}
                {product.alreadyPurchased && (
                  <div className="absolute top-2 right-2">
                    <Badge variant="secondary" className="gap-1 bg-green-100 text-green-800 border-green-200">
                      <CheckCircle className="h-3 w-3" />
                      Já adquirido
                    </Badge>
                  </div>
                )}
              </div>
              <CardTitle>{product.name}</CardTitle>
              <CardDescription>{product.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">
                  R$ {(product.price_cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </CardContent>
            <CardFooter>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="w-full">
                      <Button
                        className="w-full gap-2"
                        disabled={product.alreadyPurchased}
                        onClick={() => {
                          setSelectedProduct(product);
                          setIsCheckoutOpen(true);
                        }}
                      >
                        <ShoppingCart className="h-4 w-4" />
                        {product.alreadyPurchased ? 'Produto já adquirido' : 'Ver Detalhes'}
                      </Button>
                    </div>
                  </TooltipTrigger>
                  {product.alreadyPurchased && (
                    <TooltipContent>
                      <p>Você já comprou este modelo Show Room.</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Cada logista pode comprar apenas 1 unidade de cada modelo.
                      </p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Modal de Checkout */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-background">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Package className="h-6 w-6 text-primary" />
              {selectedProduct?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[85vh] overflow-y-auto p-6 pt-2">
            {selectedProduct && (
              <AffiliateAwareCheckout
                product={{
                  id: selectedProduct.id,
                  name: selectedProduct.name,
                  sku: selectedProduct.sku,
                  price_cents: selectedProduct.price_cents,
                  category: 'show_row' // ✅ CRÍTICO: Passar categoria para detecção correta
                }}
                isDigital={false} // Produtos Show Room são físicos
                onClose={() => setIsCheckoutOpen(false)}
                onOrderComplete={(orderId) => {
                  setIsCheckoutOpen(false);
                  toast.success("Pedido realizado com sucesso!");
                  loadProducts(); // Recarregar produtos
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
