/**
 * Landing Page com Captura de Referência (Silenciosa)
 * Captura slug ou referral_code da URL, registra em background e redireciona imediatamente
 */

import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/config/supabase';
import { STORAGE_KEYS } from '@/constants/storage-keys';

export default function LandingPageWithRef() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    const processReferral = async () => {
      if (!slug) {
        navigate('/', { replace: true });
        return;
      }

      try {
        // 🔧 MIGRAÇÃO: Limpar chaves legadas antes de processar
        const legacyKeys = ['referralCode', 'referralClickedAt', 'referral_code'];
        legacyKeys.forEach(key => {
          if (localStorage.getItem(key)) {
            console.log(`[LandingPageWithRef] Removendo chave legada: ${key}`);
            localStorage.removeItem(key);
          }
        });

        // 1. Buscar afiliado pelo slug ou referral_code
        const slugUpper = slug.toUpperCase();
        const { data: affiliate } = await supabase
          .from('affiliates')
          .select('id, name, referral_code')
          .or(`slug.eq.${slug},slug.eq.${slugUpper},referral_code.eq.${slug},referral_code.eq.${slugUpper}`)
          .eq('status', 'active')
          .is('deleted_at', null)
          .maybeSingle();

        if (affiliate) {
          // 2. Salvar no localStorage usando a mesma chave do ReferralTracker
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + 30); // 30 dias de validade
          
          // Salvar código como string pura (igual ao referral-tracker.ts)
          localStorage.setItem(STORAGE_KEYS.REFERRAL_CODE, affiliate.referral_code);
          localStorage.setItem(STORAGE_KEYS.REFERRAL_EXPIRES, expiryDate.getTime().toString());
          
          // Cookie também (para compatibilidade)
          document.cookie = `slim_referral_code=${affiliate.referral_code}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`;
          
          console.log('[LandingPageWithRef] Código de referência salvo:', affiliate.referral_code);

          // 3. Registrar clique em background (não bloqueia redirecionamento)
          (async () => {
            try {
              const ip = await getClientIP();
              await supabase
                .from('referral_clicks')
                .insert({
                  referral_code: affiliate.referral_code,
                  affiliate_id: affiliate.id,
                  ip_address: ip,
                  user_agent: navigator.userAgent,
                  referer: document.referrer,
                  clicked_at: new Date().toISOString()
                });
            } catch (err) {
              // Erro silencioso
              console.warn('Erro ao registrar clique:', err);
            }
          })();
        }
      } catch (error) {
        // Silencioso - não mostra erro
        console.warn('Erro ao processar referência:', error);
      }

      // 4. Redirecionar imediatamente para home (sempre)
      navigate('/', { replace: true });
    };

    processReferral();
  }, [slug, navigate]);

  // Função auxiliar para obter IP
  const getClientIP = async (): Promise<string> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return 'unknown';
    }
  };

  // Retorna null - não renderiza nada (redirecionamento instantâneo)
  return null;
}
