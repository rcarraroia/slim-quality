/**
 * Página de Notificações Admin
 * Permite enviar notificações broadcast para afiliados
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Send, Loader2, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/services/api.service';

export default function NotificacoesAdmin() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'info'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.message) {
      toast({
        title: 'Erro',
        description: 'Título e mensagem são obrigatórios',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiService.post('/admin?action=notifications-create', formData);

      if (response.data.success) {
        toast({
          title: 'Sucesso!',
          description: `Notificação enviada para ${response.data.data.recipients_count} afiliados`,
        });

        // Limpar formulário
        setFormData({
          title: '',
          message: '',
          type: 'info'
        });
      }
    } catch (error: any) {
      console.error('Erro ao enviar notificação:', error);
      toast({
        title: 'Erro',
        description: error.response?.data?.error || 'Erro ao enviar notificação',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Notificações</h1>
        <p className="text-muted-foreground mt-2">
          Envie notificações para todos os afiliados ativos
        </p>
      </div>

      {/* Formulário de Envio */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Enviar Notificação Broadcast
          </CardTitle>
          <CardDescription>
            A notificação será enviada para todos os afiliados com status ativo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tipo */}
            <div className="space-y-2">
              <Label htmlFor="type">Tipo de Notificação</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-blue-500" />
                      Informação
                    </div>
                  </SelectItem>
                  <SelectItem value="success">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      Sucesso
                    </div>
                  </SelectItem>
                  <SelectItem value="warning">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-yellow-500" />
                      Aviso
                    </div>
                  </SelectItem>
                  <SelectItem value="error">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-red-500" />
                      Erro
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Título */}
            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                placeholder="Ex: Nova funcionalidade disponível"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">
                {formData.title.length}/100 caracteres
              </p>
            </div>

            {/* Mensagem */}
            <div className="space-y-2">
              <Label htmlFor="message">Mensagem</Label>
              <Textarea
                id="message"
                placeholder="Digite a mensagem que será enviada para os afiliados..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={6}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                {formData.message.length}/500 caracteres
              </p>
            </div>

            {/* Preview */}
            {(formData.title || formData.message) && (
              <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase">
                  Preview
                </p>
                <div className="rounded-md bg-background border border-border p-3 space-y-2">
                  <div className="flex items-start gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                      formData.type === 'info' ? 'bg-blue-500/10' :
                      formData.type === 'success' ? 'bg-green-500/10' :
                      formData.type === 'warning' ? 'bg-yellow-500/10' :
                      'bg-red-500/10'
                    }`}>
                      <Bell className={`h-4 w-4 ${
                        formData.type === 'info' ? 'text-blue-500' :
                        formData.type === 'success' ? 'text-green-500' :
                        formData.type === 'warning' ? 'text-yellow-500' :
                        'text-red-500'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        {formData.title || 'Título da notificação'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formData.message || 'Mensagem da notificação'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Botão de Envio */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormData({ title: '', message: '', type: 'info' })}
                disabled={isLoading}
              >
                Limpar
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !formData.title || !formData.message}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Enviar Notificação
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Informações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Como Funciona
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            • As notificações são enviadas apenas para afiliados com status <span className="font-semibold text-foreground">ativo</span>
          </p>
          <p>
            • Os afiliados verão a notificação no sino de notificações do painel
          </p>
          <p>
            • As notificações ficam salvas no histórico de cada afiliado
          </p>
          <p>
            • Use o tipo adequado: <span className="font-semibold text-blue-500">Info</span> para informações gerais, 
            <span className="font-semibold text-green-500"> Sucesso</span> para conquistas, 
            <span className="font-semibold text-yellow-500"> Aviso</span> para alertas importantes, 
            <span className="font-semibold text-red-500"> Erro</span> para problemas críticos
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
