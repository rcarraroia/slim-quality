import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

interface AsaasWebhookPayload {
  event: 'PAYMENT_CREATED' | 'PAYMENT_UPDATED' | 'PAYMENT_CONFIRMED' | 'PAYMENT_RECEIVED' | 'PAYMENT_OVERDUE' | 'PAYMENT_DELETED' | 'PAYMENT_RESTORED' | 'PAYMENT_REFUNDED' | 'PAYMENT_RECEIVED_IN_CASH' | 'PAYMENT_CHARGEBACK_REQUESTED' | 'PAYMENT_CHARGEBACK_DISPUTE' | 'PAYMENT_AWAITING_CHARGEBACK_REVERSAL' | 'PAYMENT_DUNNING_RECEIVED' | 'PAYMENT_DUNNING_REQUESTED' | 'PAYMENT_BANK_SLIP_VIEWED' | 'PAYMENT_CHECKOUT_VIEWED';
  payment: {
    object: string;
    id: string;
    dateCreated: string;
    customer: string;
    subscription?: string;
    installment?: string;
    paymentLink: string;
    value: number;
    netValue: number;
    originalValue?: number;
    interestValue?: number;
    description: string;
    billingType: 'BOLETO' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'TRANSFER' | 'DEPOSIT' | 'PIX' | 'UNDEFINED';
    status: 'PENDING' | 'RECEIVED' | 'CONFIRMED' | 'OVERDUE' | 'REFUNDED' | 'RECEIVED_IN_CASH' | 'REFUND_REQUESTED' | 'REFUND_IN_PROGRESS' | 'CHARGEBACK_REQUESTED' | 'CHARGEBACK_DISPUTE' | 'AWAITING_CHARGEBACK_REVERSAL' | 'DUNNING_REQUESTED' | 'DUNNING_RECEIVED' | 'AWAITING_RISK_ANALYSIS';
    dueDate: string;
    originalDueDate: string;
    paymentDate?: string;
    clientPaymentDate?: string;
    installmentNumber?: number;
    invoiceUrl: string;
    invoiceNumber?: string;
    externalReference?: string;
    deleted: boolean;
    anticipated: boolean;
    anticipable: boolean;
  };
}

// Função para validar assinatura do webhook
async function validateWebhookSignature(payload: string, signature: string, secret: string): Promise<boolean> {
  if (!secret) return true; // Se não houver segredo, assume desenvolvimento

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify", "sign"]
    );

    const data = encoder.encode(payload);
    const signatureBytes = new Uint8Array(
      signature.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
    );

    return await crypto.subtle.verify("HMAC", key, signatureBytes, data);
  } catch (error) {
    console.error('[process-webhook] Signature validation error:', error);
    return false;
  }
}

Deno.serve(async (req: Request) => {
  // 1. Verificar método HTTP
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const rawPayload = await req.text();
    const signature = req.headers.get('asaas-signature') || '';
    const webhookToken = Deno.env.get('ASAAS_WEBHOOK_TOKEN') || ''; // Usar o mesmo token/segredo do sistema antigo se necessário

    // 2. Validar assinatura
    if (webhookToken && !await validateWebhookSignature(rawPayload, signature, webhookToken)) {
      console.error('[process-webhook] Unauthorized: Invalid signature');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const webhookData: AsaasWebhookPayload = JSON.parse(rawPayload);
    const eventType = webhookData.event;
    const payment = webhookData.payment;

    console.log(`[process-webhook] Received ${eventType} for payment ${payment.id}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 3. Idempotência com asaas_event_id em subscription_webhook_events
    const { data: existingEvent } = await supabase
      .from('subscription_webhook_events')
      .select('id')
      .eq('asaas_event_id', payment.id)
      .eq('event_type', eventType)
      .single();

    if (existingEvent) {
      console.log(`[process-webhook] Event ${payment.id} already processed. Skipping.`);
      return new Response(JSON.stringify({ success: true, message: 'Already processed' }), { status: 200 });
    }

    // 4. Processar Evento
    let result = { success: false, message: 'Unhandled event' };

    if (eventType === 'PAYMENT_CONFIRMED' || eventType === 'PAYMENT_RECEIVED') {
      result = await handlePaymentConfirmedReal(supabase, webhookData);
    } else if (eventType === 'PAYMENT_OVERDUE') {
      result = await handlePaymentStatusChange(supabase, payment, 'overdue');
    } else if (eventType === 'PAYMENT_REFUNDED') {
      result = await handlePaymentStatusChange(supabase, payment, 'refunded');
    } else {
      result = { success: true, message: 'Event logged only' };
    }

    // 5. Registrar em subscription_webhook_events para idempotência de auditoria
    await supabase.from('subscription_webhook_events').insert({
      asaas_event_id: payment.id,
      event_type: eventType,
      payload: webhookData,
      processed_at: new Date().toISOString(),
      processing_result: result,
      asaas_payment_id: payment.id,
      asaas_subscription_id: payment.subscription
    });

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 500,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[process-webhook] Critical Error:', error);
    return new Response(JSON.stringify({ error: 'Internal Error', details: error.message }), { status: 500 });
  }
});

/**
 * Lógica consolidada de processamento de pagamento confirmado
 * Ativa pedidos, assinaturas e tenants
 */
async function handlePaymentConfirmedReal(supabase: any, webhookData: AsaasWebhookPayload) {
  const payment = webhookData.payment;
  const externalRef = payment.externalReference;

  console.log(`[WH-Logic] Confirming payment: ${payment.id} (Ref: ${externalRef})`);

  try {
    // A. Ativar subscription_orders (Payment First ou Regular)
    const { data: order, error: orderError } = await supabase
      .from('subscription_orders')
      .update({ status: 'active' })
      .eq('asaas_payment_id', payment.id)
      .select('id, affiliate_n1_id, asaas_subscription_id')
      .single();

    if (orderError) {
      console.warn(`[WH-Logic] Order update warning: ${orderError.message}`);
    }

    // B. Ativar Tenant se houver afiliado vinculado (Legado do sistema antigo)
    if (order?.affiliate_n1_id) {
      await supabase
        .from('multi_agent_tenants')
        .update({ status: 'active', activated_at: new Date().toISOString() })
        .eq('affiliate_id', order.affiliate_n1_id);

      console.log(`[WH-Logic] Tenant activated for affiliate ${order.affiliate_n1_id}`);
    }

    // C. Ativar multi_agent_subscriptions
    const subId = payment.subscription || order?.asaas_subscription_id;
    if (subId) {
      await supabase
        .from('multi_agent_subscriptions')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('asaas_subscription_id', subId);

      console.log(`[WH-Logic] multi_agent_subscriptions activated for ID: ${subId}`);
    }

    // D. Ativar assinaturas genéricas (Tabela legacy usada em algumas fxs)
    if (externalRef) {
      await supabase
        .from('subscriptions')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('correlation_id', externalRef);
    }

    return { success: true, message: 'Access activated across all systems' };

  } catch (err) {
    console.error('[WH-Logic] Activation failure:', err);
    return { success: false, message: err.message };
  }
}

/**
 * Handle status changes (suspended, canceled, etc)
 */
async function handlePaymentStatusChange(supabase: any, payment: any, status: string) {
  const subId = payment.subscription;
  if (!subId) return { success: true, message: 'No subscription ID to update' };

  await supabase
    .from('multi_agent_subscriptions')
    .update({ status })
    .eq('asaas_subscription_id', subId);

  // Se atrasado, suspende o tenant
  if (status === 'overdue') {
    const { data: sub } = await supabase
      .from('multi_agent_subscriptions')
      .select('tenant_id')
      .eq('asaas_subscription_id', subId)
      .single();

    if (sub?.tenant_id) {
      await supabase
        .from('multi_agent_tenants')
        .update({ status: 'suspended', suspended_at: new Date().toISOString() })
        .eq('id', sub.tenant_id);
    }
  }

  return { success: true, message: `Status updated to ${status}` };
}
