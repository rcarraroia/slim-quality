/**
 * Vercel Serverless Function - Affiliate Withdrawals
 * GET: Buscar histórico de saques
 * POST: Solicitar novo saque
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

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
    .select('id')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (affiliateError || !affiliate) {
    return res.status(404).json({ success: false, error: 'Afiliado não encontrado' });
  }

  if (req.method === 'GET') {
    return handleGetWithdrawals(req, res, supabase, affiliate.id);
  } else if (req.method === 'POST') {
    return handleCreateWithdrawal(req, res, supabase, affiliate.id);
  }

  return res.status(405).json({ success: false, error: 'Método não permitido' });
}

async function handleGetWithdrawals(req, res, supabase, affiliateId) {
  try {
    const { page = 1, limit = 20, status, startDate, endDate } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = supabase
      .from('affiliate_withdrawals')
      .select('*', { count: 'exact' })
      .eq('affiliate_id', affiliateId)
      .is('deleted_at', null);

    if (status) query = query.eq('status', status);
    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);

    const { data: withdrawals, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (error) throw error;

    const totalCompleted = withdrawals?.filter(w => w.status === 'completed').reduce((sum, w) => sum + w.amount_cents, 0) || 0;
    const totalPending = withdrawals?.filter(w => w.status === 'processing').reduce((sum, w) => sum + w.amount_cents, 0) || 0;
    const totalRejected = withdrawals?.filter(w => w.status === 'rejected').reduce((sum, w) => sum + w.amount_cents, 0) || 0;

    return res.status(200).json({
      success: true,
      data: {
        withdrawals: withdrawals || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count || 0,
          totalPages: Math.ceil((count || 0) / parseInt(limit))
        },
        summary: { totalCompleted, totalPending, totalRejected }
      }
    });
  } catch (error) {
    console.error('[Withdrawals] Erro ao buscar:', error);
    return res.status(500).json({ success: false, error: 'Erro ao buscar saques' });
  }
}

async function handleCreateWithdrawal(req, res, supabase, affiliateId) {
  try {
    const { amount, pixKey, description } = req.body;

    if (!amount || amount < 50) {
      return res.status(400).json({ success: false, error: 'Valor mínimo de saque é R$ 50' });
    }

    if (!pixKey) {
      return res.status(400).json({ success: false, error: 'Chave PIX é obrigatória' });
    }

    const { data: withdrawal, error } = await supabase
      .from('affiliate_withdrawals')
      .insert({
        affiliate_id: affiliateId,
        amount_cents: Math.round(amount * 100),
        status: 'pending',
        method: 'pix',
        pix_key: pixKey,
        description: description || 'Saque de comissões',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({
      success: true,
      data: {
        withdrawalId: withdrawal.id,
        status: withdrawal.status,
        estimatedDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
      }
    });
  } catch (error) {
    console.error('[Withdrawals] Erro ao criar:', error);
    return res.status(500).json({ success: false, error: 'Erro ao solicitar saque' });
  }
}
