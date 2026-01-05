/**
 * Hook para tracking automático de afiliados
 * Inicializa tracking ao carregar páginas
 */

import { useEffect } from 'react';
import { affiliateFrontendService } from '@/services/frontend/affiliate.service';

export function useAffiliateTracking() {
  useEffect(() => {
    // Inicializar tracking apenas uma vez por sessão
    const trackingInitialized = sessionStorage.getItem('trackingInitialized');
    
    if (!trackingInitialized) {
      affiliateFrontendService.initializeTracking();
      sessionStorage.setItem('trackingInitialized', 'true');
    }
  }, []);

  // Função para rastrear conversões manualmente
  const trackConversion = async (orderId: string, orderValue: number) => {
    await affiliateFrontendService.trackConversion(orderId, orderValue);
  };

  // Função para verificar se há tracking ativo
  const hasActiveTracking = () => {
    return !!affiliateFrontendService.getSavedReferralCode();
  };

  return {
    trackConversion,
    hasActiveTracking
  };
}