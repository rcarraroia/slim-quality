/**
 * Chart Wrapper Component
 * Sprint 4: Sistema de Afiliados Multinível
 * 
 * Wrapper reutilizável para gráficos com loading, error e empty states
 */

import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChartWrapperProps {
  title: string;
  children: ReactNode;
  filters?: ReactNode;
  loading?: boolean;
  error?: string;
  isEmpty?: boolean;
  className?: string;
  height?: string;
}

export const ChartWrapper = ({
  title,
  children,
  filters,
  loading = false,
  error,
  isEmpty = false,
  className,
  height = "h-80",
}: ChartWrapperProps) => {
  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          {filters && <div className="flex items-center gap-2">{filters}</div>}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className={cn('w-full', height)}>
          {loading && (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-32 w-full" />
            </div>
          )}
          
          {error && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Erro ao carregar dados
              </h3>
              <p className="text-sm text-gray-500 max-w-sm">
                {error}
              </p>
            </div>
          )}
          
          {isEmpty && !loading && !error && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <BarChart3 className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhum dado encontrado
              </h3>
              <p className="text-sm text-gray-500 max-w-sm">
                Não há dados suficientes para exibir este gráfico no período selecionado.
              </p>
            </div>
          )}
          
          {!loading && !error && !isEmpty && children}
        </div>
      </CardContent>
    </Card>
  );
};