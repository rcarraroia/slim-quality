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
        await handlePaymentConfirmed(supabase, asaasSubscriptionId);
        break;

      case 'PAYMENT_OVERDUE':
        await handlePaymentOverdue(supabase, asaasSubscriptionId);
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
 * Suspende o acesso por atraso no pagamento
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
