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
 * Task 4.4, 4.5 e 4.6: Integrado com CommissionCalculatorService + Logging
 */
async function processCommissions(supabase, orderId, paymentValue) {
  const startTime = Date.now();
  let logData = {
    order_id: orderId,
    input_data: {},
    output_data: {},
    network_data: {},
    split_data: [],
    redistribution_applied: false,
    redistribution_details: null,
    success: false,
    error_message: null,
    calculated_at: new Date().toISOString()
  };

  try {
    console.log(`💰 Iniciando cálculo de comissões para pedido ${orderId}`);

    // Buscar pedido com dados de afiliado
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('affiliate_n1_id, affiliate_n2_id, affiliate_n3_id, total_cents, referral_code')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.log('Pedido não encontrado para calcular comissões');
      logData.error_message = 'Pedido não encontrado';
      await saveCalculationLog(supabase, logData);
      return;
    }

    // Se não tem afiliado, não calcular comissões
    if (!order.affiliate_n1_id && !order.referral_code) {
      console.log('Pedido sem afiliado, comissões não aplicáveis');
      logData.error_message = 'Pedido sem afiliado';
      await saveCalculationLog(supabase, logData);
      return;
    }

    // Se não tem N1, não pode calcular
    if (!order.affiliate_n1_id) {
      console.warn('Pedido tem referral_code mas não tem affiliate_n1_id');
      logData.error_message = 'Referral code sem affiliate_n1_id';
      await saveCalculationLog(supabase, logData);
      return;
    }

    const baseValue = order.total_cents;
    
    // Registrar input
    logData.input_data = {
      orderValue: baseValue,
      affiliateN1Id: order.affiliate_n1_id,
      affiliateN2Id: order.affiliate_n2_id,
      affiliateN3Id: order.affiliate_n3_id,
      referralCode: order.referral_code
    };

    // Calcular comissões com redistribuição
    const result = await calculateCommissionsWithRedistribution(
      supabase,
      orderId,
      baseValue,
      order.affiliate_n1_id,
      order.affiliate_n2_id,
      order.affiliate_n3_id
    );

    // Registrar output
    logData.output_data = {
      n1Value: result.n1Value,
      n2Value: result.n2Value,
      n3Value: result.n3Value,
      renumValue: result.renumValue,
      jbValue: result.jbValue,
      totalCommission: result.totalCommission,
      renumPercentage: result.renumPercentage,
      jbPercentage: result.jbPercentage
    };

    // Registrar rede
    logData.network_data = {
      n1: order.affiliate_n1_id ? { id: order.affiliate_n1_id } : null,
      n2: order.affiliate_n2_id ? { id: order.affiliate_n2_id } : null,
      n3: order.affiliate_n3_id ? { id: order.affiliate_n3_id } : null
    };

    // Registrar redistribuição
    logData.redistribution_applied = result.redistributionApplied;
    logData.redistribution_details = result.redistributionDetails;

    console.log(`✅ Comissões calculadas:`, {
      orderId,
      total: result.totalCommission,
      n1: result.n1Value,
      n2: result.n2Value,
      n3: result.n3Value,
      renum: result.renumValue,
      jb: result.jbValue,
      redistributionApplied: result.redistributionApplied
    });

    // Inserir comissões individuais
    const commissions = [];

    // N1 (sempre existe)
    commissions.push({
      order_id: orderId,
      affiliate_id: order.affiliate_n1_id,
      level: 1,
      percentage: 0.15,
      base_value_cents: baseValue,
      commission_value_cents: result.n1Value,
      original_percentage: 0.15,
      redistribution_applied: false,
      status: 'pending',
      calculation_details: {
        orderValue: baseValue,
        calculatedAt: new Date().toISOString(),
        redistributionApplied: result.redistributionApplied
      }
    });

    // N2 (se existir)
    if (order.affiliate_n2_id && result.n2Value > 0) {
      commissions.push({
        order_id: orderId,
        affiliate_id: order.affiliate_n2_id,
        level: 2,
        percentage: 0.03,
        base_value_cents: baseValue,
        commission_value_cents: result.n2Value,
        original_percentage: 0.03,
        redistribution_applied: false,
        status: 'pending',
        calculation_details: {
          orderValue: baseValue,
          calculatedAt: new Date().toISOString()
        }
      });
    }

    // N3 (se existir)
    if (order.affiliate_n3_id && result.n3Value > 0) {
      commissions.push({
        order_id: orderId,
        affiliate_id: order.affiliate_n3_id,
        level: 3,
        percentage: 0.02,
        base_value_cents: baseValue,
        commission_value_cents: result.n3Value,
        original_percentage: 0.02,
        redistribution_applied: false,
        status: 'pending',
        calculation_details: {
          orderValue: baseValue,
          calculatedAt: new Date().toISOString()
        }
      });
    }

    // Registrar split para log
    logData.split_data = commissions.map(c => ({
      affiliateId: c.affiliate_id,
      level: c.level,
      percentage: c.percentage,
      value: c.commission_value_cents
    }));

    // Inserir comissões
    const { error: commissionError } = await supabase
      .from('commissions')
      .insert(commissions);

    if (commissionError) {
      console.error('Erro ao criar comissões:', commissionError);
      logData.error_message = `Erro ao criar comissões: ${commissionError.message}`;
      await saveCalculationLog(supabase, logData);
      throw commissionError;
    }

    // Inserir split consolidado
    const split = {
      order_id: orderId,
      total_order_value_cents: baseValue,
      factory_percentage: 0.70,
      factory_value_cents: Math.round(baseValue * 0.70),
      commission_percentage: 0.30,
      commission_value_cents: result.totalCommission,
      
      n1_affiliate_id: order.affiliate_n1_id,
      n1_percentage: 0.15,
      n1_value_cents: result.n1Value,
      
      n2_affiliate_id: order.affiliate_n2_id,
      n2_percentage: order.affiliate_n2_id ? 0.03 : 0,
      n2_value_cents: result.n2Value,
      
      n3_affiliate_id: order.affiliate_n3_id,
      n3_percentage: order.affiliate_n3_id ? 0.02 : 0,
      n3_value_cents: result.n3Value,
      
      renum_percentage: result.renumPercentage,
      renum_value_cents: result.renumValue,
      
      jb_percentage: result.jbPercentage,
      jb_value_cents: result.jbValue,
      
      redistribution_applied: result.redistributionApplied,
      redistribution_details: result.redistributionDetails,
      
      status: 'pending'
    };

    const { error: splitError } = await supabase
      .from('commission_splits')
      .insert(split);

    if (splitError) {
      console.error('Erro ao criar split:', splitError);
      logData.error_message = `Erro ao criar split: ${splitError.message}`;
      await saveCalculationLog(supabase, logData);
      throw splitError;
    }

    // Marcar como sucesso
    logData.success = true;
    await saveCalculationLog(supabase, logData);

    const duration = Date.now() - startTime;
    console.log(`✅ ${commissions.length} comissões e 1 split criados para pedido ${orderId} (${duration}ms)`);

  } catch (error) {
    console.error('Erro ao processar comissões:', error);
    logData.error_message = error.message;
    await saveCalculationLog(supabase, logData);
    // Não falhar o webhook por causa das comissões
  }
}

/**
 * Salva log de cálculo de comissões para auditoria
 * Task 4.6: Logging completo
 */
async function saveCalculationLog(supabase, logData) {
  try {
    await supabase
      .from('commission_calculation_logs')
      .insert(logData);
    console.log('📝 Log de cálculo salvo');
  } catch (error) {
    console.error('⚠️ Erro ao salvar log de cálculo:', error);
    // Não falhar por causa do log
  }
}

/**
 * Calcula comissões com redistribuição para gestores
 * Implementa a lógica completa de redistribuição
 */
async function calculateCommissionsWithRedistribution(
  supabase,
  orderId,
  orderValue,
  n1Id,
  n2Id,
  n3Id
) {
  // Valores base
  const n1Value = Math.round(orderValue * 0.15); // 15%
  const n2Value = n2Id ? Math.round(orderValue * 0.03) : 0; // 3%
  const n3Value = n3Id ? Math.round(orderValue * 0.02) : 0; // 2%

  // Calcular redistribuição
  let renumPercentage = 0.05; // 5% base
  let jbPercentage = 0.05; // 5% base
  let redistributionApplied = false;
  let redistributionDetails = null;

  // Percentual não utilizado
  const usedPercentage = 0.15 + (n2Id ? 0.03 : 0) + (n3Id ? 0.02 : 0);
  const unusedPercentage = 0.20 - usedPercentage; // 20% = 15% + 3% + 2%

  if (unusedPercentage > 0) {
    // Redistribuir igualmente entre gestores
    const redistributionPerGestor = unusedPercentage / 2;
    renumPercentage += redistributionPerGestor;
    jbPercentage += redistributionPerGestor;
    redistributionApplied = true;
    
    redistributionDetails = {
      unusedPercentage,
      redistributedToRenum: redistributionPerGestor,
      redistributedToJB: redistributionPerGestor
    };
  }

  const renumValue = Math.round(orderValue * renumPercentage);
  const jbValue = Math.round(orderValue * jbPercentage);

  const totalCommission = n1Value + n2Value + n3Value + renumValue + jbValue;

  return {
    n1Value,
    n2Value,
    n3Value,
    renumValue,
    jbValue,
    renumPercentage,
    jbPercentage,
    totalCommission,
    redistributionApplied,
    redistributionDetails
  };
}
