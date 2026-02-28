/**
 * Guard para rotas de cliente
 * Redireciona para /entrar se não autenticado
 */

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { Loader2 } from 'lucide-react';

interface CustomerProtectedRouteProps {
  children: React.ReactNode;
  requireAffiliate?: boolean;
}

export function CustomerProtectedRoute({ 
  children, 
  requireAffiliate = false 
}: CustomerProtectedRouteProps) {
  const { user, isAuthenticated, isLoading, isAffiliate } = useCustomerAuth();
  const navigate = useNavigate();
  
  // Detecção de loop de redirecionamento
  const redirectCount = useRef(0);
  const lastRedirect = useRef(0);

  useEffect(() => {
    if (!isLoading) {
      // Se não está logado, redirecionar para login de cliente com returnUrl
      if (!isAuthenticated || !user) {
        const now = Date.now();
        
        // Detectar loop: mais de 3 redirecionamentos em 10 segundos
        if (now - lastRedirect.current < 10000) {
          redirectCount.current++;
          
          if (redirectCount.current > 3) {
            // LOOP DETECTADO!
            console.error('Loop de redirecionamento detectado - possível problema com Safari iOS');
            
            // Mostrar mensagem de erro ao usuário
            alert(
              'Problema de autenticação detectado.\n\n' +
              'Se você está usando Safari no iOS em modo privado, ' +
              'tente usar o modo normal ou outro navegador.\n\n' +
              'Caso o problema persista, entre em contato com o suporte.'
            );
            
            // Resetar contador
            redirectCount.current = 0;
            return;
          }
        } else {
          // Resetar contador se passou mais de 10 segundos
          redirectCount.current = 1;
        }
        
        lastRedirect.current = now;
        const currentPath = window.location.pathname + window.location.search;
        navigate(`/entrar?returnUrl=${encodeURIComponent(currentPath)}`);
        return;
      }

      // Se requer afiliado e não é afiliado, redirecionar para dashboard do cliente
      if (requireAffiliate && !isAffiliate) {
        navigate('/minha-conta');
        return;
      }

      // REMOVIDO: Não redirecionar afiliados automaticamente
      // Afiliados podem acessar tanto /minha-conta quanto /afiliados/dashboard
    }
  }, [isAuthenticated, user, isLoading, navigate, requireAffiliate, isAffiliate]);

  // Mostrar loading enquanto verifica autenticação
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          <p className="text-muted-foreground">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Se não está logado, não renderizar nada (será redirecionado)
  if (!isAuthenticated || !user) {
    return null;
  }

  // Se requer afiliado e não é, não renderizar
  if (requireAffiliate && !isAffiliate) {
    return null;
  }

  // Se passou por todas as verificações, renderizar o conteúdo
  return <>{children}</>;
}
