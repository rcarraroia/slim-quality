/**
 * Hook React para ReferralTracker
 * Facilita integração com componentes React
 */

import { useState, useEffect, useCallback } from 'react';
import { ReferralTracker, ReferralData } from '@/utils/referral-tracker';

export interface UseReferralTrackerReturn {
  hasActiveReferral: boolean;
  referralCode: string | null;
  referralData: ReferralData | null;
  daysRemaining: number;
  trackConversion: (orderId: string, orderValue: number) => Promise<void>;
  clearReferral: () => void;
  generateLink: (baseUrl: string, code: string, utmParams?: Record<string, string>) => string;
}

export function useReferralTracker(): UseReferralTrackerReturn {
  const [hasActiveReferral, setHasActiveReferral] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [daysRemaining, setDaysRemaining] = useState(0);

  // Atualizar estado do referral
  const updateReferralState = useCallback(() => {
    const stats = ReferralTracker.getReferralStats();
    const data = ReferralTracker.getReferralData();
    
    setHasActiveReferral(stats.hasActive);
    setReferralCode(stats.code || null);
    setReferralData(data);
    setDaysRemaining(stats.daysRemaining || 0);
  }, []);

  // Inicializar e configurar listeners
  useEffect(() => {
    updateReferralState();

    // Atualizar estado a cada minuto para verificar expiração
    const interval = setInterval(updateReferralState, 60000);

    // Listener para mudanças no localStorage (outras abas)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.startsWith('referral_')) {
        updateReferralState();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [updateReferralState]);

  // Função para rastrear conversão
  const trackConversion = useCallback(async (orderId: string, orderValue: number) => {
    await ReferralTracker.trackConversion(orderId, orderValue);
    updateReferralState(); // Atualizar estado após conversão
  }, [updateReferralState]);

  // Função para limpar referral
  const clearReferral = useCallback(() => {
    ReferralTracker.clearReferralCode();
    updateReferralState();
  }, [updateReferralState]);

  // Função para gerar link
  const generateLink = useCallback((baseUrl: string, code: string, utmParams?: Record<string, string>) => {
    return ReferralTracker.generateAffiliateLink(baseUrl, code, utmParams);
  }, []);

  return {
    hasActiveReferral,
    referralCode,
    referralData,
    daysRemaining,
    trackConversion,
    clearReferral,
    generateLink
  };
}