/**
 * Middleware para rastreamento de códigos de referência de afiliados
 * Captura parâmetros ?ref= e armazena em cookies/localStorage
 */

export class ReferralTracker {
  private static readonly REFERRAL_COOKIE_KEY = 'slim_referral_code';
  private static readonly REFERRAL_EXPIRY_DAYS = 30;

  /**
   * Inicializa o rastreamento de referência
   * Deve ser chamado no carregamento da página
   */
  static initialize(): void {
    // Verificar se há código de referência na URL
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');

    if (refCode) {
      this.setReferralCode(refCode);
      this.trackClick(refCode);
      
      // Limpar URL sem recarregar a página
      this.cleanUrl();
    }
  }

  /**
   * Armazena o código de referência no cookie e localStorage
   */
  private static setReferralCode(code: string): void {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + this.REFERRAL_EXPIRY_DAYS);

    // Cookie (para compatibilidade com servidor)
    document.cookie = `${this.REFERRAL_COOKIE_KEY}=${code}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`;

    // localStorage (backup)
    const referralData = {
      code,
      timestamp: Date.now(),
      expiry: expiryDate.getTime()
    };
    localStorage.setItem(this.REFERRAL_COOKIE_KEY, JSON.stringify(referralData));

    console.log(`[ReferralTracker] Código de referência armazenado: ${code}`);
  }

  /**
   * Recupera o código de referência armazenado
   */
  static getReferralCode(): string | null {
    // Tentar recuperar do localStorage primeiro
    try {
      const stored = localStorage.getItem(this.REFERRAL_COOKIE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        if (Date.now() < data.expiry) {
          return data.code;
        } else {
          // Expirado, remover
          this.clearReferralCode();
        }
      }
    } catch (error) {
      console.error('[ReferralTracker] Erro ao recuperar do localStorage:', error);
    }

    // Fallback para cookie
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === this.REFERRAL_COOKIE_KEY) {
        return value;
      }
    }

    return null;
  }

  /**
   * Remove o código de referência armazenado
   */
  static clearReferralCode(): void {
    // Remover cookie
    document.cookie = `${this.REFERRAL_COOKIE_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    
    // Remover localStorage
    localStorage.removeItem(this.REFERRAL_COOKIE_KEY);
  }

  /**
   * Registra um clique no código de referência
   */
  private static async trackClick(refCode: string): Promise<void> {
    try {
      const response = await fetch('/api/affiliates/track-click', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          referral_code: refCode,
          url: window.location.href,
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        console.warn('[ReferralTracker] Falha ao registrar clique:', response.statusText);
      }
    } catch (error) {
      console.error('[ReferralTracker] Erro ao registrar clique:', error);
    }
  }

  /**
   * Registra uma conversão (venda)
   */
  static async trackConversion(orderId: string): Promise<void> {
    const refCode = this.getReferralCode();
    if (!refCode) return;

    try {
      const response = await fetch('/api/affiliates/track-conversion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          referral_code: refCode,
          order_id: orderId,
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        console.log(`[ReferralTracker] Conversão registrada: ${orderId} -> ${refCode}`);
        // Manter o código por mais tempo após conversão
      } else {
        console.warn('[ReferralTracker] Falha ao registrar conversão:', response.statusText);
      }
    } catch (error) {
      console.error('[ReferralTracker] Erro ao registrar conversão:', error);
    }
  }

  /**
   * Remove parâmetros de referência da URL sem recarregar
   */
  private static cleanUrl(): void {
    const url = new URL(window.location.href);
    url.searchParams.delete('ref');
    
    // Atualizar URL sem recarregar
    window.history.replaceState({}, document.title, url.toString());
  }

  /**
   * Gera link de afiliado com código de referência
   */
  static generateAffiliateLink(baseUrl: string, referralCode: string): string {
    const url = new URL(baseUrl);
    url.searchParams.set('ref', referralCode);
    return url.toString();
  }

  /**
   * Verifica se há um código de referência ativo
   */
  static hasActiveReferral(): boolean {
    return this.getReferralCode() !== null;
  }

  /**
   * Obtém informações do referral ativo
   */
  static getReferralInfo(): { code: string; timestamp: number } | null {
    try {
      const stored = localStorage.getItem(this.REFERRAL_COOKIE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        if (Date.now() < data.expiry) {
          return {
            code: data.code,
            timestamp: data.timestamp
          };
        }
      }
    } catch (error) {
      console.error('[ReferralTracker] Erro ao obter info do referral:', error);
    }
    return null;
  }
}

// Auto-inicializar quando o DOM estiver pronto
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ReferralTracker.initialize());
  } else {
    ReferralTracker.initialize();
  }
}