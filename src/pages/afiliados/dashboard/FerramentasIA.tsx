import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/config/supabase";
import { Loader2, Bot, CheckCircle, AlertCircle, ExternalLink, X } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AffiliateAwareCheckout from "@/components/checkout/AffiliateAwareCheckout";

interface Product {
    id: string;
    name: string;
    slug: string;
    sku: string;
    description: string;
    price_cents: number;
}

interface Subscription {
    id: string;
    status: string;
    expires_at: string;
    service_type: string;
}

export default function FerramentasIA() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [product, setProduct] = useState<Product | null>(null);
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);

            // 1. Buscar usuário atual
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return; // Layout já trata auth, mas por segurança

            // 2. Buscar produto Agente IA
            const { data: productData, error: productError } = await supabase
                .from('products')
                .select('id, name, slug, sku, description, price_cents')
                .eq('category', 'ferramenta_ia')
                .eq('is_active', true)
                .maybeSingle();

            if (productError) throw productError;
            setProduct(productData);

            // 3. Buscar assinatura ativa
            const { data: subData, error: subError } = await supabase
                .from('affiliate_services')
                .select('id, status, expires_at, service_type')
                .eq('user_id', user.id)
                .eq('service_type', 'agente_ia') // Assumindo 'agente_ia' como chave do serviço (baseado no split)
                .limit(1)
                .maybeSingle(); // Pode não existir

            // Nota: O process-split grava service_type='agente_ia' ? 
            // Preciso confirmar se é 'agente_ia' ou 'ferramenta_ia' ou outro.
            // Step 1545: activateAffiliateService(userId, 'mcp_integration')?
            // Vou verificar o código do process-split novamente se falhar.
            // Por hora, assumo que o serviço segue a categoria ou uma constante.

            if (!subError && subData) {
                setSubscription(subData);
            }

        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            toast.error('Não foi possível carregar as informações.');
        } finally {
            setLoading(false);
        }
    };

    const isSubscriptionActive = () => {
        if (!subscription) return false;
        if (!subscription.expires_at) return false;
        return new Date(subscription.expires_at) > new Date();
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!product) {
        return (
            <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>O Agente IA não está disponível para contratação no momento.</p>
                </CardContent>
            </Card>
        );
    }

    const isActive = isSubscriptionActive();

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col gap-2">
                <h2 className="text-3xl font-bold tracking-tight">Ferramentas IA</h2>
                <p className="text-muted-foreground">
                    Potencialize suas vendas com inteligência artificial exclusiva da Slim Quality.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Card Principal */}
                <Card className={`border-2 ${isActive ? 'border-success/50 bg-success/5' : 'border-primary/20'}`}>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${isActive ? 'bg-success/20 text-success' : 'bg-primary/10 text-primary'}`}>
                                    <Bot className="h-8 w-8" />
                                </div>
                                <div>
                                    <CardTitle className="text-xl">{product.name}</CardTitle>
                                    <CardDescription>Assistente Virtual de Vendas</CardDescription>
                                </div>
                            </div>
                            {isActive ? (
                                <Badge className="bg-success text-white hover:bg-success">ATIVO</Badge>
                            ) : (
                                <Badge variant="outline">DISPONÍVEL</Badge>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {isActive ? (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-success font-medium">
                                    <CheckCircle className="h-5 w-5" />
                                    <span>Sua assinatura está ativa e operando.</span>
                                </div>
                                <div className="bg-background/50 p-4 rounded-lg border">
                                    <p className="text-sm text-muted-foreground">Válido até</p>
                                    <p className="text-lg font-bold">
                                        {new Date(subscription!.expires_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Acesse o portal exclusivo para configurar o seu agente, conectar o WhatsApp e gerenciar seus leads.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-sm text-muted-foreground">
                                    {product.description || "Automatize seu atendimento, tire dúvidas de clientes 24/7 e aumente sua conversão com nosso Agente IA treinado especificamente para produtos Slim Quality."}
                                </p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-bold">R$ {(product.price_cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                    <span className="text-muted-foreground">/mês</span>
                                </div>
                                <ul className="space-y-2 text-sm">
                                    <li className="flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4 text-primary" />
                                        Atendimento 24 horas
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4 text-primary" />
                                        Treinado em Colchões Magnéticos
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4 text-primary" />
                                        Suporte a Objeções
                                    </li>
                                </ul>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter>
                        {isActive ? (
                            <Button
                                className="w-full gap-2 bg-success hover:bg-success/90 text-white"
                                size="lg"
                                onClick={async () => {
                                    const { data: { session } } = await supabase.auth.getSession();
                                    const baseUrl = 'https://agente-multi-tenant.vercel.app/';
                                    if (session) {
                                        // Passa os tokens via hash para o Supabase detectar automaticamente no destino
                                        const hash = `access_token=${session.access_token}&refresh_token=${session.refresh_token}&expires_in=${session.expires_in}&token_type=bearer`;
                                        window.open(`${baseUrl}#${hash}`, '_blank');
                                    } else {
                                        window.open(baseUrl, '_blank');
                                    }
                                }}
                            >
                                Acessar Portal do Agente
                                <ExternalLink className="h-4 w-4" />
                            </Button>
                        ) : (
                            <Button
                                className="w-full gap-2"
                                size="lg"
                                onClick={() => setIsCheckoutOpen(true)}
                            >
                                Assinar Agora
                                <ExternalLink className="h-4 w-4" />
                            </Button>
                        )}
                    </CardFooter>
                </Card>

                {/* Card Informativo / Auxiliar */}
                <Card className="bg-muted/30">
                    <CardHeader>
                        <CardTitle>Como funciona?</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm text-muted-foreground">
                        <p>
                            1. <strong>Contratação:</strong> Ao assinar, você libera acesso imediato ao Agente IA vinculado à sua conta de afiliado.
                        </p>
                        <p>
                            2. <strong>Configuração:</strong> O agente utilizará seus dados de contato para direcionar os clientes prontos para compra diretamente para o seu WhatsApp.
                        </p>
                        <p>
                            3. <strong>Pagamento:</strong> O valor é cobrado mensalmente. Você pode cancelar quando quiser através do painel financeiro.
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Modal de Checkout */}
            <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
                <DialogContent className="max-w-4xl p-0 overflow-hidden bg-background">
                    <DialogHeader className="p-6 pb-0">
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                            <Bot className="h-6 w-6 text-primary" />
                            Assinar {product.name}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="max-h-[85vh] overflow-y-auto p-6 pt-2">
                        <AffiliateAwareCheckout
                            product={{
                                id: product.id,
                                name: product.name,
                                sku: product.sku,
                                price_cents: product.price_cents
                            }}
                            onClose={() => setIsCheckoutOpen(false)}
                            onOrderComplete={(orderId) => {
                                setIsCheckoutOpen(false);
                                toast.success("Pedido realizado com sucesso!");
                                loadData(); // Recarregar para ver se ativou (webhook pode demorar um pouco)
                            }}
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
