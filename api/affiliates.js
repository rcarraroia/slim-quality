/**
 * API CONSOLIDADA DE AFILIADOS
 * Reduz de 7 para 1 Serverless Function
 * 
 * Rotas:
 * - GET  ?action=balance
 * - POST ?action=export
 * - GET  ?action=referral-link
 * - GET  ?action=sales
 * - GET  ?action=stats
 * - GET  ?action=withdrawals
 * - POST ?action=withdrawals
 * - GET  ?action=notifications
 * - POST ?action=notifications
 */

import { createClient } from '@supabase/supabase-js';

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
    case 'balance':
      return handleBalance(req, res, supabase);
    case 'export':
      return handleExport(req, res, supabase);
    case 'referral-link':
      return handleReferralLink(req, res, supabase);
    case 'sales':
      return handleSales(req, res, supabase);
    case 'stats':
      return handleStats(req, res, supabase);
    case 'withdrawals':
      return handleWithdrawals(req, res, supabase);
    case 'notifications':
      return handleNotifications(req, res, supabase);
    default:
      return res.status(404).json({ success: false, error: 'Action não encontrada' });
  }
}

// ============================================
// HANDLER: BALANCE
// ============================================
async function handleBalance(req, res, supabase) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  try {
    const { user, affiliate } = await authenticateAffiliate(req, supabase);
    if (!affiliate) {
      return res.status(404).json({ success: false, error: 'Afiliado não encontrado' });
    }

    const { data: paidCommissions } = await supabase
      .from('commissions')
      .select('commission_value_cents')
      .eq('affiliate_id', affiliate.id)
      .eq('status', 'paid');

    const totalPaid = paidCommissions?.reduce((sum, c) => sum + (c.commission_value_cents || 0), 0) || 0;

    const { data: pendingCommissions } = await supabase
      .from('commissions')
      .select('commission_value_cents')
      .eq('affiliate_id', affiliate.id)
      .eq('status', 'pending');

    const totalPending = pendingCommissions?.reduce((sum, c) => sum + (c.commission_value_cents || 0), 0) || 0;

    const { data: completedWithdrawals } = await supabase
      .from('withdrawals')
      .select('amount_cents')
      .eq('affiliate_id', affiliate.id)
      .eq('status', 'completed')
      .is('deleted_at', null);

    const totalWithdrawn = completedWithdrawals?.reduce((sum, w) => sum + (w.amount_cents || 0), 0) || 0;

    const available = totalPaid - totalWithdrawn;
    const blocked = totalPending;
    const total = available + blocked;

    return res.status(200).json({
      success: true,
      data: { available, blocked, total, lastUpdate: new Date().toISOString() }
    });
  } catch (error) {
    console.error('[Balance] Erro:', error);
    return res.status(500).json({ success: false, error: 'Erro ao buscar saldo' });
  }
}

// ============================================
// HANDLER: EXPORT
// ============================================
async function handleExport(req, res, supabase) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  try {
    const { user, affiliate } = await authenticateAffiliate(req, supabase);
    if (!affiliate) {
      return res.status(404).json({ success: false, error: 'Afiliado não encontrado' });
    }

    const { type, startDate, endDate } = req.body;

    if (!type || !['commissions', 'withdrawals', 'network'].includes(type)) {
      return res.status(400).json({ success: false, error: 'Tipo inválido' });
    }

    let csvData = '';
    let filename = '';

    switch (type) {
      case 'commissions':
        const commissionsResult = await generateCommissionsCSV(supabase, affiliate.id, startDate, endDate);
        csvData = commissionsResult.csv;
        filename = `comissoes_${new Date().toISOString().split('T')[0]}.csv`;
        break;
      case 'withdrawals':
        const withdrawalsResult = await generateWithdrawalsCSV(supabase, affiliate.id, startDate, endDate);
        csvData = withdrawalsResult.csv;
        filename = `saques_${new Date().toISOString().split('T')[0]}.csv`;
        break;
      case 'network':
        const networkResult = await generateNetworkCSV(supabase, affiliate.id);
        csvData = networkResult.csv;
        filename = `rede_${new Date().toISOString().split('T')[0]}.csv`;
        break;
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send('\uFEFF' + csvData);
  } catch (error) {
    console.error('[Export] Erro:', error);
    return res.status(500).json({ success: false, error: 'Erro ao gerar relatório' });
  }
}

// ============================================
// HANDLER: REFERRAL LINK
// ============================================
async function handleReferralLink(req, res, supabase) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  try {
    const { user, affiliate } = await authenticateAffiliate(req, supabase);
    if (!affiliate) {
      return res.status(404).json({ success: false, error: 'Afiliado não encontrado' });
    }

    const { data: affiliateData } = await supabase
      .from('affiliates')
      .select('slug, referral_code')
      .eq('id', affiliate.id)
      .single();

    const identifier = affiliateData.slug || affiliateData.referral_code;
    const baseUrl = 'https://slimquality.com.br';
    const link = `${baseUrl}?ref=${identifier}`;
    const qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(link)}`;

    return res.status(200).json({
      success: true,
      data: { link, qrCode, referralCode: affiliateData.referral_code, slug: affiliateData.slug || undefined }
    });
  } catch (error) {
    console.error('[ReferralLink] Erro:', error);
    return res.status(500).json({ success: false, error: 'Erro ao gerar link' });
  }
}

// ============================================
// HANDLER: SALES
// ============================================
async function handleSales(req, res, supabase) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  try {
    const { user, affiliate } = await authenticateAffiliate(req, supabase);
    if (!affiliate) {
      return res.status(404).json({ success: false, error: 'Afiliado não encontrado' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { data: commissions, error, count } = await supabase
      .from('commissions')
      .select(`id, commission_value_cents, level, status, created_at, order_id,
        orders (id, total_cents, status, created_at, customers (name))`, { count: 'exact' })
      .eq('affiliate_id', affiliate.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const sales = (commissions || []).map(c => ({
      id: c.id,
      orderId: c.orders?.id || c.order_id,
      createdAt: c.orders?.created_at || c.created_at,
      customerName: c.orders?.customers?.name || 'Cliente não informado',
      productName: 'Slim Quality',
      totalValue: (c.orders?.total_cents || 0) / 100,
      commissionValue: (c.commission_value_cents || 0) / 100,
      level: `N${c.level || 1}`,
      status: c.orders?.status || c.status
    }));

    const totalValue = sales.reduce((sum, s) => sum + s.totalValue, 0);
    const totalCommissions = sales.reduce((sum, s) => sum + s.commissionValue, 0);

    return res.status(200).json({
      success: true,
      data: {
        sales,
        pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) },
        summary: { totalSales: count || 0, totalValue, totalCommissions }
      }
    });
  } catch (error) {
    console.error('[Sales] Erro:', error);
    return res.status(500).json({ success: false, error: 'Erro ao buscar vendas' });
  }
}

// ============================================
// HANDLER: STATS
// ============================================
async function handleStats(req, res, supabase) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  try {
    const { user, affiliate } = await authenticateAffiliate(req, supabase);
    if (!affiliate) {
      return res.status(404).json({ success: false, error: 'Afiliado não encontrado' });
    }

    const { data: affiliateData } = await supabase
      .from('affiliates')
      .select('id, total_clicks, total_conversions, total_commissions_cents, created_at')
      .eq('id', affiliate.id)
      .single();

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const { data: commissions } = await supabase
      .from('commissions')
      .select('commission_value_cents, level, status, created_at, paid_at')
      .eq('affiliate_id', affiliate.id)
      .gte('created_at', twelveMonthsAgo.toISOString())
      .order('created_at', { ascending: true });

    const { data: clicks } = await supabase
      .from('referral_clicks')
      .select('clicked_at')
      .eq('affiliate_id', affiliate.id)
      .gte('clicked_at', twelveMonthsAgo.toISOString())
      .order('clicked_at', { ascending: true });

    const { data: conversions } = await supabase
      .from('referral_conversions')
      .select('converted_at, order_value_cents')
      .eq('affiliate_id', affiliate.id)
      .gte('converted_at', twelveMonthsAgo.toISOString())
      .order('converted_at', { ascending: true });

    const { data: networkGrowth } = await supabase
      .from('affiliates')
      .select('created_at, referred_by')
      .eq('referred_by', affiliate.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    const performanceData = processPerformanceData(commissions || [], clicks || [], conversions || []);
    const conversionFunnel = processConversionFunnel(
      affiliateData.total_clicks || 0,
      affiliateData.total_conversions || 0,
      commissions || []
    );
    const networkGrowthData = processNetworkGrowth(networkGrowth || []);

    const overview = {
      totalClicks: affiliateData.total_clicks || 0,
      totalConversions: affiliateData.total_conversions || 0,
      totalCommissions: (affiliateData.total_commissions_cents || 0) / 100,
      conversionRate: affiliateData.total_clicks > 0 
        ? ((affiliateData.total_conversions / affiliateData.total_clicks) * 100).toFixed(2)
        : '0.00',
      avgCommission: affiliateData.total_conversions > 0
        ? ((affiliateData.total_commissions_cents / 100) / affiliateData.total_conversions).toFixed(2)
        : '0.00',
      memberSince: affiliateData.created_at
    };

    return res.status(200).json({
      success: true,
      data: { overview, performance: performanceData, conversionFunnel, networkGrowth: networkGrowthData }
    });
  } catch (error) {
    console.error('[Stats] Erro:', error);
    return res.status(500).json({ success: false, error: 'Erro ao buscar estatísticas' });
  }
}

// ============================================
// HANDLER: WITHDRAWALS
// ============================================
async function handleWithdrawals(req, res, supabase) {
  try {
    const { user, affiliate } = await authenticateAffiliate(req, supabase);
    if (!affiliate) {
      return res.status(404).json({ success: false, error: 'Afiliado não encontrado' });
    }

    if (req.method === 'GET') {
      const { page = 1, limit = 20, status, startDate, endDate } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      let query = supabase
        .from('withdrawals')
        .select('*', { count: 'exact' })
        .eq('affiliate_id', affiliate.id)
        .is('deleted_at', null);

      if (status) query = query.eq('status', status);
      if (startDate) query = query.gte('created_at', startDate);
      if (endDate) query = query.lte('created_at', endDate);

      const { data: withdrawals, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + parseInt(limit) - 1);

      if (error) {
        console.error('[Withdrawals] Erro ao buscar dados:', error);
        throw error;
      }

      const totalCompleted = withdrawals?.filter(w => w.status === 'completed').reduce((sum, w) => sum + w.amount_cents, 0) || 0;
      const totalPending = withdrawals?.filter(w => w.status === 'processing').reduce((sum, w) => sum + w.amount_cents, 0) || 0;
      const totalRejected = withdrawals?.filter(w => w.status === 'rejected').reduce((sum, w) => sum + w.amount_cents, 0) || 0;

      return res.status(200).json({
        success: true,
        data: {
          withdrawals: withdrawals || [],
          pagination: { page: parseInt(page), limit: parseInt(limit), total: count || 0, totalPages: Math.ceil((count || 0) / parseInt(limit)) },
          summary: { totalCompleted, totalPending, totalRejected }
        }
      });
    } else if (req.method === 'POST') {
      const { amount, pixKey, description } = req.body;

      if (!amount || amount < 50) {
        return res.status(400).json({ success: false, error: 'Valor mínimo de saque é R$ 50' });
      }

      if (!pixKey) {
        return res.status(400).json({ success: false, error: 'Chave PIX é obrigatória' });
      }

      const { data: withdrawal, error } = await supabase
        .from('withdrawals')
        .insert({
          affiliate_id: affiliate.id,
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
    }

    return res.status(405).json({ success: false, error: 'Método não permitido' });
  } catch (error) {
    console.error('[Withdrawals] Erro:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Erro ao processar saque',
      details: error.message 
    });
  }
}

// ============================================
// HANDLER: NOTIFICATIONS
// ============================================
async function handleNotifications(req, res, supabase) {
  try {
    console.log('[Notifications] Iniciando handler', { query: req.query, method: req.method });
    
    const { user, affiliate } = await authenticateAffiliate(req, supabase);
    if (!affiliate) {
      console.log('[Notifications] Afiliado não encontrado');
      return res.status(404).json({ success: false, error: 'Afiliado não encontrado' });
    }

    const { subaction, id, limit = 50 } = req.query;
    console.log('[Notifications] Subaction:', subaction, 'Affiliate ID:', affiliate.id);

    // Roteamento por subaction
    switch (subaction) {
      case 'list':
        return handleNotificationsList(req, res, supabase, affiliate, limit);
      case 'unread-count':
        return handleNotificationsUnreadCount(req, res, supabase, affiliate);
      case 'mark-read':
        return handleNotificationsMarkRead(req, res, supabase, affiliate, id);
      case 'mark-all-read':
        return handleNotificationsMarkAllRead(req, res, supabase, affiliate);
      case 'preferences':
        return handleNotificationsPreferences(req, res, supabase, affiliate);
      default:
        console.log('[Notifications] Subaction não reconhecida, usando fallback para preferências');
        // Fallback para preferências (compatibilidade)
        return handleNotificationsPreferences(req, res, supabase, affiliate);
    }
  } catch (error) {
    console.error('[Notifications] Erro:', error);
    return res.status(500).json({ success: false, error: 'Erro ao processar notificações', details: error.message });
  }
}

// Subhandler: List notifications
async function handleNotificationsList(req, res, supabase, affiliate, limit) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  const { data: notifications, error } = await supabase
    .from('notification_logs')
    .select('id, type, data, sent_at, read_at')
    .eq('affiliate_id', affiliate.id)
    .order('sent_at', { ascending: false })
    .limit(parseInt(limit));

  if (error) throw error;

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
}

// Subhandler: Unread count
async function handleNotificationsUnreadCount(req, res, supabase, affiliate) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

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
}

// Subhandler: Mark as read
async function handleNotificationsMarkRead(req, res, supabase, affiliate, notificationId) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  if (!notificationId) {
    return res.status(400).json({ success: false, error: 'ID da notificação é obrigatório' });
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

  const { error: updateError } = await supabase
    .from('notification_logs')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId);

  if (updateError) throw updateError;

  return res.status(200).json({
    success: true,
    message: 'Notificação marcada como lida'
  });
}

// Subhandler: Mark all as read
async function handleNotificationsMarkAllRead(req, res, supabase, affiliate) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

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
}

// Subhandler: Preferences (mantido para compatibilidade)
async function handleNotificationsPreferences(req, res, supabase, affiliate) {
  if (req.method === 'GET') {
    const { data: preferences, error: preferencesError } = await supabase
      .from('affiliate_notification_preferences')
      .select('*')
      .eq('affiliate_id', affiliate.id)
      .maybeSingle();

    if (preferencesError && preferencesError.code !== 'PGRST116') {
      throw preferencesError;
    }

    if (!preferences) {
      return res.status(200).json({
        success: true,
        data: {
          email_commissions: true,
          email_monthly_report: true,
          email_new_affiliates: true,
          email_promotions: false,
          whatsapp_commissions: false,
          whatsapp_monthly_report: false
        }
      });
    }

    return res.status(200).json({ success: true, data: preferences });
  } else if (req.method === 'POST') {
    const {
      email_commissions,
      email_monthly_report,
      email_new_affiliates,
      email_promotions,
      whatsapp_commissions,
      whatsapp_monthly_report
    } = req.body;

    if (
      typeof email_commissions !== 'boolean' ||
      typeof email_monthly_report !== 'boolean' ||
      typeof email_new_affiliates !== 'boolean' ||
      typeof email_promotions !== 'boolean'
    ) {
      return res.status(400).json({ success: false, error: 'Dados inválidos' });
    }

    const preferencesData = {
      affiliate_id: affiliate.id,
      email_commissions,
      email_monthly_report,
      email_new_affiliates,
      email_promotions,
      whatsapp_commissions: whatsapp_commissions || false,
      whatsapp_monthly_report: whatsapp_monthly_report || false,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('affiliate_notification_preferences')
      .upsert(preferencesData, { onConflict: 'affiliate_id', returning: 'representation' })
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({ success: true, message: 'Preferências salvas com sucesso', data });
  }

  return res.status(405).json({ success: false, error: 'Método não permitido' });
}

// Helper: Get title by type
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

// Helper: Get message by type
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
// HELPER: PROCESS PERFORMANCE DATA
// ============================================
function processPerformanceData(commissions, clicks, conversions) {
  const monthlyData = {};

  commissions.forEach(c => {
    const month = new Date(c.created_at).toISOString().slice(0, 7);
    if (!monthlyData[month]) {
      monthlyData[month] = { month, commissions: 0, clicks: 0, conversions: 0 };
    }
    monthlyData[month].commissions += (c.commission_value_cents || 0) / 100;
  });

  clicks.forEach(c => {
    const month = new Date(c.clicked_at).toISOString().slice(0, 7);
    if (!monthlyData[month]) {
      monthlyData[month] = { month, commissions: 0, clicks: 0, conversions: 0 };
    }
    monthlyData[month].clicks += 1;
  });

  conversions.forEach(c => {
    const month = new Date(c.converted_at).toISOString().slice(0, 7);
    if (!monthlyData[month]) {
      monthlyData[month] = { month, commissions: 0, clicks: 0, conversions: 0 };
    }
    monthlyData[month].conversions += 1;
  });

  return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
}

// ============================================
// HELPER: PROCESS CONVERSION FUNNEL
// ============================================
function processConversionFunnel(totalClicks, totalConversions, commissions) {
  const paidCommissions = commissions.filter(c => c.status === 'paid').length;

  return [
    { stage: 'Cliques', value: totalClicks, percentage: 100 },
    { 
      stage: 'Conversões', 
      value: totalConversions, 
      percentage: totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(1) : 0 
    },
    { 
      stage: 'Comissões Pagas', 
      value: paidCommissions, 
      percentage: totalConversions > 0 ? ((paidCommissions / totalConversions) * 100).toFixed(1) : 0 
    }
  ];
}

// ============================================
// HELPER: PROCESS NETWORK GROWTH
// ============================================
function processNetworkGrowth(networkData) {
  const monthlyGrowth = {};

  networkData.forEach(n => {
    const month = new Date(n.created_at).toISOString().slice(0, 7);
    if (!monthlyGrowth[month]) {
      monthlyGrowth[month] = { month, newAffiliates: 0 };
    }
    monthlyGrowth[month].newAffiliates += 1;
  });

  let accumulated = 0;
  const result = Object.values(monthlyGrowth)
    .sort((a, b) => a.month.localeCompare(b.month))
    .map(item => {
      accumulated += item.newAffiliates;
      return { ...item, total: accumulated };
    });

  return result;
}

// ============================================
// HELPER: GENERATE COMMISSIONS CSV
// ============================================
async function generateCommissionsCSV(supabase, affiliateId, startDate, endDate) {
  let query = supabase
    .from('commissions')
    .select(`id, commission_value_cents, level, status, created_at, paid_at, order_id,
      orders (id, total_cents, status, customers (name))`)
    .eq('affiliate_id', affiliateId)
    .order('created_at', { ascending: false });

  if (startDate) query = query.gte('created_at', startDate);
  if (endDate) query = query.lte('created_at', endDate);

  const { data: commissions, error } = await query;
  if (error) throw new Error(`Erro ao buscar comissões: ${error.message}`);

  const header = 'ID,Data,Cliente,Pedido,Valor Pedido,Comissão,Nível,Status,Data Pagamento\n';
  const rows = (commissions || []).map(c => {
    const date = new Date(c.created_at).toLocaleDateString('pt-BR');
    const customerName = c.orders?.customers?.name || 'N/A';
    const orderId = c.orders?.id || c.order_id || 'N/A';
    const orderValue = c.orders?.total_cents ? (c.orders.total_cents / 100).toFixed(2) : '0.00';
    const commission = (c.commission_value_cents / 100).toFixed(2);
    const level = `N${c.level}`;
    const status = c.status === 'paid' ? 'Pago' : c.status === 'pending' ? 'Pendente' : 'Cancelado';
    const paidDate = c.paid_at ? new Date(c.paid_at).toLocaleDateString('pt-BR') : '-';

    return `${c.id},"${date}","${customerName}","${orderId}","R$ ${orderValue}","R$ ${commission}","${level}","${status}","${paidDate}"`;
  }).join('\n');

  return { csv: header + rows };
}

// ============================================
// HELPER: GENERATE WITHDRAWALS CSV
// ============================================
async function generateWithdrawalsCSV(supabase, affiliateId, startDate, endDate) {
  let query = supabase
    .from('withdrawals')
    .select('*')
    .eq('affiliate_id', affiliateId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (startDate) query = query.gte('created_at', startDate);
  if (endDate) query = query.lte('created_at', endDate);

  const { data: withdrawals, error } = await query;
  if (error) throw new Error(`Erro ao buscar saques: ${error.message}`);

  const header = 'ID,Data Solicitação,Valor,Chave PIX,Status,Data Processamento,Observações\n';
  const rows = (withdrawals || []).map(w => {
    const date = new Date(w.created_at).toLocaleDateString('pt-BR');
    const amount = (w.amount_cents / 100).toFixed(2);
    const pixKey = w.pix_key || 'N/A';
    const status = w.status === 'completed' ? 'Concluído' : 
                   w.status === 'processing' ? 'Processando' : 
                   w.status === 'rejected' ? 'Rejeitado' : 'Pendente';
    const processedDate = w.processed_at ? new Date(w.processed_at).toLocaleDateString('pt-BR') : '-';
    const notes = w.notes || '-';

    return `${w.id},"${date}","R$ ${amount}","${pixKey}","${status}","${processedDate}","${notes}"`;
  }).join('\n');

  return { csv: header + rows };
}

// ============================================
// HELPER: GENERATE NETWORK CSV
// ============================================
async function generateNetworkCSV(supabase, affiliateId) {
  const { data: n1List } = await supabase
    .from('affiliates')
    .select('id, name, email, referral_code, status, total_commissions_cents, created_at')
    .eq('referred_by', affiliateId)
    .is('deleted_at', null);

  const network = [];

  if (n1List && n1List.length > 0) {
    for (const n1 of n1List) {
      network.push({ ...n1, level: 'N1', parent: 'Você' });

      const { data: n2List } = await supabase
        .from('affiliates')
        .select('id, name, email, referral_code, status, total_commissions_cents, created_at')
        .eq('referred_by', n1.id)
        .is('deleted_at', null);

      if (n2List && n2List.length > 0) {
        for (const n2 of n2List) {
          network.push({ ...n2, level: 'N2', parent: n1.name });
        }
      }
    }
  }

  const header = 'Nome,Email,Código,Nível,Indicado Por,Status,Total Comissões,Data Cadastro\n';
  const rows = network.map(n => {
    const name = n.name || 'N/A';
    const email = n.email || 'N/A';
    const code = n.referral_code || 'N/A';
    const level = n.level;
    const parent = n.parent;
    const status = n.status === 'active' ? 'Ativo' : 
                   n.status === 'pending' ? 'Pendente' : 
                   n.status === 'inactive' ? 'Inativo' : 'Suspenso';
    const totalCommissions = (n.total_commissions_cents / 100).toFixed(2);
    const date = new Date(n.created_at).toLocaleDateString('pt-BR');

    return `"${name}","${email}","${code}","${level}","${parent}","${status}","R$ ${totalCommissions}","${date}"`;
  }).join('\n');

  return { csv: header + rows };
}
