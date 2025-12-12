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
import { OrderAffiliateProcessor } from '@/services/sales/order-affiliate-processor';
import { useToast } from '@/hooks/use-toast';

interface Product {
  id: string;
  name: string;
  price: number;
  image?: string;
}

interface AffiliateAwareCheckoutProps {
  product: Product;
  onOrderComplete?: (orderId: string) => void;
  className?: string;
}

export default function AffiliateAwareCheckout({ 
  product, 
  onOrderComplete,
  className 
}: AffiliateAwareCheckoutProps) {
  const { referralInfo, trackConversion, getCurrentReferralCode } = useReferralTracking();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderCreated, setOrderCreated] = useState(false);

  /**
   * Processa o checkout com integração de afiliados
   */
  const handleCheckout = async () => {
    try {
      setIsProcessing(true);

      // 1. Criar pedido no sistema
      const orderData = {
        productId: product.id,
        productName: product.name,
        totalAmount: product.price,
        referralCode: getCurrentReferralCode()
      };

      const orderId = await createOrder(orderData);
      
      if (!orderId) {
        throw new Error('Falha ao criar pedido');
      }

      // 2. Processar integração com afiliado (se houver)
      if (referralInfo) {
        await processAffiliateIntegration(orderId, orderData);
      }

      // 3. Redirecionar para pagamento (Asaas, PIX, etc.)
      await redirectToPayment(orderId);

      setOrderCreated(true);
      onOrderComplete?.(orderId);

    } catch (error) {
      console.error('Erro no checkout:', error);
      toast({
        title: "Erro no checkout",
        description: "Não foi possível processar seu pedido. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Cria o pedido no sistema
   */
  const createOrder = async (orderData: any): Promise<string | null> => {
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData)
      });

      if (!response.ok) {
        throw new Error('Falha ao criar pedido');
      }

      const result = await response.json();
      return result.orderId;
    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      return null;
    }
  };

  /**
   * Processa a integração com afiliado
   */
  const processAffiliateIntegration = async (orderId: string, orderData: any) => {
    try {
      const result = await OrderAffiliateProcessor.processOrder({
        orderId,
        customerId: 'temp-customer', // Será atualizado após login/cadastro
        totalAmount: orderData.totalAmount,
        referralCode: orderData.referralCode
      });

      if (result.success && result.affiliateId) {
        toast({
          title: "Afiliado identificado!",
          description: `Sua compra será creditada para ${result.affiliateName}`,
        });
      }
    } catch (error) {
      console.error('Erro ao processar afiliado:', error);
      // Não falhar o checkout por isso
    }
  };

  /**
   * Redireciona para o pagamento
   */
  const redirectToPayment = async (orderId: string) => {
    // Aqui você integraria com o Asaas ou outro gateway
    // Por enquanto, simular redirecionamento
    console.log(`Redirecionando para pagamento do pedido: ${orderId}`);
    
    // Simular processamento de pagamento
    setTimeout(async () => {
      // Simular confirmação de pagamento via webhook
      await simulatePaymentConfirmation(orderId);
    }, 2000);
  };

  /**
   * Simula confirmação de pagamento (para desenvolvimento)
   */
  const simulatePaymentConfirmation = async (orderId: string) => {
    try {
      // Registrar conversão se houver afiliado
      if (referralInfo) {
        await trackConversion(orderId);
      }

      toast({
        title: "Pagamento confirmado!",
        description: "Seu pedido foi processado com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao simular pagamento:', error);
    }
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
                  R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
              <span>R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Frete:</span>
              <span className="text-green-600">Grátis</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t">
              <span>Total:</span>
              <span className="text-primary">
                R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                Processando...
              </>
            ) : orderCreated ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Pedido Criado!
              </>
            ) : (
              'Finalizar Compra'
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
              <span>Pagamento via PIX ou Cartão</span>
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