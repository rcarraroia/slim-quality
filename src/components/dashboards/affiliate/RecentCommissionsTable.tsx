/**
 * Recent Commissions Table Component
 * Sprint 4: Sistema de Afiliados Multinível
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { CommissionStatusBadge } from '@/components/affiliates/CommissionStatusBadge';
import { ExternalLink } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';

interface CommissionData {
  id: string;
  paidAt?: string;
  orderNumber: string;
  value: number;
  status: 'calculated' | 'pending' | 'paid' | 'failed';
  createdAt: string;
}

interface RecentCommissionsTableProps {
  data?: CommissionData[];
  loading?: boolean;
  error?: string;
  onStatusFilter?: (status: string) => void;
}

export const RecentCommissionsTable = ({ 
  data, 
  loading, 
  error, 
  onStatusFilter 
}: RecentCommissionsTableProps) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value / 100);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    onStatusFilter?.(status);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Últimas Comissões</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Últimas Comissões</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>Erro ao carregar comissões</p>
            <Button variant="outline" size="sm" className="mt-2">
              Tentar novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Últimas Comissões</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>Nenhuma comissão encontrada</p>
            <p className="text-sm mt-1">Suas comissões aparecerão aqui</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Últimas Comissões</CardTitle>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="paid">Pagas</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="failed">Falhadas</SelectItem>
            </SelectContent>
          </Select>
          <Link to="/afiliados/dashboard/comissoes">
            <Button variant="outline" size="sm">
              Ver Todas
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium text-sm">Data</th>
                <th className="text-left p-3 font-medium text-sm">Pedido</th>
                <th className="text-left p-3 font-medium text-sm">Valor</th>
                <th className="text-left p-3 font-medium text-sm">Status</th>
                <th className="text-left p-3 font-medium text-sm">Ações</th>
              </tr>
            </thead>
            <tbody>
              {data.map((commission, index) => (
                <tr 
                  key={commission.id}
                  className={index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}
                >
                  <td className="p-3 text-sm">
                    {commission.paidAt ? (
                      <div>
                        <p className="font-medium">{formatDate(commission.paidAt)}</p>
                        <p className="text-xs text-muted-foreground">Pago em</p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-medium">{formatDate(commission.createdAt)}</p>
                        <p className="text-xs text-muted-foreground">Criado em</p>
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-sm">
                    <p className="font-medium">#{commission.orderNumber}</p>
                  </td>
                  <td className="p-3 text-sm font-medium text-success">
                    {formatCurrency(commission.value)}
                  </td>
                  <td className="p-3">
                    <CommissionStatusBadge status={commission.status} />
                  </td>
                  <td className="p-3">
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};