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
      console.log('[WH-Assinaturas] ⚠️ Evento ignorado: asaasSubscriptionId não encontrado');
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
    console.error('[WH-Assinaturas] ❌ Erro crítico:', error);
    return res.status(200).json({ error: error.message }); // 200 para o Asaas não repetir infinitamente
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
