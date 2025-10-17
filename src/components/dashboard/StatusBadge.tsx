import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type StatusType = 
  | 'ativa' | 'aguardando' | 'negociando' | 'finalizada'
  | 'pago' | 'pendente' | 'cancelado' | 'enviado'
  | 'ativo' | 'inativo'
  | 'aprovada' | 'cancelada' | 'paga' | 'depositado'
  | 'aprovado' | 'processando' | 'rejeitado';

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  // Conversas
  ativa: { label: 'Ativa', className: 'bg-success/10 text-success hover:bg-success/20' },
  aguardando: { label: 'Aguardando', className: 'bg-warning/10 text-warning hover:bg-warning/20' },
  negociando: { label: 'Negociando', className: 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20' },
  finalizada: { label: 'Finalizada', className: 'bg-muted text-muted-foreground hover:bg-muted/80' },
  
  // Vendas
  pago: { label: 'Pago', className: 'bg-success/10 text-success hover:bg-success/20' },
  pendente: { label: 'Pendente', className: 'bg-warning/10 text-warning hover:bg-warning/20' },
  cancelado: { label: 'Cancelado', className: 'bg-destructive/10 text-destructive hover:bg-destructive/20' },
  enviado: { label: 'Enviado', className: 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20' },
  
  // Geral
  ativo: { label: 'Ativo', className: 'bg-success/10 text-success hover:bg-success/20' },
  inativo: { label: 'Inativo', className: 'bg-muted text-muted-foreground hover:bg-muted/80' },
  
  // Comissões/Recebimentos
  aprovada: { label: 'Aprovada', className: 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20' },
  cancelada: { label: 'Cancelada', className: 'bg-destructive/10 text-destructive hover:bg-destructive/20' },
  paga: { label: 'Paga', className: 'bg-success/10 text-success hover:bg-success/20' },
  depositado: { label: 'Depositado', className: 'bg-success/10 text-success hover:bg-success/20' }, // Novo
  
  // Saques (mantido para o dashboard admin)
  aprovado: { label: 'Aprovado', className: 'bg-success/10 text-success hover:bg-success/20' },
  processando: { label: 'Processando', className: 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20' },
  rejeitado: { label: 'Rejeitado', className: 'bg-destructive/10 text-destructive hover:bg-destructive/20' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  // Mapeamento de 'aguardando' (Recebimentos) para 'pendente' (Vendas/Geral)
  const effectiveStatus = status === 'aguardando' ? 'pendente' : status;
  
  const config = statusConfig[effectiveStatus as StatusType];
  
  if (!config) {
    return <Badge variant="outline" className={cn("border-0", className)}>{status}</Badge>;
  }

  return (
    <Badge 
      variant="outline" 
      className={cn(config.className, "border-0", className)}
    >
      {config.label}
    </Badge>
  );
}