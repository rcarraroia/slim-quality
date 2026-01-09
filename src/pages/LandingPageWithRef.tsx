/**
 * Landing Page com Captura de Referência
 * Captura slug ou referral_code da URL e redireciona para home
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/config/supabase';
import { Loader2 } from 'lucide-react';

export default function LandingPageWithRef() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    const processReferral = async () => {
      if (!slug) {
        navigate('/');
        return;
      }

      try {
        // 1. Buscar afiliado pelo slug ou referral_code
        const slugUpper = slug.toUpperCase();
        const { data: affiliate, error } = await supabase
          .from('affiliates')
          .select('id, name, referral_code')
          .or(`slug.eq.${slug},slug.eq.${slugUpper},referral_code.eq.${slug},referral_code.eq.${slugUpper}`)
          .eq('status', 'active')
          .is('deleted_at', null)
          .maybeSingle();

        if (error || !affiliate) {
          console.warn('Afiliado não encontrado:', slug);
          setStatus('error');
          setTimeout(() => navigate('/'), 2000);
          return;
        }

        // 2. Registrar clique
        await supabase
          .from('referral_clicks')
          .insert({
            referral_code: affiliate.referral_code,
            affiliate_id: affiliate.id,
            ip_address: await getClientIP(),
            user_agent: navigator.userAgent,
            referer: document.referrer,
            clicked_at: new Date().toISOString()
          });

        // 3. Salvar no localStorage
        localStorage.setItem('referralCode', affiliate.referral_code);
        localStorage.setItem('referralClickedAt', new Date().toISOString());

        // 4. Sucesso
        setStatus('success');

        // 5. Redirecionar para home após 1 segundo
        setTimeout(() => {
          navigate('/');
        }, 1000);

      } catch (error) {
        console.error('Erro ao processar referência:', error);
        setStatus('error');
        setTimeout(() => navigate('/'), 2000);
      }
    };

    processReferral();
  }, [slug, navigate]);

  // Função auxiliar para obter IP
  const getClientIP = async (): Promise<string> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      return 'unknown';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="text-center space-y-4">
        {status === 'loading' && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="text-lg text-muted-foreground">Processando indicação...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mx-auto">
              <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-lg font-semibold">Indicação registrada!</p>
            <p className="text-sm text-muted-foreground">Redirecionando...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center mx-auto">
              <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-lg font-semibold">Link inválido</p>
            <p className="text-sm text-muted-foreground">Redirecionando para home...</p>
          </>
        )}
      </div>
    </div>
  );
}
