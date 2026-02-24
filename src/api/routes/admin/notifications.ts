/**
 * API de Notificações - Admin
 * Sistema de Notificações - Fase 2
 * Created: 2026-02-24
 */

import { Router, Response } from 'express';
import { supabase } from '../../../config/supabase';
import { verifyAdmin, AdminRequest } from '../../middleware/auth';

const router = Router();

/**
 * POST /api/admin/notifications/create
 * Admin cria notificação broadcast para todos os afiliados ativos
 */
router.post('/create', verifyAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const { title, message, type = 'status_change' } = req.body;

    // Validações
    if (!title || !message) {
      return res.status(400).json({ 
        error: 'Título e mensagem são obrigatórios' 
      });
    }

    const validTypes = ['info', 'success', 'warning', 'error'];
    const notificationType = validTypes.includes(type) ? type : 'info';

    // Buscar todos os afiliados ativos
    const { data: affiliates, error: affiliatesError } = await supabase
      .from('affiliates')
      .select('id, name, email')
      .eq('status', 'active')
      .is('deleted_at', null);

    if (affiliatesError) throw affiliatesError;

    if (!affiliates || affiliates.length === 0) {
      return res.status(404).json({ 
        error: 'Nenhum afiliado ativo encontrado' 
      });
    }

    // Gerar broadcast_id único
    const broadcastId = crypto.randomUUID();

    // Criar notificações para todos os afiliados
    const notifications = affiliates.map(affiliate => ({
      affiliate_id: affiliate.id,
      type: 'status_change',
      data: {
        title,
        message,
        notification_type: notificationType,
        broadcast_id: broadcastId,
        sent_by_admin_id: req.admin!.id
      },
      channel: 'email',
      status: 'sent',
      recipient_email: affiliate.email,
      sent_at: new Date().toISOString()
    }));

    // Inserir em lote
    const { error: insertError } = await supabase
      .from('notification_logs')
      .insert(notifications);

    if (insertError) throw insertError;

    res.json({
      success: true,
      message: `Notificação enviada para ${affiliates.length} afiliados`,
      data: {
        broadcast_id: broadcastId,
        recipients_count: affiliates.length,
        title,
        type: notificationType
      }
    });
  } catch (error: any) {
    console.error('Erro ao criar notificação broadcast:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/admin/notifications/sent
 * Lista notificações enviadas pelo admin (broadcasts)
 */
router.get('/sent', verifyAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // Buscar broadcasts únicos (agrupados por broadcast_id)
    const { data: broadcasts, error } = await supabase
      .from('notification_logs')
      .select('data, sent_at')
      .not('data->broadcast_id', 'is', null)
      .order('sent_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (error) throw error;

    // Agrupar por broadcast_id e contar destinatários
    const broadcastMap = new Map();
    
    for (const notification of broadcasts || []) {
      const broadcastId = notification.data?.broadcast_id;
      if (!broadcastId) continue;

      if (!broadcastMap.has(broadcastId)) {
        // Contar quantos afiliados receberam este broadcast
        const { count } = await supabase
          .from('notification_logs')
          .select('*', { count: 'exact', head: true })
          .eq('data->>broadcast_id', broadcastId);

        broadcastMap.set(broadcastId, {
          broadcast_id: broadcastId,
          title: notification.data?.title,
          message: notification.data?.message,
          type: notification.data?.notification_type || 'info',
          sent_at: notification.sent_at,
          recipients_count: count || 0
        });
      }
    }

    const formattedBroadcasts = Array.from(broadcastMap.values());

    res.json({
      success: true,
      data: formattedBroadcasts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: formattedBroadcasts.length
      }
    });
  } catch (error: any) {
    console.error('Erro ao listar notificações enviadas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
