/**
 * Página de Pagamento PIX
 * Exibe QR Code e código copia e cola para pagamento
 */

import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Copy, Clock, QrCode, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/config/supabase';

export default function PagamentoPix() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const orderId = searchParams.get('order_id');
  const paymentId = searchParams.get('payment_id');
  
  const [loading, setLoading] = useState(true);
  const [pixData, setPixData] = useState<{
    qrCode: string;
    copyPaste: string;
    expiresAt?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'confirmed' | 'expired'>('pending');

  // Buscar dados do PIX
  useEffect(() => {
    async function fetchPixData() {
      if (!orderId) {
        setLoading(false);
        return;
      }

      try {
        // Buscar dados do pagamento no banco
        const { data: payment, error } = await supabase
          .from('payments')
          .select('*')
          .eq('order_id', orderId)
          .single();

        if (error || !payment) {
          console.error('Erro ao buscar pagamento:', error);
          // Tentar buscar via API
          await fetchPixFromApi();
          return;
        }

        if (payment.pix_qr_code && payment.pix_copy_paste) {
          setPixData({
            qrCode: payment.pix_qr_code,
            copyPaste: payment.pix_copy_paste,
            expiresAt: payment.pix_expires_at
          });
          setPaymentStatus(payment.status === 'confirmed' ? 'confirmed' : 'pending');
        } else {
          // Se não tem dados do PIX, buscar via API
          await fetchPixFromApi();
        }
      } catch (error) {
        console.error('Erro:', error);
        await fetchPixFromApi();
      } finally {
        setLoading(false);
      }
    }

    async function fetchPixFromApi() {
      try {
        const backendUrl = import.meta.env.VITE_API_URL || '';
        const response = await fetch(`${backendUrl}/api/pix-qrcode?order_id=${orderId}`);
        const data = await response.json();
        
        if (data.success && data.pixQrCode) {
          setPixData({
            qrCode: data.pixQrCode,
            copyPaste: data.pixCopyPaste,
            expiresAt: data.expiresAt
          });
        }
      } catch (error) {
        console.error('Erro ao buscar PIX da API:', error);
      }
    }

    fetchPixData();
  }, [orderId]);

  // Polling para verificar status do pagamento
  useEffect(() => {
    if (paymentStatus !== 'pending' || !orderId) return;

    const interval = setInterval(async () => {
      try {
        const { data: payment } = await supabase
          .from('payments')
          .select('status')
          .eq('order_id', orderId)
          .single();

        if (payment?.status === 'confirmed') {
          setPaymentStatus('confirmed');
          toast({
            title: "🎉 Pagamento confirmado!",
            description: "Seu pagamento foi recebido com sucesso.",
          });
          // Redirecionar após 3 segundos
          setTimeout(() => {
            navigate(`/pagamento-sucesso?order_id=${orderId}`);
          }, 3000);
        }
      } catch (error) {
        console.error('Erro ao verificar status:', error);
      }
    }, 5000); // Verificar a cada 5 segundos

    return () => clearInterval(interval);
  }, [orderId, paymentStatus, navigate, toast]);

  const handleCopyCode = async () => {
    if (!pixData?.copyPaste) return;
    
    try {
      await navigator.clipboard.writeText(pixData.copyPaste);
      setCopied(true);
      toast({
        title: "Código copiado!",
        description: "Cole no app do seu banco para pagar.",
      });
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      toast({
        title: "Erro ao copiar",
        description: "Selecione e copie o código manualmente.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-muted-foreground">Carregando dados do pagamento...</p>
        </div>
      </div>
    );
  }

  if (!orderId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-red-500">Pedido não encontrado</p>
            <Button onClick={() => navigate('/')} className="mt-4">
              Voltar ao início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (paymentStatus === 'confirmed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-600 mb-2">Pagamento Confirmado!</h2>
            <p className="text-muted-foreground mb-4">
              Seu pagamento foi recebido com sucesso.
            </p>
            <Button onClick={() => navigate(`/pagamento-sucesso?order_id=${orderId}`)}>
              Ver detalhes do pedido
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <QrCode className="h-6 w-6 text-primary" />
              Pagamento via PIX
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* QR Code */}
            {pixData?.qrCode ? (
              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-lg border-2 border-primary/20">
                  <img 
                    src={`data:image/png;base64,${pixData.qrCode}`}
                    alt="QR Code PIX"
                    className="w-48 h-48"
                  />
                </div>
              </div>
            ) : (
              <div className="flex justify-center">
                <div className="w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                  <p className="text-sm text-muted-foreground text-center px-4">
                    QR Code não disponível.<br/>Use o código abaixo.
                  </p>
                </div>
              </div>
            )}

            {/* Instruções */}
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Escaneie o QR Code acima com o app do seu banco
              </p>
              <p className="text-sm text-muted-foreground">
                ou copie o código abaixo:
              </p>
            </div>

            {/* Código Copia e Cola */}
            {pixData?.copyPaste && (
              <div className="space-y-2">
                <div className="bg-gray-100 p-3 rounded-lg">
                  <p className="text-xs font-mono break-all text-gray-600">
                    {pixData.copyPaste}
                  </p>
                </div>
                <Button 
                  onClick={handleCopyCode}
                  className="w-full"
                  variant={copied ? "secondary" : "default"}
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Código copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copiar código PIX
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Aviso de tempo */}
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Este código PIX expira em <strong>24 horas</strong>.
                Após o pagamento, a confirmação é automática.
              </AlertDescription>
            </Alert>

            {/* Status */}
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Aguardando pagamento...</span>
            </div>

            {/* Pedido */}
            <div className="text-center text-xs text-muted-foreground border-t pt-4">
              <p>Pedido: #{orderId?.slice(-8)}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
