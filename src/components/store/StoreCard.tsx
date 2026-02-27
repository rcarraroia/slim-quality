import { MapPin, Phone, Clock, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface StoreCardProps {
  id: string;
  store_name: string;
  slug: string;
  description?: string;
  city: string;
  state: string;
  neighborhood?: string;
  logo_url?: string;
  phone?: string;
  whatsapp?: string;
  distance?: number;
  isOpen?: boolean;
  onClick?: () => void;
  className?: string;
}

export function StoreCard({
  store_name,
  slug,
  description,
  city,
  state,
  neighborhood,
  logo_url,
  phone,
  whatsapp,
  distance,
  isOpen,
  onClick,
  className
}: StoreCardProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDistance = (meters?: number) => {
    if (!meters) return null;
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all duration-200 hover:border-primary hover:shadow-md',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Logo */}
          <Avatar className="h-16 w-16 flex-shrink-0">
            <AvatarImage src={logo_url} alt={store_name} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {getInitials(store_name)}
            </AvatarFallback>
          </Avatar>

          {/* Informações */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg truncate">{store_name}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">
                    {neighborhood ? `${neighborhood}, ` : ''}{city} - {state}
                  </span>
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-col gap-1 items-end">
                {isOpen !== undefined && (
                  <Badge variant={isOpen ? 'default' : 'secondary'} className="text-xs">
                    {isOpen ? 'Aberto' : 'Fechado'}
                  </Badge>
                )}
                {distance !== undefined && (
                  <Badge variant="outline" className="text-xs">
                    {formatDistance(distance)}
                  </Badge>
                )}
              </div>
            </div>

            {/* Descrição */}
            {description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {description}
              </p>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between gap-2">
              {/* Contato */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {(phone || whatsapp) && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    <span>{phone || whatsapp}</span>
                  </div>
                )}
              </div>

              {/* Ação */}
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-primary hover:text-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(`/lojas/${slug}`, '_blank');
                }}
              >
                Ver detalhes
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function StoreCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-4">
          <div className="h-16 w-16 rounded-full bg-muted animate-pulse" />
          <div className="flex-1 space-y-3">
            <div className="h-5 w-3/4 bg-muted rounded animate-pulse" />
            <div className="h-4 w-1/2 bg-muted rounded animate-pulse" />
            <div className="h-4 w-full bg-muted rounded animate-pulse" />
            <div className="flex justify-between">
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              <div className="h-4 w-20 bg-muted rounded animate-pulse" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
