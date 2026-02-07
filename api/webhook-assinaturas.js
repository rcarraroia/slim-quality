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
    
    // Extrair ID da assinatura (pode vir no campo subscription do pagamento ou no objeto subscription direto)
    const asaasSubscriptionId = subscriptionData?.id || payment?.subscription;

    console.log(`[WH-Assinaturas] 🔔 Evento ${eventType} recebido para Assinatura ${asaasSubscriptionId}`);

    if (!asaasSubscriptionId) {
      // Verificar se é Payment First via externalReference
      const externalRef = payment?.externalReference;
      if (externalRef && externalRef.startsWith('subscription_')) {
        console.log('[WH-Assinaturas] 🔄 Processando Payment First:', externalRef);
        await handlePaymentFirstConfirmed(supabase, payment);
        return res.status(200).json({ success: true, type: 'payment_first' });
      }
      
      console.log('[WH-Assinaturas] ⚠️ Evento ignorado: não é assinatura nem Payment First');
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
        status: 'active'
      })
      .eq('asaas_payment_id', payment.id)
      .select('id, affiliate_n1_id, customer_email')
      .single();

    if (orderError || !order) {
      console.error('[WH-PaymentFirst] ❌ Erro ao atualizar subscription_orders:', orderError);
      throw new Error(`Pedido não encontrado para payment_id: ${payment.id}`);
    }

    console.log('[WH-PaymentFirst] ✅ subscription_orders atualizada:', {
      orderId: order.id,
      customerEmail: order.customer_email,
      status: 'active'
    });

    // ============================================================
    // ETAPA 3: Buscar/Ativar tenant
    // ============================================================
    const { data: tenant, error: tenantError } = await supabase
      .from('multi_agent_tenants')
      .select('id, status')
      .eq('affiliate_id', order.affiliate_n1_id)
      .single();

    if (tenantError || !tenant) {
      console.warn('[WH-PaymentFirst] ⚠️ Tenant não encontrado para customer_email:', order.customer_email);
      // NÃO bloqueia - pode ser criado depois manualmente
    } else {
      // Ativar tenant
      const { error: activateError } = await supabase
        .from('multi_agent_tenants')
        .update({
          status: 'active',
          activated_at: new Date().toISOString()
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
        processing_result: { processing_time_ms: Date.now() - startTime },
        subscription_order_id: order.id
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
      processing_result: { processing_time_ms: processingTime }
    }).catch(err => {
      console.error('[WH-PaymentFirst] ❌ Falha ao registrar erro:', err);
    });

    throw error; // Re-lançar para tratamento upstream
  }
}
