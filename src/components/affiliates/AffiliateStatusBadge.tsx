/**
 * Affiliate Status Badge Component
 * Sprint 4: Sistema de Afiliados Multinível
 */

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AffiliateStatusBadgeProps {
  status: 'pending' | 'active' | 'inactive' | 'suspended';
  className?: string;
}

const statusConfig = {
  pending: {
    label: 'Pendente',
    variant: 'secondary' as const,
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  active: {
    label: 'Ativo',
    variant: 'default' as const,
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  inactive: {
    label: 'Inativo',
    variant: 'secondary' as const,
    className: 'bg-gray-100 text-gray-800 border-gray-200',
  },
  suspended: {
    label: 'Suspenso',
    variant: 'destructive' as const,
    className: 'bg-red-100 text-red-800 border-red-200',
  },
};

export const AffiliateStatusBadge = ({ status, className }: AffiliateStatusBadgeProps) => {
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