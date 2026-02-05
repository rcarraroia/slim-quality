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
function validateWebhookSignature(payload: string, signature: string, secret: string): boolean {
  // Implementação da validação de assinatura do Asaas
  // Por segurança, sempre validar a assinatura em produção
  try {
    // O Asaas usa HMAC-SHA256 para assinar os webhooks
    const crypto = globalThis.crypto;
    if (!crypto || !crypto.subtle) {
      console.warn('[process-webhook] Crypto API not available, skipping signature validation');
      return true; // Em desenvolvimento, pode pular validação
    }

    // TODO: Implementar validação HMAC-SHA256 quando necessário
    // Por enquanto, aceitar todos os webhooks (desenvolvimento)
    return true;
  } catch (error) {
    console.error('[process-webhook] Signature validation error:', error);
    return false;
  }
}

Deno.serve(async (req: Request) => {
  // Verificar método HTTP
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    // Ler o corpo da requisição
    const rawPayload = await req.text();
    
    // Validar assinatura do webhook (se configurada)
    const signature = req.headers.get('asaas-signature') || '';
    const webhookSecret = Deno.env.get('ASAAS_WEBHOOK_SECRET') || '';
    
    if (webhookSecret && !validateWebhookSignature(rawPayload, signature, webhookSecret)) {
      console.error('[process-webhook] Invalid webhook signature');
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse do payload JSON
    const webhookData: AsaasWebhookPayload = JSON.parse(rawPayload);
    
    console.log(`[process-webhook] Received event: ${webhookData.event} for payment: ${webhookData.payment.id}`);

    // Configurar Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verificar idempotência - evitar processar o mesmo webhook múltiplas vezes
    const webhookId = `${webhookData.event}_${webhookData.payment.id}_${webhookData.payment.dateCreated}`;
    
    const { data: existingWebhook } = await supabase
      .from('webhook_logs')
      .select('id')
      .eq('webhook_id', webhookId)
      .single();

    if (existingWebhook) {
      console.log(`[process-webhook] Webhook already processed: ${webhookId}`);
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Webhook already processed',
          webhookId
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Registrar webhook no log
    const { error: logError } = await supabase
      .from('webhook_logs')
      .insert({
        id: crypto.randomUUID(),
        webhook_id: webhookId,
        event_type: webhookData.event,
        payment_id: webhookData.payment.id,
        payload: webhookData,
        processed_at: new Date().toISOString(),
        status: 'processing'
      });

    if (logError) {
      console.error('[process-webhook] Error logging webhook:', logError);
    }

    // Processar diferentes tipos de eventos
    let processResult = { success: false, message: 'Event not handled' };

    switch (webhookData.event) {
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED':
        processResult = await handlePaymentConfirmed(supabase, webhookData);
        break;
        
      case 'PAYMENT_OVERDUE':
      case 'PAYMENT_REFUNDED':
        processResult = await handlePaymentFailed(supabase, webhookData);
        break;
        
      case 'PAYMENT_CREATED':
      case 'PAYMENT_UPDATED':
        processResult = await handlePaymentUpdated(supabase, webhookData);
        break;
        
      default:
        console.log(`[process-webhook] Event ${webhookData.event} not handled, but logged`);
        processResult = { success: true, message: `Event ${webhookData.event} logged but not processed` };
    }

    // Atualizar status do webhook log
    await supabase
      .from('webhook_logs')
      .update({ 
        status: processResult.success ? 'completed' : 'failed',
        result: processResult
      })
      .eq('webhook_id', webhookId);

    console.log(`[process-webhook] Processing result:`, processResult);

    return new Response(
      JSON.stringify({
        success: processResult.success,
        message: processResult.message,
        webhookId,
        event: webhookData.event,
        paymentId: webhookData.payment.id,
        timestamp: new Date().toISOString()
      }),
      {
        status: processResult.success ? 200 : 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type, asaas-signature'
        }
      }
    );

  } catch (error) {
    console.error('[process-webhook] Unexpected error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});

// Função para processar pagamento confirmado
async function handlePaymentConfirmed(supabase: any, webhookData: AsaasWebhookPayload) {
  try {
    const payment = webhookData.payment;
    
    console.log(`[handlePaymentConfirmed] Processing confirmed payment: ${payment.id}`);

    // Buscar assinatura relacionada pelo externalReference (correlation_id)
    if (payment.externalReference) {
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('correlation_id', payment.externalReference)
        .single();

      if (subscription && !subError) {
        // Atualizar status da assinatura
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            last_payment_date: payment.paymentDate || payment.clientPaymentDate,
            updated_at: new Date().toISOString()
          })
          .eq('id', subscription.id);

        if (updateError) {
          console.error('[handlePaymentConfirmed] Error updating subscription:', updateError);
          return { success: false, message: 'Failed to update subscription' };
        }

        console.log(`[handlePaymentConfirmed] Subscription ${subscription.id} activated`);
        return { success: true, message: 'Subscription activated successfully' };
      }
    }

    // Se não encontrou assinatura, apenas registrar o pagamento
    console.log(`[handlePaymentConfirmed] No subscription found for payment ${payment.id}`);
    return { success: true, message: 'Payment confirmed, no subscription to update' };

  } catch (error) {
    console.error('[handlePaymentConfirmed] Error:', error);
    return { success: false, message: error.message };
  }
}

// Função para processar pagamento falhado
async function handlePaymentFailed(supabase: any, webhookData: AsaasWebhookPayload) {
  try {
    const payment = webhookData.payment;
    
    console.log(`[handlePaymentFailed] Processing failed payment: ${payment.id} (${payment.status})`);

    // Buscar assinatura relacionada
    if (payment.externalReference) {
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('correlation_id', payment.externalReference)
        .single();

      if (subscription && !subError) {
        // Atualizar status da assinatura para suspenso ou cancelado
        const newStatus = payment.status === 'OVERDUE' ? 'past_due' : 'cancelled';
        
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', subscription.id);

        if (updateError) {
          console.error('[handlePaymentFailed] Error updating subscription:', updateError);
          return { success: false, message: 'Failed to update subscription status' };
        }

        console.log(`[handlePaymentFailed] Subscription ${subscription.id} status updated to ${newStatus}`);
        return { success: true, message: `Subscription status updated to ${newStatus}` };
      }
    }

    return { success: true, message: 'Payment failure processed, no subscription to update' };

  } catch (error) {
    console.error('[handlePaymentFailed] Error:', error);
    return { success: false, message: error.message };
  }
}

// Função para processar atualizações de pagamento
async function handlePaymentUpdated(supabase: any, webhookData: AsaasWebhookPayload) {
  try {
    const payment = webhookData.payment;
    
    console.log(`[handlePaymentUpdated] Processing payment update: ${payment.id} (${payment.status})`);

    // Apenas registrar a atualização, sem ações específicas
    return { success: true, message: 'Payment update logged successfully' };

  } catch (error) {
    console.error('[handlePaymentUpdated] Error:', error);
    return { success: false, message: error.message };
  }
}