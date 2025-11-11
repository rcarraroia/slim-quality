/**
 * Recent Conversions Table Component
 * Sprint 4: Sistema de Afiliados Multinível
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';

interface ConversionData {
  id: string;
  date: string;
  productName: string;
  orderValue: number;
  commissionValue: number;
  level: number;
  orderNumber: string;
}

interface RecentConversionsTableProps {
  data?: ConversionData[];
  loading?: boolean;
  error?: string;
}

export const RecentConversionsTable = ({ data, loading, error }: RecentConversionsTableProps) => {
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

  const getLevelBadge = (level: number) => {
    const levelConfig = {
      1: { label: 'N1', variant: 'default' as const },
      2: { label: 'N2', variant: 'secondary' as const },
      3: { label: 'N3', variant: 'outline' as const },
    };
    
    const config = levelConfig[level as keyof typeof levelConfig] || { label: `N${level}`, variant: 'outline' as const };
    
    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Últimas Conversões</CardTitle>
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
          <CardTitle>Últimas Conversões</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>Erro ao carregar conversões</p>
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
          <CardTitle>Últimas Conversões</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>Nenhuma conversão encontrada</p>
            <p className="text-sm mt-1">Suas vendas aparecerão aqui</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Últimas Conversões</CardTitle>
        <Link to="/afiliados/dashboard/comissoes">
          <Button variant="outline" size="sm">
            Ver Todas
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium text-sm">Data</th>
                <th className="text-left p-3 font-medium text-sm">Produto</th>
                <th className="text-left p-3 font-medium text-sm">Valor Venda</th>
                <th className="text-left p-3 font-medium text-sm">Comissão</th>
                <th className="text-left p-3 font-medium text-sm">Nível</th>
                <th className="text-left p-3 font-medium text-sm">Ações</th>
              </tr>
            </thead>
            <tbody>
              {data.map((conversion, index) => (
                <tr 
                  key={conversion.id}
                  className={index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}
                >
                  <td className="p-3 text-sm">
                    {formatDate(conversion.date)}
                  </td>
                  <td className="p-3 text-sm">
                    <div>
                      <p className="font-medium">{conversion.productName}</p>
                      <p className="text-xs text-muted-foreground">#{conversion.orderNumber}</p>
                    </div>
                  </td>
                  <td className="p-3 text-sm font-medium">
                    {formatCurrency(conversion.orderValue)}
                  </td>
                  <td className="p-3 text-sm font-medium text-success">
                    {formatCurrency(conversion.commissionValue)}
                  </td>
                  <td className="p-3">
                    {getLevelBadge(conversion.level)}
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