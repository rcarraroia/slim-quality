/**
 * Componente ReferralTracker
 * Integração automática do sistema de rastreamento em páginas React
 */

import { useEffect } from 'react';
import { ReferralTracker } from '@/utils/referral-tracker';

export interface ReferralTrackerProps {
  /**
   * Se deve mostrar logs no console (desenvolvimento)
   */
  debug?: boolean;
  
  /**
   * Callback chamado quando um código é capturado
   */
  onReferralCaptured?: (code: string) => void;
  
  /**
   * Callback chamado quando uma conversão é registrada
   */
  onConversionTracked?: (orderId: string, code: string) => void;
}

/**
 * Componente para integração automática do ReferralTracker
 * Deve ser incluído no layout principal da aplicação
 */
export function ReferralTrackerComponent({ 
  debug = false, 
  onReferralCaptured,
  onConversionTracked 
}: ReferralTrackerProps) {
  
  useEffect(() => {
    // Garantir que o ReferralTracker está inicializado
    ReferralTracker.initialize();
    
    if (debug) {
      const stats = ReferralTracker.getReferralStats();
      console.log('[ReferralTracker] Estado atual:', stats);
    }
    
    // Verificar se há código ativo e notificar
    const activeCode = ReferralTracker.getReferralCode();
    if (activeCode && onReferralCaptured) {
      onReferralCaptured(activeCode);
    }
  }, [debug, onReferralCaptured]);

  // Componente não renderiza nada visualmente
  return null;
}

/**
 * Hook para rastreamento de conversão em componentes de checkout
 */
export function useReferralConversion() {
  return {
    trackConversion: async (orderId: string, orderValue: number) => {
      const code = ReferralTracker.getReferralCode();
      if (code) {
        await ReferralTracker.trackConversion(orderId, orderValue);
        return code;
      }
      return null;
    },
    
    hasActiveReferral: () => ReferralTracker.isReferralCodeValid(),
    
    getReferralCode: () => ReferralTracker.getReferralCode()
  };
}