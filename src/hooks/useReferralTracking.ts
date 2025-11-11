/**
 * useReferralTracking Hook
 * Sprint 4: Sistema de Afiliados Multinível
 * 
 * Hook para capturar e gerenciar códigos de referência automaticamente
 */

import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const REFERRAL_COOKIE_KEY = 'slim_referral_code';
const REFERRAL_EXPIRY_DAYS = 30;

interface ReferralData {
  code: string;
  timestamp: number;
  expiresAt: number;
}

export const useReferralTracking = () => {
  const location = useLocation();
  const [currentReferralCode, setCurrentReferralCode] = useState<string | null>(null);

  /**
   * Salva código de referência no localStorage com expiração
   */
  const saveReferralCode = (code: string) => {
    const now = Date.now();
    const expiresAt = now + (REFERRAL_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    
    const referralData: ReferralData = {
      code,
      timestamp: now,
      expiresAt,
    };

    localStorage.setItem(REFERRAL_COOKIE_KEY, JSON.stringify(referralData));
    setCurrentReferralCode(code);

    console.log('Referral code saved:', code);
  };

  /**
   * Recupera código de referência válido do localStorage
   */
  const getReferralCode = (): string | null => {
    try {
      const stored = localStorage.getItem(REFERRAL_COOKIE_KEY);
      if (!stored) return null;

      const referralData: ReferralData = JSON.parse(stored);
      const now = Date.now();

      // Verificar se expirou
      if (now > referralData.expiresAt) {
        localStorage.removeItem(REFERRAL_COOKIE_KEY);
        return null;
      }

      return referralData.code;
    } catch (error) {
      console.error('Error reading referral code:', error);
      localStorage.removeItem(REFERRAL_COOKIE_KEY);
      return null;
    }
  };

  /**
   * Remove código de referência
   */
  const clearReferralCode = () => {
    localStorage.removeItem(REFERRAL_COOKIE_KEY);
    setCurrentReferralCode(null);
  };

  /**
   * Verifica se há código de referência válido
   */
  const hasValidReferralCode = (): boolean => {
    return getReferralCode() !== null;
  };

  /**
   * Obtém dados completos do referral
   */
  const getReferralData = (): ReferralData | null => {
    try {
      const stored = localStorage.getItem(REFERRAL_COOKIE_KEY);
      if (!stored) return null;

      const referralData: ReferralData = JSON.parse(stored);
      const now = Date.now();

      // Verificar se expirou
      if (now > referralData.expiresAt) {
        localStorage.removeItem(REFERRAL_COOKIE_KEY);
        return null;
      }

      return referralData;
    } catch (error) {
      console.error('Error reading referral data:', error);
      localStorage.removeItem(REFERRAL_COOKIE_KEY);
      return null;
    }
  };

  /**
   * Registra clique no backend (para analytics)
   */
  const trackClick = async (referralCode: string) => {
    try {
      // Fazer chamada para o backend registrar o clique
      await fetch('/api/affiliates/track-click', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          referral_code: referralCode,
          page: location.pathname,
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Error tracking click:', error);
      // Não falhar se não conseguir registrar o clique
    }
  };

  // Effect para detectar código de referência na URL
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const refCode = urlParams.get('ref');

    if (refCode) {
      // Validar formato do código (deve ter pelo menos 3 caracteres)
      if (refCode.length >= 3) {
        saveReferralCode(refCode);
        trackClick(refCode);

        // Limpar URL sem recarregar a página
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('ref');
        window.history.replaceState({}, '', newUrl.toString());
      }
    } else {
      // Verificar se já existe código salvo
      const existingCode = getReferralCode();
      if (existingCode) {
        setCurrentReferralCode(existingCode);
      }
    }
  }, [location]);

  // Effect para carregar código existente na inicialização
  useEffect(() => {
    const existingCode = getReferralCode();
    if (existingCode) {
      setCurrentReferralCode(existingCode);
    }
  }, []);

  return {
    currentReferralCode,
    saveReferralCode,
    getReferralCode,
    clearReferralCode,
    hasValidReferralCode,
    getReferralData,
    trackClick,
  };
};

/**
 * Hook simplificado para apenas obter o código atual
 */
export const useCurrentReferralCode = () => {
  const { currentReferralCode } = useReferralTracking();
  return currentReferralCode;
};

/**
 * Função utilitária para usar em formulários de pedido
 */
export const getCurrentReferralCodeForOrder = (): string | null => {
  try {
    const stored = localStorage.getItem(REFERRAL_COOKIE_KEY);
    if (!stored) return null;

    const referralData: ReferralData = JSON.parse(stored);
    const now = Date.now();

    // Verificar se expirou
    if (now > referralData.expiresAt) {
      localStorage.removeItem(REFERRAL_COOKIE_KEY);
      return null;
    }

    return referralData.code;
  } catch (error) {
    console.error('Error getting referral code for order:', error);
    return null;
  }
};