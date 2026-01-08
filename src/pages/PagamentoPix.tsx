import { useSearchParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Copy, Check, Clock, ArrowLeft, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function PagamentoPix() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutos
  
  const orderId = searchParams.get('order_id');
  const paymentId = searchParams.get('payment_id');
  const qrCode = searchParams.get('qr_code');
  const copyPaste = searchParams.get('copy_paste');

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCopy = async () => {
    if (copyPaste) {
      try {
        await navigator.clipboard.writeText(copyPaste);
        setCopied(true);
        toast({
          title: "Código copiado!",
          description: "Cole no app do seu banco para pagar",
        });
        setTimeout(() => setCopied(false), 3000);
      } catch {
        toast({
          title: "Erro ao copiar",
          description: "Selecione e copie manualmente",
          variant: "destructive"
        });
      }
    }
  };

  if (!qrCode && !copyPaste) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <p className="text-gray-600">Dados de pagamento não encontrados</p>
          <Button onClick={() => navigate('/')} className="mt-4">
            Voltar ao Início
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <QrCode className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Pague com PIX</h1>
          <p className="text-gray-600 mt-2">Escaneie o QR Code ou copie o código</p>
        </div>

        {/* Timer */}
        <div className="flex items-center justify-center gap-2 mb-6 text-orange-600">
          <Clock className="w-5 h-5" />
          <span className="font-mono text-lg">{formatTime(timeLeft)}</span>
          <span className="text-sm">para pagar</span>
        </div>

        {/* QR Code */}
        {qrCode && (
          <div className="bg-white border-2 border-gray-200 rounded-xl p-4 mb-6">
            <img 
              src={`data:image/png;base64,${qrCode}`} 
              alt="QR Code PIX" 
              className="w-full max-w-[250px] mx-auto"
            />
          </div>
        )}

        {/* Código Copia e Cola */}
        {copyPaste && (
          <div className="mb-6">
            <p className="text-sm text-gray-500 mb-2 text-center">Ou copie o código:</p>
            <div className="bg-gray-50 rounded-lg p-3 break-all">
              <code className="text-xs text-gray-700">{copyPaste}</code>
            </div>
            <Button 
              onClick={handleCopy}
              className="w-full mt-3"
              variant={copied ? "outline" : "default"}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar Código PIX
                </>
              )}
            </Button>
          </div>
        )}

        {/* Info do pedido */}
        {orderId && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-center">
            <p className="text-sm text-gray-500">Pedido</p>
            <p className="font-mono text-sm text-gray-700">{orderId}</p>
          </div>
        )}

        {/* Instruções */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">Como pagar:</h3>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Abra o app do seu banco</li>
            <li>Escolha pagar com PIX</li>
            <li>Escaneie o QR Code ou cole o código</li>
            <li>Confirme o pagamento</li>
          </ol>
        </div>

        <Button 
          onClick={() => navigate('/')}
          variant="ghost"
          className="w-full"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar ao Início
        </Button>

        <p className="text-xs text-gray-400 mt-4 text-center">
          Após o pagamento, você receberá a confirmação por email
        </p>
      </div>
    </div>
  );
}
