/**
 * API CONSOLIDADA DE NOTIFICAÇÕES - ADMIN
 * Sistema de Notificações - Fase 2
 * Created: 2026-02-24
 * 
 * Rotas:
 * - POST ?action=create
 * - GET  ?action=sent
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action } = req.query;

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
    case 'create':
      return handleCreate(req, res, supabase);
    case 'sent':
      return handleSent(req, res, supabase);
    default:
      return res.status(404).json({ success: false, error: 'Action não encontrada' });
  }
}

// ============================================
// HANDLER: CREATE BROADCAST
// ============================================
async function handleCreate(req, res, supabase) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  try {
    const { admin } = await authenticateAdmin(req, supabase);
    if (!admin) {
      return res.status(403).json({ success: false, error: 'Acesso negado' });
    }

    const { title, message, type = 'info' } = req.body;

    // Validações
    if (!title || !message) {
      return res.status(400).json({ 
        success: false,
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
        success: false,
        error: 'Nenhum afiliado ativo encontrado' 
      });
    }

    // Gerar broadcast_id único
    const broadcastId = randomUUID();

    // Criar notificações para todos os afiliados
    const notifications = affiliates.map(affiliate => ({
      affiliate_id: affiliate.id,
      type: 'broadcast',
      data: {
        title,
        message,
        notification_type: notificationType,
        broadcast_id: broadcastId,
        sent_by_admin_id: admin.id
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

    return res.status(200).json({
      success: true,
      message: `Notificação enviada para ${affiliates.length} afiliados`,
      data: {
        broadcast_id: broadcastId,
        recipients_count: affiliates.length,
        title,
        type: notificationType
      }
    });
  } catch (error) {
    console.error('[Admin Notifications Create] Erro:', error);
    return res.status(500).json({ success: false, error: 'Erro ao criar notificação broadcast' });
  }
}

// ============================================
// HANDLER: SENT BROADCASTS
// ============================================
async function handleSent(req, res, supabase) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  try {
    const { admin } = await authenticateAdmin(req, supabase);
    if (!admin) {
      return res.status(403).json({ success: false, error: 'Acesso negado' });
    }

    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Buscar broadcasts únicos (agrupados por broadcast_id)
    const { data: broadcasts, error } = await supabase
      .from('notification_logs')
      .select('data, sent_at')
      .eq('type', 'broadcast')
      .not('data->broadcast_id', 'is', null)
      .order('sent_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

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

    return res.status(200).json({
      success: true,
      data: formattedBroadcasts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: formattedBroadcasts.length
      }
    });
  } catch (error) {
    console.error('[Admin Notifications Sent] Erro:', error);
    return res.status(500).json({ success: false, error: 'Erro ao listar notificações enviadas' });
  }
}

// ============================================
// HELPER: AUTHENTICATE ADMIN
// ============================================
async function authenticateAdmin(req, supabase) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('[Auth Admin] Token não fornecido');
      throw new Error('Token de autenticação não fornecido');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError) {
      console.error('[Auth Admin] Erro ao validar token:', authError);
      throw new Error('Token inválido');
    }
    
    if (!user) {
      console.error('[Auth Admin] Usuário não encontrado');
      throw new Error('Usuário não autenticado');
    }

    // Verificar se é admin
    const { data: admin, error: adminError } = await supabase
      .from('admins')
      .select('id, role')
      .eq('id', user.id)
      .maybeSingle();

    if (adminError) {
      console.error('[Auth Admin] Erro ao buscar admin:', adminError);
      throw new Error('Erro ao buscar dados do admin');
    }

    if (!admin) {
      console.error('[Auth Admin] Usuário não é admin');
      throw new Error('Acesso negado');
    }

    return { user, admin };
  } catch (error) {
    console.error('[Auth Admin] Erro na autenticação:', error.message);
    throw error;
  }
}
