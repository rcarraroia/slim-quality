/**
 * Webhook Asaas - Recebe notificações de pagamento
 * Atualiza status do pedido e pagamento no Supabase quando pagamento é confirmado
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, asaas-access-token');

  // Preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Apenas POST permitido
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Inicializar Supabase
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase não configurado');
    return res.status(500).json({ error: 'Supabase não configurado' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const event = req.body;
    
    console.log('=== WEBHOOK ASAAS RECEBIDO ===');
    console.log('Evento:', JSON.stringify(event, null, 2));

    // Validar que é um evento de pagamento
    if (!event || !event.event || !event.payment) {
      console.log('Evento inválido ou não é de pagamento');
      return res.status(200).json({ received: true, message: 'Evento ignorado' });
    }

    const { event: eventType, payment } = event;
    const orderId = payment.externalReference;
    const asaasPaymentId = payment.id;

    // Registrar webhook no log (sempre, mesmo sem orderId)
    await logWebhook(supabase, {
      asaasEventId: `${eventType}_${asaasPaymentId}_${Date.now()}`,
      eventType,
      payload: event,
      tokenValid: true,
      asaasPaymentId,
      orderId
    });

    if (!orderId) {
      console.log('Pagamento sem externalReference (orderId)');
      return res.status(200).json({ received: true, message: 'Sem orderId' });
    }

    console.log(`Processando evento ${eventType} para pedido ${orderId}`);

    // Mapear status do Asaas para status do pedido e pagamento
    // order_status enum: pending, paid, processing, shipped, delivered, cancelled
    // payment_status enum: pending, confirmed, received, overdue, refunded, cancelled, authorized
    let orderStatus = null;
    let paymentStatus = null;

    switch (eventType) {
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED':
        orderStatus = 'paid'; // IMPORTANTE: usar 'paid' para aparecer em vendas
        paymentStatus = 'confirmed';
        break;
      case 'PAYMENT_OVERDUE':
        orderStatus = 'pending';
        paymentStatus = 'overdue';
        break;
      case 'PAYMENT_DELETED':
      case 'PAYMENT_REFUNDED':
        orderStatus = 'cancelled';
        paymentStatus = 'refunded';
        break;
      case 'PAYMENT_CREATED':
      case 'PAYMENT_UPDATED':
        // Não alterar status do pedido, apenas registrar
        paymentStatus = mapAsaasStatus(payment.status);
        break;
      default:
        console.log(`Evento ${eventType} não mapeado`);
        return res.status(200).json({ received: true, message: 'Evento não processado' });
    }

    // 1. Atualizar pedido na tabela orders
    if (orderStatus) {
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          status: orderStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (orderError) {
        console.error('Erro ao atualizar pedido:', orderError);
      } else {
        console.log(`Pedido ${orderId} atualizado: status=${orderStatus}`);
      }
    }

    // 2. Atualizar pagamento na tabela payments
    const paymentUpdateData = {
      status: paymentStatus,
      updated_at: new Date().toISOString()
    };

    if (paymentStatus === 'paid') {
      paymentUpdateData.paid_at = new Date().toISOString();
      paymentUpdateData.confirmed_at = payment.confirmedDate || new Date().toISOString();
    }

    const { error: paymentError } = await supabase
      .from('payments')
      .update(paymentUpdateData)
      .eq('order_id', orderId);

    if (paymentError) {
      console.error('Erro ao atualizar pagamento:', paymentError);
    } else {
      console.log(`Pagamento do pedido ${orderId} atualizado: status=${paymentStatus}`);
    }

    // 3. Registrar transação de webhook
    await supabase
      .from('asaas_transactions')
      .insert({
        order_id: orderId,
        transaction_type: `WEBHOOK_${eventType}`,
        request_payload: event,
        response_payload: { orderStatus, paymentStatus },
        success: true,
        http_status: 200,
        asaas_payment_id: asaasPaymentId
      });

    // 4. Se pagamento confirmado, calcular comissões (se houver afiliado)
    if (orderStatus === 'paid') {
      await processCommissions(supabase, orderId, payment.value);
    }

    // Atualizar log como processado
    await supabase
      .from('asaas_webhook_logs')
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
        order_id: orderId
      })
      .eq('asaas_payment_id', asaasPaymentId)
      .eq('event_type', eventType);

    console.log(`=== WEBHOOK PROCESSADO COM SUCESSO ===`);

    return res.status(200).json({ 
      received: true, 
      orderId,
      orderStatus,
      paymentStatus 
    });

  } catch (error) {
    console.error('Erro no webhook:', error);
    // Retornar 200 para não penalizar
    return res.status(200).json({ 
      received: true, 
      error: error.message 
    });
  }
}

/**
 * Mapeia status do Asaas para status interno
 * payment_status enum: pending, confirmed, received, overdue, refunded, cancelled, authorized
 */
function mapAsaasStatus(asaasStatus) {
  const statusMap = {
    'PENDING': 'pending',
    'RECEIVED': 'received',
    'CONFIRMED': 'confirmed',
    'OVERDUE': 'overdue',
    'REFUNDED': 'refunded',
    'RECEIVED_IN_CASH': 'received',
    'REFUND_REQUESTED': 'refunded',
    'CHARGEBACK_REQUESTED': 'cancelled',
    'CHARGEBACK_DISPUTE': 'cancelled',
    'AWAITING_CHARGEBACK_REVERSAL': 'pending',
    'DUNNING_REQUESTED': 'pending',
    'DUNNING_RECEIVED': 'received',
    'AWAITING_RISK_ANALYSIS': 'pending'
  };
  return statusMap[asaasStatus] || 'pending';
}

/**
 * Registra webhook no log
 */
async function logWebhook(supabase, data) {
  try {
    await supabase
      .from('asaas_webhook_logs')
      .insert({
        asaas_event_id: data.asaasEventId,
        event_type: data.eventType,
        payload: data.payload,
        token_valid: data.tokenValid,
        processed: false,
        asaas_payment_id: data.asaasPaymentId,
        order_id: data.orderId
      });
    console.log('Webhook registrado no log');
  } catch (error) {
    console.error('Erro ao registrar webhook no log:', error);
  }
}

/**
 * Processa comissões quando pagamento é confirmado
 */
async function processCommissions(supabase, orderId, paymentValue) {
  try {
    // Buscar pedido com dados de afiliado
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('affiliate_n1_id, affiliate_n2_id, affiliate_n3_id, total_cents, referral_code')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.log('Pedido não encontrado para calcular comissões');
      return;
    }

    // Se não tem afiliado, não calcular comissões
    if (!order.affiliate_n1_id && !order.referral_code) {
      console.log('Pedido sem afiliado, comissões não aplicáveis');
      return;
    }

    const baseValue = order.total_cents;
    const commissions = [];

    // Percentuais conforme regra de negócio
    // N1: 15%, N2: 3%, N3: 2%, Gestores: 5% cada (redistribuição se não houver níveis)

    if (order.affiliate_n1_id) {
      // N1 sempre recebe 15%
      commissions.push({
        order_id: orderId,
        affiliate_id: order.affiliate_n1_id,
        level: 1,
        percentage: 15,
        base_value_cents: baseValue,
        commission_value_cents: Math.round(baseValue * 0.15),
        status: 'calculated'
      });
    }

    if (order.affiliate_n2_id) {
      // N2 recebe 3%
      commissions.push({
        order_id: orderId,
        affiliate_id: order.affiliate_n2_id,
        level: 2,
        percentage: 3,
        base_value_cents: baseValue,
        commission_value_cents: Math.round(baseValue * 0.03),
        status: 'calculated'
      });
    }

    if (order.affiliate_n3_id) {
      // N3 recebe 2%
      commissions.push({
        order_id: orderId,
        affiliate_id: order.affiliate_n3_id,
        level: 3,
        percentage: 2,
        base_value_cents: baseValue,
        commission_value_cents: Math.round(baseValue * 0.02),
        status: 'calculated'
      });
    }

    // Inserir comissões se houver
    if (commissions.length > 0) {
      const { error: commissionError } = await supabase
        .from('commissions')
        .insert(commissions);

      if (commissionError) {
        console.error('Erro ao criar comissões:', commissionError);
      } else {
        console.log(`${commissions.length} comissões criadas para pedido ${orderId}`);
      }
    }

  } catch (error) {
    console.error('Erro ao processar comissões:', error);
  }
}
