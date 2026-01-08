/**
 * Hook para tracking automático de afiliados
 * Atualizado para usar o ReferralTracker consolidado
 * Task 1: Correção Sistema Pagamentos
 */

import { useEffect } from 'react';
import { ReferralTracker } from '@/utils/referral-tracker';

export function useAffiliateTracking() {
  useEffect(() => {
    // Garantir que o ReferralTracker está inicializado
    // O ReferralTracker já se auto-inicializa, mas garantimos aqui
    ReferralTracker.initialize();
    
    console.log('[useAffiliateTracking] Sistema de tracking inicializado');
  }, []);

  // Função para rastrear conversões manualmente
  const trackConversion = async (orderId: string, orderValue: number) => {
    await ReferralTracker.trackConversion(orderId, orderValue);
  };

  // Função para verificar se há tracking ativo
  const hasActiveTracking = () => {
    return ReferralTracker.isReferralCodeValid();
  };

  // Função para obter código ativo
  const getActiveReferralCode = () => {
    return ReferralTracker.getReferralCode();
  };

  // Função para obter dados completos do referral
  const getReferralData = () => {
    return ReferralTracker.getReferralData();
  };

  return {
    trackConversion,
    hasActiveTracking,
    getActiveReferralCode,
    getReferralData
  };
}