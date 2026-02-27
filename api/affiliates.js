/**
 * API CONSOLIDADA DE AFILIADOS
 * Reduz de 7 para 1 Serverless Function
 * 
 * Rotas:
 * - POST ?action=register
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
    case 'register':
      return handleRegister(req, res, supabase);
    case 'payment-first-validate':
      return handlePaymentFirstValidate(req, res, supabase);
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
    case 'create-asaas-account':
      return handleCreateAsaasAccount(req, res, supabase);
    case 'configure-wallet':
      return handleConfigureWallet(req, res, supabase);
    default:
      return res.status(404).json({ success: false, error: 'Action não encontrada' });
  }
}

// ============================================
// HANDLER: REGISTER
// ============================================
async function handleRegister(req, res, supabase) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Método não permitido. Use POST.' 
    });
  }

  try {
    const { 
      name, 
      email, 
      phone, 
      password, 
      affiliate_type, 
      document, 
      referral_code 
    } = req.body;

    // ============================================
    // VALIDAÇÕES DE CAMPOS OBRIGATÓRIOS
    // ============================================
    
    if (!name || !email || !password || !affiliate_type) {
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios: name, email, password, affiliate_type',
        field: !name ? 'name' : !email ? 'email' : !password ? 'password' : 'affiliate_type'
      });
    }

    // ============================================
    // VALIDAÇÃO DE AFFILIATE_TYPE
    // ============================================
    
    if (!['individual', 'logista'].includes(affiliate_type)) {
      return res.status(400).json({
        success: false,
        error: 'affiliate_type deve ser "individual" ou "logista"',
        field: 'affiliate_type'
      });
    }

    // ============================================
    // VALIDAÇÃO DE DOCUMENT
    // ============================================
    
    // Remover formatação do documento
    const cleanDocument = document ? document.replace(/\D/g, '') : '';

    // Validar comprimento baseado no tipo
    if (affiliate_type === 'individual') {
      if (cleanDocument.length !== 11) {
        return res.status(400).json({
          success: false,
          error: 'CPF deve ter 11 dígitos',
          field: 'document'
        });
      }

      // Validar dígitos verificadores do CPF
      if (!validateCPF(cleanDocument)) {
        return res.status(400).json({
          success: false,
          error: 'CPF inválido. Verifique os dígitos.',
          field: 'document'
        });
      }
    } else if (affiliate_type === 'logista') {
      if (!cleanDocument || cleanDocument.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'CNPJ é obrigatório para Logistas',
          field: 'document'
        });
      }

      if (cleanDocument.length !== 14) {
        return res.status(400).json({
          success: false,
          error: 'CNPJ deve ter 14 dígitos',
          field: 'document'
        });
      }

      // Validar dígitos verificadores do CNPJ
      if (!validateCNPJ(cleanDocument)) {
        return res.status(400).json({
          success: false,
          error: 'CNPJ inválido. Verifique os dígitos.',
          field: 'document'
        });
      }
    }

    // ============================================
    // VERIFICAR DUPLICATAS
    // ============================================
    
    // Verificar se email já existe
    const { data: existingEmail } = await supabase
      .from('affiliates')
      .select('id')
      .eq('email', email)
      .single();

    if (existingEmail) {
      return res.status(409).json({
        success: false,
        error: 'Email já cadastrado',
        field: 'email'
      });
    }

    // Verificar se document já existe
    if (cleanDocument) {
      const { data: existingDocument } = await supabase
        .from('affiliates')
        .select('id')
        .eq('document', cleanDocument)
        .single();

      if (existingDocument) {
        return res.status(409).json({
          success: false,
          error: affiliate_type === 'individual' ? 'CPF já cadastrado' : 'CNPJ já cadastrado',
          field: 'document'
        });
      }
    }

    // ============================================
    // CRIAR USUÁRIO NO SUPABASE AUTH
    // ============================================
    
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        affiliate_type
      }
    });

    if (authError) {
      console.error('Erro ao criar usuário:', authError);
      return res.status(500).json({
        success: false,
        error: 'Erro ao criar usuário. Tente novamente.',
        details: authError.message
      });
    }

    const userId = authData.user.id;

    // ============================================
    // GERAR REFERRAL CODE ÚNICO
    // ============================================
    
    const referralCode = generateReferralCode();

    // ============================================
    // CRIAR REGISTRO NA TABELA AFFILIATES
    // ============================================
    
    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .insert({
        user_id: userId,
        name,
        email,
        phone: phone || null,
        document: cleanDocument,
        document_type: affiliate_type === 'individual' ? 'CPF' : 'CNPJ',
        affiliate_type,
        financial_status: 'financeiro_pendente',
        referral_code: referralCode,
        referred_by: referral_code ? await getReferredBy(supabase, referral_code) : null,
        status: 'pending'
      })
      .select()
      .single();

    if (affiliateError) {
      console.error('Erro ao criar afiliado:', affiliateError);
      
      // Cleanup: deletar usuário criado no Auth
      try {
        await supabase.auth.admin.deleteUser(userId);
      } catch (cleanupError) {
        console.error('Erro ao fazer cleanup do usuário:', cleanupError);
      }

      return res.status(500).json({
        success: false,
        error: 'Erro ao criar registro de afiliado. Tente novamente.',
        details: affiliateError.message
      });
    }

    // ============================================
    // RETORNAR SUCESSO
    // ============================================
    
    return res.status(201).json({
      success: true,
      data: {
        id: affiliate.id,
        name: affiliate.name,
        email: affiliate.email,
        affiliate_type: affiliate.affiliate_type,
        financial_status: affiliate.financial_status,
        referral_code: affiliate.referral_code,
        status: affiliate.status
      }
    });

  } catch (error) {
    console.error('Erro inesperado no registro:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
}

// ============================================
// HANDLER: PAYMENT FIRST VALIDATE
// ============================================
async function handlePaymentFirstValidate(req, res, supabase) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    const { email, name, phone, document, affiliate_type, referral_code, password } = req.body;

    // Validação de campos obrigatórios
    if (!email || !name || !phone || !document || !affiliate_type || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Campos obrigatórios faltando',
        required: ['email', 'name', 'phone', 'document', 'affiliate_type', 'password']
      });
    }

    // Validar tipo de afiliado
    if (!['individual', 'logista'].includes(affiliate_type)) {
      return res.status(400).json({ 
        success: false,
        error: 'Tipo de afiliado inválido' 
      });
    }

    // Remover formatação do documento
    const cleanDocument = document.replace(/[^\d]/g, '');

    // Determinar tipo de documento
    const document_type = cleanDocument.length === 11 ? 'CPF' : 'CNPJ';

    // Validar CPF/CNPJ
    const isValidDocument = document_type === 'CPF' 
      ? validateCPF(cleanDocument) 
      : validateCNPJ(cleanDocument);
      
    if (!isValidDocument) {
      return res.status(400).json({ 
        success: false,
        error: document_type === 'CPF' ? 'CPF inválido' : 'CNPJ inválido' 
      });
    }

    // Verificar duplicatas de email
    const { data: existingEmail } = await supabase
      .from('affiliates')
      .select('id')
      .eq('email', email)
      .is('deleted_at', null)
      .maybeSingle();

    if (existingEmail) {
      return res.status(409).json({ 
        success: false,
        error: 'Email já cadastrado' 
      });
    }

    // Verificar duplicatas de document
    const { data: existingDocument } = await supabase
      .from('affiliates')
      .select('id')
      .eq('document', cleanDocument)
      .is('deleted_at', null)
      .maybeSingle();

    if (existingDocument) {
      return res.status(409).json({ 
        success: false,
        error: document_type === 'CPF' ? 'CPF já cadastrado' : 'CNPJ já cadastrado' 
      });
    }

    // Validar referral_code (se fornecido)
    let referred_by = null;
    if (referral_code) {
      const { data: parent } = await supabase
        .from('affiliates')
        .select('id')
        .eq('referral_code', referral_code)
        .eq('status', 'active')
        .is('deleted_at', null)
        .maybeSingle();

      if (!parent) {
        return res.status(404).json({ 
          success: false,
          error: 'Código de indicação inválido' 
        });
      }
      referred_by = parent.id;
    }

    // Criptografar senha (bcrypt)
    const bcrypt = await import('bcryptjs');
    const password_hash = await bcrypt.hash(password, 10);

    // Criar sessão temporária
    const { data: session, error: sessionError } = await supabase
      .from('payment_sessions')
      .insert({
        email,
        name,
        phone,
        document: cleanDocument,
        document_type,
        affiliate_type,
        referred_by,
        referral_code: referral_code || null,
        password_hash,
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutos
      })
      .select('session_token')
      .single();

    if (sessionError) {
      console.error('Erro ao criar sessão:', sessionError);
      return res.status(500).json({ 
        success: false,
        error: 'Erro ao criar sessão temporária',
        details: sessionError.message
      });
    }

    return res.status(200).json({
      success: true,
      session_token: session.session_token,
      message: 'Dados validados com sucesso',
      data: {
        email,
        name,
        phone,
        document: cleanDocument,
        document_type,
        affiliate_type,
        referral_code: referral_code || null,
        referred_by
      }
    });

  } catch (error) {
    console.error('Erro inesperado na validação:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
}

// ============================================
// FUNÇÕES AUXILIARES PARA REGISTRO
// ============================================

/**
 * Valida CPF brasileiro
 */
function validateCPF(cpf) {
  // Verificar se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  // Calcular primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let digit1 = 11 - (sum % 11);
  if (digit1 >= 10) digit1 = 0;

  // Calcular segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }
  let digit2 = 11 - (sum % 11);
  if (digit2 >= 10) digit2 = 0;

  // Verificar se os dígitos calculados correspondem aos informados
  return (
    parseInt(cpf.charAt(9)) === digit1 &&
    parseInt(cpf.charAt(10)) === digit2
  );
}

/**
 * Valida CNPJ brasileiro
 */
function validateCNPJ(cnpj) {
  // Verificar se todos os dígitos são iguais
  if (/^(\d)\1{13}$/.test(cnpj)) {
    return false;
  }

  // Pesos para cálculo do primeiro dígito
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  // Calcular primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cnpj.charAt(i)) * weights1[i];
  }
  let digit1 = sum % 11;
  digit1 = digit1 < 2 ? 0 : 11 - digit1;

  // Pesos para cálculo do segundo dígito
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  // Calcular segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cnpj.charAt(i)) * weights2[i];
  }
  let digit2 = sum % 11;
  digit2 = digit2 < 2 ? 0 : 11 - digit2;

  // Verificar se os dígitos calculados correspondem aos informados
  return (
    parseInt(cnpj.charAt(12)) === digit1 &&
    parseInt(cnpj.charAt(13)) === digit2
  );
}

/**
 * Gera um código de indicação único
 */
function generateReferralCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Busca o ID do afiliado que indicou (referred_by)
 */
async function getReferredBy(supabase, referralCode) {
  if (!referralCode) return null;

  const { data } = await supabase
    .from('affiliates')
    .select('id')
    .eq('referral_code', referralCode)
    .single();

  return data ? data.id : null;
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
      .select('slug, referral_code, financial_status')
      .eq('id', affiliate.id)
      .single();

    // ETAPA 2: Verificar se afiliado tem status financeiro ativo
    if (affiliateData.financial_status !== 'ativo') {
      return res.status(403).json({
        success: false,
        error: 'Configure sua carteira digital para gerar link de indicação',
        code: 'FINANCIAL_STATUS_PENDING'
      });
    }

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

// ============================================
// HANDLER: CREATE ASAAS ACCOUNT (ETAPA 2)
// ============================================
async function handleCreateAsaasAccount(req, res, supabase) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Método não permitido. Use POST.' 
    });
  }

  try {
    // Autenticar afiliado
    const { user, affiliate } = await authenticateAffiliate(req, supabase);
    if (!affiliate) {
      return res.status(404).json({ 
        success: false, 
        error: 'Afiliado não encontrado' 
      });
    }

    // Buscar dados completos do afiliado
    const { data: affiliateData, error: affiliateError } = await supabase
      .from('affiliates')
      .select('*')
      .eq('id', affiliate.id)
      .single();

    if (affiliateError || !affiliateData) {
      return res.status(404).json({ 
        success: false, 
        error: 'Dados do afiliado não encontrados' 
      });
    }

    // Verificar se já tem wallet configurada
    if (affiliateData.wallet_id) {
      return res.status(400).json({
        success: false,
        error: 'Você já possui uma wallet configurada. Entre em contato com o suporte para alterações.'
      });
    }

    // Extrair dados do body
    const { 
      name, 
      email, 
      cpfCnpj, 
      mobilePhone, 
      incomeValue, 
      address, 
      addressNumber, 
      province, 
      postalCode 
    } = req.body;

    // ============================================
    // VALIDAÇÕES DE CAMPOS OBRIGATÓRIOS
    // ============================================
    
    if (!name || !email || !cpfCnpj || !mobilePhone || !incomeValue || 
        !address || !addressNumber || !province || !postalCode) {
      return res.status(400).json({
        success: false,
        error: 'Todos os campos são obrigatórios',
        field: !name ? 'name' : !email ? 'email' : !cpfCnpj ? 'cpfCnpj' : 
               !mobilePhone ? 'mobilePhone' : !incomeValue ? 'incomeValue' :
               !address ? 'address' : !addressNumber ? 'addressNumber' :
               !province ? 'province' : 'postalCode'
      });
    }

    // Validar formato de CPF/CNPJ
    const cleanDocument = cpfCnpj.replace(/\D/g, '');
    if (cleanDocument.length !== 11 && cleanDocument.length !== 14) {
      return res.status(400).json({
        success: false,
        error: 'CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos',
        field: 'cpfCnpj'
      });
    }

    // Validar formato de CEP
    const cleanPostalCode = postalCode.replace(/\D/g, '');
    if (cleanPostalCode.length !== 8) {
      return res.status(400).json({
        success: false,
        error: 'CEP deve ter 8 dígitos',
        field: 'postalCode'
      });
    }

    // Validar incomeValue
    const income = parseFloat(incomeValue);
    if (isNaN(income) || income <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Renda/Faturamento deve ser um valor positivo',
        field: 'incomeValue'
      });
    }

    // ============================================
    // INTEGRAÇÃO COM API ASAAS
    // ============================================
    
    const asaasApiKey = process.env.ASAAS_API_KEY;
    if (!asaasApiKey) {
      console.error('[CreateAsaasAccount] ASAAS_API_KEY não configurada');
      return res.status(500).json({
        success: false,
        error: 'Configuração do servidor incompleta'
      });
    }

    // Montar payload para API Asaas
    const asaasPayload = {
      name,
      email,
      cpfCnpj: cleanDocument,
      mobilePhone,
      incomeValue: income,
      address,
      addressNumber,
      province,
      postalCode: cleanPostalCode
    };

    console.log('[CreateAsaasAccount] Enviando requisição para Asaas:', { email, cpfCnpj: cleanDocument });

    // Fazer requisição para API Asaas
    const asaasResponse = await fetch('https://api.asaas.com/v3/accounts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': asaasApiKey
      },
      body: JSON.stringify(asaasPayload)
    });

    const asaasData = await asaasResponse.json();

    // Tratar erros da API Asaas
    if (!asaasResponse.ok) {
      console.error('[CreateAsaasAccount] Erro da API Asaas:', asaasData);

      // Erro 409: Email ou CPF/CNPJ já cadastrado
      if (asaasResponse.status === 409) {
        return res.status(409).json({
          success: false,
          error: 'Email ou CPF/CNPJ já cadastrado no Asaas. Use a opção "Já tenho conta".'
        });
      }

      // Erro 400: Validação de campos
      if (asaasResponse.status === 400) {
        const errorMessage = asaasData.errors?.[0]?.description || 'Dados inválidos';
        return res.status(400).json({
          success: false,
          error: errorMessage,
          field: asaasData.errors?.[0]?.field
        });
      }

      // Outros erros
      return res.status(500).json({
        success: false,
        error: 'Erro ao criar conta no Asaas. Tente novamente.',
        details: asaasData.errors?.[0]?.description
      });
    }

    // Extrair walletId (UUID) e apiKey da resposta
    const walletId = asaasData.walletId;
    const apiKey = asaasData.apiKey;

    if (!walletId) {
      console.error('[CreateAsaasAccount] walletId não retornado pela API Asaas:', asaasData);
      return res.status(500).json({
        success: false,
        error: 'Erro ao obter Wallet ID da conta criada'
      });
    }

    console.log('[CreateAsaasAccount] Conta criada com sucesso:', { 
      walletId, 
      accountId: asaasData.id,
      hasApiKey: !!apiKey 
    });

    // ============================================
    // RETORNAR SUCESSO
    // ============================================
    
    return res.status(201).json({
      success: true,
      data: {
        walletId,
        accountId: asaasData.id,
        apiKey: apiKey || undefined,
        message: 'Conta criada com sucesso'
      }
    });

  } catch (error) {
    console.error('[CreateAsaasAccount] Erro inesperado:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
}

// ============================================
// HANDLER: CONFIGURE WALLET (ETAPA 2)
// ============================================
async function handleConfigureWallet(req, res, supabase) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Método não permitido. Use POST.' 
    });
  }

  try {
    // Autenticar afiliado
    const { user, affiliate } = await authenticateAffiliate(req, supabase);
    if (!affiliate) {
      return res.status(404).json({ 
        success: false, 
        error: 'Afiliado não encontrado' 
      });
    }

    // Buscar dados completos do afiliado
    const { data: affiliateData, error: affiliateError } = await supabase
      .from('affiliates')
      .select('*')
      .eq('id', affiliate.id)
      .single();

    if (affiliateError || !affiliateData) {
      return res.status(404).json({ 
        success: false, 
        error: 'Dados do afiliado não encontrados' 
      });
    }

    // Verificar se já tem wallet configurada
    if (affiliateData.wallet_id) {
      return res.status(400).json({
        success: false,
        error: 'Você já possui uma wallet configurada. Entre em contato com o suporte para alterações.'
      });
    }

    // Extrair walletId do body
    const { walletId } = req.body;

    if (!walletId) {
      return res.status(400).json({
        success: false,
        error: 'Wallet ID é obrigatório',
        field: 'walletId'
      });
    }

    // ============================================
    // VALIDAÇÃO DE FORMATO UUID
    // ============================================
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    
    if (!uuidRegex.test(walletId)) {
      return res.status(400).json({
        success: false,
        error: 'Formato de Wallet ID inválido. Use formato UUID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
        field: 'walletId'
      });
    }

    // ============================================
    // VERIFICAR DUPLICAÇÃO (CONSTRAINT UNIQUE)
    // ============================================
    
    const { data: existingWallet } = await supabase
      .from('affiliates')
      .select('id')
      .eq('wallet_id', walletId)
      .is('deleted_at', null)
      .single();

    if (existingWallet) {
      return res.status(409).json({
        success: false,
        error: 'Esta wallet já está cadastrada para outro afiliado.'
      });
    }

    // ============================================
    // ATUALIZAR AFILIADO (TRANSAÇÃO ATÔMICA)
    // ============================================
    
    const now = new Date().toISOString();
    
    const { data: updatedAffiliate, error: updateError } = await supabase
      .from('affiliates')
      .update({
        wallet_id: walletId,
        financial_status: 'ativo',
        wallet_configured_at: now,
        onboarding_completed: true,
        updated_at: now
      })
      .eq('id', affiliate.id)
      .select()
      .single();

    if (updateError) {
      console.error('[ConfigureWallet] Erro ao atualizar afiliado:', updateError);
      
      // Verificar se é erro de constraint UNIQUE
      if (updateError.code === '23505') {
        return res.status(409).json({
          success: false,
          error: 'Esta wallet já está cadastrada para outro afiliado.'
        });
      }
      
      return res.status(500).json({
        success: false,
        error: 'Erro ao configurar wallet. Tente novamente.',
        details: updateError.message
      });
    }

    console.log('[ConfigureWallet] Wallet configurada com sucesso:', {
      affiliateId: affiliate.id,
      walletId,
      financial_status: 'ativo'
    });

    // ============================================
    // RETORNAR SUCESSO
    // ============================================
    
    return res.status(200).json({
      success: true,
      data: {
        affiliateId: updatedAffiliate.id,
        walletId: updatedAffiliate.wallet_id,
        financial_status: updatedAffiliate.financial_status,
        message: 'Wallet configurada com sucesso'
      }
    });

  } catch (error) {
    console.error('[ConfigureWallet] Erro inesperado:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
}
