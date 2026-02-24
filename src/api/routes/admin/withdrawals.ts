/**
 * Task 2.7: API de Saques
 * BLOCO 2: APIs Backend - Gestão de Saques
 */

import { Router, Response } from 'express';
import { supabase } from '../../../config/supabase';
import { verifyAdmin, AdminRequest } from '../../middleware/auth';
import { auditLogger } from '../../../services/audit-logger.service';

const router = Router();

/**
 * GET /api/admin/withdrawals - Listar solicitações de saque
 */
router.get('/', verifyAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      affiliate_id,
      date_from,
      date_to,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    // Construir query
    let query = supabase
      .from('withdrawals')
      .select(`
        id,
        amount_cents,
        status,
        requested_at,
        processed_at,
        notes,
        created_at,
        affiliate:affiliates!withdrawals_affiliate_id_fkey(
          id, name, email, wallet_id
        )
      `);

    // Aplicar filtros
    if (status) {
      query = query.eq('status', status);
    }

    if (affiliate_id) {
      query = query.eq('affiliate_id', affiliate_id);
    }

    if (date_from) {
      query = query.gte('requested_at', date_from);
    }

    if (date_to) {
      query = query.lte('requested_at', date_to);
    }

    // Aplicar ordenação
    const validSortFields = ['requested_at', 'amount_cents', 'status', 'processed_at'];
    const sortField = validSortFields.includes(String(sortBy)) ? String(sortBy) : 'requested_at';
    const order = sortOrder === 'asc' ? true : false;

    query = query.order(sortField, { ascending: order });

    // Aplicar paginação
    query = query.range(offset, offset + Number(limit) - 1);

    const { data: withdrawals, error } = await query;

    if (error) {
      throw error;
    }

    // Buscar total de registros
    let countQuery = supabase
      .from('withdrawals')
      .select('*', { count: 'exact', head: true });

    if (status) countQuery = countQuery.eq('status', status);
    if (affiliate_id) countQuery = countQuery.eq('affiliate_id', affiliate_id);
    if (date_from) countQuery = countQuery.gte('requested_at', date_from);
    if (date_to) countQuery = countQuery.lte('requested_at', date_to);

    const { count: totalCount } = await countQuery;

    // Formatar dados
    const formattedWithdrawals = (withdrawals || []).map(withdrawal => ({
      ...withdrawal,
      amount: Math.round(withdrawal.amount_cents / 100)
    }));

    // Log da ação
    await auditLogger.logAction({
      adminId: req.admin!.id,
      action: 'list_withdrawals',
      resourceType: 'withdrawal',
      details: { 
        filters: { status, affiliate_id, date_from, date_to, page, limit },
        resultsCount: withdrawals?.length || 0
      }
    });

    res.json({
      data: formattedWithdrawals,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / Number(limit))
      }
    });
  } catch (error) {
    console.error('Erro ao listar saques:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/admin/withdrawals/:id - Detalhes do saque
 */
router.get('/:id', verifyAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Buscar saque com dados relacionados
    const { data: withdrawal, error } = await supabase
      .from('withdrawals')
      .select(`
        *,
        affiliate:affiliates!withdrawals_affiliate_id_fkey(
          id, name, email, wallet_id, referral_code
        ),
        processed_by_admin:admins!withdrawals_processed_by_fkey(
          name, email
        )
      `)
      .eq('id', id)
      .single();

    if (error || !withdrawal) {
      return res.status(404).json({ error: 'Saque não encontrado' });
    }

    // Formatar dados
    const formattedWithdrawal = {
      ...withdrawal,
      amount: Math.round(withdrawal.amount_cents / 100)
    };

    // Log da ação
    await auditLogger.logAction({
      adminId: req.admin!.id,
      action: 'view_withdrawal',
      resourceType: 'withdrawal',
      resourceId: id,
      details: { 
        affiliateName: withdrawal.affiliate?.name,
        amount: Math.round(withdrawal.amount_cents / 100)
      }
    });

    res.json(formattedWithdrawal);
  } catch (error) {
    console.error('Erro ao buscar detalhes do saque:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * POST /api/admin/withdrawals/:id/approve - Aprovar saque
 */
router.post('/:id/approve', verifyAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    // Buscar saque
    const { data: withdrawal, error: fetchError } = await supabase
      .from('withdrawals')
      .select(`
        *,
        affiliate:affiliates!withdrawals_affiliate_id_fkey(name, email, wallet_id)
      `)
      .eq('id', id)
      .single();

    if (fetchError || !withdrawal) {
      return res.status(404).json({ error: 'Saque não encontrado' });
    }

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ error: 'Saque não está pendente de aprovação' });
    }

    // Aprovar saque
    const { error: updateError } = await supabase
      .from('withdrawals')
      .update({
        status: 'approved',
        processed_at: new Date().toISOString(),
        processed_by: req.admin!.id,
        notes: notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    // ============================================
    // GATILHO AUTOMÁTICO: Notificação de Saque Processado
    // ============================================
    // 🚨 DÉBITO TÉCNICO: Este gatilho está no frontend TypeScript.
    // FASE 2: Mover para backend Python ou Edge Function para:
    //   - Centralizar lógica de negócio
    //   - Evitar dependência de chamadas frontend
    //   - Garantir execução mesmo em falhas de UI
    // ============================================
    try {
      await supabase.from('notification_logs').insert({
        affiliate_id: withdrawal.affiliate_id,
        type: 'withdrawal_processed',
        data: {
          withdrawal_id: id,
          amount: Math.round(withdrawal.amount_cents / 100),
          wallet_id: withdrawal.affiliate?.wallet_id,
          processed_at: new Date().toISOString(),
          processed_by_admin: req.admin!.name || req.admin!.email
        },
        channel: 'email',
        status: 'sent',
        recipient_email: withdrawal.affiliate?.email,
        sent_at: new Date().toISOString()
      });
    } catch (notificationError) {
      // Log do erro mas não bloqueia aprovação do saque
      console.error('Erro ao criar notificação de saque:', notificationError);
    }

    // Log da ação
    await auditLogger.logAction({
      adminId: req.admin!.id,
      action: 'approve_withdrawal',
      resourceType: 'withdrawal',
      resourceId: id,
      details: { 
        affiliateName: withdrawal.affiliate?.name,
        amount: Math.round(withdrawal.amount_cents / 100),
        walletId: withdrawal.affiliate?.wallet_id,
        notes: notes || null
      }
    });

    res.json({ 
      message: 'Saque aprovado com sucesso',
      withdrawal: {
        id: withdrawal.id,
        status: 'approved',
        amount: Math.round(withdrawal.amount_cents / 100)
      }
    });
  } catch (error) {
    console.error('Erro ao aprovar saque:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * POST /api/admin/withdrawals/:id/reject - Rejeitar saque
 */
router.post('/:id/reject', verifyAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Motivo da rejeição é obrigatório' });
    }

    // Buscar saque
    const { data: withdrawal, error: fetchError } = await supabase
      .from('withdrawals')
      .select(`
        *,
        affiliate:affiliates!withdrawals_affiliate_id_fkey(name, email)
      `)
      .eq('id', id)
      .single();

    if (fetchError || !withdrawal) {
      return res.status(404).json({ error: 'Saque não encontrado' });
    }

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ error: 'Saque não está pendente de aprovação' });
    }

    // Rejeitar saque
    const { error: updateError } = await supabase
      .from('withdrawals')
      .update({
        status: 'rejected',
        processed_at: new Date().toISOString(),
        processed_by: req.admin!.id,
        rejection_reason: reason,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    // Log da ação
    await auditLogger.logAction({
      adminId: req.admin!.id,
      action: 'reject_withdrawal',
      resourceType: 'withdrawal',
      resourceId: id,
      details: { 
        affiliateName: withdrawal.affiliate?.name,
        amount: Math.round(withdrawal.amount_cents / 100),
        rejectionReason: reason
      }
    });

    res.json({ 
      message: 'Saque rejeitado com sucesso',
      withdrawal: {
        id: withdrawal.id,
        status: 'rejected',
        amount: Math.round(withdrawal.amount_cents / 100)
      }
    });
  } catch (error) {
    console.error('Erro ao rejeitar saque:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * POST /api/admin/withdrawals/:id/process - Marcar como processado
 */
router.post('/:id/process', verifyAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { transaction_id, notes } = req.body;

    // Buscar saque
    const { data: withdrawal, error: fetchError } = await supabase
      .from('withdrawals')
      .select(`
        *,
        affiliate:affiliates!withdrawals_affiliate_id_fkey(name, email)
      `)
      .eq('id', id)
      .single();

    if (fetchError || !withdrawal) {
      return res.status(404).json({ error: 'Saque não encontrado' });
    }

    if (withdrawal.status !== 'approved') {
      return res.status(400).json({ error: 'Saque deve estar aprovado para ser processado' });
    }

    // Marcar como processado
    const { error: updateError } = await supabase
      .from('withdrawals')
      .update({
        status: 'completed',
        transaction_id: transaction_id || null,
        notes: notes || withdrawal.notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    // Log da ação
    await auditLogger.logAction({
      adminId: req.admin!.id,
      action: 'process_withdrawal',
      resourceType: 'withdrawal',
      resourceId: id,
      details: { 
        affiliateName: withdrawal.affiliate?.name,
        amount: Math.round(withdrawal.amount_cents / 100),
        transactionId: transaction_id || null,
        notes: notes || null
      }
    });

    res.json({ 
      message: 'Saque processado com sucesso',
      withdrawal: {
        id: withdrawal.id,
        status: 'completed',
        amount: Math.round(withdrawal.amount_cents / 100)
      }
    });
  } catch (error) {
    console.error('Erro ao processar saque:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;