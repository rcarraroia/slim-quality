/**
 * Serviço de Autenticação de Clientes
 * Separado do adminAuthService para clientes e afiliados
 */

import { supabase } from '@/config/supabase';

export interface CustomerUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  customerId: string;
  isAffiliate: boolean;
  affiliateId?: string;
  affiliateStatus?: string;
}

export interface RegisterData {
  name: string;
  email: string;
  phone?: string;
  password: string;
}

export interface RegisterAffiliateData extends RegisterData {
  referralCode?: string; // Código de quem indicou
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface LoginResponse {
  user: CustomerUser;
  token: string;
  refreshToken: string;
  expiresIn: number;
}

class CustomerAuthService {
  /**
   * Login de cliente
   */
  async login(email: string, password: string): Promise<ApiResponse<LoginResponse>> {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError || !authData.user || !authData.session) {
        return {
          success: false,
          error: authError?.message || 'Email ou senha incorretos'
        };
      }

      // Buscar dados do customer
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', authData.user.id)
        .single();

      if (customerError || !customerData) {
        // Verificar se é admin tentando logar como cliente
        const { data: adminData } = await supabase
          .from('admins')
          .select('id')
          .eq('id', authData.user.id)
          .single();

        if (adminData) {
          await supabase.auth.signOut();
          return {
            success: false,
            error: 'Use o login de administrador em /admin/login'
          };
        }

        await supabase.auth.signOut();
        return {
          success: false,
          error: 'Conta de cliente não encontrada'
        };
      }

      // Verificar se é afiliado
      const { data: affiliateData } = await supabase
        .from('affiliates')
        .select('id, status')
        .eq('user_id', authData.user.id)
        .single();

      const customerUser: CustomerUser = {
        id: authData.user.id,
        email: authData.user.email || '',
        name: customerData.name,
        phone: customerData.phone,
        customerId: customerData.id,
        isAffiliate: !!affiliateData,
        affiliateId: affiliateData?.id,
        affiliateStatus: affiliateData?.status
      };

      // Salvar no localStorage
      localStorage.setItem('customer_token', authData.session.access_token);
      localStorage.setItem('customer_refresh_token', authData.session.refresh_token);
      localStorage.setItem('customer_user', JSON.stringify(customerUser));
      
      const expirationTime = Date.now() + (authData.session.expires_in || 3600) * 1000;
      localStorage.setItem('customer_token_expires', expirationTime.toString());

      return {
        success: true,
        data: {
          user: customerUser,
          token: authData.session.access_token,
          refreshToken: authData.session.refresh_token,
          expiresIn: authData.session.expires_in || 3600
        }
      };
    } catch (error: any) {
      console.error('Erro no login:', error);
      return {
        success: false,
        error: error.message || 'Erro interno no login'
      };
    }
  }

  /**
   * Logout de cliente
   */
  async logout(): Promise<void> {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.warn('Erro ao fazer logout no Supabase:', error);
    }
    this.clearAuthData();
  }

  /**
   * Registrar novo cliente
   */
  async register(data: RegisterData): Promise<ApiResponse<LoginResponse>> {
    try {
      // Verificar se já existe customer com este email sem user_id
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id, user_id, phone')
        .eq('email', data.email)
        .single();

      // Criar usuário no auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: { name: data.name }
        }
      });

      if (authError || !authData.user) {
        if (authError?.message?.includes('already registered')) {
          return { success: false, error: 'Este email já está cadastrado' };
        }
        return { success: false, error: authError?.message || 'Erro ao criar conta' };
      }

      let customerId: string;

      if (existingCustomer && !existingCustomer.user_id) {
        // Atualizar customer existente com user_id
        const { error: updateError } = await supabase
          .from('customers')
          .update({ 
            user_id: authData.user.id,
            name: data.name,
            phone: data.phone || existingCustomer.phone
          })
          .eq('id', existingCustomer.id);

        if (updateError) {
          console.error('Erro ao vincular customer:', updateError);
        }
        customerId = existingCustomer.id;
      } else {
        // Criar novo customer
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            user_id: authData.user.id,
            name: data.name,
            email: data.email,
            phone: data.phone,
            status: 'active'
          })
          .select('id')
          .single();

        if (customerError || !newCustomer) {
          console.error('Erro ao criar customer:', customerError);
          return { success: false, error: 'Erro ao criar perfil de cliente' };
        }
        customerId = newCustomer.id;
      }

      // Auto-login após registro
      if (authData.session) {
        const customerUser: CustomerUser = {
          id: authData.user.id,
          email: data.email,
          name: data.name,
          phone: data.phone,
          customerId,
          isAffiliate: false
        };

        localStorage.setItem('customer_token', authData.session.access_token);
        localStorage.setItem('customer_refresh_token', authData.session.refresh_token);
        localStorage.setItem('customer_user', JSON.stringify(customerUser));
        
        const expirationTime = Date.now() + (authData.session.expires_in || 3600) * 1000;
        localStorage.setItem('customer_token_expires', expirationTime.toString());

        return {
          success: true,
          data: {
            user: customerUser,
            token: authData.session.access_token,
            refreshToken: authData.session.refresh_token,
            expiresIn: authData.session.expires_in || 3600
          }
        };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Erro no registro:', error);
      return { success: false, error: error.message || 'Erro interno no registro' };
    }
  }


  /**
   * Registrar cliente + afiliado (página pública)
   */
  async registerWithAffiliate(data: RegisterAffiliateData): Promise<ApiResponse<LoginResponse>> {
    try {
      // Primeiro registrar como cliente
      const registerResult = await this.register(data);
      
      if (!registerResult.success || !registerResult.data) {
        return registerResult;
      }

      const userId = registerResult.data.user.id;
      const customerId = registerResult.data.user.customerId;

      // Gerar referral_code único
      const referralCode = await this.generateUniqueReferralCode(data.name);

      // Criar afiliado (ativação automática - admin só desativa se necessário)
      const { data: affiliateData, error: affiliateError } = await supabase
        .from('affiliates')
        .insert({
          user_id: userId,
          name: data.name,
          email: data.email,
          phone: data.phone,
          referral_code: referralCode,
          status: 'active' // Ativação automática
          // Nota: referred_by removido pois coluna não existe na tabela
        })
        .select('id, status')
        .single();

      if (affiliateError || !affiliateData) {
        console.error('Erro ao criar afiliado:', affiliateError);
        // Não falhar o registro, apenas logar
      }

      // Atualizar dados do usuário com info de afiliado
      const updatedUser: CustomerUser = {
        ...registerResult.data.user,
        isAffiliate: !!affiliateData,
        affiliateId: affiliateData?.id,
        affiliateStatus: affiliateData?.status
      };

      localStorage.setItem('customer_user', JSON.stringify(updatedUser));

      return {
        success: true,
        data: {
          ...registerResult.data,
          user: updatedUser
        }
      };
    } catch (error: any) {
      console.error('Erro no registro de afiliado:', error);
      return { success: false, error: error.message || 'Erro interno no registro' };
    }
  }

  /**
   * Gerar código de indicação único (exatamente 6 caracteres)
   */
  private async generateUniqueReferralCode(name: string): Promise<string> {
    // Pegar até 4 letras do nome
    const baseCode = name
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z]/g, '')
      .substring(0, 4);
    
    // Completar com caracteres aleatórios para ter exatamente 6
    const randomLength = 6 - baseCode.length;
    let randomPart = '';
    for (let i = 0; i < randomLength; i++) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    let code = (baseCode + randomPart).substring(0, 6);
    let attempts = 0;

    while (attempts < 10) {
      const { data: existing } = await supabase
        .from('affiliates')
        .select('id')
        .eq('referral_code', code)
        .maybeSingle();

      if (!existing) {
        return code;
      }

      // Gerar novo código aleatório
      randomPart = '';
      for (let i = 0; i < randomLength; i++) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      code = (baseCode + randomPart).substring(0, 6);
      attempts++;
    }

    // Fallback: usar timestamp
    const timestamp = Date.now().toString(36).toUpperCase();
    return (baseCode + timestamp).substring(0, 6);
  }

  /**
   * Verificar se está autenticado
   */
  isAuthenticated(): boolean {
    const token = localStorage.getItem('customer_token');
    const expiresAt = localStorage.getItem('customer_token_expires');
    
    if (!token || !expiresAt) return false;
    
    const now = Date.now();
    const expiration = parseInt(expiresAt);
    
    if (now >= expiration) {
      this.clearAuthData();
      return false;
    }
    
    return true;
  }

  /**
   * Obter usuário atual do Supabase
   */
  async getCurrentUser(): Promise<CustomerUser | null> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) return null;

      const { data: customerData } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!customerData) return null;

      const { data: affiliateData } = await supabase
        .from('affiliates')
        .select('id, status')
        .eq('user_id', user.id)
        .single();

      return {
        id: user.id,
        email: user.email || '',
        name: customerData.name,
        phone: customerData.phone,
        customerId: customerData.id,
        isAffiliate: !!affiliateData,
        affiliateId: affiliateData?.id,
        affiliateStatus: affiliateData?.status
      };
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      return null;
    }
  }

  /**
   * Obter usuário do localStorage
   */
  getStoredUser(): CustomerUser | null {
    const userStr = localStorage.getItem('customer_user');
    if (!userStr) return null;
    
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  /**
   * Atualizar dados do usuário no localStorage
   */
  updateStoredUser(updates: Partial<CustomerUser>): void {
    const user = this.getStoredUser();
    if (user) {
      localStorage.setItem('customer_user', JSON.stringify({ ...user, ...updates }));
    }
  }

  /**
   * Recuperar senha
   */
  async resetPassword(email: string): Promise<ApiResponse<{ message: string }>> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/entrar?reset=true`
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: { message: 'Email de recuperação enviado' }
      };
    } catch (error: any) {
      return { success: false, error: error.message || 'Erro ao enviar email' };
    }
  }

  /**
   * Atualizar senha
   */
  async updatePassword(newPassword: string): Promise<ApiResponse<{ message: string }>> {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: { message: 'Senha atualizada com sucesso' }
      };
    } catch (error: any) {
      return { success: false, error: error.message || 'Erro ao atualizar senha' };
    }
  }

  /**
   * Renovar token
   */
  async refreshToken(): Promise<boolean> {
    try {
      const { data, error } = await supabase.auth.refreshSession();

      if (error || !data.session) {
        this.clearAuthData();
        return false;
      }

      localStorage.setItem('customer_token', data.session.access_token);
      localStorage.setItem('customer_refresh_token', data.session.refresh_token);
      
      const expirationTime = Date.now() + (data.session.expires_in || 3600) * 1000;
      localStorage.setItem('customer_token_expires', expirationTime.toString());

      return true;
    } catch (error) {
      console.error('Erro ao renovar token:', error);
      this.clearAuthData();
      return false;
    }
  }

  /**
   * Limpar dados de autenticação
   */
  clearAuthData(): void {
    localStorage.removeItem('customer_token');
    localStorage.removeItem('customer_refresh_token');
    localStorage.removeItem('customer_user');
    localStorage.removeItem('customer_token_expires');
  }

  /**
   * Obter token
   */
  getToken(): string | null {
    return localStorage.getItem('customer_token');
  }
}

export const customerAuthService = new CustomerAuthService();
export default customerAuthService;
