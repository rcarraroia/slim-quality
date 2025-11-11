/**
 * AuthService - Serviço de Autenticação
 * Sprint 1: Sistema de Autenticação e Gestão de Usuários
 * 
 * Gerencia autenticação, registro e gestão de perfis
 */

import { supabase, supabaseAdmin } from '../../config/database';
import { logger } from '../../utils/logger';
import {
  RegisterData,
  LoginData,
  AuthResponse,
  Profile,
  UpdateProfileData,
  AuthEventType,
} from '../../types/auth.types';

export class AuthService {
  /**
   * Registra novo usuário no sistema
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      logger.info('AuthService', 'Registering new user', { email: data.email });

      // 1. Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true, // Auto-confirmar email em desenvolvimento
        user_metadata: {
          full_name: data.full_name,
          phone: data.phone,
        },
      });

      if (authError) {
        logger.error('AuthService', 'Failed to create user in auth', authError as Error);
        throw authError;
      }

      if (!authData.user) {
        throw new Error('User creation failed');
      }

      // 2. Aguardar criação do profile via trigger
      // O trigger handle_new_user() cria automaticamente o profile e atribui role 'cliente'
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 3. Buscar perfil completo
      const profile = await this.getUserProfile(authData.user.id);

      if (!profile) {
        throw new Error('Profile creation failed');
      }

      // 4. Buscar roles
      const roles = await this.getUserRoles(authData.user.id);

      // 5. Criar sessão para o usuário
      const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (sessionError || !sessionData.session) {
        logger.error('AuthService', 'Failed to create session after registration', sessionError as Error);
        throw sessionError || new Error('Session creation failed');
      }

      logger.info('AuthService', 'User registered successfully', { userId: authData.user.id });

      return {
        user: {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          roles,
        },
        session: {
          access_token: sessionData.session.access_token,
          refresh_token: sessionData.session.refresh_token,
          expires_in: sessionData.session.expires_in,
        },
      };
    } catch (error) {
      logger.error('AuthService', 'Registration error', error as Error);
      throw error;
    }
  }

  /**
   * Autentica usuário
   */
  async login(data: LoginData): Promise<AuthResponse> {
    try {
      logger.info('AuthService', 'User login attempt', { email: data.email });

      // 1. Autenticar via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (authError || !authData.session || !authData.user) {
        logger.warn('AuthService', 'Login failed', { email: data.email });
        
        // Registrar tentativa falhada
        await this.logAuthEvent('login_failed', null, {
          email: data.email,
          reason: authError?.message || 'Invalid credentials',
        });

        throw authError || new Error('Login failed');
      }

      // 2. Buscar perfil completo
      const profile = await this.getUserProfile(authData.user.id);

      if (!profile) {
        throw new Error('Profile not found');
      }

      // 3. Buscar roles
      const roles = await this.getUserRoles(authData.user.id);

      // 4. Atualizar last_login_at
      await supabaseAdmin
        .from('profiles')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', authData.user.id);

      // 5. Registrar login bem-sucedido
      await this.logAuthEvent('login_success', authData.user.id, {
        email: data.email,
      });

      logger.info('AuthService', 'User logged in successfully', { userId: authData.user.id });

      return {
        user: {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          roles,
        },
        session: {
          access_token: authData.session.access_token,
          refresh_token: authData.session.refresh_token,
          expires_in: authData.session.expires_in,
        },
      };
    } catch (error) {
      logger.error('AuthService', 'Login error', error as Error);
      throw error;
    }
  }

  /**
   * Encerra sessão do usuário
   */
  async logout(token: string): Promise<void> {
    try {
      logger.info('AuthService', 'User logout');

      // Invalidar sessão
      const { error } = await supabase.auth.admin.signOut(token);

      if (error) {
        logger.warn('AuthService', 'Logout error (non-critical)', error);
        // Não lançar erro - logout deve ser idempotente
      }

      logger.info('AuthService', 'User logged out successfully');
    } catch (error) {
      logger.error('AuthService', 'Logout error', error as Error);
      // Não lançar erro - logout deve ser idempotente
    }
  }

  /**
   * Solicita recuperação de senha
   */
  async forgotPassword(email: string): Promise<void> {
    try {
      logger.info('AuthService', 'Password reset requested', { email });

      // Enviar email de recuperação via Supabase Auth
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.SITE_URL || 'http://localhost:3000'}/reset-password`,
      });

      if (error) {
        logger.error('AuthService', 'Failed to send password reset email', error);
        // Não lançar erro - por segurança, sempre retornar sucesso
      }

      // Registrar evento
      await this.logAuthEvent('password_reset_request', null, { email });

      logger.info('AuthService', 'Password reset email sent (if email exists)');
    } catch (error) {
      logger.error('AuthService', 'Forgot password error', error as Error);
      // Não lançar erro - por segurança, sempre retornar sucesso
    }
  }

  /**
   * Busca perfil completo do usuário
   */
  async getUserProfile(userId: string): Promise<Profile | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .is('deleted_at', null)
        .single();

      if (error || !data) {
        logger.warn('AuthService', 'Profile not found', { userId });
        return null;
      }

      return data as Profile;
    } catch (error) {
      logger.error('AuthService', 'Error fetching profile', error as Error, { userId });
      return null;
    }
  }

  /**
   * Busca roles do usuário
   */
  async getUserRoles(userId: string): Promise<string[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .is('deleted_at', null);

      if (error || !data) {
        logger.warn('AuthService', 'Roles not found', { userId });
        return [];
      }

      return data.map((r) => r.role);
    } catch (error) {
      logger.error('AuthService', 'Error fetching roles', error as Error, { userId });
      return [];
    }
  }

  /**
   * Atualiza perfil do usuário
   */
  async updateProfile(userId: string, updates: UpdateProfileData): Promise<Profile> {
    try {
      logger.info('AuthService', 'Updating profile', { userId });

      const { data, error } = await supabaseAdmin
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error || !data) {
        logger.error('AuthService', 'Failed to update profile', error as Error);
        throw error || new Error('Profile update failed');
      }

      // Registrar evento
      await this.logAuthEvent('profile_updated', userId, { updates });

      logger.info('AuthService', 'Profile updated successfully', { userId });

      return data as Profile;
    } catch (error) {
      logger.error('AuthService', 'Update profile error', error as Error, { userId });
      throw error;
    }
  }

  /**
   * Atribui role a usuário
   */
  async assignRole(userId: string, role: string): Promise<void> {
    try {
      logger.info('AuthService', 'Assigning role', { userId, role });

      const { error } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: userId,
          role,
        });

      if (error) {
        logger.error('AuthService', 'Failed to assign role', error);
        throw error;
      }

      // Registrar evento
      await this.logAuthEvent('role_changed', userId, { role, action: 'assigned' });

      logger.info('AuthService', 'Role assigned successfully', { userId, role });
    } catch (error) {
      logger.error('AuthService', 'Assign role error', error as Error, { userId, role });
      throw error;
    }
  }

  /**
   * Remove role de usuário (soft delete)
   */
  async removeRole(userId: string, role: string): Promise<void> {
    try {
      logger.info('AuthService', 'Removing role', { userId, role });

      const { error } = await supabaseAdmin
        .from('user_roles')
        .update({ deleted_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('role', role)
        .is('deleted_at', null);

      if (error) {
        logger.error('AuthService', 'Failed to remove role', error);
        throw error;
      }

      // Registrar evento
      await this.logAuthEvent('role_changed', userId, { role, action: 'removed' });

      logger.info('AuthService', 'Role removed successfully', { userId, role });
    } catch (error) {
      logger.error('AuthService', 'Remove role error', error as Error, { userId, role });
      throw error;
    }
  }

  /**
   * Registra evento de auditoria
   */
  async logAuthEvent(
    eventType: AuthEventType,
    userId: string | null,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      await supabaseAdmin.from('auth_logs').insert({
        user_id: userId,
        event_type: eventType,
        metadata,
      });
    } catch (error) {
      logger.error('AuthService', 'Failed to log auth event', error as Error, {
        eventType,
        userId,
      });
      // Não lançar erro - logging não deve quebrar fluxo principal
    }
  }
}

// Exportar instância singleton
export const authService = new AuthService();
