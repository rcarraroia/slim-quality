import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Package, ArrowRight, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PagamentoSucesso() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const orderId = searchParams.get('order_id');

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Pagamento Confirmado!
        </h1>
        
        <p className="text-gray-600 mb-6">
          Obrigado pela sua compra! Seu pedido foi confirmado e está sendo processado.
        </p>

        {orderId && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-green-700 font-medium">Número do pedido</p>
            <p className="font-mono text-lg text-green-900">{orderId.slice(-8).toUpperCase()}</p>
          </div>
        )}

        <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Package className="w-5 h-5" />
            Próximos passos
          </h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">1.</span>
              Você receberá um email de confirmação
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">2.</span>
              Prepararemos seu pedido com carinho
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">3.</span>
              Enviaremos o código de rastreio por email
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <Button 
            onClick={() => navigate('/')}
            className="w-full bg-primary hover:bg-primary/90"
            size="lg"
          >
            <Home className="w-4 h-4 mr-2" />
            Voltar ao Início
          </Button>
          
          <Button 
            onClick={() => navigate('/produtos')}
            variant="outline"
            className="w-full"
          >
            Continuar Comprando
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        <p className="text-xs text-gray-400 mt-6">
          Dúvidas? Entre em contato pelo WhatsApp: (33) 99838-4177
        </p>
      </div>
    </div>
  );
}
