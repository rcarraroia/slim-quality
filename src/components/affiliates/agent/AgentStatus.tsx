import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Bot, QrCode, Power, RefreshCw, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { agentService } from '@/services/agent.service';
import { useToast } from '@/components/ui/use-toast';

interface AgentStatusProps {
  status: 'connected' | 'disconnected' | 'connecting';
  onStatusChange: () => void;
}

export function AgentStatus({ status, onStatusChange }: AgentStatusProps) {
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const { toast } = useToast();

  const handleActivate = async () => {
    setLoading(true);
    try {
      const { qr_code } = await agentService.activateAgent();
      setQrCode(qr_code);
      toast({
        title: 'Agente ativado',
        description: 'Escaneie o QR Code com seu WhatsApp',
      });
      onStatusChange();
    } catch (error: any) {
      toast({
        title: 'Erro ao ativar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateQR = async () => {
    setLoading(true);
    try {
      const { qr_code } = await agentService.regenerateQRCode();
      setQrCode(qr_code);
      toast({
        title: 'QR Code regenerado',
        description: 'Escaneie o novo QR Code',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao regenerar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await agentService.disconnect();
      setQrCode(null);
      toast({
        title: 'Agente desconectado',
        description: 'WhatsApp desconectado com sucesso',
      });
      onStatusChange();
    } catch (error: any) {
      toast({
        title: 'Erro ao desconectar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'connected':
        return (
          <Badge className="bg-green-500">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Conectado
          </Badge>
        );
      case 'connecting':
        return (
          <Badge className="bg-yellow-500">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Conectando
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <XCircle className="h-3 w-3 mr-1" />
            Desconectado
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Status da Conexão
              </CardTitle>
              <CardDescription>
                Conecte seu WhatsApp para ativar o agente
              </CardDescription>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'disconnected' && !qrCode && (
            <div className="text-center py-8">
              <Bot className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                Seu agente ainda não está ativado
              </p>
              <Button onClick={handleActivate} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Ativando...
                  </>
                ) : (
                  <>
                    <Power className="h-4 w-4 mr-2" />
                    Ativar Agente
                  </>
                )}
              </Button>
            </div>
          )}

          {qrCode && status !== 'connected' && (
            <div className="space-y-4">
              <Alert>
                <QrCode className="h-4 w-4" />
                <AlertDescription>
                  Escaneie o QR Code abaixo com seu WhatsApp para conectar
                </AlertDescription>
              </Alert>
              
              <div className="flex justify-center">
                <img 
                  src={qrCode} 
                  alt="QR Code" 
                  className="w-64 h-64 border rounded-lg"
                />
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={handleRegenerateQR}
                  disabled={loading}
                  className="flex-1"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerar QR Code
                </Button>
              </div>
            </div>
          )}

          {status === 'connected' && (
            <div className="space-y-4">
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Seu agente está conectado e pronto para atender!
                </AlertDescription>
              </Alert>

              <Button 
                variant="destructive" 
                onClick={handleDisconnect}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Desconectando...
                  </>
                ) : (
                  <>
                    <Power className="h-4 w-4 mr-2" />
                    Desconectar
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
