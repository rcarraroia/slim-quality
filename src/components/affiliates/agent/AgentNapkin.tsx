import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Brain, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { agentService } from '@/services/agent.service';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface NapkinItem {
  id: string;
  content: string;
  last_updated_by: 'agent' | 'affiliate';
  created_at: string;
}

export function AgentNapkin() {
  const [loading, setLoading] = useState(true);
  const [napkin, setNapkin] = useState<NapkinItem[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadNapkin();
  }, []);

  const loadNapkin = async () => {
    try {
      const data = await agentService.getNapkin();
      setNapkin(data);
    } catch (error) {
      console.error('Erro ao carregar napkin:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await agentService.deleteNapkin(id);
      setNapkin(napkin.filter(item => item.id !== id));
      toast({
        title: 'Aprendizado deletado',
        description: 'O item foi removido com sucesso',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao deletar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setDeleteId(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Aprendizados do Agente
          </CardTitle>
          <CardDescription>
            Conhecimentos que o agente aprendeu durante conversas ({napkin.length}/100)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {napkin.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Seu agente ainda não aprendeu nada. Os aprendizados aparecerão aqui conforme ele interage com clientes.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {napkin.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-4 p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <p className="text-sm">{item.content}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(item.created_at).toLocaleDateString('pt-BR')}
                      </span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">
                        {item.last_updated_by === 'agent' ? 'Aprendido automaticamente' : 'Adicionado manualmente'}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteId(item.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar aprendizado?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O agente não usará mais este conhecimento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && handleDelete(deleteId)}>
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
