/**
 * Guard para rotas de cliente
 * Redireciona para /entrar se não autenticado
 */

import { useEffect } from 'react';
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

  useEffect(() => {
    if (!isLoading) {
      // Se não está logado, redirecionar para login de cliente
      if (!isAuthenticated || !user) {
        navigate('/entrar');
        return;
      }

      // Se requer afiliado e não é afiliado, redirecionar para dashboard do cliente
      if (requireAffiliate && !isAffiliate) {
        navigate('/minha-conta');
        return;
      }
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
