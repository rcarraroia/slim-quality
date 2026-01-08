/**
 * ReferralTracker - Sistema Consolidado de Rastreamento de Afiliados
 * Implementação da Task 1: Correção Sistema Pagamentos
 * 
 * Consolida funcionalidades dos sistemas existentes em uma única implementação
 * seguindo o design especificado na spec de correção.
 */

export interface ReferralData {
  code: string;
  timestamp: number;
  expiry: number;
  utmParams?: Record<string, string>;
}

export class ReferralTracker {
  private static readonly STORAGE_KEY = 'referral_code';
  private static readonly EXPIRES_KEY = 'referral_expires';
  private static readonly UTM_KEY = 'referral_utm';
  private static readonly TTL_DAYS = 30;

  /**
   * Captura código de referência da URL (?ref=CODIGO)
   * Salva em localStorage com TTL de 30 dias
   * 
   * Validates: Requirements 3.1, 3.2
   */
  static captureReferralCode(): void {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const refCode = urlParams.get('ref');
      
      if (refCode && refCode.trim()) {
        const cleanCode = refCode.trim().toUpperCase();
        const expiresAt = Date.now() + (this.TTL_DAYS * 24 * 60 * 60 * 1000);
        
        // Armazenar código com TTL
        localStorage.setItem(this.STORAGE_KEY, cleanCode);
        localStorage.setItem(this.EXPIRES_KEY, expiresAt.toString());
        
        // Capturar parâmetros UTM se existirem
        const utmParams = this.captureUtmParams(urlParams);
        if (Object.keys(utmParams).length > 0) {
          localStorage.setItem(this.UTM_KEY, JSON.stringify(utmParams));
        }
        
        console.log(`[ReferralTracker] Código capturado: ${cleanCode}`);
        
        // Registrar clique
        this.trackClick(cleanCode, utmParams);
        
        // Limpar URL sem recarregar
        this.cleanUrl();
      }
    } catch (error) {
      console.error('[ReferralTracker] Erro ao capturar código:', error);
    }
  }

  /**
   * Recupera código de referência válido do localStorage
   * @returns Código de referência ou null se expirado/inexistente
   * 
   * Validates: Requirements 3.3, 3.4
   */
  static getReferralCode(): string | null {
    try {
      const code = localStorage.getItem(this.STORAGE_KEY);
      const expires = localStorage.getItem(this.EXPIRES_KEY);
      
      if (!code || !expires) {
        return null;
      }
      
      // Verificar se expirou
      if (Date.now() > parseInt(expires)) {
        this.clearReferralCode();
        return null;
      }
      
      return code;
    } catch (error) {
      console.error('[ReferralTracker] Erro ao recuperar código:', error);
      return null;
    }
  }

  /**
   * Remove código de referência após conversão
   * 
   * Validates: Requirements 3.5
   */
  static clearReferralCode(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(this.EXPIRES_KEY);
      localStorage.removeItem(this.UTM_KEY);
      console.log('[ReferralTracker] Código limpo após conversão');
    } catch (error) {
      console.error('[ReferralTracker] Erro ao limpar código:', error);
    }
  }

  /**
   * Verifica se código ainda é válido (não expirado)
   */
  static isReferralCodeValid(): boolean {
    return this.getReferralCode() !== null;
  }

  /**
   * Obtém dados completos do referral (código + UTM)
   */
  static getReferralData(): ReferralData | null {
    const code = this.getReferralCode();
    if (!code) return null;

    try {
      const expires = localStorage.getItem(this.EXPIRES_KEY);
      const utmData = localStorage.getItem(this.UTM_KEY);
      
      return {
        code,
        timestamp: Date.now(),
        expiry: expires ? parseInt(expires) : 0,
        utmParams: utmData ? JSON.parse(utmData) : undefined
      };
    } catch (error) {
      console.error('[ReferralTracker] Erro ao obter dados:', error);
      return { code, timestamp: Date.now(), expiry: 0 };
    }
  }

  /**
   * Registra clique no código de referência
   * 
   * Validates: Requirements 3.6
   */
  private static async trackClick(refCode: string, utmParams: Record<string, string> = {}): Promise<void> {
    try {
      const clickData = {
        referral_code: refCode,
        url: window.location.href,
        user_agent: navigator.userAgent,
        referer: document.referrer || null,
        utm_source: utmParams.utm_source || null,
        utm_medium: utmParams.utm_medium || null,
        utm_campaign: utmParams.utm_campaign || null,
        utm_content: utmParams.utm_content || null,
        utm_term: utmParams.utm_term || null,
        clicked_at: new Date().toISOString()
      };

      const response = await fetch('/api/referral/track-click', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clickData)
      });

      if (!response.ok) {
        console.warn('[ReferralTracker] Falha ao registrar clique:', response.statusText);
      }
    } catch (error) {
      console.warn('[ReferralTracker] Erro ao registrar clique:', error);
    }
  }

  /**
   * Registra conversão (venda)
   * 
   * Validates: Requirements 3.7
   */
  static async trackConversion(orderId: string, orderValue: number): Promise<void> {
    const referralData = this.getReferralData();
    if (!referralData) return;

    try {
      const conversionData = {
        referral_code: referralData.code,
        order_id: orderId,
        order_value_cents: Math.round(orderValue * 100),
        utm_source: referralData.utmParams?.utm_source || null,
        utm_medium: referralData.utmParams?.utm_medium || null,
        utm_campaign: referralData.utmParams?.utm_campaign || null,
        utm_content: referralData.utmParams?.utm_content || null,
        utm_term: referralData.utmParams?.utm_term || null,
        converted_at: new Date().toISOString()
      };

      const response = await fetch('/api/referral/track-conversion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(conversionData)
      });

      if (response.ok) {
        console.log(`[ReferralTracker] Conversão registrada: ${orderId} -> ${referralData.code}`);
        // Limpar código após conversão bem-sucedida
        this.clearReferralCode();
      } else {
        console.warn('[ReferralTracker] Falha ao registrar conversão:', response.statusText);
      }
    } catch (error) {
      console.error('[ReferralTracker] Erro ao registrar conversão:', error);
    }
  }

  /**
   * Captura parâmetros UTM da URL
   */
  private static captureUtmParams(urlParams: URLSearchParams): Record<string, string> {
    const utmParams: Record<string, string> = {};
    
    const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
    
    utmKeys.forEach(key => {
      const value = urlParams.get(key);
      if (value) {
        utmParams[key] = value;
      }
    });
    
    return utmParams;
  }

  /**
   * Remove parâmetros de referência da URL sem recarregar
   */
  private static cleanUrl(): void {
    try {
      const url = new URL(window.location.href);
      
      // Remover parâmetros de tracking
      url.searchParams.delete('ref');
      url.searchParams.delete('utm_source');
      url.searchParams.delete('utm_medium');
      url.searchParams.delete('utm_campaign');
      url.searchParams.delete('utm_content');
      url.searchParams.delete('utm_term');
      
      // Atualizar URL sem recarregar
      window.history.replaceState({}, document.title, url.toString());
    } catch (error) {
      console.error('[ReferralTracker] Erro ao limpar URL:', error);
    }
  }

  /**
   * Gera link de afiliado com código de referência
   */
  static generateAffiliateLink(baseUrl: string, referralCode: string, utmParams?: Record<string, string>): string {
    try {
      const url = new URL(baseUrl);
      url.searchParams.set('ref', referralCode.toUpperCase());
      
      // Adicionar parâmetros UTM se fornecidos
      if (utmParams) {
        Object.entries(utmParams).forEach(([key, value]) => {
          if (value) {
            url.searchParams.set(key, value);
          }
        });
      }
      
      return url.toString();
    } catch (error) {
      console.error('[ReferralTracker] Erro ao gerar link:', error);
      return baseUrl;
    }
  }

  /**
   * Inicialização automática - deve ser chamada no carregamento de todas as páginas
   * 
   * Validates: Requirements 3.8
   */
  static initialize(): void {
    try {
      // Verificar se estamos no browser
      if (typeof window === 'undefined') return;
      
      // Capturar código se presente na URL
      this.captureReferralCode();
      
      console.log('[ReferralTracker] Sistema inicializado');
    } catch (error) {
      console.error('[ReferralTracker] Erro na inicialização:', error);
    }
  }

  /**
   * Obtém estatísticas do referral ativo
   */
  static getReferralStats(): { hasActive: boolean; code?: string; daysRemaining?: number } {
    const referralData = this.getReferralData();
    
    if (!referralData) {
      return { hasActive: false };
    }
    
    const daysRemaining = Math.ceil((referralData.expiry - Date.now()) / (1000 * 60 * 60 * 24));
    
    return {
      hasActive: true,
      code: referralData.code,
      daysRemaining: Math.max(0, daysRemaining)
    };
  }
}

// Auto-inicialização quando o DOM estiver pronto
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ReferralTracker.initialize());
  } else {
    ReferralTracker.initialize();
  }
}

// Exportar para uso global
declare global {
  interface Window {
    ReferralTracker: typeof ReferralTracker;
  }
}

if (typeof window !== 'undefined') {
  window.ReferralTracker = ReferralTracker;
}