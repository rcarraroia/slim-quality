import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/config/supabase';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  wallet_id?: string;
  is_affiliate: boolean;
  affiliate_status?: string;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  isAdmin: () => boolean;
  isSuperAdmin: () => boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Buscar perfil do usuário
  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Erro ao buscar perfil:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
      return null;
    }
  };

  // Atualizar último login
  const updateLastLogin = async (userId: string) => {
    try {
      await supabase
        .from('profiles')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', userId);
    } catch (error) {
      console.error('Erro ao atualizar último login:', error);
    }
  };

  // Função de login
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      console.log('🔐 Iniciando login:', { email, supabaseUrl: supabase.supabaseUrl });

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('📊 Resultado do login:', { data: !!data.user, error: error?.message });

      if (error) {
        console.error('❌ Erro no login:', error);
        return { 
          success: false, 
          error: error.message === 'Invalid login credentials' 
            ? 'Email ou senha incorretos' 
            : error.message 
        };
      }

      if (data.user) {
        console.log('✅ Usuário autenticado:', data.user.email);
        
        // Buscar perfil do usuário
        const userProfile = await fetchProfile(data.user.id);
        
        console.log('👤 Perfil encontrado:', !!userProfile);
        
        if (userProfile) {
          setProfile(userProfile);
          // Atualizar último login
          await updateLastLogin(data.user.id);
        }

        toast({
          title: "Login realizado com sucesso!",
          description: `Bem-vindo, ${userProfile?.full_name || data.user.email}!`,
        });

        return { success: true };
      }

      return { success: false, error: 'Erro desconhecido no login' };
    } catch (error) {
      console.error('💥 Erro no login:', error);
      return { success: false, error: 'Erro interno do sistema' };
    } finally {
      setLoading(false);
    }
  };

  // Função de logout
  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Erro no logout:', error);
        toast({
          title: "Erro ao sair",
          description: "Ocorreu um erro ao fazer logout",
          variant: "destructive",
        });
      } else {
        setUser(null);
        setProfile(null);
        setSession(null);
        
        toast({
          title: "Logout realizado",
          description: "Você foi desconectado com sucesso",
        });
      }
    } catch (error) {
      console.error('Erro no logout:', error);
    } finally {
      setLoading(false);
    }
  };

  // Verificar se é admin
  const isAdmin = () => {
    if (!profile) return false;
    
    // Super admin tem acesso total
    if (profile.email === 'rcarrarocoach@gmail.com') return true;
    
    // Verificar se tem role de admin (quando implementarmos)
    // Por enquanto, apenas o super admin
    return false;
  };

  // Verificar se é super admin
  const isSuperAdmin = () => {
    return profile?.email === 'rcarrarocoach@gmail.com';
  };

  // Atualizar perfil
  const refreshProfile = async () => {
    if (user) {
      const userProfile = await fetchProfile(user.id);
      if (userProfile) {
        setProfile(userProfile);
      }
    }
  };

  // Monitorar mudanças de autenticação
  useEffect(() => {
    // Obter sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id).then(setProfile);
      }
      
      setLoading(false);
    });

    // Escutar mudanças de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const userProfile = await fetchProfile(session.user.id);
        setProfile(userProfile);
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = {
    user,
    profile,
    session,
    loading,
    signIn,
    signOut,
    isAdmin,
    isSuperAdmin,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}