/**
 * Auth Redirect Component
 * Redireciona usuário autenticado para dashboard apropriado
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getDashboardByRole } from '@/utils/navigation';

export function AuthRedirect() {
  const { isAuthenticated, user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      // Redirecionar para dashboard apropriado
      const dashboardRoute = getDashboardByRole(user.roles);
      navigate(dashboardRoute, { replace: true });
    }
  }, [isAuthenticated, user, loading, navigate]);

  return null;
}
