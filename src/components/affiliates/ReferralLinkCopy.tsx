/**
 * Referral Link Copy Component
 * Sprint 4: Sistema de Afiliados Multinível
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, Check, ExternalLink, QrCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ReferralLinkCopyProps {
  referralCode: string;
  referralUrl: string;
  qrCodeUrl?: string;
  className?: string;
}

export const ReferralLinkCopy = ({
  referralCode,
  referralUrl,
  qrCodeUrl,
  className,
}: ReferralLinkCopyProps) => {
  const [copied, setCopied] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      
      toast({
        title: 'Link copiado!',
        description: 'O link de indicação foi copiado para a área de transferência.',
      });

      // Reset do ícone após 2 segundos
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      
      toast({
        title: 'Erro ao copiar',
        description: 'Não foi possível copiar o link. Tente selecionar e copiar manualmente.',
        variant: 'destructive',
      });
    }
  };

  const openLink = () => {
    window.open(referralUrl, '_blank');
  };

  const shareViaWhatsApp = () => {
    const message = encodeURIComponent(
      `🎯 Conheça os colchões magnéticos terapêuticos da Slim Quality!\n\n` +
      `✨ Tecnologia exclusiva para melhorar seu sono e saúde\n` +
      `🔗 Acesse: ${referralUrl}\n\n` +
      `#SlimQuality #ColchãoMagnético #SaúdeESono`
    );
    
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ExternalLink className="h-5 w-5" />
          Seu Link de Indicação
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Código de referência */}
        <div>
          <Label className="text-sm font-medium">Código de Referência</Label>
          <div className="mt-1 p-3 bg-gray-50 rounded-md border">
            <code className="text-lg font-mono font-bold text-blue-600">
              {referralCode}
            </code>
          </div>
        </div>

        {/* Link completo */}
        <div>
          <Label className="text-sm font-medium">Link Completo</Label>
          <div className="mt-1 flex gap-2">
            <Input
              value={referralUrl}
              readOnly
              className="font-mono text-sm"
            />
            <Button
              onClick={copyToClipboard}
              variant="outline"
              size="icon"
              className="shrink-0"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Ações */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={copyToClipboard} className="flex-1 min-w-[120px]">
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Copiado!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copiar Link
              </>
            )}
          </Button>
          
          <Button onClick={openLink} variant="outline" className="flex-1 min-w-[120px]">
            <ExternalLink className="h-4 w-4 mr-2" />
            Abrir Link
          </Button>
          
          <Button onClick={shareViaWhatsApp} variant="outline" className="flex-1 min-w-[120px]">
            📱 WhatsApp
          </Button>

          {qrCodeUrl && (
            <Button
              onClick={() => setShowQrCode(!showQrCode)}
              variant="outline"
              size="icon"
            >
              <QrCode className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* QR Code */}
        {showQrCode && qrCodeUrl && (
          <div className="flex justify-center p-4 bg-white border rounded-lg">
            <img
              src={qrCodeUrl}
              alt="QR Code do link de indicação"
              className="w-48 h-48"
            />
          </div>
        )}

        {/* Dicas de uso */}
        <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
          <h4 className="font-medium text-blue-900 mb-1">💡 Como usar:</h4>
          <ul className="space-y-1 text-blue-800">
            <li>• Compartilhe este link com seus contatos</li>
            <li>• Quando alguém comprar através dele, você ganha comissão</li>
            <li>• O link é válido por tempo indeterminado</li>
            <li>• Você pode acompanhar os cliques no seu dashboard</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};