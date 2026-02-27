import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const { action } = req.query;
  
  try {
    switch (action) {
      case 'list':
        return await handleList(req, res);
      case 'mark-read':
        return await handleMarkRead(req, res);
      case 'mark-all-read':
        return await handleMarkAllRead(req, res);
      case 'send-email':
        return await handleSendEmail(req, res);
      default:
        return res.status(404).json({ error: 'Action não encontrada' });
    }
  } catch (error) {
    console.error('Erro na API de notificações:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
}

/**
 * Lista notificações do afiliado logado
 */
async function handleList(req, res) {
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
async function handleMarkRead(req, res) {
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
async function handleMarkAllRead(req, res) {
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
 * Integração com Resend (ou outro serviço de email)
 */
async function handleSendEmail(req, res) {
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
  // Por enquanto, apenas log
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

/**
 * Templates de email
 */
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
