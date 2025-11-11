/**
 * Metric Card Component
 * Sprint 4: Sistema de Afiliados Multinível
 */

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  valueClassName?: string;
}

export const MetricCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  className,
  valueClassName,
}: MetricCardProps) => {
  return (
    <Card className={cn('', className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className={cn(
              'text-2xl font-bold text-gray-900 mt-1',
              valueClassName
            )}>
              {value}
            </p>
            {subtitle && (
              <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
            )}
            {trend && (
              <div className="flex items-center mt-2">
                <span
                  className={cn(
                    'text-xs font-medium',
                    trend.isPositive ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {trend.isPositive ? '+' : ''}{trend.value}%
                </span>
                <span className="text-xs text-gray-500 ml-1">vs. mês anterior</span>
              </div>
            )}
          </div>
          <div className="ml-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Icon className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};