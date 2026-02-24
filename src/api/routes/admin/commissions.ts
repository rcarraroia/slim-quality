/**
 * Task 2.5: API de Comissões
 * BLOCO 2: APIs Backend - Gestão de Comissões
 */

import { Router } from 'express';
import { supabase } from '../../../config/supabase';
import { verifyAdmin, AdminRequest } from '../../middleware/auth';
import { auditLogger } from '../../../services/audit-logger.service';

const router = Router();

/**
 * GET /api/admin/commissions - Listar comissões com filtros
 */
router.get('/', verifyAdmin, async (req: AdminRequest, res) => {
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
      .from('commissions')
      .select(`
        id,
        commission_value_cents,
        level,
        percentage,
        status,
        created_at,
        paid_at,
        affiliate:affiliates!commissions_affiliate_id_fkey(id, name, email),
        order:orders!commissions_order_id_fkey(id, order_number, total_cents)
      `);

    // Aplicar filtros
    if (status) {
      query = query.eq('status', status);
    }

    if (affiliate_id) {
      query = query.eq('affiliate_id', affiliate_id);
    }

    if (date_from) {
      query = query.gte('created_at', date_from);
    }

    if (date_to) {
      query = query.lte('created_at', date_to);
    }

    // Aplicar ordenação
    const validSortFields = ['created_at', 'commission_value_cents', 'status', 'level'];
    const sortField = validSortFields.includes(String(sortBy)) ? String(sortBy) : 'created_at';
    const order = sortOrder === 'asc' ? true : false;

    query = query.order(sortField, { ascending: order });

    // Aplicar paginação
    query = query.range(offset, offset + Number(limit) - 1);

    const { data: commissions, error } = await query;

    if (error) {
      throw error;
    }

    // Buscar total de registros
    let countQuery = supabase
      .from('commissions')
      .select('*', { count: 'exact', head: true });

    if (status) countQuery = countQuery.eq('status', status);
    if (affiliate_id) countQuery = countQuery.eq('affiliate_id', affiliate_id);
    if (date_from) countQuery = countQuery.gte('created_at', date_from);
    if (date_to) countQuery = countQuery.lte('created_at', date_to);

    const { count: totalCount } = await countQuery;

    // Formatar dados
    const formattedCommissions = (commissions || []).map(commission => ({
      ...commission,
      commission_value: Math.round(commission.commission_value_cents / 100),
      order_total: commission.order ? Math.round(commission.order.total_cents / 100) : 0
    }));

    // Log da ação
    await auditLogger.logAction({
      adminId: req.admin!.id,
      action: 'list_commissions',
      resourceType: 'commission',
      details: { 
        filters: { status, affiliate_id, date_from, date_to, page, limit },
        resultsCount: commissions?.length || 0
      }
    });

    res.json({
      data: formattedCommissions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / Number(limit))
      }
    });
  } catch (error) {
    console.error('Erro ao listar comissões:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/admin/commissions/:id - Detalhes da comissão
 */
router.get('/:id', verifyAdmin, async (req: AdminRequest, res) => {
  try {
    const { id } = req.params;

    // Buscar comissão com dados relacionados
    const { data: commission, error } = await supabase
      .from('commissions')
      .select(`
        *,
        affiliate:affiliates!commissions_affiliate_id_fkey(
          id, name, email, referral_code, wallet_id
        ),
        order:orders!commissions_order_id_fkey(
          id, order_number, total_cents, customer_name, customer_email, created_at
        )
      `)
      .eq('id', id)
      .single();

    if (error || !commission) {
      return res.status(404).json({ error: 'Comissão não encontrada' });
    }

    // Formatar dados
    const formattedCommission = {
      ...commission,
      commission_value: Math.round(commission.commission_value_cents / 100),
      base_value: Math.round(commission.base_value_cents / 100),
      order: commission.order ? {
        ...commission.order,
        total: Math.round(commission.order.total_cents / 100)
      } : null
    };

    // Log da ação
    await auditLogger.logAction({
      adminId: req.admin!.id,
      action: 'view_commission',
      resourceType: 'commission',
      resourceId: id,
      details: { 
        affiliateName: commission.affiliate?.name,
        commissionValue: Math.round(commission.commission_value_cents / 100)
      }
    });

    res.json(formattedCommission);
  } catch (error) {
    console.error('Erro ao buscar detalhes da comissão:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * POST /api/admin/commissions/:id/approve - Aprovar comissão
 */
router.post('/:id/approve', verifyAdmin, async (req: AdminRequest, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    // Buscar comissão
    const { data: commission, error: fetchError } = await supabase
      .from('commissions')
      .select(`
        *,
        affiliate:affiliates!commissions_affiliate_id_fkey(name, email)
      `)
      .eq('id', id)
      .single();

    if (fetchError || !commission) {
      return res.status(404).json({ error: 'Comissão não encontrada' });
    }

    if (commission.status !== 'calculated' && commission.status !== 'pending') {
      return res.status(400).json({ error: 'Comissão não pode ser aprovada neste status' });
    }

    // Aprovar comissão
    const { error: updateError } = await supabase
      .from('commissions')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    // ============================================
    // GATILHO AUTOMÁTICO: Notificação de Comissão Paga
    // ============================================
    // 🚨 DÉBITO TÉCNICO: Este gatilho está no frontend TypeScript.
    // FASE 2: Mover para backend Python ou Edge Function para:
    //   - Centralizar lógica de negócio
    //   - Evitar dependência de chamadas frontend
    //   - Garantir execução mesmo em falhas de UI
    // ============================================
    try {
      await supabase.from('notification_logs').insert({
        affiliate_id: commission.affiliate_id,
        type: 'commission_received',
        data: {
          commission_id: id,
          commission_value: Math.round(commission.commission_value_cents / 100),
          order_number: commission.order?.order_number,
          level: commission.level,
          paid_at: new Date().toISOString()
        },
        channel: 'email',
        status: 'sent',
        recipient_email: commission.affiliate?.email,
        sent_at: new Date().toISOString()
      });
    } catch (notificationError) {
      // Log do erro mas não bloqueia aprovação da comissão
      console.error('Erro ao criar notificação de comissão:', notificationError);
    }

    // Log da ação
    await auditLogger.logAction({
      adminId: req.admin!.id,
      action: 'approve_commission',
      resourceType: 'commission',
      resourceId: id,
      details: { 
        affiliateName: commission.affiliate?.name,
        commissionValue: Math.round(commission.commission_value_cents / 100),
        notes: notes || null
      }
    });

    res.json({ 
      message: 'Comissão aprovada com sucesso',
      commission: {
        id: commission.id,
        status: 'paid',
        commission_value: Math.round(commission.commission_value_cents / 100)
      }
    });
  } catch (error) {
    console.error('Erro ao aprovar comissão:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * POST /api/admin/commissions/:id/reject - Rejeitar comissão
 */
router.post('/:id/reject', verifyAdmin, async (req: AdminRequest, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Motivo da rejeição é obrigatório' });
    }

    // Buscar comissão
    const { data: commission, error: fetchError } = await supabase
      .from('commissions')
      .select(`
        *,
        affiliate:affiliates!commissions_affiliate_id_fkey(name, email)
      `)
      .eq('id', id)
      .single();

    if (fetchError || !commission) {
      return res.status(404).json({ error: 'Comissão não encontrada' });
    }

    if (commission.status === 'paid') {
      return res.status(400).json({ error: 'Comissão já foi paga e não pode ser rejeitada' });
    }

    // Rejeitar comissão
    const { error: updateError } = await supabase
      .from('commissions')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    // Log da ação
    await auditLogger.logAction({
      adminId: req.admin!.id,
      action: 'reject_commission',
      resourceType: 'commission',
      resourceId: id,
      details: { 
        affiliateName: commission.affiliate?.name,
        commissionValue: Math.round(commission.commission_value_cents / 100),
        rejectionReason: reason
      }
    });

    res.json({ 
      message: 'Comissão rejeitada com sucesso',
      commission: {
        id: commission.id,
        status: 'cancelled',
        commission_value: Math.round(commission.commission_value_cents / 100)
      }
    });
  } catch (error) {
    console.error('Erro ao rejeitar comissão:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * POST /api/admin/commissions/export - Exportar relatório de comissões
 */
router.post('/export', verifyAdmin, async (req: AdminRequest, res) => {
  try {
    const {
      status,
      affiliate_id,
      date_from,
      date_to,
      format = 'csv'
    } = req.body;

    // Construir query para exportação
    let query = supabase
      .from('commissions')
      .select(`
        id,
        commission_value_cents,
        level,
        percentage,
        status,
        created_at,
        paid_at,
        affiliate:affiliates!commissions_affiliate_id_fkey(name, email, referral_code),
        order:orders!commissions_order_id_fkey(order_number, total_cents, customer_name)
      `);

    // Aplicar filtros
    if (status) query = query.eq('status', status);
    if (affiliate_id) query = query.eq('affiliate_id', affiliate_id);
    if (date_from) query = query.gte('created_at', date_from);
    if (date_to) query = query.lte('created_at', date_to);

    query = query.order('created_at', { ascending: false });

    const { data: commissions, error } = await query;

    if (error) {
      throw error;
    }

    if (format === 'csv') {
      // Gerar CSV
      const csvHeaders = [
        'ID',
        'Afiliado',
        'Email',
        'Código',
        'Pedido',
        'Nível',
        'Percentual',
        'Valor Comissão',
        'Status',
        'Data Criação',
        'Data Pagamento'
      ].join(',');

      const csvRows = (commissions || []).map(c => [
        c.id,
        c.affiliate?.name || '',
        c.affiliate?.email || '',
        c.affiliate?.referral_code || '',
        c.order?.order_number || '',
        c.level,
        c.percentage,
        Math.round(c.commission_value_cents / 100),
        c.status,
        new Date(c.created_at).toLocaleDateString('pt-BR'),
        c.paid_at ? new Date(c.paid_at).toLocaleDateString('pt-BR') : ''
      ].join(','));

      const csvContent = [csvHeaders, ...csvRows].join('\n');

      // Log da ação
      await auditLogger.logAction({
        adminId: req.admin!.id,
        action: 'export_commissions',
        resourceType: 'commission',
        details: { 
          format,
          filters: { status, affiliate_id, date_from, date_to },
          recordsCount: commissions?.length || 0
        }
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=comissoes_${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csvContent);
    } else {
      // Retornar JSON
      const formattedCommissions = (commissions || []).map(c => ({
        ...c,
        commission_value: Math.round(c.commission_value_cents / 100),
        order_total: c.order ? Math.round(c.order.total_cents / 100) : 0
      }));

      // Log da ação
      await auditLogger.logAction({
        adminId: req.admin!.id,
        action: 'export_commissions',
        resourceType: 'commission',
        details: { 
          format,
          filters: { status, affiliate_id, date_from, date_to },
          recordsCount: commissions?.length || 0
        }
      });

      res.json({
        data: formattedCommissions,
        exportedAt: new Date().toISOString(),
        totalRecords: formattedCommissions.length
      });
    }
  } catch (error) {
    console.error('Erro ao exportar comissões:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;