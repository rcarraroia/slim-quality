/**
 * API CONSOLIDADA DE ADMIN + NOTIFICATIONS
 * Rotas administrativas e de notificações consolidadas
 * 
 * Rotas Admin:
 * - POST ?action=notifications-create (broadcast para todos)
 * - GET  ?action=notifications-sent (histórico de broadcasts)
 * 
 * Rotas Notifications (afiliados):
 * - GET  ?action=list (listar notificações do afiliado)
 * - POST ?action=mark-read (marcar como lida)
 * - POST ?action=mark-all-read (marcar todas como lidas)
 * - POST ?action=send-email (enviar email)
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
    // Admin routes
    case 'notifications-create':
      return handleNotificationsCreate(req, res, supabase);
    case 'notifications-sent':
      return handleNotificationsSent(req, res, supabase);
    
    // Affiliate notification routes
    case 'list':
      return handleList(req, res, supabase);
    case 'mark-read':
      return handleMarkRead(req, res, supabase);
    case 'mark-all-read':
      return handleMarkAllRead(req, res, supabase);
    case 'send-email':
      return handleSendEmail(req, res, supabase);
    
    default:
      return res.status(404).json({ success: false, error: 'Action não encontrada' });
  }
}

// ============================================
// HANDLER: CREATE BROADCAST
// ============================================
async function handleNotificationsCreate(req, res, supabase) {
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
async function handleNotificationsSent(req, res, supabase) {
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


// ============================================
// AFFILIATE NOTIFICATION HANDLERS
// ============================================

/**
 * Lista notificações do afiliado logado
 */
async function handleList(req, res, supabase) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  // Verificar autenticação
  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  );

  if (authError || !user) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  // Buscar afiliado
  const { data: affiliate } = await supabase
    .from('affiliates')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!affiliate) {
    return res.status(404).json({ error: 'Afiliado não encontrado' });
  }

  // Buscar notificações (últimas 50)
  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('affiliate_id', affiliate.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    throw error;
  }

  // Contar não lidas
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return res.status(200).json({
    success: true,
    notifications,
    unreadCount
  });
}

/**
 * Marca uma notificação como lida
 */
async function handleMarkRead(req, res, supabase) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const { notification_id } = req.body;
  if (!notification_id) {
    return res.status(400).json({ error: 'notification_id é obrigatório' });
  }

  // Verificar autenticação
  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  );

  if (authError || !user) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  // Buscar afiliado
  const { data: affiliate } = await supabase
    .from('affiliates')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!affiliate) {
    return res.status(404).json({ error: 'Afiliado não encontrado' });
  }

  // Marcar como lida
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, updated_at: new Date().toISOString() })
    .eq('id', notification_id)
    .eq('affiliate_id', affiliate.id);

  if (error) {
    throw error;
  }

  return res.status(200).json({
    success: true,
    message: 'Notificação marcada como lida'
  });
}

/**
 * Marca todas as notificações como lidas
 */
async function handleMarkAllRead(req, res, supabase) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  // Verificar autenticação
  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  );

  if (authError || !user) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  // Buscar afiliado
  const { data: affiliate } = await supabase
    .from('affiliates')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!affiliate) {
    return res.status(404).json({ error: 'Afiliado não encontrado' });
  }

  // Marcar todas como lidas
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, updated_at: new Date().toISOString() })
    .eq('affiliate_id', affiliate.id)
    .eq('is_read', false);

  if (error) {
    throw error;
  }

  return res.status(200).json({
    success: true,
    message: 'Todas as notificações marcadas como lidas'
  });
}

/**
 * Envia email de notificação
 */
async function handleSendEmail(req, res, supabase) {
  const { affiliate_id, type, data } = req.body;

  if (!affiliate_id || !type) {
    return res.status(400).json({ error: 'affiliate_id e type são obrigatórios' });
  }

  // Buscar dados do afiliado
  const { data: affiliate, error: affiliateError } = await supabase
    .from('affiliates')
    .select('name, email')
    .eq('id', affiliate_id)
    .single();

  if (affiliateError || !affiliate) {
    return res.status(404).json({ error: 'Afiliado não encontrado' });
  }

  // Preparar email baseado no tipo
  let subject, html;

  switch (type) {
    case 'payment_reminder':
      subject = 'Lembrete: Pagamento próximo do vencimento';
      html = generatePaymentReminderEmail(affiliate, data);
      break;
    
    case 'payment_confirmed':
      subject = 'Pagamento confirmado!';
      html = generatePaymentConfirmedEmail(affiliate, data);
      break;
    
    case 'overdue':
      subject = 'Atenção: Pagamento em atraso';
      html = generateOverdueEmail(affiliate, data);
      break;
    
    case 'regularized':
      subject = 'Pagamento regularizado!';
      html = generateRegularizedEmail(affiliate, data);
      break;
    
    default:
      return res.status(400).json({ error: 'Tipo de email inválido' });
  }

  // TODO: Integrar com serviço de email (Resend, SendGrid, etc)
  console.log('Email a ser enviado:', {
    to: affiliate.email,
    subject,
    html
  });

  // Criar notificação no painel
  const { error: notificationError } = await supabase
    .from('notifications')
    .insert({
      affiliate_id,
      type,
      title: subject,
      message: extractTextFromHtml(html),
      link: '/afiliados/dashboard/pagamentos'
    });

  if (notificationError) {
    console.error('Erro ao criar notificação:', notificationError);
  }

  return res.status(200).json({
    success: true,
    message: 'Email enviado com sucesso (simulado)'
  });
}

// ============================================
// EMAIL TEMPLATES
// ============================================

function generatePaymentReminderEmail(affiliate, data) {
  const { daysUntilDue, amount, dueDate } = data;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #6366f1; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .button { display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Lembrete de Pagamento</h1>
        </div>
        <div class="content">
          <p>Olá, ${affiliate.name}!</p>
          <p>Este é um lembrete de que seu pagamento vence em <strong>${daysUntilDue} dias</strong>.</p>
          <p><strong>Valor:</strong> R$ ${(amount / 100).toFixed(2)}</p>
          <p><strong>Vencimento:</strong> ${new Date(dueDate).toLocaleDateString('pt-BR')}</p>
          <p>Para evitar a suspensão da sua vitrine, realize o pagamento antes do vencimento.</p>
          <a href="${process.env.FRONTEND_URL}/afiliados/dashboard/pagamentos" class="button">
            Ver Pagamentos
          </a>
        </div>
        <div class="footer">
          <p>Slim Quality - Sistema de Afiliados</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generatePaymentConfirmedEmail(affiliate, data) {
  const { amount, paymentDate } = data;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10b981; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .button { display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✓ Pagamento Confirmado!</h1>
        </div>
        <div class="content">
          <p>Olá, ${affiliate.name}!</p>
          <p>Seu pagamento foi confirmado com sucesso!</p>
          <p><strong>Valor:</strong> R$ ${(amount / 100).toFixed(2)}</p>
          <p><strong>Data:</strong> ${new Date(paymentDate).toLocaleDateString('pt-BR')}</p>
          <p>Obrigado por manter sua assinatura em dia!</p>
          <a href="${process.env.FRONTEND_URL}/afiliados/dashboard/pagamentos" class="button">
            Ver Comprovante
          </a>
        </div>
        <div class="footer">
          <p>Slim Quality - Sistema de Afiliados</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateOverdueEmail(affiliate, data) {
  const { amount, dueDate, daysOverdue } = data;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #ef4444; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .button { display: inline-block; padding: 12px 24px; background: #ef4444; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚠ Pagamento em Atraso</h1>
        </div>
        <div class="content">
          <p>Olá, ${affiliate.name},</p>
          <p>Identificamos que seu pagamento está em atraso há <strong>${daysOverdue} dias</strong>.</p>
          <p><strong>Valor:</strong> R$ ${(amount / 100).toFixed(2)}</p>
          <p><strong>Vencimento:</strong> ${new Date(dueDate).toLocaleDateString('pt-BR')}</p>
          <p><strong>Atenção:</strong> Sua vitrine foi temporariamente desativada. Regularize seu pagamento para reativá-la.</p>
          <a href="${process.env.FRONTEND_URL}/afiliados/dashboard/pagamentos" class="button">
            Regularizar Pagamento
          </a>
        </div>
        <div class="footer">
          <p>Slim Quality - Sistema de Afiliados</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateRegularizedEmail(affiliate, data) {
  const { amount, paymentDate } = data;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10b981; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .button { display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✓ Pagamento Regularizado!</h1>
        </div>
        <div class="content">
          <p>Olá, ${affiliate.name}!</p>
          <p>Seu pagamento foi regularizado com sucesso!</p>
          <p><strong>Valor:</strong> R$ ${(amount / 100).toFixed(2)}</p>
          <p><strong>Data:</strong> ${new Date(paymentDate).toLocaleDateString('pt-BR')}</p>
          <p>Sua vitrine foi reativada e está visível novamente na plataforma.</p>
          <a href="${process.env.FRONTEND_URL}/afiliados/dashboard/loja" class="button">
            Ver Minha Loja
          </a>
        </div>
        <div class="footer">
          <p>Slim Quality - Sistema de Afiliados</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Extrai texto de HTML (para notificações no painel)
 */
function extractTextFromHtml(html) {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 500);
}
