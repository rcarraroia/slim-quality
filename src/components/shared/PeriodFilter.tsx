/**
 * Period Filter Component
 * Sprint 4: Sistema de Afiliados Multinível
 * 
 * Filtro de período reutilizável para dashboards
 */

import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format, subDays, subMonths, subYears, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export interface Period {
  label: string;
  value: string;
  startDate: Date;
  endDate: Date;
}

interface PeriodFilterProps {
  value: Period;
  onChange: (period: Period) => void;
  className?: string;
}

const PRESET_PERIODS: Omit<Period, 'startDate' | 'endDate'>[] = [
  { label: 'Últimos 7 dias', value: '7d' },
  { label: 'Últimos 30 dias', value: '30d' },
  { label: 'Últimos 3 meses', value: '3m' },
  { label: 'Último ano', value: '1y' },
  { label: 'Personalizado', value: 'custom' },
];

const getPeriodDates = (value: string): { startDate: Date; endDate: Date } => {
  const now = new Date();
  const endDate = endOfDay(now);
  
  switch (value) {
    case '7d':
      return { startDate: startOfDay(subDays(now, 7)), endDate };
    case '30d':
      return { startDate: startOfDay(subDays(now, 30)), endDate };
    case '3m':
      return { startDate: startOfDay(subMonths(now, 3)), endDate };
    case '1y':
      return { startDate: startOfDay(subYears(now, 1)), endDate };
    default:
      return { startDate: startOfDay(subDays(now, 30)), endDate };
  }
};

export const PeriodFilter = ({ value, onChange, className }: PeriodFilterProps) => {
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(value.startDate);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(value.endDate);
  const [showCustomCalendar, setShowCustomCalendar] = useState(false);

  const handlePresetChange = (presetValue: string) => {
    const preset = PRESET_PERIODS.find(p => p.value === presetValue);
    if (!preset) return;

    if (presetValue === 'custom') {
      setShowCustomCalendar(true);
      return;
    }

    const dates = getPeriodDates(presetValue);
    onChange({
      ...preset,
      ...dates,
    });
  };

  const handleCustomDateApply = () => {
    if (!customStartDate || !customEndDate) return;

    onChange({
      label: `${format(customStartDate, 'dd/MM/yy', { locale: ptBR })} - ${format(customEndDate, 'dd/MM/yy', { locale: ptBR })}`,
      value: 'custom',
      startDate: startOfDay(customStartDate),
      endDate: endOfDay(customEndDate),
    });
    
    setShowCustomCalendar(false);
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Select value={value.value} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Selecionar período" />
        </SelectTrigger>
        <SelectContent>
          {PRESET_PERIODS.map((period) => (
            <SelectItem key={period.value} value={period.value}>
              {period.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {value.value === 'custom' && (
        <Popover open={showCustomCalendar} onOpenChange={setShowCustomCalendar}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-64 justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {customStartDate && customEndDate ? (
                `${format(customStartDate, 'dd/MM/yy', { locale: ptBR })} - ${format(customEndDate, 'dd/MM/yy', { locale: ptBR })}`
              ) : (
                'Selecionar datas'
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Data inicial:</label>
                <Calendar
                  mode="single"
                  selected={customStartDate}
                  onSelect={setCustomStartDate}
                  locale={ptBR}
                  className="rounded-md border"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Data final:</label>
                <Calendar
                  mode="single"
                  selected={customEndDate}
                  onSelect={setCustomEndDate}
                  locale={ptBR}
                  className="rounded-md border"
                  disabled={(date) => customStartDate ? date < customStartDate : false}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCustomCalendar(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleCustomDateApply}
                  disabled={!customStartDate || !customEndDate}
                >
                  Aplicar
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};