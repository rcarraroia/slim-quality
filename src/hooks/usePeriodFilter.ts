/**
 * usePeriodFilter Hook
 * Sprint 4: Sistema de Afiliados Multinível
 * 
 * Hook para gerenciar filtros de período em dashboards
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { startOfDay, endOfDay, subDays, subMonths, subYears } from 'date-fns';
import type { Period } from '@/components/shared/PeriodFilter';

const getPeriodFromValue = (value: string): Period => {
  const now = new Date();
  const endDate = endOfDay(now);
  
  switch (value) {
    case '7d':
      return {
        label: 'Últimos 7 dias',
        value: '7d',
        startDate: startOfDay(subDays(now, 7)),
        endDate,
      };
    case '30d':
      return {
        label: 'Últimos 30 dias',
        value: '30d',
        startDate: startOfDay(subDays(now, 30)),
        endDate,
      };
    case '3m':
      return {
        label: 'Últimos 3 meses',
        value: '3m',
        startDate: startOfDay(subMonths(now, 3)),
        endDate,
      };
    case '1y':
      return {
        label: 'Último ano',
        value: '1y',
        startDate: startOfDay(subYears(now, 1)),
        endDate,
      };
    default:
      return {
        label: 'Últimos 30 dias',
        value: '30d',
        startDate: startOfDay(subDays(now, 30)),
        endDate,
      };
  }
};

export const usePeriodFilter = (defaultPeriod: string = '30d') => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [period, setPeriod] = useState<Period>(() => {
    const urlPeriod = searchParams.get('period') || defaultPeriod;
    return getPeriodFromValue(urlPeriod);
  });

  // Atualizar URL quando período mudar
  useEffect(() => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('period', period.value);
    
    // Se for período customizado, adicionar datas
    if (period.value === 'custom') {
      newSearchParams.set('start_date', period.startDate.toISOString());
      newSearchParams.set('end_date', period.endDate.toISOString());
    } else {
      newSearchParams.delete('start_date');
      newSearchParams.delete('end_date');
    }
    
    setSearchParams(newSearchParams, { replace: true });
  }, [period, searchParams, setSearchParams]);

  // Função para alterar período
  const changePeriod = (newPeriod: Period) => {
    setPeriod(newPeriod);
  };

  // Função para obter parâmetros de API
  const getApiParams = () => {
    return {
      start_date: period.startDate.toISOString(),
      end_date: period.endDate.toISOString(),
      period: period.value,
    };
  };

  // Função para obter período formatado para exibição
  const getFormattedPeriod = () => {
    return period.label;
  };

  return {
    period,
    changePeriod,
    getApiParams,
    getFormattedPeriod,
  };
};