/**
 * API CONSOLIDADA DE NOTIFICAÇÕES - AFILIADOS
 * Sistema de Notificações - Fase 2
 * Created: 2026-02-24
 * 
 * Rotas:
 * - GET  ?action=list
 * - GET  ?action=unread-count
 * - PUT  ?action=mark-read&id={id}
 * - PUT  ?action=mark-all-read
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action, id, limit = 50 } = req.query;

  if (!action) {
    return res.status(400).json({ 
      success: false, 
      error: 'Parâmetro "action" é obrigatório' 
    });
  }

  // Inicializar Supabase
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ success: false, error: 'Configuração do servidor incompleta' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Roteamento
  switch (action) {
    case 'list':
      return handleList(req, res, supabase, limit);
    case 'unread-count':
      return handleUnreadCount(req, res, supabase);
    case 'mark-read':
      return handleMarkRead(req, res, supabase, id);
    case 'mark-all-read':
      return handleMarkAllRead(req, res, supabase);
    default:
      return res.status(404).json({ success: false, error: 'Action não encontrada' });
  }
}

// ============================================
// HANDLER: LIST
// ============================================
async function handleList(req, res, supabase, limit) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  try {
    const { user, affiliate } = await authenticateAffiliate(req, supabase);
    if (!affiliate) {
      return res.status(404).json({ success: false, error: 'Afiliado não encontrado' });
    }

    // Buscar notificações
    const { data: notifications, error } = await supabase
      .from('notification_logs')
      .select('id, type, data, sent_at, read_at')
      .eq('affiliate_id', affiliate.id)
      .order('sent_at', { ascending: false })
      .limit(parseInt(limit));

    if (error) throw error;

    // Formatar resposta
    const formattedNotifications = (notifications || []).map(n => ({
      id: n.id,
      type: n.type,
      title: n.data?.title || getTitleByType(n.type),
      message: n.data?.message || getMessageByType(n.type, n.data),
      data: n.data,
      created_at: n.sent_at,
      read_at: n.read_at
    }));

    return res.status(200).json({
      success: true,
      data: formattedNotifications
    });
  } catch (error) {
    console.error('[Notifications List] Erro:', error);
    return res.status(500).json({ success: false, error: 'Erro ao listar notificações' });
  }
}

// ============================================
// HANDLER: UNREAD COUNT
// ============================================
async function handleUnreadCount(req, res, supabase) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  try {
    const { user, affiliate } = await authenticateAffiliate(req, supabase);
    if (!affiliate) {
      return res.status(404).json({ success: false, error: 'Afiliado não encontrado' });
    }

    // Contar não lidas
    const { count, error } = await supabase
      .from('notification_logs')
      .select('*', { count: 'exact', head: true })
      .eq('affiliate_id', affiliate.id)
      .is('read_at', null);

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data: count || 0
    });
  } catch (error) {
    console.error('[Notifications Unread Count] Erro:', error);
    return res.status(500).json({ success: false, error: 'Erro ao contar notificações' });
  }
}

// ============================================
// HANDLER: MARK READ
// ============================================
async function handleMarkRead(req, res, supabase, notificationId) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  if (!notificationId) {
    return res.status(400).json({ success: false, error: 'ID da notificação é obrigatório' });
  }

  try {
    const { user, affiliate } = await authenticateAffiliate(req, supabase);
    if (!affiliate) {
      return res.status(404).json({ success: false, error: 'Afiliado não encontrado' });
    }

    // Verificar se notificação pertence ao afiliado
    const { data: notification, error: checkError } = await supabase
      .from('notification_logs')
      .select('id, affiliate_id')
      .eq('id', notificationId)
      .single();

    if (checkError || !notification) {
      return res.status(404).json({ success: false, error: 'Notificação não encontrada' });
    }

    if (notification.affiliate_id !== affiliate.id) {
      return res.status(403).json({ success: false, error: 'Acesso negado' });
    }

    // Marcar como lida
    const { error: updateError } = await supabase
      .from('notification_logs')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId);

    if (updateError) throw updateError;

    return res.status(200).json({
      success: true,
      message: 'Notificação marcada como lida'
    });
  } catch (error) {
    console.error('[Notifications Mark Read] Erro:', error);
    return res.status(500).json({ success: false, error: 'Erro ao marcar notificação' });
  }
}

// ============================================
// HANDLER: MARK ALL READ
// ============================================
async function handleMarkAllRead(req, res, supabase) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  try {
    const { user, affiliate } = await authenticateAffiliate(req, supabase);
    if (!affiliate) {
      return res.status(404).json({ success: false, error: 'Afiliado não encontrado' });
    }

    // Marcar todas como lidas
    const { error: updateError } = await supabase
      .from('notification_logs')
      .update({ read_at: new Date().toISOString() })
      .eq('affiliate_id', affiliate.id)
      .is('read_at', null);

    if (updateError) throw updateError;

    return res.status(200).json({
      success: true,
      message: 'Todas as notificações foram marcadas como lidas'
    });
  } catch (error) {
    console.error('[Notifications Mark All Read] Erro:', error);
    return res.status(500).json({ success: false, error: 'Erro ao marcar notificações' });
  }
}

// ============================================
// HELPER: AUTHENTICATE AFFILIATE
// ============================================
async function authenticateAffiliate(req, supabase) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('[Auth] Token não fornecido');
      throw new Error('Token de autenticação não fornecido');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError) {
      console.error('[Auth] Erro ao validar token:', authError);
      throw new Error('Token inválido');
    }
    
    if (!user) {
      console.error('[Auth] Usuário não encontrado');
      throw new Error('Usuário não autenticado');
    }

    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .select('id')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (affiliateError) {
      console.error('[Auth] Erro ao buscar afiliado:', affiliateError);
      throw new Error('Erro ao buscar dados do afiliado');
    }

    return { user, affiliate };
  } catch (error) {
    console.error('[Auth] Erro na autenticação:', error.message);
    throw error;
  }
}

// ============================================
// HELPER: GET TITLE BY TYPE
// ============================================
function getTitleByType(type) {
  const titles = {
    'welcome': 'Bem-vindo ao Programa de Afiliados!',
    'commission_paid': 'Comissão Recebida!',
    'withdrawal_processed': 'Saque Processado!',
    'status_change': 'Atualização Importante',
    'network_update': 'Novidade na sua Rede',
    'payment_reminder': 'Lembrete de Pagamento',
    'monthly_report': 'Relatório Mensal Disponível',
    'broadcast': 'Comunicado Importante'
  };
  return titles[type] || 'Notificação';
}

// ============================================
// HELPER: GET MESSAGE BY TYPE
// ============================================
function getMessageByType(type, data) {
  switch (type) {
    case 'commission_paid':
      return `Você recebeu uma comissão de R$ ${data?.commission_value || '0,00'}`;
    case 'withdrawal_processed':
      return `Seu saque de R$ ${data?.amount || '0,00'} foi processado com sucesso`;
    case 'welcome':
      return 'Parabéns! Você agora faz parte do nosso programa de afiliados.';
    default:
      return data?.message || 'Você tem uma nova notificação';
  }
}
