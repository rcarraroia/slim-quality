/**
 * Vercel Serverless Function - Affiliate Balance
 * GET: Buscar saldo disponível e bloqueado do afiliado
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ success: false, error: 'Configuração do servidor incompleta' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Token de autenticação não fornecido' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ success: false, error: 'Usuário não autenticado' });
    }

    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .select('id, total_commissions_cents')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (affiliateError || !affiliate) {
      return res.status(404).json({ success: false, error: 'Afiliado não encontrado' });
    }

    // Buscar comissões pagas
    const { data: paidCommissions } = await supabase
      .from('commissions')
      .select('commission_value_cents')
      .eq('affiliate_id', affiliate.id)
      .eq('status', 'paid');

    const totalPaid = paidCommissions?.reduce((sum, c) => sum + (c.commission_value_cents || 0), 0) || 0;

    // Buscar comissões pendentes
    const { data: pendingCommissions } = await supabase
      .from('commissions')
      .select('commission_value_cents')
      .eq('affiliate_id', affiliate.id)
      .eq('status', 'pending');

    const totalPending = pendingCommissions?.reduce((sum, c) => sum + (c.commission_value_cents || 0), 0) || 0;

    // Buscar saques completados
    const { data: completedWithdrawals } = await supabase
      .from('affiliate_withdrawals')
      .select('amount_cents')
      .eq('affiliate_id', affiliate.id)
      .eq('status', 'completed')
      .is('deleted_at', null);

    const totalWithdrawn = completedWithdrawals?.reduce((sum, w) => sum + (w.amount_cents || 0), 0) || 0;

    // Calcular saldos
    const available = totalPaid - totalWithdrawn;
    const blocked = totalPending;
    const total = available + blocked;

    return res.status(200).json({
      success: true,
      data: {
        available,
        blocked,
        total,
        lastUpdate: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[Balance] Erro:', error);
    return res.status(500).json({ success: false, error: 'Erro ao buscar saldo' });
  }
}
