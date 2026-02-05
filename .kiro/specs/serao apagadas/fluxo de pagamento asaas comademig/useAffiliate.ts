
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AffiliateData {
  display_name: string;
  cpf_cnpj: string;
  asaas_wallet_id: string;
  contact_email?: string;
  phone?: string;
}

export interface Affiliate {
  id: string;
  user_id: string;
  display_name: string;
  cpf_cnpj: string;
  asaas_wallet_id: string;
  contact_email: string;
  phone: string;
  status: 'pending' | 'active' | 'suspended';
  is_adimplent: boolean;
  referral_code: string;
  created_at: string;
  updated_at: string;
}

export interface Referral {
  id: string;
  affiliate_id: string;
  referred_name: string;
  referred_email: string;
  charge_id?: string;
  amount: number;
  status: 'pending' | 'paid' | 'cancelled';
  created_at: string;
}

export interface Transaction {
  id: string;
  asaas_payment_id: string;
  affiliate_id: string;
  total_amount: number;
  affiliate_amount: number;
  convention_amount: number;
  renum_amount: number;
  status: string;
  created_at: string;
}

// Hook para buscar dados do afiliado atual
export function useMyAffiliate() {
  return useQuery({
    queryKey: ['my-affiliate'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { data, error } = await supabase
        .from('affiliates')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as Affiliate | null;
    },
  });
}

// Hook para buscar indicações do afiliado
export function useAffiliateReferrals(affiliateId?: string) {
  return useQuery({
    queryKey: ['affiliate-referrals', affiliateId],
    queryFn: async () => {
      if (!affiliateId) return [];

      const { data, error } = await supabase
        .from('affiliate_referrals')
        .select(`
          *,
          referred_user:profiles!referred_user_id(
            id,
            nome_completo,
            email
          )
        `)
        .eq('affiliate_id', affiliateId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!affiliateId,
    staleTime: 0, // Sempre buscar dados frescos
    gcTime: 0, // Não cachear (antes era cacheTime)
  });
}

// Hook para buscar comissões do afiliado
export function useAffiliateCommissions(affiliateId?: string) {
  return useQuery({
    queryKey: ['affiliate-commissions', affiliateId],
    queryFn: async () => {
      if (!affiliateId) return [];

      const { data, error } = await supabase
        .from('affiliate_commissions')
        .select('*')
        .eq('affiliate_id', affiliateId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!affiliateId,
  });
}

// Hook para buscar estatísticas do afiliado
export function useAffiliateStats(affiliateId?: string) {
  return useQuery({
    queryKey: ['affiliate-stats', affiliateId],
    queryFn: async () => {
      if (!affiliateId) {
        return {
          totalReferrals: 0,
          activeReferrals: 0,
          totalCommissions: 0,
          pendingCommissions: 0,
          paidCommissions: 0,
        };
      }

      // Buscar indicações
      const { data: referrals } = await supabase
        .from('affiliate_referrals')
        .select('status, conversion_value')
        .eq('affiliate_id', affiliateId);

      // Buscar comissões
      const { data: commissions } = await supabase
        .from('affiliate_commissions')
        .select('amount, status')
        .eq('affiliate_id', affiliateId);

      return {
        totalReferrals: referrals?.length || 0,
        activeReferrals: referrals?.filter(r => r.status === 'converted').length || 0,
        totalCommissions: commissions?.reduce((sum, c) => sum + c.amount, 0) || 0,
        pendingCommissions: commissions?.filter(c => c.status === 'pending')
          .reduce((sum, c) => sum + c.amount, 0) || 0,
        paidCommissions: commissions?.filter(c => c.status === 'paid')
          .reduce((sum, c) => sum + c.amount, 0) || 0,
      };
    },
    enabled: !!affiliateId,
  });
}

// Hook para criar afiliado
export function useCreateAffiliate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AffiliateData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { data: result, error } = await supabase
        .from('affiliates')
        .insert({
          user_id: user.id,
          display_name: data.display_name,
          cpf_cnpj: data.cpf_cnpj,
          asaas_wallet_id: data.asaas_wallet_id,
          contact_email: data.contact_email || user.email,
          phone: data.phone,
          status: 'active',
          is_adimplent: true,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-affiliate'] });
      toast.success('Cadastro de afiliado criado com sucesso! Você já pode começar a indicar.');
    },
    onError: (error: any) => {
      console.error('Erro ao criar afiliado:', error);
      toast.error('Erro ao criar cadastro de afiliado: ' + error.message);
    },
  });
}

// Hook para atualizar afiliado
export function useUpdateAffiliate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: string; updates: Partial<AffiliateData> }) => {
      const { data: result, error } = await supabase
        .from('affiliates')
        .update(data.updates)
        .eq('id', data.id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-affiliate'] });
      toast.success('Dados atualizados com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar afiliado:', error);
      toast.error('Erro ao atualizar dados: ' + error.message);
    },
  });
}

// Função utilitária para gerar URL de indicação
export function generateReferralUrl(referralCode: string): string {
  return `${window.location.origin}/filiacao?ref=${referralCode}`;
}
