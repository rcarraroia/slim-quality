/**
 * API de Notificações - Afiliados
 * Sistema de Notificações - Fase 2
 * Created: 2026-02-24
 */

import { Router } from 'express';
import { supabase } from '../../config/supabase';
import { verifyAffiliate, AffiliateRequest } from '../middleware/affiliate-auth';

const router = Router();

/**
 * GET /api/notifications
 * Lista notificações do afiliado logado
 */
router.get('/', verifyAffiliate, async (req: AffiliateRequest, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    // Buscar affiliate_id do usuário
    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .select('id')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single();

    if (affiliateError || !affiliate) {
      return res.status(404).json({ error: 'Afiliado não encontrado' });
    }

    // Buscar notificações
    const { data: notifications, error } = await supabase
      .from('notification_logs')
      .select('id, type, data, sent_at, read_at')
      .eq('affiliate_id', affiliate.id)
      .order('sent_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    // Formatar resposta
    const formattedNotifications = (notifications || []).map(n => ({
      id: n.id,
      type: n.type,
      title: n.data?.title || getTitleByType(n.type),
      message: n.data?.message || getMessageByType(n.type, n.data),
      data: n.data,
      sent_at: n.sent_at,
      is_read: n.read_at !== null,
      read_at: n.read_at
    }));

    res.json({
      success: true,
      data: formattedNotifications
    });
  } catch (error: any) {
    console.error('Erro ao listar notificações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/notifications/unread-count
 * Contador de notificações não lidas
 */
router.get('/unread-count', verifyAffiliate, async (req: AffiliateRequest, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    // Buscar affiliate_id do usuário
    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .select('id')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single();

    if (affiliateError || !affiliate) {
      return res.status(404).json({ error: 'Afiliado não encontrado' });
    }

    // Contar não lidas
    const { count, error } = await supabase
      .from('notification_logs')
      .select('*', { count: 'exact', head: true })
      .eq('affiliate_id', affiliate.id)
      .is('read_at', null);

    if (error) throw error;

    res.json({
      success: true,
      data: {
        unread_count: count || 0
      }
    });
  } catch (error: any) {
    console.error('Erro ao contar notificações não lidas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * PUT /api/notifications/:id/read
 * Marcar notificação como lida
 */
router.put('/:id/read', verifyAffiliate, async (req: AffiliateRequest, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    
    if (!userId) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    // Buscar affiliate_id do usuário
    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .select('id')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single();

    if (affiliateError || !affiliate) {
      return res.status(404).json({ error: 'Afiliado não encontrado' });
    }

    // Verificar se notificação pertence ao afiliado
    const { data: notification, error: checkError } = await supabase
      .from('notification_logs')
      .select('id, affiliate_id')
      .eq('id', id)
      .single();

    if (checkError || !notification) {
      return res.status(404).json({ error: 'Notificação não encontrada' });
    }

    if (notification.affiliate_id !== affiliate.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Marcar como lida
    const { error: updateError } = await supabase
      .from('notification_logs')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id);

    if (updateError) throw updateError;

    res.json({
      success: true,
      message: 'Notificação marcada como lida'
    });
  } catch (error: any) {
    console.error('Erro ao marcar notificação como lida:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * PUT /api/notifications/mark-all-read
 * Marcar todas as notificações como lidas
 */
router.put('/mark-all-read', verifyAffiliate, async (req: AffiliateRequest, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    // Buscar affiliate_id do usuário
    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .select('id')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single();

    if (affiliateError || !affiliate) {
      return res.status(404).json({ error: 'Afiliado não encontrado' });
    }

    // Marcar todas como lidas
    const { error: updateError } = await supabase
      .from('notification_logs')
      .update({ read_at: new Date().toISOString() })
      .eq('affiliate_id', affiliate.id)
      .is('read_at', null);

    if (updateError) throw updateError;

    res.json({
      success: true,
      message: 'Todas as notificações foram marcadas como lidas'
    });
  } catch (error: any) {
    console.error('Erro ao marcar todas como lidas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * Funções auxiliares para gerar títulos e mensagens padrão
 */
function getTitleByType(type: string): string {
  const titles: Record<string, string> = {
    'welcome': 'Bem-vindo ao Programa de Afiliados!',
    'commission_received': 'Comissão Recebida!',
    'withdrawal_processed': 'Saque Processado!',
    'status_change': 'Atualização Importante',
    'network_update': 'Novidade na sua Rede',
    'payment_reminder': 'Lembrete de Pagamento',
    'monthly_report': 'Relatório Mensal Disponível'
  };
  return titles[type] || 'Notificação';
}

function getMessageByType(type: string, data: any): string {
  switch (type) {
    case 'commission_received':
      return `Você recebeu uma comissão de R$ ${data?.commission_value || '0,00'}`;
    case 'withdrawal_processed':
      return `Seu saque de R$ ${data?.amount || '0,00'} foi processado com sucesso`;
    case 'welcome':
      return 'Parabéns! Você agora faz parte do nosso programa de afiliados.';
    default:
      return data?.message || 'Você tem uma nova notificação';
  }
}

export default router;
