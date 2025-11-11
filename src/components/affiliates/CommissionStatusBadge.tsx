/**
 * Commission Status Badge Component
 * Sprint 4: Sistema de Afiliados Multinível
 */

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface CommissionStatusBadgeProps {
  status: 'calculated' | 'pending' | 'paid' | 'failed';
  className?: string;
}

const statusConfig = {
  calculated: {
    label: 'Calculada',
    variant: 'secondary' as const,
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  pending: {
    label: 'Pendente',
    variant: 'secondary' as const,
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  paid: {
    label: 'Paga',
    variant: 'default' as const,
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  failed: {
    label: 'Falhou',
    variant: 'destructive' as const,
    className: 'bg-red-100 text-red-800 border-red-200',
  },
};

export const CommissionStatusBadge = ({ status, className }: CommissionStatusBadgeProps) => {
  const config = statusConfig[status];

  return (
    <Badge
      variant={config.variant}
      className={cn(config.className, className)}
    >
      {config.label}
    </Badge>
  );
};