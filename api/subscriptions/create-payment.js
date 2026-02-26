/**
 * API DE PAGAMENTOS E ASSINATURAS
 * Gerencia cobranças de taxa de adesão e mensalidades
 * 
 * Actions:
 * - POST ?action=create-membership-payment (criar cobrança de adesão)
 * - POST ?action=create-subscription (criar assinatura mensal - Logista)
 * - POST ?action=cancel-subscription (cancelar assinatura)
 * - GET  ?action=get-history (histórico de pagamentos)
 * - GET  ?action=get-receipt (comprovante de pagamento)
 */

import { createClient } from '@supabase/supabase-js';

// Constantes de comissionamento
const COMMISSION_RATES = {
  SLIM: 0.10,      // 10% para Slim Quality
  SELLER: 0.15,    // 15% para N1
  N1: 0.03,        // 3% para N2
  N2: 0.02,        // 2% para N3
  RENUM: 0.05,     // 5% base para Renum
  JB: 0.05         // 5% base para JB
};

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
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
    case 'create-membership-payment':
      return handleCreateMembershipPayment(req, res, supabase);
    case 'create-subscription':
      return handleCreateSubscription(req, res, supabase);
    case 'cancel-subscription':
      return handleCancelSubscription(req, res, supabase);
    case 'get-history':
      return handleGetHistory(req, res, supabase);
    case 'get-receipt':
      return handleGetReceipt(req, res, supabase);
    default:
      return res.status(404).json({ success: false, error: 'Action não encontrada' });
  }
}

// ============================================
// FUNÇÃO AUXILIAR: CALCULAR SPLIT
// ============================================
// REGRAS DE COMISSIONAMENTO (Taxas de Adesão e Mensalidades):
// - Slim Quality: 10% (recebe automaticamente, NÃO entra no array de splits)
// - N1: 15% (se ativo e com wallet)
// - N2: 3% (se ativo e com wallet)
// - N3: 2% (se ativo e com wallet)
// - Renum e JB: Dividem 50/50 o restante dos 90% após pagar a rede
// 
// IMPORTANTE: Segundo documentação Asaas, a conta principal (Slim) recebe
// automaticamente o que sobrar após os splits. NÃO incluir no array!
// ============================================
async function calculateSplit(supabase, affiliateId, paymentValue) {
  // Buscar wallet IDs dos gestores (apenas Renum e JB)
  const renumWalletId = process.env.ASAAS_WALLET_RENUM;
  const jbWalletId = process.env.ASAAS_WALLET_JB;

  if (!renumWalletId || !jbWalletId) {
    throw new Error('Wallet IDs dos gestores (Renum e JB) não configuradas');
  }

  // Buscar afiliado N1 e sua rede
  const { data: n1Affiliate } = await supabase
    .from('affiliates')
    .select('id, referred_by, wallet_id, payment_status')
    .eq('id', affiliateId)
    .is('deleted_at', null)
    .single();

  if (!n1Affiliate) {
    throw new Error('Afiliado não encontrado');
  }

  const n1IsActive = n1Affiliate.payment_status === 'active' && n1Affiliate.wallet_id;

  // Buscar N2 e N3
  let n2Affiliate = null;
  let n3Affiliate = null;
  let n2IsActive = false;
  let n3IsActive = false;

  if (n1Affiliate.referred_by) {
    const { data: n2Data } = await supabase
      .from('affiliates')
      .select('id, referred_by, wallet_id, payment_status')
      .eq('id', n1Affiliate.referred_by)
      .is('deleted_at', null)
      .single();

    n2Affiliate = n2Data;
    n2IsActive = n2Affiliate?.payment_status === 'active' && n2Affiliate?.wallet_id;

    if (n2Affiliate?.referred_by) {
      const { data: n3Data } = await supabase
        .from('affiliates')
        .select('id, referred_by, wallet_id, payment_status')
        .eq('id', n2Affiliate.referred_by)
        .is('deleted_at', null)
        .single();

      n3Affiliate = n3Data;
      n3IsActive = n3Affiliate?.payment_status === 'active' && n3Affiliate?.wallet_id;
    }
  }

  // Calcular percentuais da rede de afiliados
  const n1Percentage = n1IsActive ? COMMISSION_RATES.SELLER * 100 : 0; // 15% ou 0
  const n2Percentage = n2IsActive ? COMMISSION_RATES.N1 * 100 : 0;      // 3% ou 0
  const n3Percentage = n3IsActive ? COMMISSION_RATES.N2 * 100 : 0;      // 2% ou 0

  // Calcular quanto da rede foi usado
  const networkPercentage = n1Percentage + n2Percentage + n3Percentage;

  // Calcular quanto sobra dos 90% para Renum e JB
  // Total disponível para split: 90% (Slim fica com 10% automaticamente)
  // Após pagar a rede, o restante vai para Renum e JB (50/50)
  const remainingPercentage = 90 - networkPercentage;
  const renumPercentage = remainingPercentage / 2;
  const jbPercentage = remainingPercentage / 2;

  // Montar array de splits (apenas quem entra no split do Asaas)
  const splits = [];

  // N1 (apenas se ativo e com wallet)
  if (n1IsActive) {
    splits.push({
      walletId: n1Affiliate.wallet_id,
      percentualValue: Math.round(n1Percentage * 100) / 100
    });
  }

  // N2 (apenas se ativo e com wallet)
  if (n2IsActive) {
    splits.push({
      walletId: n2Affiliate.wallet_id,
      percentualValue: Math.round(n2Percentage * 100) / 100
    });
  }

  // N3 (apenas se ativo e com wallet)
  if (n3IsActive) {
    splits.push({
      walletId: n3Affiliate.wallet_id,
      percentualValue: Math.round(n3Percentage * 100) / 100
    });
  }

  // Renum (sempre recebe)
  splits.push({
    walletId: renumWalletId,
    percentualValue: Math.round(renumPercentage * 100) / 100
  });

  // JB (sempre recebe)
  splits.push({
    walletId: jbWalletId,
    percentualValue: Math.round(jbPercentage * 100) / 100
  });

  // Validar que soma = 90% (não 100%, pois Slim recebe 10% automaticamente)
  const totalPercentage = splits.reduce((sum, s) => sum + s.percentualValue, 0);
  const expectedTotal = 90;
  const diff = Math.abs(totalPercentage - expectedTotal);

  if (diff > 0.01) {
    // Ajustar último split (JB) para compensar arredondamento
    const lastSplit = splits[splits.length - 1];
    lastSplit.percentualValue += (expectedTotal - totalPercentage);
    lastSplit.percentualValue = Math.round(lastSplit.percentualValue * 100) / 100;
  }

  return splits;
}

// ============================================
// HANDLER: CREATE MEMBERSHIP PAYMENT
// Task 3.2: Criar cobrança de taxa de adesão
// ============================================
async function handleCreateMembershipPayment(req, res, supabase) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Método não permitido. Use POST.' 
    });
  }

  try {
    const { affiliate_id, billing_type = 'PIX' } = req.body;

    if (!affiliate_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'affiliate_id é obrigatório' 
      });
    }

    // Buscar afiliado
    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .select('*')
      .eq('id', affiliate_id)
      .single();

    if (affiliateError || !affiliate) {
      return res.status(404).json({ 
        success: false, 
        error: 'Afiliado não encontrado' 
      });
    }

    // Buscar produto de adesão conforme tipo de afiliado
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('category', 'adesao_afiliado')
      .eq('eligible_affiliate_type', affiliate.affiliate_type)
      .eq('is_active', true)
      .single();

    if (productError || !product) {
      return res.status(404).json({ 
        success: false, 
        error: `Produto de adesão para ${affiliate.affiliate_type} não encontrado` 
      });
    }

    if (!product.has_entry_fee || !product.entry_fee_cents) {
      return res.status(400).json({ 
        success: false, 
        error: 'Produto não possui taxa de adesão configurada' 
      });
    }

    // Criar customer no Asaas se não existir
    let asaasCustomerId = affiliate.asaas_customer_id;

    if (!asaasCustomerId) {
      const customerData = {
        name: affiliate.name,
        email: affiliate.email,
        phone: affiliate.phone,
        cpfCnpj: affiliate.document,
        notificationDisabled: false
      };

      const asaasResponse = await fetch('https://api.asaas.com/v3/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': process.env.ASAAS_API_KEY
        },
        body: JSON.stringify(customerData)
      });

      if (!asaasResponse.ok) {
        const errorData = await asaasResponse.json();
        console.error('Erro ao criar customer no Asaas:', errorData);
        return res.status(500).json({ 
          success: false, 
          error: 'Erro ao criar customer no Asaas',
          details: errorData
        });
      }

      const asaasCustomer = await asaasResponse.json();
      asaasCustomerId = asaasCustomer.id;

      // Salvar asaas_customer_id no afiliado
      await supabase
        .from('affiliates')
        .update({ asaas_customer_id: asaasCustomerId })
        .eq('id', affiliate_id);
    }

    // Criar cobrança no Asaas
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3); // Vencimento em 3 dias

    // Calcular split
    const splits = await calculateSplit(supabase, affiliate_id, product.entry_fee_cents / 100);

    const paymentData = {
      customer: asaasCustomerId,
      billingType: billing_type,
      value: product.entry_fee_cents / 100,
      dueDate: dueDate.toISOString().split('T')[0],
      description: `Taxa de Adesão - ${product.name}`,
      externalReference: `affiliate_${affiliate_id}`,
      split: splits
    };

    const paymentResponse = await fetch('https://api.asaas.com/v3/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': process.env.ASAAS_API_KEY
      },
      body: JSON.stringify(paymentData)
    });

    if (!paymentResponse.ok) {
      const errorData = await paymentResponse.json();
      console.error('Erro ao criar cobrança no Asaas:', errorData);
      return res.status(500).json({ 
        success: false, 
        error: 'Erro ao criar cobrança no Asaas',
        details: errorData
      });
    }

    const payment = await paymentResponse.json();

    // Registrar pagamento em affiliate_payments
    const { data: affiliatePayment, error: paymentError } = await supabase
      .from('affiliate_payments')
      .insert({
        affiliate_id: affiliate_id,
        payment_type: 'membership_fee',
        amount_cents: product.entry_fee_cents,
        status: 'pending',
        asaas_payment_id: payment.id,
        due_date: dueDate.toISOString().split('T')[0]
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Erro ao registrar pagamento:', paymentError);
      return res.status(500).json({ 
        success: false, 
        error: 'Erro ao registrar pagamento no banco' 
      });
    }

    // Retornar dados da cobrança
    return res.status(200).json({
      success: true,
      payment: {
        id: affiliatePayment.id,
        asaas_payment_id: payment.id,
        amount: product.entry_fee_cents / 100,
        due_date: dueDate.toISOString().split('T')[0],
        billing_type: billing_type,
        status: 'pending',
        // Dados específicos do tipo de pagamento
        pix_qr_code: payment.encodedImage,
        pix_copy_paste: payment.payload,
        invoice_url: payment.invoiceUrl,
        bank_slip_url: payment.bankSlipUrl
      }
    });

  } catch (error) {
    console.error('Erro em create-membership-payment:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
}

// ============================================
// HANDLER: CREATE SUBSCRIPTION
// Task 3.3: Criar assinatura mensal (Logista)
// ============================================
async function handleCreateSubscription(req, res, supabase) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Método não permitido. Use POST.' 
    });
  }

  try {
    const { affiliate_id, billing_type = 'CREDIT_CARD' } = req.body;

    if (!affiliate_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'affiliate_id é obrigatório' 
      });
    }

    // Buscar afiliado
    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .select('*')
      .eq('id', affiliate_id)
      .single();

    if (affiliateError || !affiliate) {
      return res.status(404).json({ 
        success: false, 
        error: 'Afiliado não encontrado' 
      });
    }

    // Validar que é Logista
    if (affiliate.affiliate_type !== 'logista') {
      return res.status(400).json({ 
        success: false, 
        error: 'Apenas Logistas podem criar assinaturas mensais' 
      });
    }

    // Buscar produto de adesão Logista
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('category', 'adesao_afiliado')
      .eq('eligible_affiliate_type', 'logista')
      .eq('is_active', true)
      .single();

    if (productError || !product) {
      return res.status(404).json({ 
        success: false, 
        error: 'Produto de adesão Logista não encontrado' 
      });
    }

    if (!product.monthly_fee_cents) {
      return res.status(400).json({ 
        success: false, 
        error: 'Produto não possui mensalidade configurada' 
      });
    }

    // Criar customer no Asaas se não existir
    let asaasCustomerId = affiliate.asaas_customer_id;

    if (!asaasCustomerId) {
      const customerData = {
        name: affiliate.name,
        email: affiliate.email,
        phone: affiliate.phone,
        cpfCnpj: affiliate.document,
        notificationDisabled: false
      };

      const asaasResponse = await fetch('https://api.asaas.com/v3/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': process.env.ASAAS_API_KEY
        },
        body: JSON.stringify(customerData)
      });

      if (!asaasResponse.ok) {
        const errorData = await asaasResponse.json();
        console.error('Erro ao criar customer no Asaas:', errorData);
        return res.status(500).json({ 
          success: false, 
          error: 'Erro ao criar customer no Asaas',
          details: errorData
        });
      }

      const asaasCustomer = await asaasResponse.json();
      asaasCustomerId = asaasCustomer.id;

      // Salvar asaas_customer_id no afiliado
      await supabase
        .from('affiliates')
        .update({ asaas_customer_id: asaasCustomerId })
        .eq('id', affiliate_id);
    }

    // Criar assinatura no Asaas
    // Primeira cobrança é IMEDIATA (sem carência)
    const nextDueDate = new Date().toISOString().split('T')[0];

    // Calcular split
    const splits = await calculateSplit(supabase, affiliate_id, product.monthly_fee_cents / 100);

    const subscriptionData = {
      customer: asaasCustomerId,
      billingType: billing_type,
      value: product.monthly_fee_cents / 100,
      cycle: product.billing_cycle?.toUpperCase() || 'MONTHLY',
      nextDueDate: nextDueDate,
      description: `Mensalidade - ${product.name}`,
      externalReference: `affiliate_${affiliate_id}`,
      split: splits
    };

    const subscriptionResponse = await fetch('https://api.asaas.com/v3/subscriptions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': process.env.ASAAS_API_KEY
      },
      body: JSON.stringify(subscriptionData)
    });

    if (!subscriptionResponse.ok) {
      const errorData = await subscriptionResponse.json();
      console.error('Erro ao criar assinatura no Asaas:', errorData);
      return res.status(500).json({ 
        success: false, 
        error: 'Erro ao criar assinatura no Asaas',
        details: errorData
      });
    }

    const subscription = await subscriptionResponse.json();

    // Registrar assinatura em affiliate_payments
    const { data: affiliatePayment, error: paymentError } = await supabase
      .from('affiliate_payments')
      .insert({
        affiliate_id: affiliate_id,
        payment_type: 'monthly_subscription',
        amount_cents: product.monthly_fee_cents,
        status: 'pending',
        asaas_subscription_id: subscription.id,
        due_date: nextDueDate
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Erro ao registrar assinatura:', paymentError);
      return res.status(500).json({ 
        success: false, 
        error: 'Erro ao registrar assinatura no banco' 
      });
    }

    // Retornar dados da assinatura
    return res.status(200).json({
      success: true,
      subscription: {
        id: affiliatePayment.id,
        asaas_subscription_id: subscription.id,
        amount: product.monthly_fee_cents / 100,
        cycle: product.billing_cycle || 'monthly',
        next_due_date: nextDueDate,
        status: 'active'
      }
    });

  } catch (error) {
    console.error('Erro em create-subscription:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
}

// ============================================
// HANDLER: CANCEL SUBSCRIPTION
// Task 3.4: Cancelar assinatura mensal
// ============================================
async function handleCancelSubscription(req, res, supabase) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Método não permitido. Use POST.' 
    });
  }

  try {
    const { affiliate_id } = req.body;

    if (!affiliate_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'affiliate_id é obrigatório' 
      });
    }

    // Buscar afiliado
    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .select('*')
      .eq('id', affiliate_id)
      .single();

    if (affiliateError || !affiliate) {
      return res.status(404).json({ 
        success: false, 
        error: 'Afiliado não encontrado' 
      });
    }

    // Validar que é Logista
    if (affiliate.affiliate_type !== 'logista') {
      return res.status(400).json({ 
        success: false, 
        error: 'Apenas Logistas possuem assinaturas mensais' 
      });
    }

    // Buscar assinatura ativa
    const { data: payment, error: paymentError } = await supabase
      .from('affiliate_payments')
      .select('*')
      .eq('affiliate_id', affiliate_id)
      .eq('payment_type', 'monthly_subscription')
      .not('asaas_subscription_id', 'is', null)
      .in('status', ['pending', 'paid'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (paymentError || !payment) {
      return res.status(404).json({ 
        success: false, 
        error: 'Assinatura ativa não encontrada' 
      });
    }

    // Cancelar assinatura no Asaas
    const cancelResponse = await fetch(`https://api.asaas.com/v3/subscriptions/${payment.asaas_subscription_id}`, {
      method: 'DELETE',
      headers: {
        'access_token': process.env.ASAAS_API_KEY
      }
    });

    if (!cancelResponse.ok) {
      const errorData = await cancelResponse.json();
      console.error('Erro ao cancelar assinatura no Asaas:', errorData);
      return res.status(500).json({ 
        success: false, 
        error: 'Erro ao cancelar assinatura no Asaas',
        details: errorData
      });
    }

    // Atualizar status no banco
    await supabase
      .from('affiliate_payments')
      .update({ status: 'cancelled' })
      .eq('id', payment.id);

    // Desativar switch "Aparecer na Vitrine"
    await supabase
      .from('affiliates')
      .update({ is_visible_in_showcase: false })
      .eq('id', affiliate_id);

    await supabase
      .from('store_profiles')
      .update({ is_visible_in_showcase: false })
      .eq('affiliate_id', affiliate_id);

    return res.status(200).json({
      success: true,
      message: 'Assinatura cancelada com sucesso'
    });

  } catch (error) {
    console.error('Erro em cancel-subscription:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
}

// ============================================
// HANDLER: GET HISTORY
// Task 3.5: Obter histórico de pagamentos
// ============================================
async function handleGetHistory(req, res, supabase) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Método não permitido. Use GET.' 
    });
  }

  try {
    const { affiliate_id, type, status } = req.query;

    if (!affiliate_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'affiliate_id é obrigatório' 
      });
    }

    // Construir query
    let query = supabase
      .from('affiliate_payments')
      .select('*')
      .eq('affiliate_id', affiliate_id)
      .order('created_at', { ascending: false });

    // Filtros opcionais
    if (type) {
      query = query.eq('payment_type', type);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: payments, error } = await query;

    if (error) {
      console.error('Erro ao buscar histórico:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Erro ao buscar histórico de pagamentos' 
      });
    }

    // Formatar dados
    const formattedPayments = payments.map(payment => ({
      id: payment.id,
      type: payment.payment_type,
      amount: payment.amount_cents / 100,
      status: payment.status,
      due_date: payment.due_date,
      paid_at: payment.paid_at,
      created_at: payment.created_at,
      asaas_payment_id: payment.asaas_payment_id,
      asaas_subscription_id: payment.asaas_subscription_id
    }));

    return res.status(200).json({
      success: true,
      payments: formattedPayments,
      total: formattedPayments.length
    });

  } catch (error) {
    console.error('Erro em get-history:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
}

// ============================================
// HANDLER: GET RECEIPT
// Task 3.5: Obter comprovante de pagamento
// ============================================
async function handleGetReceipt(req, res, supabase) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Método não permitido. Use GET.' 
    });
  }

  try {
    const { payment_id, affiliate_id } = req.query;

    if (!payment_id || !affiliate_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'payment_id e affiliate_id são obrigatórios' 
      });
    }

    // Buscar pagamento
    const { data: payment, error } = await supabase
      .from('affiliate_payments')
      .select('*')
      .eq('id', payment_id)
      .eq('affiliate_id', affiliate_id)
      .single();

    if (error || !payment) {
      return res.status(404).json({ 
        success: false, 
        error: 'Pagamento não encontrado' 
      });
    }

    // Validar que pagamento foi pago
    if (payment.status !== 'paid') {
      return res.status(400).json({ 
        success: false, 
        error: 'Comprovante disponível apenas para pagamentos confirmados' 
      });
    }

    // Retornar dados do comprovante
    return res.status(200).json({
      success: true,
      receipt: {
        id: payment.id,
        type: payment.payment_type,
        amount: payment.amount_cents / 100,
        paid_at: payment.paid_at,
        due_date: payment.due_date,
        asaas_payment_id: payment.asaas_payment_id
      }
    });

  } catch (error) {
    console.error('Erro em get-receipt:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
}
