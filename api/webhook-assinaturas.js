/**
 * Webhook Asaas - Gestão de Assinaturas Agente IA
 * Ativa, renova e suspende o acesso ao Agente Multi-Tenant
 * 
 * ✅ Protocolo RENUM: Isolamento de responsabilidades técnicas
 * 📚 Documentação: https://docs.asaas.com.br/docs/assinaturas
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, asaas-access-token');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  // 1. VALIDAÇÃO DE TOKEN
  const receivedToken = req.headers['asaas-access-token'];
  const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;

  if (!expectedToken || receivedToken !== expectedToken) {
    console.error('[WH-Assinaturas] ❌ Token inválido ou não configurado');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // 2. INICIALIZAR SUPABASE
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const event = req.body;
    const { event: eventType, payment, subscription: subscriptionData } = event;
    
    // Extrair externalReference para roteamento
    const externalRef = payment?.externalReference || '';
    
    // ============================================================
    // ROTEAMENTO 1: PRÉ-CADASTRO DE AFILIADOS (PAYMENT FIRST)
    // ============================================================
    if (externalRef.startsWith('affiliate_pre_')) {
      console.log('[WH-Afiliados] 🚀 Processando pré-cadastro:', externalRef);
      await handlePreRegistrationPayment(supabase, payment);
      return res.status(200).json({ success: true, type: 'affiliate_pre_registration' });
    }
    
    // ============================================================
    // ROTEAMENTO 2: EVENTOS DE AFILIADOS EXISTENTES
    // ============================================================
    if (externalRef.startsWith('affiliate_')) {
      console.log('[WH-Assinaturas] 🔄 Enfileirando evento de afiliado:', externalRef);
      await enqueueAffiliateWebhook(supabase, event);
      return res.status(200).json({ success: true, type: 'affiliate_queued' });
    }
    
    // ============================================================
    // ROTEAMENTO 2: PAYMENT FIRST (EXISTENTE)
    // ============================================================
    if (externalRef.startsWith('subscription_')) {
      console.log('[WH-Assinaturas] 🔄 Processando Payment First:', externalRef);
      await handlePaymentFirstConfirmed(supabase, payment);
      return res.status(200).json({ success: true, type: 'payment_first' });
    }
    
    // ============================================================
    // ROTEAMENTO 3: ASSINATURAS RECORRENTES (EXISTENTE)
    // ============================================================
    // Extrair ID da assinatura (pode vir no campo subscription do pagamento ou no objeto subscription direto)
    const asaasSubscriptionId = subscriptionData?.id || payment?.subscription;

    console.log(`[WH-Assinaturas] 🔔 Evento ${eventType} recebido para Assinatura ${asaasSubscriptionId}`);

    if (!asaasSubscriptionId) {
      console.log('[WH-Assinaturas] ⚠️ Evento ignorado: não é assinatura recorrente');
      return res.status(200).json({ received: true, message: 'Sem ID de assinatura' });
    }

    // 3. PROCESSAR EVENTOS
    switch (eventType) {
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED':
        // Verificar se é assinatura de afiliado ou agente IA
        const { data: affiliateSub } = await supabase
          .from('affiliate_payments')
          .select('id')
          .eq('asaas_subscription_id', asaasSubscriptionId)
          .single();
        
        if (affiliateSub) {
          await handleAffiliatePaymentConfirmed(supabase, asaasSubscriptionId, payment);
        } else {
          await handlePaymentConfirmed(supabase, asaasSubscriptionId);
        }
        break;

      case 'PAYMENT_OVERDUE':
        // Verificar se é assinatura de afiliado ou agente IA
        const { data: affiliateSubOverdue } = await supabase
          .from('affiliate_payments')
          .select('id')
          .eq('asaas_subscription_id', asaasSubscriptionId)
          .single();
        
        if (affiliateSubOverdue) {
          await handleAffiliatePaymentOverdue(supabase, asaasSubscriptionId);
        } else {
          await handlePaymentOverdue(supabase, asaasSubscriptionId);
        }
        break;

      case 'SUBSCRIPTION_DELETED':
        await handleSubscriptionDeleted(supabase, asaasSubscriptionId);
        break;

      default:
        console.log(`[WH-Assinaturas] ℹ️ Evento ${eventType} não requer ação técnica imediata.`);
    }

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('[WH-Assinaturas] 💥 ERRO CRÍTICO:', {
      message: error.message,
      stack: error.stack,
      event: req.body?.event,
      timestamp: new Date().toISOString()
    });

    // IMPORTANTE: Sempre retornar 200 para Asaas (evita reenvios infinitos)
    // O erro já foi logado para investigação posterior
    return res.status(200).json({ 
      received: true, 
      error: 'Internal processing error (logged)', 
      timestamp: new Date().toISOString() 
    });
  }
}

/**
 * Ativa ou Renova o acesso ao Agente IA (+30 dias)
 * NOTA: Esta função processa assinaturas do sistema de agente IA multi-tenant
 * Para renovações de afiliados, use handleAffiliatePaymentConfirmed()
 */
async function handlePaymentConfirmed(supabase, asaasSubscriptionId) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);
  const expiresAtISO = expiresAt.toISOString();

  console.log(`[WH-Assinaturas] 🔄 Renovando assinatura ${asaasSubscriptionId} até ${expiresAtISO}`);

  // 1. Atualizar registro da assinatura
  const { data: sub, error: subError } = await supabase
    .from('multi_agent_subscriptions')
    .update({
      status: 'active',
      next_due_date: expiresAtISO.split('T')[0],
      updated_at: new Date().toISOString()
    })
    .eq('asaas_subscription_id', asaasSubscriptionId)
    .select('tenant_id')
    .single();

  if (subError) throw subError;

  // 2. Garantir que o Tenant está Ativo
  if (sub?.tenant_id) {
    const { error: tenantError } = await supabase
      .from('multi_agent_tenants')
      .update({
        status: 'active',
        suspended_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', sub.tenant_id);

    if (tenantError) console.error('[WH-Assinaturas] ⚠️ Erro ao ativar tenant:', tenantError);
  }
}

/**
 * Processa renovação mensal de assinatura de afiliado
 * Cria novo registro de pagamento, calcula comissões e notifica
 */
async function handleAffiliatePaymentConfirmed(supabase, asaasSubscriptionId, payment) {
  console.log('[Affiliate-Renewal] 🔄 Processing monthly renewal:', asaasSubscriptionId);
  
  try {
    // 1. Buscar assinatura ativa
    const { data: subscription, error: subError } = await supabase
      .from('affiliate_payments')
      .select('affiliate_id, amount_cents')
      .eq('asaas_subscription_id', asaasSubscriptionId)
      .eq('payment_type', 'monthly_subscription')
      .eq('status', 'active')
      .single();
    
    if (subError || !subscription) {
      console.error('[Affiliate-Renewal] ❌ Subscription not found:', asaasSubscriptionId);
      return;
    }
    
    console.log('[Affiliate-Renewal] ✅ Subscription found:', {
      affiliateId: subscription.affiliate_id,
      amountCents: subscription.amount_cents
    });
    
    // 2. Criar novo registro de pagamento mensal
    const { error: paymentError } = await supabase
      .from('affiliate_payments')
      .insert({
        affiliate_id: subscription.affiliate_id,
        asaas_payment_id: payment.id,
        asaas_subscription_id: asaasSubscriptionId,
        payment_type: 'monthly_subscription',
        amount_cents: subscription.amount_cents,
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        due_date: payment.dueDate,
        created_at: new Date().toISOString()
      });
    
    if (paymentError) {
      console.error('[Affiliate-Renewal] ❌ Error creating payment record:', paymentError);
      throw paymentError;
    }
    
    console.log('[Affiliate-Renewal] ✅ Payment record created');
    
    // 3. Garantir que afiliado está ativo
    const { error: affiliateError } = await supabase
      .from('affiliates')
      .update({
        payment_status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.affiliate_id);
    
    if (affiliateError) {
      console.error('[Affiliate-Renewal] ⚠️ Error updating affiliate:', affiliateError);
    } else {
      console.log('[Affiliate-Renewal] ✅ Affiliate status updated to active');
    }
    
    // 4. Calcular e salvar comissões
    try {
      await calculateAndSaveCommissions(
        supabase, 
        subscription.affiliate_id, 
        subscription.amount_cents, 
        'monthly_subscription'
      );
      console.log('[Affiliate-Renewal] ✅ Commissions calculated');
    } catch (commError) {
      console.error('[Affiliate-Renewal] ⚠️ Error calculating commissions:', commError);
      // Non-blocking
    }
    
    // 5. Criar notificação
    await supabase.from('notifications').insert({
      affiliate_id: subscription.affiliate_id,
      type: 'payment_confirmed',
      title: 'Pagamento confirmado',
      message: `Sua mensalidade de R$ ${(subscription.amount_cents / 100).toFixed(2)} foi confirmada. Obrigado!`,
      read: false,
      created_at: new Date().toISOString()
    });
    
    console.log('[Affiliate-Renewal] ✅ Notification created');
    console.log('[Affiliate-Renewal] ✅ Renewal processed successfully');
    
  } catch (error) {
    console.error('[Affiliate-Renewal] 💥 Error processing renewal:', error);
    throw error;
  }
}
// ============================================
// FUNÇÃO AUXILIAR: CALCULAR SPLIT
// ============================================
const COMMISSION_RATES = {
  SLIM: 0.10, SELLER: 0.15, N1: 0.03, N2: 0.02, RENUM: 0.05, JB: 0.05
};

async function calculateSplit(supabase, affiliateId, paymentValue) {
  const renumWalletId = process.env.ASAAS_WALLET_RENUM;
  const jbWalletId = process.env.ASAAS_WALLET_JB;
  if (!renumWalletId || !jbWalletId) throw new Error('Wallet IDs não configuradas');

  const { data: n1Affiliate } = await supabase.from('affiliates')
    .select('id, referred_by, wallet_id, payment_status').eq('id', affiliateId).is('deleted_at', null).single();
  if (!n1Affiliate) throw new Error('Afiliado não encontrado');

  const n1IsActive = n1Affiliate.payment_status === 'active' && n1Affiliate.wallet_id;
  let n2Affiliate = null, n3Affiliate = null, n2IsActive = false, n3IsActive = false;

  if (n1Affiliate.referred_by) {
    const { data: n2Data } = await supabase.from('affiliates')
      .select('id, referred_by, wallet_id, payment_status').eq('id', n1Affiliate.referred_by).is('deleted_at', null).single();
    n2Affiliate = n2Data;
    n2IsActive = n2Affiliate?.payment_status === 'active' && n2Affiliate?.wallet_id;
    if (n2Affiliate?.referred_by) {
      const { data: n3Data } = await supabase.from('affiliates')
        .select('id, referred_by, wallet_id, payment_status').eq('id', n2Affiliate.referred_by).is('deleted_at', null).single();
      n3Affiliate = n3Data;
      n3IsActive = n3Affiliate?.payment_status === 'active' && n3Affiliate?.wallet_id;
    }
  }

  const n1Percentage = n1IsActive ? COMMISSION_RATES.SELLER * 100 : 0;
  const n2Percentage = n2IsActive ? COMMISSION_RATES.N1 * 100 : 0;
  const n3Percentage = n3IsActive ? COMMISSION_RATES.N2 * 100 : 0;
  const networkPercentage = n1Percentage + n2Percentage + n3Percentage;
  const remainingPercentage = 90 - networkPercentage;
  const renumPercentage = remainingPercentage / 2;
  const jbPercentage = remainingPercentage / 2;

  const splits = [];
  if (n1IsActive) splits.push({ walletId: n1Affiliate.wallet_id, percentualValue: Math.round(n1Percentage * 100) / 100 });
  if (n2IsActive) splits.push({ walletId: n2Affiliate.wallet_id, percentualValue: Math.round(n2Percentage * 100) / 100 });
  if (n3IsActive) splits.push({ walletId: n3Affiliate.wallet_id, percentualValue: Math.round(n3Percentage * 100) / 100 });
  splits.push({ walletId: renumWalletId, percentualValue: Math.round(renumPercentage * 100) / 100 });
  splits.push({ walletId: jbWalletId, percentualValue: Math.round(jbPercentage * 100) / 100 });

  const totalPercentage = splits.reduce((sum, s) => sum + s.percentualValue, 0);
  const diff = Math.abs(totalPercentage - 90);
  if (diff > 0.01) {
    const lastSplit = splits[splits.length - 1];
    lastSplit.percentualValue += (90 - totalPercentage);
    lastSplit.percentualValue = Math.round(lastSplit.percentualValue * 100) / 100;
  }
  return splits;
}



/**
 * Suspende o acesso por atraso no pagamento
 * NOTA: Esta função processa assinaturas do sistema de agente IA multi-tenant
 * Para atrasos de afiliados, use handleAffiliatePaymentOverdue()
 */
async function handlePaymentOverdue(supabase, asaasSubscriptionId) {
  console.log(`[WH-Assinaturas] ⚠️ Suspendendo acesso por atraso: ${asaasSubscriptionId}`);

  const { data: sub } = await supabase
    .from('multi_agent_subscriptions')
    .update({ status: 'overdue' })
    .eq('asaas_subscription_id', asaasSubscriptionId)
    .select('tenant_id')
    .single();

  if (sub?.tenant_id) {
    await supabase
      .from('multi_agent_tenants')
      .update({
        status: 'suspended',
        suspended_at: new Date().toISOString()
      })
      .eq('id', sub.tenant_id);
  }
}

/**
 * Processa atraso de pagamento de assinatura de afiliado
 * Bloqueia vitrine, agente IA e atualiza status
 */
async function handleAffiliatePaymentOverdue(supabase, asaasSubscriptionId) {
  console.log('[Affiliate-Overdue] ⚠️ Processing overdue payment:', asaasSubscriptionId);
  
  try {
    // 1. Buscar assinatura
    const { data: subscription, error: subError } = await supabase
      .from('affiliate_payments')
      .select('affiliate_id')
      .eq('asaas_subscription_id', asaasSubscriptionId)
      .eq('payment_type', 'monthly_subscription')
      .single();
    
    if (subError || !subscription) {
      console.error('[Affiliate-Overdue] ❌ Subscription not found:', asaasSubscriptionId);
      return;
    }
    
    console.log('[Affiliate-Overdue] ✅ Subscription found:', {
      affiliateId: subscription.affiliate_id
    });
    
    // 2. Atualizar status do afiliado
    const { error: affiliateError } = await supabase
      .from('affiliates')
      .update({
        payment_status: 'overdue',
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.affiliate_id);
    
    if (affiliateError) {
      console.error('[Affiliate-Overdue] ❌ Error updating affiliate:', affiliateError);
      throw affiliateError;
    }
    
    console.log('[Affiliate-Overdue] ✅ Affiliate marked as overdue');
    
    // 3. Desativar vitrine
    const { error: vitrineError } = await supabase
      .from('store_profiles')
      .update({
        is_visible_in_showcase: false,
        updated_at: new Date().toISOString()
      })
      .eq('affiliate_id', subscription.affiliate_id);
    
    if (vitrineError) {
      console.error('[Affiliate-Overdue] ⚠️ Error deactivating vitrine:', vitrineError);
    } else {
      console.log('[Affiliate-Overdue] ✅ Vitrine deactivated');
    }
    
    // 4. Suspender agente IA
    const { error: tenantError } = await supabase
      .from('multi_agent_tenants')
      .update({
        status: 'suspended',
        suspended_at: new Date().toISOString()
      })
      .eq('affiliate_id', subscription.affiliate_id);
    
    if (tenantError) {
      console.error('[Affiliate-Overdue] ⚠️ Error suspending agent:', tenantError);
    } else {
      console.log('[Affiliate-Overdue] ✅ Agent suspended');
    }
    
    // 5. Criar notificação
    await supabase.from('notifications').insert({
      affiliate_id: subscription.affiliate_id,
      type: 'payment_overdue',
      title: 'Pagamento em atraso',
      message: 'Sua mensalidade está em atraso. Regularize para manter acesso à vitrine e agente IA.',
      link: '/afiliados/dashboard/assinatura',
      read: false,
      created_at: new Date().toISOString()
    });
    
    console.log('[Affiliate-Overdue] ✅ Notification created');
    console.log('[Affiliate-Overdue] ✅ Overdue processed successfully');
    
  } catch (error) {
    console.error('[Affiliate-Overdue] 💥 Error processing overdue:', error);
    throw error;
  }
}

/**
 * Cancela permanentemente o acesso
 */
async function handleSubscriptionDeleted(supabase, asaasSubscriptionId) {
  console.log(`[WH-Assinaturas] 🚫 Cancelando assinatura: ${asaasSubscriptionId}`);

  const { data: sub } = await supabase
    .from('multi_agent_subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString()
    })
    .eq('asaas_subscription_id', asaasSubscriptionId)
    .select('tenant_id')
    .single();

  if (sub?.tenant_id) {
    await supabase
      .from('multi_agent_tenants')
      .update({
        status: 'canceled',
        suspended_at: new Date().toISOString()
      })
      .eq('id', sub.tenant_id);
  }
}

/**
 * Enfileira evento de afiliado para processamento assíncrono
 * Usa tabela subscription_webhook_events (já existe)
 * Será processado pela Edge Function process-affiliate-webhooks
 * 
 * FASE 4: Detecta e processa bundles (logista) antes de enfileirar
 */
async function enqueueAffiliateWebhook(supabase, event) {
  const startTime = Date.now();
  const { payment } = event;
  
  console.log('[WH-Afiliados] 📥 Enfileirando evento:', {
    eventType: event.event,
    paymentId: payment.id,
    externalRef: payment.externalReference,
    value: payment.value,
    status: payment.status
  });

  try {
    // ============================================================
    // FASE 4: DETECTAR E PROCESSAR BUNDLE (PAYMENT_CONFIRMED)
    // ============================================================
    if (event.event === 'PAYMENT_CONFIRMED') {
      const affiliateId = payment.externalReference.replace('affiliate_', '');
      
      // Verificar se é upgrade (Individual Básico → Premium)
      const { data: affiliate } = await supabase
        .from('affiliates')
        .select('has_subscription')
        .eq('id', affiliateId)
        .single();
      
      if (affiliate && !affiliate.has_subscription) {
        // É um upgrade! Processar upgrade
        console.log('[WH-Afiliados] 🆙 Upgrade detectado! Processando...');
        await handleUpgradePayment(supabase, payment);
        console.log('[WH-Afiliados] ✅ Upgrade processado com sucesso');
      } else {
        // Pagamento regular de assinatura
        const isBundle = await detectBundlePayment(supabase, payment);
        
        if (isBundle) {
          console.log('[WH-Afiliados] 🎯 Bundle detectado! Processando ativação...');
          await processBundleActivation(supabase, payment);
          console.log('[WH-Afiliados] ✅ Bundle ativado com sucesso');
        }
      }
    }
    
    // ============================================================
    // PROCESSAR CANCELAMENTO DE ASSINATURA
    // ============================================================
    if (event.event === 'SUBSCRIPTION_CANCELLED') {
      console.log('[WH-Afiliados] 🚫 Cancelamento detectado! Processando...');
      await handleSubscriptionCancelled(supabase, payment);
      console.log('[WH-Afiliados] ✅ Cancelamento processado com sucesso');
    }
    
    // ============================================================
    // ETAPA 1: IDEMPOTÊNCIA - Verificar se evento já foi enfileirado
    // ============================================================
    const { data: existing } = await supabase
      .from('subscription_webhook_events')
      .select('id, processed')
      .eq('asaas_event_id', payment.id)
      .eq('event_type', event.event)
      .single();

    if (existing) {
      console.log('[WH-Afiliados] ⚠️ Evento já enfileirado:', {
        queueId: existing.id,
        processed: existing.processed
      });
      return { success: true, duplicate: true, queueId: existing.id };
    }

    // ============================================================
    // ETAPA 2: ENFILEIRAR EVENTO
    // ============================================================
    const { data: queued, error } = await supabase
      .from('subscription_webhook_events')
      .insert({
        asaas_event_id: payment.id,
        event_type: event.event,
        payload: event,
        processed: false, // Marca como não processado
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) {
      console.error('[WH-Afiliados] ❌ Erro ao enfileirar:', error);
      throw error;
    }

    const processingTime = Date.now() - startTime;
    console.log('[WH-Afiliados] ✅ Evento enfileirado com sucesso:', {
      queueId: queued.id,
      paymentId: payment.id,
      eventType: event.event,
      processingTimeMs: processingTime
    });

    return { 
      success: true, 
      queueId: queued.id,
      processingTimeMs: processingTime
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('[WH-Afiliados] 💥 ERRO ao enfileirar:', {
      error: error.message,
      stack: error.stack,
      paymentId: payment.id,
      processingTimeMs: processingTime
    });
    throw error;
  }
}

/**
 * Processa pagamento de pré-cadastro de afiliado (Payment First)
 * Cria conta Supabase Auth + registro em affiliates + rede genealógica
 * 
 * CRÍTICO: Segue padrão idêntico ao sistema Comademig (subscription-payment-flow)
 * - Usa password_hash diretamente da tabela payment_sessions
 * - NÃO envia senha temporária nem email de redefinição
 * - Usa email_confirm: true para confirmar email automaticamente
 */

// ============================================================
// FUNÇÕES DE BUNDLE ACTIVATION (FASE 4)
// ============================================================

/**
 * Detecta se o pagamento é de um bundle (vitrine + agente)
 * ATUALIZADO: Verifica has_subscription ao invés de affiliate_type
 * @param {object} supabase - Cliente Supabase
 * @param {object} payment - Objeto de pagamento do Asaas
 * @returns {Promise<boolean>} - true se é bundle, false caso contrário
 */
async function detectBundlePayment(supabase, payment) {
  const externalRef = payment.externalReference;
  
  // Verificar se é pagamento de afiliado
  if (!externalRef || !externalRef.startsWith('affiliate_')) {
    return false;
  }
  
  // Extrair affiliate_id
  const affiliateId = externalRef.replace('affiliate_', '');
  
  console.log('[Bundle] 🔍 Detectando bundle payment:', {
    affiliateId,
    paymentId: payment.id,
    value: payment.value
  });
  
  // Buscar has_subscription do afiliado
  const { data: affiliate, error } = await supabase
    .from('affiliates')
    .select('has_subscription, affiliate_type')
    .eq('id', affiliateId)
    .single();
  
  if (error || !affiliate) {
    console.error('[Bundle] ❌ Afiliado não encontrado:', affiliateId);
    return false;
  }
  
  // Bundle = afiliado com mensalidade (has_subscription = true)
  const isBundle = affiliate.has_subscription === true;
  
  console.log('[Bundle] 📊 Detection result:', {
    affiliateId,
    affiliateType: affiliate.affiliate_type,
    hasSubscription: affiliate.has_subscription,
    isBundle
  });
  
  return isBundle;
}

/**
 * Ativa bundle (vitrine + agente) para afiliado com mensalidade
 * ATUALIZADO: Renomeado de activateTenantAndVitrine() e corrigido campo is_visible_in_showcase
 * @param {object} supabase - Cliente Supabase
 * @param {string} affiliateId - ID do afiliado (UUID)
 * @returns {Promise<string>} - ID do tenant criado/atualizado
 */
async function activateBundle(supabase, affiliateId) {
  console.log('[Bundle] 🚀 Activating bundle:', affiliateId);
  
  try {
    // 1. Create/update tenant (agent IA)
    const { data: tenant, error: tenantError } = await supabase
      .from('multi_agent_tenants')
      .upsert({
        affiliate_id: affiliateId,
        status: 'active',
        whatsapp_status: 'inactive',
        activated_at: new Date().toISOString(),
        personality: null  // Use fallback
      }, {
        onConflict: 'affiliate_id'
      })
      .select('id')
      .single();
    
    if (tenantError) {
      console.error('[Bundle] ❌ Error creating tenant:', tenantError);
      throw tenantError;
    }
    
    console.log('[Bundle] ✅ Tenant activated:', {
      tenantId: tenant.id,
      affiliateId
    });
    
    // 2. Activate vitrine (CORRECTED FIELD)
    const { error: vitrineError } = await supabase
      .from('store_profiles')
      .update({ 
        is_visible_in_showcase: true,  // ✅ CORRECT FIELD
        updated_at: new Date().toISOString()
      })
      .eq('affiliate_id', affiliateId);
    
    if (vitrineError) {
      console.error('[Bundle] ⚠️ Error activating vitrine:', vitrineError);
      // Don't block - vitrine can be activated manually
    } else {
      console.log('[Bundle] ✅ Vitrine activated:', affiliateId);
    }
    
    return tenant.id;
    
  } catch (error) {
    console.error('[Bundle] 💥 Fatal error:', {
      error: error.message,
      affiliateId
    });
    throw error;
  }
}

/**
 * Registra serviços de vitrine e agente em affiliate_services
 * @param {object} supabase - Cliente Supabase
 * @param {string} affiliateId - ID do afiliado (UUID)
 */
async function registerAffiliateServices(supabase, affiliateId) {
  console.log('[Bundle] 📝 Registrando serviços:', affiliateId);
  
  const services = [
    {
      affiliate_id: affiliateId,
      service_type: 'vitrine',
      status: 'active',
      activated_at: new Date().toISOString(),
      metadata: { bundle: true, activated_via: 'payment' }
    },
    {
      affiliate_id: affiliateId,
      service_type: 'agente',
      status: 'active',
      activated_at: new Date().toISOString(),
      metadata: { bundle: true, activated_via: 'payment' }
    }
  ];
  
  const { error } = await supabase
    .from('affiliate_services')
    .upsert(services, {
      onConflict: 'affiliate_id,service_type'
    });
  
  if (error) {
    console.error('[Bundle] ❌ Erro ao registrar serviços:', error);
    throw error;
  }
  
  console.log('[Bundle] ✅ Serviços registrados:', {
    affiliateId,
    services: ['vitrine', 'agente']
  });
}

/**
 * Enfileira job para provisionar instância Evolution
 * @param {object} supabase - Cliente Supabase
 * @param {string} tenantId - ID do tenant (UUID)
 * @param {string} affiliateId - ID do afiliado (UUID)
 */
async function enqueueEvolutionProvisioning(supabase, tenantId, affiliateId) {
  console.log('[Bundle] 📤 Enfileirando provisioning Evolution:', {
    tenantId,
    affiliateId
  });
  
  // Verificar se tabela evolution_provisioning_queue existe
  // Se não existir, apenas logar (será implementado na Fase 5)
  const { error } = await supabase
    .from('evolution_provisioning_queue')
    .insert({
      tenant_id: tenantId,
      affiliate_id: affiliateId,
      status: 'pending',
      created_at: new Date().toISOString()
    });
  
  if (error) {
    console.warn('[Bundle] ⚠️ Tabela evolution_provisioning_queue não existe ainda:', error.message);
    console.log('[Bundle] ℹ️ Provisioning será implementado na Fase 5');
  } else {
    console.log('[Bundle] ✅ Provisioning enfileirado:', {
      tenantId,
      affiliateId
    });
  }
}

/**
 * Cria order_items com split 50/50 para analytics
 * @param {object} supabase - Cliente Supabase
 * @param {string} affiliateId - ID do afiliado (UUID)
 * @param {number} totalCents - Valor total em centavos
 */
async function createBundleOrderItems(supabase, affiliateId, totalCents) {
  console.log('[Bundle] 📊 Criando order_items para analytics:', {
    affiliateId,
    totalCents
  });
  
  // Verificar se tabela orders existe e se há order para este afiliado
  // Se não existir, apenas logar (order_items é para analytics, não bloqueia)
  const halfAmount = Math.floor(totalCents / 2);
  
  // Buscar produtos de adesão (Individual e Logista)
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, name, category, sku')
    .eq('category', 'adesao_afiliado')
    .limit(2);
  
  if (productsError || !products || products.length < 2) {
    console.warn('[Bundle] ⚠️ Produtos de adesão não encontrados:', productsError?.message);
    console.log('[Bundle] ℹ️ Order items não criados (não bloqueia ativação)');
    return;
  }
  
  // Para bundle de logista, usar produto "Adesão Logista"
  // Split 50/50: metade para vitrine, metade para agente (analytics)
  const logistaProduct = products.find(p => p.sku.includes('ADL'));
  
  if (!logistaProduct) {
    console.warn('[Bundle] ⚠️ Produto de adesão logista não encontrado');
    return;
  }
  
  // Criar order fictício para analytics (se não existir)
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      customer_id: null, // Sem customer (é pagamento de afiliado)
      affiliate_id: affiliateId,
      status: 'completed',
      total_cents: totalCents,
      payment_method: 'asaas',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select('id')
    .single();
  
  if (orderError) {
    console.warn('[Bundle] ⚠️ Erro ao criar order:', orderError.message);
    return;
  }
  
  // Criar order_items com split 50/50 (vitrine + agente)
  const items = [
    {
      order_id: order.id,
      product_id: logistaProduct.id,
      quantity: 1,
      price_cents: halfAmount,
      metadata: { bundle: true, split_type: '50/50', service: 'vitrine' }
    },
    {
      order_id: order.id,
      product_id: logistaProduct.id,
      quantity: 1,
      price_cents: halfAmount,
      metadata: { bundle: true, split_type: '50/50', service: 'agente' }
    }
  ];
  
  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(items);
  
  if (itemsError) {
    console.warn('[Bundle] ⚠️ Erro ao criar order_items:', itemsError.message);
  } else {
    console.log('[Bundle] ✅ Order items criados:', {
      orderId: order.id,
      items: 2,
      splitType: '50/50'
    });
  }
}

/**
 * Processa ativação de bundle (vitrine + agente) para afiliado com mensalidade
 * ATUALIZADO: Usa activateBundle() ao invés de activateTenantAndVitrine()
 * @param {object} supabase - Cliente Supabase
 * @param {object} payment - Objeto de pagamento do Asaas
 */
async function processBundleActivation(supabase, payment) {
  const startTime = Date.now();
  const affiliateId = payment.externalReference.replace('affiliate_', '');
  
  console.log('[Bundle] 🎯 Iniciando ativação de bundle:', {
    affiliateId,
    paymentId: payment.id,
    value: payment.value
  });
  
  try {
    // 1. Ativar tenant e vitrine
    const tenantId = await activateBundle(supabase, affiliateId);
    
    // 2. Registrar serviços
    await registerAffiliateServices(supabase, affiliateId);
    
    // 3. Criar order_items para analytics (não bloqueia)
    await createBundleOrderItems(supabase, affiliateId, payment.value * 100);
    
    // 4. Enfileirar provisioning Evolution (async)
    await enqueueEvolutionProvisioning(supabase, tenantId, affiliateId);
    
    const processingTime = Date.now() - startTime;
    console.log('[Bundle] ✅ Bundle ativado com sucesso:', {
      affiliateId,
      tenantId,
      processingTimeMs: processingTime
    });
    
    return {
      success: true,
      tenantId,
      affiliateId,
      processingTimeMs: processingTime
    };
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('[Bundle] 💥 ERRO ao ativar bundle:', {
      error: error.message,
      stack: error.stack,
      affiliateId,
      processingTimeMs: processingTime
    });
    throw error;
  }
}

// ============================================================
// FIM DAS FUNÇÕES DE BUNDLE ACTIVATION
// ============================================================

/**
 * Processa upgrade de Individual Básico para Premium
 * Atualiza has_subscription, ativa bundle e cria notificação
 * @param {object} supabase - Cliente Supabase
 * @param {object} payment - Objeto de pagamento do Asaas
 */
async function handleUpgradePayment(supabase, payment) {
  const affiliateId = payment.externalReference.replace('affiliate_', '');
  
  console.log('[Upgrade] 🔄 Processing upgrade payment:', affiliateId);
  
  try {
    // 1. Update affiliate
    const { error: updateError } = await supabase
      .from('affiliates')
      .update({
        has_subscription: true,
        payment_status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', affiliateId);
    
    if (updateError) {
      console.error('[Upgrade] ❌ Error updating affiliate:', updateError);
      throw updateError;
    }
    
    console.log('[Upgrade] ✅ Affiliate updated to premium');
    
    // 2. Activate bundle
    const tenantId = await activateBundle(supabase, affiliateId);
    
    console.log('[Upgrade] ✅ Bundle activated:', tenantId);
    
    // 2.5. Create recurring subscription (if not exists)
    console.log('[Upgrade] 🔄 Checking for existing subscription...');
    
    try {
      // Check if subscription already exists
      const { data: existingSub } = await supabase
        .from('affiliate_payments')
        .select('id, asaas_subscription_id')
        .eq('affiliate_id', affiliateId)
        .eq('payment_type', 'monthly_subscription')
        .not('asaas_subscription_id', 'is', null)
        .single();
      
      if (existingSub) {
        console.log('[Upgrade] ℹ️ Subscription already exists:', existingSub.asaas_subscription_id);
      } else {
        // Fetch affiliate data
        const { data: affiliate } = await supabase
          .from('affiliates')
          .select('affiliate_type')
          .eq('id', affiliateId)
          .single();
        
        // Fetch product
        const { data: product } = await supabase
          .from('products')
          .select('monthly_fee_cents, name, billing_cycle')
          .eq('category', 'adesao_afiliado')
          .eq('eligible_affiliate_type', affiliate.affiliate_type)
          .eq('is_subscription', true)
          .eq('is_active', true)
          .single();
        
        if (product && product.monthly_fee_cents > 0) {
          // Calculate next due date (+30 days)
          const nextDueDate = new Date();
          nextDueDate.setDate(nextDueDate.getDate() + 30);
          const nextDueDateStr = nextDueDate.toISOString().split('T')[0];
          
          // Calculate split
          const splits = await calculateSplit(supabase, affiliateId, product.monthly_fee_cents / 100);
          
          // Create subscription in Asaas
          const subscriptionResponse = await fetch('https://api.asaas.com/v3/subscriptions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'access_token': process.env.ASAAS_API_KEY
            },
            body: JSON.stringify({
              customer: payment.customer,
              billingType: 'CREDIT_CARD',
              value: product.monthly_fee_cents / 100,
              cycle: product.billing_cycle?.toUpperCase() || 'MONTHLY',
              nextDueDate: nextDueDateStr,
              description: `Mensalidade - ${product.name}`,
              externalReference: `affiliate_${affiliateId}`,
              split: splits
            })
          });
          
          if (subscriptionResponse.ok) {
            const subscription = await subscriptionResponse.json();
            
            // Register subscription in affiliate_payments
            await supabase.from('affiliate_payments').insert({
              affiliate_id: affiliateId,
              payment_type: 'monthly_subscription',
              amount_cents: product.monthly_fee_cents,
              status: 'active',
              asaas_subscription_id: subscription.id,
              due_date: nextDueDateStr,
              created_at: new Date().toISOString()
            });
            
            console.log('[Upgrade] ✅ Recurring subscription created:', subscription.id);
          } else {
            const errorData = await subscriptionResponse.json();
            console.error('[Upgrade] ❌ Error creating subscription:', errorData);
          }
        }
      }
    } catch (subError) {
      console.error('[Upgrade] ⚠️ Error creating subscription (non-fatal):', subError);
      // Non-blocking - subscription can be created manually
    }
    
    // 3. Create notification
    await supabase.from('notifications').insert({
      affiliate_id: affiliateId,
      type: 'upgrade_success',
      title: 'Upgrade realizado com sucesso!',
      message: 'Sua conta foi atualizada para o Plano Premium. Agora você tem acesso à vitrine e agente IA.',
      link: '/afiliados/dashboard/loja',
      read: false,
      created_at: new Date().toISOString()
    });
    
    console.log('[Upgrade] ✅ Notification created');
    
    return { success: true, tenantId };
  } catch (error) {
    console.error('[Upgrade] 💥 Error processing upgrade:', error);
    throw error;
  }
}

/**
 * Processa cancelamento de assinatura
 * Atualiza has_subscription, desativa bundle e cria notificação
 * @param {object} supabase - Cliente Supabase
 * @param {object} payment - Objeto de pagamento do Asaas
 */
async function handleSubscriptionCancelled(supabase, payment) {
  const affiliateId = payment.externalReference.replace('affiliate_', '');
  
  console.log('[Cancel] 🔄 Processing subscription cancellation:', affiliateId);
  
  try {
    // 1. Update affiliate
    const { error: updateError } = await supabase
      .from('affiliates')
      .update({
        has_subscription: false,
        payment_status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', affiliateId);
    
    if (updateError) {
      console.error('[Cancel] ❌ Error updating affiliate:', updateError);
      throw updateError;
    }
    
    console.log('[Cancel] ✅ Affiliate downgraded to basic');
    
    // 2. Deactivate vitrine
    const { error: vitrineError } = await supabase
      .from('store_profiles')
      .update({
        is_visible_in_showcase: false,
        updated_at: new Date().toISOString()
      })
      .eq('affiliate_id', affiliateId);
    
    if (vitrineError) {
      console.error('[Cancel] ⚠️ Error deactivating vitrine:', vitrineError);
    } else {
      console.log('[Cancel] ✅ Vitrine deactivated');
    }
    
    // 3. Deactivate agent
    const { error: tenantError } = await supabase
      .from('multi_agent_tenants')
      .update({
        status: 'inactive',
        suspended_at: new Date().toISOString()
      })
      .eq('affiliate_id', affiliateId);
    
    if (tenantError) {
      console.error('[Cancel] ⚠️ Error deactivating agent:', tenantError);
    } else {
      console.log('[Cancel] ✅ Agent deactivated');
    }
    
    // 4. Create notification
    await supabase.from('notifications').insert({
      affiliate_id: affiliateId,
      type: 'subscription_cancelled',
      title: 'Assinatura cancelada',
      message: 'Sua assinatura foi cancelada. Você voltou para o Plano Básico. Pode reativar a qualquer momento.',
      link: '/afiliados/dashboard/assinatura',
      read: false,
      created_at: new Date().toISOString()
    });
    
    console.log('[Cancel] ✅ Notification created');
    
    return { success: true };
  } catch (error) {
    console.error('[Cancel] 💥 Error processing cancellation:', error);
    throw error;
  }
}

// ============================================================
// FIM DAS FUNÇÕES DE UPGRADE E CANCELAMENTO
// ============================================================

/**
 * Processa pagamento de pré-cadastro de afiliado (Payment First)
 * Cria conta Supabase Auth + registro em affiliates + rede genealógica
 * 
 * CRÍTICO: Segue padrão idêntico ao sistema Comademig (subscription-payment-flow)
 * - Usa password_hash diretamente da tabela payment_sessions
 * - NÃO envia senha temporária nem email de redefinição
 * - Usa email_confirm: true para confirmar email automaticamente
 */
async function handlePreRegistrationPayment(supabase, payment) {
  const startTime = Date.now();
  console.log('[WH-PreReg] 🚀 Iniciando processamento de pré-cadastro:', {
    paymentId: payment.id,
    externalRef: payment.externalReference,
    value: payment.value,
    status: payment.status
  });

  try {
    // ============================================================
    // ETAPA 1: IDEMPOTÊNCIA - Verificar se evento já foi processado
    // ============================================================
    const { data: existingEvent } = await supabase
      .from('subscription_webhook_events')
      .select('id, processed_at, user_id')
      .eq('asaas_event_id', payment.id)
      .eq('event_type', 'PAYMENT_CONFIRMED')
      .single();

    if (existingEvent) {
      console.log('[WH-PreReg] ⚠️ Evento já processado anteriormente:', {
        eventId: existingEvent.id,
        processedAt: existingEvent.processed_at,
        userId: existingEvent.user_id
      });
      return { 
        success: true, 
        duplicate: true, 
        userId: existingEvent.user_id,
        message: 'Evento já processado' 
      };
    }

    // ============================================================
    // ETAPA 2: Buscar sessão temporária
    // ============================================================
    // Extrair session_token do externalReference: "affiliate_pre_{session_token}"
    const sessionToken = payment.externalReference.replace('affiliate_pre_', '');
    
    const { data: session, error: sessionError } = await supabase
      .from('payment_sessions')
      .select('*')
      .eq('session_token', sessionToken)
      .single();

    if (sessionError || !session) {
      console.error('[WH-PreReg] ❌ Sessão temporária não encontrada:', {
        sessionToken,
        error: sessionError
      });
      throw new Error(`Sessão temporária não encontrada: ${sessionToken}`);
    }

    console.log('[WH-PreReg] ✅ Sessão temporária encontrada:', {
      sessionId: session.id,
      email: session.email,
      name: session.name,
      affiliateType: session.affiliate_type,
      hasReferralCode: !!session.referral_code
    });

    // ============================================================
    // ETAPA 3: Criar usuário no Supabase Auth
    // CRÍTICO: Usar password_hash diretamente (padrão Comademig)
    // ============================================================
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: session.email,
      password: session.password_hash, // Hash recuperado da tabela payment_sessions
      email_confirm: true, // Confirmar email automaticamente (sem envio de email)
      user_metadata: {
        name: session.name,
        phone: session.phone,
        affiliate_type: session.affiliate_type
      }
    });

    if (authError) {
      console.error('[WH-PreReg] ❌ Erro ao criar usuário Supabase Auth:', authError);
      throw new Error(`Falha ao criar usuário: ${authError.message}`);
    }

    const userId = authUser.user.id;
    console.log('[WH-PreReg] ✅ Usuário Supabase Auth criado:', {
      userId,
      email: session.email
    });

    // ============================================================
    // ETAPA 4: Gerar referral_code único
    // ============================================================
    const referralCode = await generateUniqueReferralCode(supabase);
    console.log('[WH-PreReg] ✅ Referral code gerado:', referralCode);

    // ============================================================
    // ETAPA 5: Resolver referred_by (se houver referral_code)
    // ============================================================
    let referredBy = null;
    if (session.referral_code) {
      const { data: referrer } = await supabase
        .from('affiliates')
        .select('id')
        .eq('referral_code', session.referral_code)
        .single();

      if (referrer) {
        referredBy = referrer.id;
        console.log('[WH-PreReg] ✅ Afiliado indicador encontrado:', {
          referralCode: session.referral_code,
          referrerId: referredBy
        });
      } else {
        console.warn('[WH-PreReg] ⚠️ Código de indicação não encontrado:', session.referral_code);
      }
    }

    // ============================================================
    // ETAPA 6: Criar registro em affiliates
    // ============================================================
    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .insert({
        user_id: userId,
        name: session.name,
        email: session.email,
        phone: session.phone,
        document: session.document,
        document_type: session.document_type,
        affiliate_type: session.affiliate_type,
        referral_code: referralCode,
        payment_status: 'active', // Pagamento confirmado
        status: 'active', // Afiliado ativo
        wallet_id: null, // Será configurado depois pelo afiliado
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (affiliateError) {
      console.error('[WH-PreReg] ❌ Erro ao criar registro em affiliates:', affiliateError);
      throw new Error(`Falha ao criar afiliado: ${affiliateError.message}`);
    }

    const affiliateId = affiliate.id;
    console.log('[WH-PreReg] ✅ Registro em affiliates criado:', {
      affiliateId,
      referralCode
    });

    // ============================================================
    // ETAPA 7: Criar rede genealógica (se houver indicador)
    // ============================================================
    if (referredBy) {
      // Buscar rede do indicador
      const { data: referrerNetwork } = await supabase
        .from('affiliate_network')
        .select('parent_id, level')
        .eq('affiliate_id', referredBy)
        .order('level', { ascending: true });

      const networkToInsert = [];

      // N1: Indicador direto
      networkToInsert.push({
        affiliate_id: affiliateId,
        parent_id: referredBy,
        level: 1,
        created_at: new Date().toISOString()
      });

      // N2 e N3: Ascendentes do indicador
      if (referrerNetwork && referrerNetwork.length > 0) {
        // N2: Pai do indicador
        networkToInsert.push({
          affiliate_id: affiliateId,
          parent_id: referrerNetwork[0].parent_id,
          level: 2,
          created_at: new Date().toISOString()
        });

        // N3: Avô do indicador
        if (referrerNetwork.length > 1) {
          networkToInsert.push({
            affiliate_id: affiliateId,
            parent_id: referrerNetwork[1].parent_id,
            level: 3,
            created_at: new Date().toISOString()
          });
        }
      }

      const { error: networkError } = await supabase
        .from('affiliate_network')
        .insert(networkToInsert);

      if (networkError) {
        console.error('[WH-PreReg] ❌ Erro ao criar rede genealógica:', networkError);
        // NÃO bloqueia - rede pode ser criada manualmente depois
      } else {
        console.log('[WH-PreReg] ✅ Rede genealógica criada:', {
          affiliateId,
          levels: networkToInsert.length
        });
      }
    }

    // ============================================================
    // ETAPA 8: Registrar pagamento em affiliate_payments
    // ============================================================
    const { error: paymentError } = await supabase
      .from('affiliate_payments')
      .insert({
        affiliate_id: affiliateId,
        asaas_payment_id: payment.id,
        payment_type: session.affiliate_type === 'individual' ? 'membership_fee' : 'membership_fee',
        amount_cents: Math.round(payment.value * 100),
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      });

    if (paymentError) {
      console.error('[WH-PreReg] ❌ Erro ao registrar pagamento:', paymentError);
      // NÃO bloqueia - pagamento pode ser registrado manualmente
    } else {
      console.log('[WH-PreReg] ✅ Pagamento registrado em affiliate_payments');
    }

    // ============================================================
    // ETAPA 8.5: CRIAR ASSINATURA RECORRENTE (SE APLICÁVEL)
    // ============================================================
    if (session.affiliate_type === 'logista' || session.has_subscription) {
      console.log('[WH-PreReg] 🔄 Criando assinatura recorrente...');
      
      try {
        // Buscar produto para obter monthly_fee_cents
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('monthly_fee_cents, name, billing_cycle')
          .eq('category', 'adesao_afiliado')
          .eq('eligible_affiliate_type', session.affiliate_type)
          .eq('is_subscription', true)
          .eq('is_active', true)
          .single();
        
        if (productError || !product) {
          console.error('[WH-PreReg] ⚠️ Produto de assinatura não encontrado:', productError);
          // NÃO bloqueia - assinatura pode ser criada manualmente
        } else if (product.monthly_fee_cents > 0) {
          // Calcular próxima cobrança (+30 dias)
          const nextDueDate = new Date();
          nextDueDate.setDate(nextDueDate.getDate() + 30);
          const nextDueDateStr = nextDueDate.toISOString().split('T')[0];
          
          // Calcular split
          const splits = await calculateSplit(supabase, affiliateId, product.monthly_fee_cents / 100);
          
          // Criar assinatura no Asaas
          const subscriptionResponse = await fetch('https://api.asaas.com/v3/subscriptions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'access_token': process.env.ASAAS_API_KEY
            },
            body: JSON.stringify({
              customer: payment.customer,
              billingType: 'CREDIT_CARD', // Padrão para recorrência
              value: product.monthly_fee_cents / 100,
              cycle: product.billing_cycle?.toUpperCase() || 'MONTHLY',
              nextDueDate: nextDueDateStr,
              description: `Mensalidade - ${product.name}`,
              externalReference: `affiliate_${affiliateId}`,
              split: splits
            })
          });
          
          if (subscriptionResponse.ok) {
            const subscription = await subscriptionResponse.json();
            
            // Registrar assinatura em affiliate_payments
            const { error: subError } = await supabase
              .from('affiliate_payments')
              .insert({
                affiliate_id: affiliateId,
                payment_type: 'monthly_subscription',
                amount_cents: product.monthly_fee_cents,
                status: 'active',
                asaas_subscription_id: subscription.id,
                due_date: nextDueDateStr,
                created_at: new Date().toISOString()
              });
            
            if (subError) {
              console.error('[WH-PreReg] ❌ Erro ao registrar assinatura no banco:', subError);
            } else {
              console.log('[WH-PreReg] ✅ Assinatura recorrente criada:', {
                subscriptionId: subscription.id,
                nextDueDate: nextDueDateStr,
                value: product.monthly_fee_cents / 100
              });
            }
          } else {
            const errorData = await subscriptionResponse.json();
            console.error('[WH-PreReg] ❌ Erro ao criar assinatura no Asaas:', errorData);
          }
        }
      } catch (subError) {
        console.error('[WH-PreReg] ⚠️ Erro ao criar assinatura (não fatal):', subError);
        // NÃO bloqueia - assinatura pode ser criada manualmente
      }
    }

    // ============================================================
    // ETAPA 9: Calcular e salvar comissões
    // ============================================================
    try {
      await calculateAndSaveCommissions(supabase, affiliateId, Math.round(payment.value * 100), 'membership_fee');
      console.log('[WH-PreReg] ✅ Comissões calculadas e salvas');
    } catch (commError) {
      console.error('[WH-PreReg] ⚠️ Erro ao calcular comissões (não fatal):', commError);
      // NÃO bloqueia - comissões podem ser calculadas manualmente
    }

    // ============================================================
    // ETAPA 10: Deletar sessão temporária
    // ============================================================
    const { error: deleteError } = await supabase
      .from('payment_sessions')
      .delete()
      .eq('session_token', sessionToken);

    if (deleteError) {
      console.error('[WH-PreReg] ⚠️ Erro ao deletar sessão temporária (não fatal):', deleteError);
      // NÃO bloqueia - sessão expira automaticamente em 30 minutos
    } else {
      console.log('[WH-PreReg] ✅ Sessão temporária deletada');
    }

    // ============================================================
    // ETAPA 11: Registrar evento processado (idempotência)
    // ============================================================
    const { error: eventError } = await supabase
      .from('subscription_webhook_events')
      .insert({
        asaas_event_id: payment.id,
        event_type: 'PAYMENT_CONFIRMED',
        payload: JSON.stringify(payment),
        processed_at: new Date().toISOString(),
        processing_time_ms: Date.now() - startTime,
        user_id: userId
      });

    if (eventError) {
      console.error('[WH-PreReg] ⚠️ Erro ao registrar evento (não fatal):', eventError);
      // NÃO bloqueia - evento foi processado com sucesso
    }

    // ============================================================
    // ETAPA 12: Enviar notificação de boas-vindas
    // ============================================================
    try {
      await supabase.from('notifications').insert({
        affiliate_id: affiliateId,
        type: 'welcome',
        title: 'Bem-vindo ao Slim Quality!',
        message: `Olá ${session.name}! Sua conta foi ativada com sucesso. Seu código de indicação é: ${referralCode}`,
        read: false,
        created_at: new Date().toISOString()
      });
      console.log('[WH-PreReg] ✅ Notificação de boas-vindas enviada');
    } catch (notifError) {
      console.error('[WH-PreReg] ⚠️ Erro ao enviar notificação (não fatal):', notifError);
      // NÃO bloqueia
    }

    // ============================================================
    // ETAPA 13: Sucesso final
    // ============================================================
    const processingTime = Date.now() - startTime;
    console.log('[WH-PreReg] ✅ Processamento concluído com sucesso:', {
      paymentId: payment.id,
      userId,
      affiliateId,
      referralCode,
      hasNetwork: !!referredBy,
      processingTimeMs: processingTime
    });

    return {
      success: true,
      userId,
      affiliateId,
      referralCode,
      processingTimeMs: processingTime
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('[WH-PreReg] 💥 ERRO FATAL:', {
      error: error.message,
      stack: error.stack,
      paymentId: payment.id,
      processingTimeMs: processingTime
    });

    // Registrar erro para auditoria
    await supabase.from('subscription_webhook_events').insert({
      asaas_event_id: payment.id,
      event_type: 'PAYMENT_CONFIRMED',
      payload: JSON.stringify(payment),
      error_message: error.message,
      processed_at: new Date().toISOString(),
      processing_time_ms: processingTime
    }).catch(err => {
      console.error('[WH-PreReg] ❌ Falha ao registrar erro:', err);
    });

    throw error; // Re-lançar para tratamento upstream
  }
}

/**
 * Gera código de indicação único (6 caracteres alfanuméricos)
 * Formato: ABC123 (3 letras + 3 números)
 */
async function generateUniqueReferralCode(supabase) {
  const maxAttempts = 10;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Gerar código: 3 letras + 3 números
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    
    let code = '';
    for (let i = 0; i < 3; i++) {
      code += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    for (let i = 0; i < 3; i++) {
      code += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }

    // Verificar se já existe
    const { data: existing } = await supabase
      .from('affiliates')
      .select('id')
      .eq('referral_code', code)
      .single();

    if (!existing) {
      return code;
    }

    console.log('[generateReferralCode] ⚠️ Código duplicado, tentando novamente:', code);
  }

  throw new Error('Falha ao gerar código de indicação único após 10 tentativas');
}

/**
 * Calcula e salva comissões para pagamento de afiliado
 * Comissões: 10% Slim + N1(15%) + N2(3%) + N3(2%) + Renum/JB (restante 50/50)
 */
async function calculateAndSaveCommissions(supabase, affiliate_id, amount_cents, payment_type) {
  console.log('[calculateCommissions] 🔄 Calculando comissões:', {
    affiliateId: affiliate_id,
    amountCents: amount_cents,
    paymentType: payment_type
  });

  // Buscar rede genealógica
  const { data: network } = await supabase
    .from('affiliate_network')
    .select('parent_id, level')
    .eq('affiliate_id', affiliate_id)
    .order('level', { ascending: true });

  const amount = amount_cents / 100;

  // Comissões: 10% Slim + N1(15%) + N2(3%) + N3(2%) + Renum/JB (restante 50/50)
  const commissions = {
    slim: amount * 0.10,
    n1: amount * 0.15,
    n2: amount * 0.03,
    n3: amount * 0.02,
    renum: amount * 0.05, // Base 5%
    jb: amount * 0.05     // Base 5%
  };

  // Calcular redistribuição
  let available = amount * 0.20; // 20% para N1+N2+N3
  let used = 0;

  const commissionsToSave = [];

  if (network && network.length > 0) {
    // N1 existe e está ativo
    const { data: n1Affiliate } = await supabase
      .from('affiliates')
      .select('payment_status')
      .eq('id', network[0].parent_id)
      .single();

    if (n1Affiliate && n1Affiliate.payment_status === 'active') {
      used += commissions.n1;
      commissionsToSave.push({
        affiliate_id: network[0].parent_id,
        order_id: null,
        payment_id: affiliate_id,
        level: 1,
        amount_cents: Math.round(commissions.n1 * 100),
        status: 'pending',
        created_at: new Date().toISOString()
      });
    }

    // N2 existe e está ativo
    if (network.length > 1) {
      const { data: n2Affiliate } = await supabase
        .from('affiliates')
        .select('payment_status')
        .eq('id', network[1].parent_id)
        .single();

      if (n2Affiliate && n2Affiliate.payment_status === 'active') {
        used += commissions.n2;
        commissionsToSave.push({
          affiliate_id: network[1].parent_id,
          order_id: null,
          payment_id: affiliate_id,
          level: 2,
          amount_cents: Math.round(commissions.n2 * 100),
          status: 'pending',
          created_at: new Date().toISOString()
        });
      }
    }

    // N3 existe e está ativo
    if (network.length > 2) {
      const { data: n3Affiliate } = await supabase
        .from('affiliates')
        .select('payment_status')
        .eq('id', network[2].parent_id)
        .single();

      if (n3Affiliate && n3Affiliate.payment_status === 'active') {
        used += commissions.n3;
        commissionsToSave.push({
          affiliate_id: network[2].parent_id,
          order_id: null,
          payment_id: affiliate_id,
          level: 3,
          amount_cents: Math.round(commissions.n3 * 100),
          status: 'pending',
          created_at: new Date().toISOString()
        });
      }
    }
  }

  // Redistribuir o que não foi usado para Renum e JB
  const remaining = available - used;
  commissions.renum += remaining / 2;
  commissions.jb += remaining / 2;

  // Salvar comissões
  if (commissionsToSave.length > 0) {
    const { error: commError } = await supabase
      .from('commissions')
      .insert(commissionsToSave);

    if (commError) {
      console.error('[calculateCommissions] ❌ Erro ao salvar comissões:', commError);
      throw commError;
    }

    console.log('[calculateCommissions] ✅ Comissões salvas:', {
      count: commissionsToSave.length,
      totalCents: commissionsToSave.reduce((sum, c) => sum + c.amount_cents, 0)
    });
  } else {
    console.log('[calculateCommissions] ℹ️ Nenhuma comissão a salvar (rede vazia ou inativa)');
  }

  // Registrar comissões de gestores (Renum e JB)
  // TODO: Implementar quando houver tabela de gestores ou wallet_ids configurados
  console.log('[calculateCommissions] ℹ️ Comissões de gestores:', {
    renum: commissions.renum,
    jb: commissions.jb
  });
}

/**
 * Processa pagamentos Payment First (sem assinatura tradicional)
 */
async function handlePaymentFirstConfirmed(supabase, payment) {
  const startTime = Date.now();
  console.log('[WH-PaymentFirst] 🚀 Iniciando processamento:', {
    paymentId: payment.id,
    externalRef: payment.externalReference,
    value: payment.value
  });

  try {
    // ============================================================
    // ETAPA 1: IDEMPOTÊNCIA - Verificar se evento já foi processado
    // ============================================================
    const { data: existingEvent } = await supabase
      .from('subscription_webhook_events')
      .select('id, processed_at')
      .eq('asaas_event_id', payment.id)
      .eq('event_type', 'PAYMENT_CONFIRMED')
      .single();

    if (existingEvent) {
      console.log('[WH-PaymentFirst] ⚠️ Evento já processado anteriormente:', {
        eventId: existingEvent.id,
        processedAt: existingEvent.processed_at
      });
      return { 
        success: true, 
        duplicate: true, 
        message: 'Evento já processado' 
      };
    }

    // ============================================================
    // ETAPA 2: Atualizar subscription_orders
    // ============================================================
    const { data: order, error: orderError } = await supabase
      .from('subscription_orders')
      .update({ 
        status: 'active',
        confirmed_at: new Date().toISOString(),
        asaas_confirmed_value: payment.value
      })
      .eq('asaas_payment_id', payment.id)
      .select('id, user_id, affiliate_data')
      .single();

    if (orderError || !order) {
      console.error('[WH-PaymentFirst] ❌ Erro ao atualizar subscription_orders:', orderError);
      throw new Error(`Pedido não encontrado para payment_id: ${payment.id}`);
    }

    console.log('[WH-PaymentFirst] ✅ subscription_orders atualizada:', {
      orderId: order.id,
      userId: order.user_id,
      status: 'active'
    });

    // ============================================================
    // ETAPA 3: Buscar/Ativar tenant
    // ============================================================
    const { data: tenant, error: tenantError } = await supabase
      .from('multi_agent_tenants')
      .select('id, status')
      .eq('affiliate_id', order.user_id)
      .single();

    if (tenantError || !tenant) {
      console.warn('[WH-PaymentFirst] ⚠️ Tenant não encontrado para user_id:', order.user_id);
      // NÃO bloqueia - pode ser criado depois manualmente
    } else {
      // Ativar tenant
      const { error: activateError } = await supabase
        .from('multi_agent_tenants')
        .update({
          status: 'active',
          activated_at: new Date().toISOString(),
          last_payment_at: new Date().toISOString()
        })
        .eq('id', tenant.id);

      if (activateError) {
        console.error('[WH-PaymentFirst] ❌ Erro ao ativar tenant:', activateError);
      } else {
        console.log('[WH-PaymentFirst] ✅ Tenant ativado:', {
          tenantId: tenant.id,
          previousStatus: tenant.status,
          newStatus: 'active'
        });
      }
    }

    // ============================================================
    // ETAPA 4: Registrar evento processado (idempotência)
    // ============================================================
    const { error: eventError } = await supabase
      .from('subscription_webhook_events')
      .insert({
        asaas_event_id: payment.id,
        event_type: 'PAYMENT_CONFIRMED',
        payload: JSON.stringify(payment),
        processed_at: new Date().toISOString(),
        processing_time_ms: Date.now() - startTime,
        order_id: order.id,
        user_id: order.user_id
      });

    if (eventError) {
      console.error('[WH-PaymentFirst] ⚠️ Erro ao registrar evento (não fatal):', eventError);
      // NÃO bloqueia - evento foi processado com sucesso
    }

    // ============================================================
    // ETAPA 5: Sucesso final
    // ============================================================
    const processingTime = Date.now() - startTime;
    console.log('[WH-PaymentFirst] ✅ Processamento concluído:', {
      paymentId: payment.id,
      orderId: order.id,
      processingTimeMs: processingTime
    });

    return {
      success: true,
      orderId: order.id,
      tenantActivated: !!tenant,
      processingTimeMs: processingTime
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('[WH-PaymentFirst] 💥 ERRO FATAL:', {
      error: error.message,
      stack: error.stack,
      paymentId: payment.id,
      processingTimeMs: processingTime
    });

    // Registrar erro para auditoria
    await supabase.from('subscription_webhook_events').insert({
      asaas_event_id: payment.id,
      event_type: 'PAYMENT_CONFIRMED',
      payload: JSON.stringify(payment),
      error_message: error.message,
      processed_at: new Date().toISOString(),
      processing_time_ms: processingTime
    }).catch(err => {
      console.error('[WH-PaymentFirst] ❌ Falha ao registrar erro:', err);
    });

    throw error; // Re-lançar para tratamento upstream
  }
}
