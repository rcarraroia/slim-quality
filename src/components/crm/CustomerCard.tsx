import { User, Mail, Phone, Tag as TagIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { Customer } from '@/services/frontend/customer-frontend.service';

interface CustomerCardProps {
  customer: Customer;
  onClick?: () => void;
}

export function CustomerCard({ customer, onClick }: CustomerCardProps) {
  const initials = customer.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const statusColors = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    pending: 'bg-yellow-100 text-yellow-800'
  };

  return (
    <Card
      className="p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        <Avatar className="h-12 w-12">
          <AvatarFallback className="bg-primary text-primary-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-lg truncate">{customer.name}</h3>
            <Badge className={statusColors[customer.status as keyof typeof statusColors] || statusColors.active}>
              {customer.status}
            </Badge>
          </div>

          <div className="space-y-1 text-sm text-muted-foreground">
            {customer.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span className="truncate">{customer.email}</span>
              </div>
            )}
            {customer.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <span>{customer.phone}</span>
              </div>
            )}
          </div>

          {customer.tags && customer.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {customer.tags.slice(0, 3).map(tag => (
                <Badge
                  key={tag.id}
                  variant="outline"
                  style={{ borderColor: tag.color, color: tag.color }}
                  className="text-xs"
                >
                  {tag.name}
                </Badge>
              ))}
              {customer.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{customer.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
