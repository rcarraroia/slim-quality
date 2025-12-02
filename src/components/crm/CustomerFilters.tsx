import { useState } from 'react';
import { Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TagSelector } from './TagSelector';

export interface CustomerFilterValues {
  tags: string[];
  dateFrom: string;
  dateTo: string;
  origin: string;
}

interface CustomerFiltersProps {
  filters: CustomerFilterValues;
  onFiltersChange: (filters: CustomerFilterValues) => void;
}

export function CustomerFilters({ filters, onFiltersChange }: CustomerFiltersProps) {
  const [open, setOpen] = useState(false);

  const updateFilter = (key: keyof CustomerFilterValues, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      tags: [],
      dateFrom: '',
      dateTo: '',
      origin: 'all'
    });
  };

  const hasActiveFilters = 
    filters.tags.length > 0 || 
    filters.dateFrom || 
    filters.dateTo || 
    (filters.origin && filters.origin !== 'all');

  const activeFilterCount = 
    filters.tags.length + 
    (filters.dateFrom ? 1 : 0) + 
    (filters.dateTo ? 1 : 0) + 
    (filters.origin ? 1 : 0);

  return (
    <div className="space-y-4">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
            {hasActiveFilters && (
              <Badge className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Filtros Avançados</h4>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Limpar
                </Button>
              )}
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tags</label>
              <TagSelector
                selectedTags={filters.tags}
                onTagsChange={(tags) => updateFilter('tags', tags)}
              />
            </div>

            {/* Data de Cadastro */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Data de Cadastro</label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => updateFilter('dateFrom', e.target.value)}
                  placeholder="De"
                />
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => updateFilter('dateTo', e.target.value)}
                  placeholder="Até"
                />
              </div>
            </div>

            {/* Origem */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Origem</label>
              <Select value={filters.origin} onValueChange={(value) => updateFilter('origin', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as origens" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="organic">Orgânico</SelectItem>
                  <SelectItem value="affiliate">Afiliado</SelectItem>
                  <SelectItem value="n8n">N8N/WhatsApp</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Filtros Ativos */}
      {hasActiveFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">Filtros ativos:</span>
              {filters.dateFrom && (
                <Badge variant="secondary">
                  De: {new Date(filters.dateFrom).toLocaleDateString('pt-BR')}
                  <X
                    className="h-3 w-3 ml-1 cursor-pointer"
                    onClick={() => updateFilter('dateFrom', '')}
                  />
                </Badge>
              )}
              {filters.dateTo && (
                <Badge variant="secondary">
                  Até: {new Date(filters.dateTo).toLocaleDateString('pt-BR')}
                  <X
                    className="h-3 w-3 ml-1 cursor-pointer"
                    onClick={() => updateFilter('dateTo', '')}
                  />
                </Badge>
              )}
              {filters.origin && (
                <Badge variant="secondary">
                  Origem: {
                    filters.origin === 'organic' ? 'Orgânico' : 
                    filters.origin === 'affiliate' ? 'Afiliado' : 
                    filters.origin === 'n8n' ? 'N8N/WhatsApp' : 'Manual'
                  }
                  <X
                    className="h-3 w-3 ml-1 cursor-pointer"
                    onClick={() => updateFilter('origin', '')}
                  />
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
