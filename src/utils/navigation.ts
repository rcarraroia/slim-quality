/**
 * Navigation Utilities
 * Funções auxiliares para navegação e redirecionamento
 */

/**
 * Determina o dashboard apropriado baseado nos roles do usuário
 * Prioridade: admin > afiliado > vendedor > cliente
 */
export function getDashboardByRole(roles: string[]): string {
  if (!roles || roles.length === 0) {
    return '/'; // Fallback para home
  }

  // Prioridade de roles
  if (roles.includes('admin')) {
    return '/dashboard';
  }
  
  if (roles.includes('afiliado')) {
    return '/afiliados/dashboard';
  }
  
  if (roles.includes('vendedor')) {
    return '/dashboard'; // Vendedores usam dashboard admin
  }
  
  // Cliente ou qualquer outro role
  return '/';
}
