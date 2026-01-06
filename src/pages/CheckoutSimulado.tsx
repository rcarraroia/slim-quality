import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Copy, QrCode, CreditCard, FileText, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function CheckoutSimulado() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  
  const paymentId = searchParams.get('payment');
  const amount = searchParams.get('amount');
  const type = searchParams.get('type');
  
  useEffect(() => {
    if (!paymentId || !amount || !type) {
      navigate('/');
    }
  }, [paymentId, amount, type, navigate]);
  
  const handleCopyPix = () => {
    const pixCode = `00020126580014br.gov.bcb.pix0136${paymentId}520400005303986540${amount}5802BR5925SLIM QUALITY SIMULACAO6009SAO PAULO62070503***6304`;
    navigator.clipboard.writeText(pixCode);
    setCopied(true);
    toast.success('Código PIX copiado!');
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleSimulatePayment = () => {
    toast.success('Pagamento simulado com sucesso!');
    setTimeout(() => {
      navigate('/pedido-confirmado?payment=' + paymentId);
    }, 1500);
  };
  
  const formatCurrency = (value: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(parseFloat(value));
  };
  
  if (!paymentId || !amount || !type) {
    return null;
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Checkout Simulado
          </h1>
          <p className="text-gray-600">
            Ambiente de teste - Slim Quality
          </p>
          <Badge variant="secondary" className="mt-2">
            Modo Simulação
          </Badge>
        </div>
        
        {/* Payment Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Pedido Criado com Sucesso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">ID do Pagamento:</span>
                <span className="font-mono text-sm">{paymentId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Valor:</span>
                <span className="font-bold text-lg text-green-600">
                  {formatCurrency(amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Método:</span>
                <Badge variant="outline">
                  {type === 'PIX' && <QrCode className="h-4 w-4 mr-1" />}
                  {type === 'CREDIT_CARD' && <CreditCard className="h-4 w-4 mr-1" />}
                  {type === 'BOLETO' && <FileText className="h-4 w-4 mr-1" />}
                  {type}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Payment Method Specific Content */}
        {type === 'PIX' && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Pagamento via PIX
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">
                  Código PIX Copia e Cola:
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white p-2 rounded border text-xs break-all">
                    00020126580014br.gov.bcb.pix0136{paymentId}520400005303986540{amount}5802BR5925SLIM QUALITY SIMULACAO6009SAO PAULO62070503***6304
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyPix}
                    className={copied ? 'bg-green-50 border-green-200' : ''}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  💡 <strong>Simulação:</strong> Este é um ambiente de teste. 
                  O código PIX acima é apenas para demonstração.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
        
        {type === 'CREDIT_CARD' && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Pagamento via Cartão de Crédito
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  💳 <strong>Simulação:</strong> Em produção, aqui seria exibido 
                  o formulário de cartão de crédito do Asaas.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
        
        {type === 'BOLETO' && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Pagamento via Boleto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  📄 <strong>Simulação:</strong> Em produção, aqui seria exibido 
                  o link para download do boleto bancário.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
        
        <Separator className="my-6" />
        
        {/* Simulation Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Ações de Simulação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Como este é um ambiente de teste, você pode simular o pagamento:
            </p>
            
            <Button 
              onClick={handleSimulatePayment}
              className="w-full"
              size="lg"
            >
              ✅ Simular Pagamento Aprovado
            </Button>
            
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ <strong>Importante:</strong> Este é um checkout simulado. 
                Em produção, a integração real com o Asaas será utilizada.
              </p>
            </div>
          </CardContent>
        </Card>
        
        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>Slim Quality - Sistema de Vendas</p>
          <p>Ambiente de Desenvolvimento</p>
        </div>
      </div>
    </div>
  );
}