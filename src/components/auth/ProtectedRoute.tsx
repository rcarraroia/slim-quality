import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireSuperAdmin?: boolean;
}

export function ProtectedRoute({ 
  children, 
  requireAdmin = false, 
  requireSuperAdmin = false 
}: ProtectedRouteProps) {
  const { user, profile, loading, isAdmin, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  
  // Detecção de loop de redirecionamento
  const redirectCount = useRef(0);
  const lastRedirect = useRef(0);

  useEffect(() => {
    if (!loading) {
      // Se não está logado, redirecionar para login admin
      if (!user) {
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
        navigate('/admin/login');
        return;
      }

      // Se requer super admin e não é super admin
      if (requireSuperAdmin && !isSuperAdmin()) {
        navigate('/dashboard');
        return;
      }

      // Se requer admin e não é admin
      if (requireAdmin && !isAdmin()) {
        navigate('/dashboard');
        return;
      }
    }
  }, [user, profile, loading, navigate, requireAdmin, requireSuperAdmin, isAdmin, isSuperAdmin]);

  // Mostrar loading enquanto verifica autenticação
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Se não está logado, não renderizar nada (será redirecionado)
  if (!user) {
    return null;
  }

  // Se requer permissões especiais e não tem, não renderizar
  if (requireSuperAdmin && !isSuperAdmin()) {
    return null;
  }

  if (requireAdmin && !isAdmin()) {
    return null;
  }

  // Se passou por todas as verificações, renderizar o conteúdo
  return <>{children}</>;
}