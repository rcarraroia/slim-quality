import { useSearchParams, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, RefreshCw, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PagamentoErro() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const orderId = searchParams.get('order_id');
  const errorType = searchParams.get('error');
  const message = searchParams.get('message');

  const handleRetry = () => {
    // Voltar para a página inicial para tentar novamente
    navigate('/');
  };

  const handleContact = () => {
    // Abrir WhatsApp
    window.open('https://wa.me/5533998384177?text=Olá! Tive um problema no pagamento do pedido ' + (orderId || ''), '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-10 h-10 text-red-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Ops! Algo deu errado
        </h1>
        
        <p className="text-gray-600 mb-6">
          Não foi possível processar seu pagamento. Mas não se preocupe, seu pedido foi salvo e você pode tentar novamente.
        </p>

        {orderId && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-500">Número do pedido</p>
            <p className="font-mono text-sm text-gray-700">{orderId}</p>
          </div>
        )}

        {message && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-700">{decodeURIComponent(message)}</p>
          </div>
        )}

        <div className="space-y-3">
          <Button 
            onClick={handleRetry}
            className="w-full bg-primary hover:bg-primary/90"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Tentar Novamente
          </Button>
          
          <Button 
            onClick={handleContact}
            variant="outline"
            className="w-full"
          >
            <Phone className="w-4 h-4 mr-2" />
            Falar com Atendimento
          </Button>
          
          <Button 
            onClick={() => navigate('/')}
            variant="ghost"
            className="w-full"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Início
          </Button>
        </div>

        <p className="text-xs text-gray-400 mt-6">
          Se o problema persistir, entre em contato pelo WhatsApp: (33) 99838-4177
        </p>
      </div>
    </div>
  );
}
