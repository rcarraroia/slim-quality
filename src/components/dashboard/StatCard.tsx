import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: {
    value: string;
    positive: boolean;
  };
  iconColor?: string;
}

export function StatCard({ icon: Icon, label, value, trend, iconColor = "text-primary" }: StatCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Icon className={cn("h-8 w-8", iconColor)} />
            <div>
              <p className="text-3xl font-bold">{value}</p>
              <p className="text-sm text-muted-foreground">{label}</p>
            </div>
          </div>
        </div>
        
        {trend && (
          <div className={cn(
            "flex items-center gap-1 mt-4 text-sm font-medium",
            trend.positive ? "text-success" : "text-muted-foreground"
          )}>
            {trend.positive ? (
              <ArrowUp className="h-4 w-4" />
            ) : null}
            <span>{trend.value}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
