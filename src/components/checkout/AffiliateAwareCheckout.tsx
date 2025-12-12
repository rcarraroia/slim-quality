/**
 * Componente de checkout integrado com sistema de afiliados
 * Automaticamente associa vendas aos afiliados quando há código de referência
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Users, Gift, Loader2 } from 'lucide-react';
import { useReferralTracking } from '@/hooks/useReferralTracking';
import { checkoutService } from '@/services/checkout.service';
import { useToast } from '@/hooks/use-toast';
import PaymentMethodSelector, { type PaymentMethod } from './PaymentMethodSelector';
import type { CheckoutData, Product } from '@/types/database.types';

interface CheckoutProduct {
  id: string;
  name: string;
  sku: string;
  price_cents: number;
  image?: string;
}

interface AffiliateAwareCheckoutProps {
  product: CheckoutProduct;
  onOrderComplete?: (orderId: string) => void;
  onClose?: () => void;
  className?: string;
}

export default function AffiliateAwareCheckout({ 
  product, 
  onOrderComplete,
  onClose,
  className 
}: AffiliateAwareCheckoutProps) {
  const { referralInfo, trackConversion, getCurrentReferralCode } = useReferralTracking();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderCreated, setOrderCreated] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>({ type: 'pix' });
  const [customerData, setCustomerData] = useState({
    name: '',
    email: '',
    phone: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    postal_code: ''
  });

  /**
   * Processa o checkout com integração real
   */
  const handleCheckout = async () => {
    try {
      setIsProcessing(true);

      // Validar dados do cliente
      if (!customerData.name || !customerData.email || !customerData.phone) {
        toast({
          title: "Dados incompletos",
          description: "Preencha todos os campos obrigatórios.",
          variant: "destructive"
        });
        return;
      }

      // Montar dados do checkout
      const checkoutData: CheckoutData = {
        customer: {
          ...customerData,
          source: referralInfo ? 'affiliate' : 'website',
          referral_code: getCurrentReferralCode(),
          status: 'active'
        },
        product: {
          id: product.id,
          name: product.name,
          sku: product.sku,
          price_cents: product.price_cents,
          quantity: 1
        },
        shipping: {
          recipient_name: customerData.name,
          street: customerData.street,
          number: customerData.number,
          complement: customerData.complement,
          neighborhood: customerData.neighborhood,
          city: customerData.city,
          state: customerData.state,
          postal_code: customerData.postal_code,
          phone: customerData.phone
        },
        payment: {
          method: selectedPaymentMethod.type,
          installments: selectedPaymentMethod.installments
        },
        affiliate: referralInfo ? {
          referral_code: referralInfo.code
        } : undefined,
        totals: {
          subtotal_cents: product.price_cents,
          shipping_cents: 0, // Frete grátis
          discount_cents: 0,
          total_cents: product.price_cents
        }
      };

      // Processar checkout
      const result = await checkoutService.processCheckout(checkoutData);

      if (result.success) {
        setOrderCreated(true);
        
        toast({
          title: "🎉 Pedido criado com sucesso!",
          description: (
            <div className="space-y-2">
              <p>Pedido #{result.order_id?.slice(-8)} criado</p>
              <p className="text-sm text-muted-foreground">
                Redirecionando para pagamento seguro...
              </p>
              {referralInfo && (
                <p className="text-sm text-primary">
                  ✨ Seu indicador receberá comissão automaticamente!
                </p>
              )}
            </div>
          ),
          duration: 5000,
        });

        // Registrar conversão se houver afiliado
        if (referralInfo && result.order_id) {
          await trackConversion(result.order_id);
        }

        onOrderComplete?.(result.order_id!);

        // Redirecionar para pagamento
        if (result.payment_url) {
          setTimeout(() => {
            window.location.href = result.payment_url!;
          }, 2000);
        }
      } else {
        throw new Error(result.error || 'Erro desconhecido');
      }

    } catch (error) {
      console.error('Erro no checkout:', error);
      
      let errorMessage = "Não foi possível processar seu pedido. Tente novamente.";
      let errorTitle = "Erro no checkout";
      
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('fetch')) {
          errorTitle = "Problema de conexão";
          errorMessage = "Verifique sua conexão com a internet e tente novamente.";
        } else if (error.message.includes('validation')) {
          errorTitle = "Dados inválidos";
          errorMessage = "Verifique os dados informados e tente novamente.";
        } else if (error.message.includes('Asaas')) {
          errorTitle = "Problema no pagamento";
          errorMessage = "Nosso sistema de pagamento está temporariamente indisponível. Tente novamente em alguns minutos ou entre em contato conosco.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
        action: (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.location.reload()}
          >
            Tentar Novamente
          </Button>
        )
      });
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Atualiza dados do cliente
   */
  const updateCustomerData = (field: string, value: string) => {
    setCustomerData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className={className}>
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Finalizar Compra
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Informações do Produto */}
          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold">{product.name}</h3>
                <p className="text-2xl font-bold text-primary">
                  R$ {(product.price_cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              {product.image && (
                <img 
                  src={product.image} 
                  alt={product.name}
                  className="w-16 h-16 object-cover rounded-lg"
                />
              )}
            </div>
          </div>

          {/* Seletor de Método de Pagamento */}
          {!orderCreated && (
            <PaymentMethodSelector
              amount={product.price_cents}
              onSelect={setSelectedPaymentMethod}
              selected={selectedPaymentMethod}
              className="mb-6"
            />
          )}

          {/* Formulário de Dados do Cliente */}
          {!orderCreated && (
            <div className="space-y-4">
              <h4 className="font-semibold text-sm">Dados para entrega:</h4>
              
              <div className="grid grid-cols-1 gap-3">
                <input
                  type="text"
                  placeholder="Nome completo *"
                  value={customerData.name}
                  onChange={(e) => updateCustomerData('name', e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  required
                />
                
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="email"
                    placeholder="Email *"
                    value={customerData.email}
                    onChange={(e) => updateCustomerData('email', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                    required
                  />
                  <input
                    type="tel"
                    placeholder="Telefone *"
                    value={customerData.phone}
                    onChange={(e) => updateCustomerData('phone', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Rua"
                    value={customerData.street}
                    onChange={(e) => updateCustomerData('street', e.target.value)}
                    className="col-span-2 px-3 py-2 border rounded-md text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Número"
                    value={customerData.number}
                    onChange={(e) => updateCustomerData('number', e.target.value)}
                    className="px-3 py-2 border rounded-md text-sm"
                  />
                </div>
                
                <input
                  type="text"
                  placeholder="Complemento"
                  value={customerData.complement}
                  onChange={(e) => updateCustomerData('complement', e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                />
                
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Bairro"
                    value={customerData.neighborhood}
                    onChange={(e) => updateCustomerData('neighborhood', e.target.value)}
                    className="px-3 py-2 border rounded-md text-sm"
                  />
                  <input
                    type="text"
                    placeholder="CEP"
                    value={customerData.postal_code}
                    onChange={(e) => updateCustomerData('postal_code', e.target.value)}
                    className="px-3 py-2 border rounded-md text-sm"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Cidade"
                    value={customerData.city}
                    onChange={(e) => updateCustomerData('city', e.target.value)}
                    className="px-3 py-2 border rounded-md text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Estado"
                    value={customerData.state}
                    onChange={(e) => updateCustomerData('state', e.target.value)}
                    className="px-3 py-2 border rounded-md text-sm"
                    maxLength={2}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Informações do Afiliado */}
          {referralInfo && (
            <Alert className="border-primary/20 bg-primary/5">
              <Users className="h-4 w-4 text-primary" />
              <AlertDescription className="space-y-2">
                <div className="flex items-center gap-2">
                  <Gift className="h-4 w-4 text-primary" />
                  <span className="font-medium">Compra via indicação</span>
                </div>
                <div className="space-y-1">
                  <Badge variant="secondary" className="text-xs">
                    Código: {referralInfo.code}
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    Sua compra ajudará quem te indicou a ganhar comissão!
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Resumo do Pedido */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>R$ {(product.price_cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Frete:</span>
              <span className="text-green-600">Grátis</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t">
              <span>Total:</span>
              <span className="text-primary">
                R$ {(product.price_cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Botão de Checkout */}
          <Button 
            onClick={handleCheckout}
            disabled={isProcessing || orderCreated}
            className="w-full"
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando pagamento...
              </>
            ) : orderCreated ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Pedido Criado com Sucesso!
              </>
            ) : (
              'Finalizar Compra - Pagamento Seguro'
            )}
          </Button>

          {/* Informações de Segurança */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>Compra 100% segura</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>
                {selectedPaymentMethod.type === 'pix' 
                  ? 'Pagamento via PIX - Aprovação instantânea'
                  : `Cartão de Crédito - ${selectedPaymentMethod.installments || 1}x ${selectedPaymentMethod.installments === 1 ? 'à vista' : 'sem juros'}`
                }
              </span>
            </div>
            {referralInfo && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4 text-primary" />
                <span>Afiliado será creditado automaticamente</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export { AffiliateAwareCheckout };