/**
 * Affiliate Network View Component
 * Sprint 4: Sistema de Afiliados Multinível
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AffiliateStatusBadge } from '@/components/affiliates/AffiliateStatusBadge';
import { Users, ChevronRight, ExternalLink } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';

interface NetworkAffiliate {
  id: string;
  name: string;
  email: string;
  status: 'pending' | 'active' | 'inactive' | 'suspended';
  createdAt: string;
  totalCommissions: number;
}

interface NetworkUpline {
  n2?: { name: string; email: string };
  n3?: { name: string; email: string };
}

interface AffiliateNetworkData {
  directAffiliates: NetworkAffiliate[];
  upline: NetworkUpline;
  totalDirects: number;
  totalNetwork: number;
}

interface AffiliateNetworkViewProps {
  data?: AffiliateNetworkData;
  loading?: boolean;
  error?: string;
}

export const AffiliateNetworkView = ({ data, loading, error }: AffiliateNetworkViewProps) => {
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

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Minha Rede
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 border rounded">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
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
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Minha Rede
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>Erro ao carregar rede</p>
            <Button variant="outline" size="sm" className="mt-2">
              Tentar novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Minha Rede
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum afiliado na sua rede ainda</p>
            <p className="text-sm mt-1">Compartilhe seu link para começar a construir sua rede</p>
            <Link to="/afiliados/dashboard/link">
              <Button variant="outline" size="sm" className="mt-4">
                Ver Meu Link
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Minha Rede
        </CardTitle>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{data.totalDirects} diretos</span>
          <span>{data.totalNetwork} total</span>
          <Link to="/afiliados/dashboard/rede">
            <Button variant="outline" size="sm">
              Ver Completa
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Breadcrumb da hierarquia */}
        {(data.upline.n3 || data.upline.n2) && (
          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm font-medium mb-2">Você foi indicado por:</p>
            <div className="flex items-center gap-2 text-sm">
              {data.upline.n3 && (
                <>
                  <span className="font-medium">{data.upline.n3.name}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </>
              )}
              {data.upline.n2 && (
                <>
                  <span className="font-medium">{data.upline.n2.name}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </>
              )}
              <span className="font-medium text-primary">Você</span>
            </div>
          </div>
        )}

        {/* Lista de afiliados diretos */}
        <div>
          <h4 className="font-medium mb-4">Afiliados Diretos (N1)</h4>
          {data.directAffiliates.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <p>Nenhum afiliado direto ainda</p>
              <p className="text-sm mt-1">Compartilhe seu link para indicar pessoas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.directAffiliates.slice(0, 5).map((affiliate) => (
                <div
                  key={affiliate.id}
                  className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <Avatar>
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(affiliate.name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium truncate">{affiliate.name}</p>
                      <AffiliateStatusBadge status={affiliate.status} />
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {affiliate.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Cadastrado em {formatDate(affiliate.createdAt)}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-sm font-medium text-success">
                      {formatCurrency(affiliate.totalCommissions)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Comissões geradas
                    </p>
                  </div>
                  
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              
              {data.directAffiliates.length > 5 && (
                <div className="text-center pt-2">
                  <Link to="/afiliados/dashboard/rede">
                    <Button variant="outline" size="sm">
                      Ver todos os {data.directAffiliates.length} afiliados
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};