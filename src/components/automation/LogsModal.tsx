/**
 * Modal para visualização de logs de automação
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, AlertCircle, CheckCircle, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { automationService, AutomationLog, AutomationRule } from '@/services/automation.service';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface LogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  automation: AutomationRule | null;
}

const statusIcons = {
  success: CheckCircle,
  error: AlertCircle,
  pending: Clock,
};

const statusColors = {
  success: 'bg-success/10 text-success border-success/20',
  error: 'bg-destructive/10 text-destructive border-destructive/20',
  pending: 'bg-warning/10 text-warning border-warning/20',
};

export function LogsModal({ isOpen, onClose, automation }: LogsModalProps) {
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  // Carregar logs quando modal abrir
  useEffect(() => {
    if (isOpen && automation) {
      loadLogs(1);
    }
  }, [isOpen, automation]);

  const loadLogs = async (page: number) => {
    if (!automation) return;

    try {
      setLoading(true);
      
      const response = await automationService.getRuleLogs(automation.id, page, 20);
      
      if (response.success && response.data) {
        setLogs(response.data.logs);
        setPagination(response.data.pagination);
      } else {
        throw new Error(response.error || 'Erro ao carregar logs');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error('Erro ao carregar logs: ' + errorMessage);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      loadLogs(newPage);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>
            Logs de Execução: {automation?.nome}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Carregando logs...</span>
            </div>
          )}

          {/* Lista de Logs */}
          {!loading && (
            <>
              {logs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                  <p>Nenhum log de execução encontrado</p>
                  <p className="text-sm">Esta automação ainda não foi executada</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-3">
                    {logs.map((log) => {
                      const StatusIcon = statusIcons[log.status];
                      
                      return (
                        <div
                          key={log.id}
                          className="border rounded-lg p-4 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <StatusIcon className="h-4 w-4" />
                              <Badge className={cn("border", statusColors[log.status])}>
                                {log.status === 'success' ? 'Sucesso' : 
                                 log.status === 'error' ? 'Erro' : 'Pendente'}
                              </Badge>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {formatDate(log.executed_at)}
                            </span>
                          </div>

                          {/* Mensagem de erro (se houver) */}
                          {log.error_message && (
                            <div className="bg-destructive/10 border border-destructive/20 rounded p-2">
                              <p className="text-sm text-destructive font-medium">Erro:</p>
                              <p className="text-sm text-destructive">{log.error_message}</p>
                            </div>
                          )}

                          {/* Detalhes (se houver) */}
                          {log.details && (
                            <div className="bg-muted/50 rounded p-2">
                              <p className="text-sm font-medium mb-1">Detalhes:</p>
                              <pre className="text-xs text-muted-foreground overflow-x-auto">
                                {typeof log.details === 'string' 
                                  ? log.details 
                                  : JSON.stringify(log.details, null, 2)
                                }
                              </pre>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}

              {/* Paginação */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Página {pagination.page} de {pagination.totalPages} 
                    ({pagination.total} logs no total)
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page >= pagination.totalPages}
                    >
                      Próxima
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Botões do rodapé */}
          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}