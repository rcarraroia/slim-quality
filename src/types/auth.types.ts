/**
 * Tipos TypeScript - Autenticação
 * Sprint 1: Sistema de Autenticação e Gestão de Usuários
 */

/**
 * Dados de registro de usuário
 */
export interface RegisterData {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
}

/**
 * Dados de login
 */
export interface LoginData {
  email: string;
  password: string;
}

/**
 * Sessão do Supabase
 */
export interface Session {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at?: number;
  token_type: string;
  user: {
    id: string;
    email: string;
  };
}

/**
 * Resposta de autenticação (registro/login)
 */
export interface AuthResponse {
  user: {
    id: string;
    email: string;
    full_name: string;
    roles: string[];
  };
  session: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
}

/**
 * Perfil de usuário completo
 */
export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  
  // ⭐ Preparação para Sprint 4 (Afiliados)
  wallet_id: string | null;
  is_affiliate: boolean;
  affiliate_status: 'pending' | 'active' | 'inactive' | 'suspended' | null;
  
  // Metadados
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Dados para atualização de perfil
 */
export interface UpdateProfileData {
  full_name?: string;
  phone?: string | null;
  avatar_url?: string | null;
}

/**
 * Role de usuário
 */
export type Role = 'admin' | 'vendedor' | 'afiliado' | 'cliente';

/**
 * Registro de role de usuário
 */
export interface UserRole {
  id: string;
  user_id: string;
  role: Role;
  created_at: string;
  deleted_at: string | null;
}

/**
 * Tipo de evento de auditoria
 */
export type AuthEventType =
  | 'register'
  | 'login_success'
  | 'login_failed'
  | 'logout'
  | 'password_reset_request'
  | 'password_reset_success'
  | 'profile_updated'
  | 'role_changed';

/**
 * Log de auditoria
 */
export interface AuthLog {
  id: string;
  user_id: string | null;
  event_type: AuthEventType;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

/**
 * Dados do usuário autenticado (adicionado ao request)
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  profile: Profile;
  roles: string[];
}

/**
 * Erro de autenticação
 */
export interface AuthError {
  error: string;
  details?: Array<{
    field: string;
    message: string;
  }>;
}
