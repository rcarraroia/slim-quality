/**
 * Hook para gerenciar rastreamento de referrals
 */

import { useEffect, useState } from 'react';
import { ReferralTracker } from '@/utils/referral-tracker';

export interface ReferralInfo {
  code: string;
  timestamp: number;
  isActive: boolean;
}

export const useReferralTracking = () => {
  const [referralInfo, setReferralInfo] = useState<ReferralInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Inicializar rastreamento
    ReferralTracker.initialize();
    
    // Verificar se há referral ativo
    const data = ReferralTracker.getReferralData();
    if (data) {
      setReferralInfo({
        code: data.code,
        timestamp: data.timestamp,
        isActive: true
      });
    }
    
    setIsLoading(false);
  }, []);

  /**
   * Registra uma conversão (venda)
   */
  const trackConversion = async (orderId: string): Promise<boolean> => {
    try {
      await ReferralTracker.trackConversion(orderId);
      return true;
    } catch (error) {
      console.error('Erro ao registrar conversão:', error);
      return false;
    }
  };

  /**
   * Gera um link de afiliado
   */
  const generateAffiliateLink = (baseUrl: string, referralCode: string): string => {
    return ReferralTracker.generateAffiliateLink(baseUrl, referralCode);
  };

  /**
   * Limpa o código de referência atual
   */
  const clearReferral = (): void => {
    ReferralTracker.clearReferralCode();
    setReferralInfo(null);
  };

  /**
   * Verifica se há um referral ativo
   */
  const hasActiveReferral = (): boolean => {
    const code = ReferralTracker.getReferralCode();
    return code !== null && code !== undefined;
  };

  /**
   * Obtém o código de referência atual
   */
  const getCurrentReferralCode = (): string | null => {
    return ReferralTracker.getReferralCode();
  };

  return {
    referralInfo,
    isLoading,
    trackConversion,
    generateAffiliateLink,
    clearReferral,
    hasActiveReferral,
    getCurrentReferralCode
  };
};

export default useReferralTracking;