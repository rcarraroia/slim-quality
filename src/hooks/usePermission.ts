/**
 * Hook de Permissões Frontend
 * Task 3.2: Implementar Hook de Permissões Frontend
 * BLOCO 3 - Segurança e Permissões
 */

import React from 'react';

import { useAuth } from './useAuth';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'super_admin';
  is_active: boolean;
}

export const usePermission = () => {
  const { user } = useAuth();
  
  /**
   * Verifica se o usuário tem uma permissão específica
   */
  const hasPermission = (requiredRole: 'admin' | 'super_admin'): boolean => {
    if (!user) return false;
    
    // Verificar se usuário está ativo
    if (!user.is_active) return false;
    
    // Se requer admin, tanto admin quanto super_admin podem
    if (requiredRole === 'admin') {
      return user.role === 'admin' || user.role === 'super_admin';
    }
    
    // Se requer super_admin, apenas super_admin pode
    if (requiredRole === 'super_admin') {
      return user.role === 'super_admin';
    }
    
    return false;
  };
  
  /**
   * Verifica se pode visualizar dados
   */
  const canView = (resource: string): boolean => {
    if (!user) return false;
    
    // Todos os admins ativos podem visualizar
    return hasPermission('admin');
  };
  
  /**
   * Verifica se pode editar dados
   */
  const canEdit = (resource: string): boolean => {
    if (!user) return false;
    
    // Recursos que apenas super_admin pode editar
    const superAdminOnlyResources = [
      'admin_config',
      'sicc_config',
      'admin_users',
      'system_settings'
    ];
    
    if (superAdminOnlyResources.includes(resource)) {
      return hasPermission('super_admin');
    }
    
    // Outros recursos: todos os admins podem editar
    return hasPermission('admin');
  };
  
  /**
   * Verifica se pode aprovar/rejeitar
   */
  const canApprove = (resource: string): boolean => {
    if (!user) return false;
    
    // Todos os admins podem aprovar afiliados, comissões, saques
    const approvableResources = [
      'affiliates',
      'commissions', 
      'withdrawals',
      'affiliate_requests'
    ];
    
    if (approvableResources.includes(resource)) {
      return hasPermission('admin');
    }
    
    return false;
  };
  
  /**
   * Verifica se pode deletar dados
   */
  const canDelete = (resource: string): boolean => {
    if (!user) return false;
    
    // Apenas super_admin pode deletar dados críticos
    const criticalResources = [
      'admins',
      'audit_logs',
      'commissions',
      'orders'
    ];
    
    if (criticalResources.includes(resource)) {
      return hasPermission('super_admin');
    }
    
    // Outros recursos: todos os admins podem deletar
    return hasPermission('admin');
  };
  
  /**
   * Verifica se pode acessar configurações
   */
  const canAccessSettings = (): boolean => {
    return hasPermission('super_admin');
  };
  
  /**
   * Verifica se pode gerenciar outros admins
   */
  const canManageAdmins = (): boolean => {
    return hasPermission('super_admin');
  };
  
  /**
   * Verifica se pode exportar dados
   */
  const canExport = (resource: string): boolean => {
    if (!user) return false;
    
    // Todos os admins podem exportar relatórios
    const exportableResources = [
      'affiliates',
      'commissions',
      'withdrawals',
      'orders',
      'reports'
    ];
    
    if (exportableResources.includes(resource)) {
      return hasPermission('admin');
    }
    
    return false;
  };
  
  /**
   * Verifica se pode acessar logs de auditoria
   */
  const canViewAuditLogs = (): boolean => {
    return hasPermission('admin');
  };
  
  /**
   * Verifica se pode processar pagamentos/splits
   */
  const canProcessPayments = (): boolean => {
    return hasPermission('admin');
  };
  
  /**
   * Retorna informações do usuário atual
   */
  const getCurrentUser = (): AdminUser | null => {
    return user;
  };
  
  /**
   * Verifica se é super admin
   */
  const isSuperAdmin = (): boolean => {
    return hasPermission('super_admin');
  };
  
  /**
   * Verifica se é admin (qualquer nível)
   */
  const isAdmin = (): boolean => {
    return hasPermission('admin');
  };
  
  return {
    // Verificações básicas
    hasPermission,
    isAdmin,
    isSuperAdmin,
    
    // Verificações por ação
    canView,
    canEdit,
    canDelete,
    canApprove,
    canExport,
    
    // Verificações específicas
    canAccessSettings,
    canManageAdmins,
    canViewAuditLogs,
    canProcessPayments,
    
    // Informações do usuário
    getCurrentUser,
    user
  };
};

/**
 * Hook para verificação rápida de permissão
 */
export const useRequirePermission = (requiredRole: 'admin' | 'super_admin') => {
  const { hasPermission, user } = usePermission();
  
  const hasRequiredPermission = hasPermission(requiredRole);
  
  return {
    hasPermission: hasRequiredPermission,
    user,
    isLoading: false // TODO: Implementar loading state se necessário
  };
};

/**
 * Componente HOC para proteger rotas por permissão
 */
export const withPermission = (
  Component: React.ComponentType<any>,
  requiredRole: 'admin' | 'super_admin'
) => {
  return (props: any) => {
    const { hasPermission } = usePermission();
    
    if (!hasPermission(requiredRole)) {
      return React.createElement('div', 
        { className: 'flex items-center justify-center min-h-screen' },
        React.createElement('div',
          { className: 'text-center' },
          React.createElement('h2',
            { className: 'text-2xl font-bold text-gray-900 mb-2' },
            'Acesso Negado'
          ),
          React.createElement('p',
            { className: 'text-gray-600' },
            'Você não tem permissão para acessar esta página.'
          )
        )
      );
    }
    
    return React.createElement(Component, props);
  };
};

export default usePermission;