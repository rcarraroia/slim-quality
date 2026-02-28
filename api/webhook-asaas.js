/**
 * Webhook Asaas - Recebe notificações de pagamento
 * Atualiza status do pedido e pagamento no Supabase quando pagamento é confirmado
 * 
 * ✅ ATUALIZADO: Validação via header asaas-access-token (doc oficial)
 * 📚 Documentação: https://docs.asaas.com/docs/receba-eventos-do-asaas-no-seu-endpoint-de-webhook
 * 
 * IMPORTANTE: Este é um Vercel Serverless Function
 * URL: https://slimquality.com.br/api/webhook-asaas
 * Deploy: Automático via Git push
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

  // ✅ VALIDAÇÃO DE TOKEN (Documentação oficial Asaas)
  // https://docs.asaas.com/docs/receba-eventos-do-asaas-no-seu-endpoint-de-webhook
  const receivedToken = req.headers['asaas-access-token'];
  const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;

  if (!expectedToken) {
    console.error('[WebhookAsaas] ❌ ASAAS_WEBHOOK_TOKEN não configurado');
    return res.status(500).json({ error: 'Webhook não configurado' });
  }

  if (!receivedToken) {
    console.error('[WebhookAsaas] ❌ Header asaas-access-token não fornecido');
    return res.status(401).json({ error: 'Unauthorized - Token ausente' });
  }

  if (receivedToken !== expectedToken) {
    console.error('[WebhookAsaas] ❌ Token inválido', {
      received: receivedToken.substring(0, 10) + '...',
      expected: expectedToken.substring(0, 10) + '...'
    });
    return res.status(401).json({ error: 'Unauthorized - Token inválido' });
  }

  console.log('[WebhookAsaas] ✅ Token validado com sucesso');

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

      // 5. Registrar compra Show Room (se aplicável)
      await registerShowRoomPurchase(supabase, orderId);
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
    const isSubscription = event.payment?.subscription || false;
    console.log(`💰 Iniciando cálculo de comissões para pedido ${orderId}${isSubscription ? ' (Cobrança de Assinatura)' : ''}`);

    // Buscar pedido com dados de afiliado
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        affiliate_n1_id, 
        affiliate_n2_id, 
        affiliate_n3_id, 
        total_cents, 
        referral_code,
        order_items (product_id, product_name, product_sku)
      `)
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

    // ✅ NOVO: Verificar se é Agente IA
    const isIAProduct = order.order_items?.some(item =>
      item.product_sku === 'COL-707D80' || item.product_name?.toLowerCase().includes('agente ia')
    ) || false;

    // ✅ NOVO: Verificar se é Show Room
    const isShowRoomProduct = await checkIfShowRoomOrder(supabase, orderId);

    // Registrar input
    logData.input_data = {
      orderValue: baseValue,
      isIAProduct: isIAProduct,
      isShowRoomProduct: isShowRoomProduct,
      affiliateN1Id: order.affiliate_n1_id,
      affiliateN2Id: order.affiliate_n2_id,
      affiliateN3Id: order.affiliate_n3_id,
      referralCode: order.referral_code
    };

    // ============================================================
    // SHOW ROOM: Comissionamento diferenciado (90% + 5% + 5%)
    // ============================================================
    if (isShowRoomProduct) {
      console.log('🏪 Produto Show Room detectado - aplicando comissionamento diferenciado');
      
      // Calcular valores
      const renumValue = Math.round(baseValue * 0.05); // 5%
      const jbValue = Math.round(baseValue * 0.05);    // 5%
      const totalCommission = renumValue + jbValue;     // 10% total
      
      console.log(`✅ Comissões Show Room calculadas:`, {
        orderId,
        total: totalCommission,
        renum: renumValue,
        jb: jbValue,
        fabricaRecebe: baseValue - totalCommission // 90%
      });

      // Registrar output
      logData.output_data = {
        n1Value: 0,
        n2Value: 0,
        n3Value: 0,
        renumValue: renumValue,
        jbValue: jbValue,
        totalCommission: totalCommission,
        renumPercentage: 0.05,
        jbPercentage: 0.05,
        isShowRoom: true
      };

      // Inserir apenas comissões dos gestores
      const commissions = [];

      if (renumValue > 0) {
        commissions.push({
          order_id: orderId,
          affiliate_id: null,
          level: 0,
          percentage: 0.05,
          base_value_cents: baseValue,
          commission_value_cents: renumValue,
          original_percentage: 0.05,
          redistribution_applied: false,
          status: 'pending',
          metadata: {
            level: 'manager_renum',
            is_show_room: true,
            manager_name: 'Renum'
          },
          calculation_details: {
            orderValue: baseValue,
            calculatedAt: new Date().toISOString(),
            isShowRoom: true,
            note: 'Comissão Show Room - sem rede de afiliados'
          }
        });
      }

      if (jbValue > 0) {
        commissions.push({
          order_id: orderId,
          affiliate_id: null,
          level: 0,
          percentage: 0.05,
          base_value_cents: baseValue,
          commission_value_cents: jbValue,
          original_percentage: 0.05,
          redistribution_applied: false,
          status: 'pending',
          metadata: {
            level: 'manager_jb',
            is_show_room: true,
            manager_name: 'JB'
          },
          calculation_details: {
            orderValue: baseValue,
            calculatedAt: new Date().toISOString(),
            isShowRoom: true,
            note: 'Comissão Show Room - sem rede de afiliados'
          }
        });
      }

      // Registrar split para log
      logData.split_data = commissions.map(c => ({
        affiliateId: c.affiliate_id,
        level: c.level,
        percentage: c.percentage,
        value: c.commission_value_cents,
        isShowRoom: true
      }));

      // Inserir comissões
      const { error: insertError } = await supabase
        .from('commissions')
        .insert(commissions);

      if (insertError) {
        console.error('Erro ao inserir comissões Show Room:', insertError);
        logData.error_message = insertError.message;
        await saveCalculationLog(supabase, logData);
        return;
      }

      logData.success = true;
      await saveCalculationLog(supabase, logData);

      const duration = Date.now() - startTime;
      console.log(`✅ Comissões Show Room processadas em ${duration}ms`);
      return;
    }

    // ============================================================
    // FLUXO NORMAL: Produtos regulares e IA
    // ============================================================

    // Calcular comissões com redistribuição
    const result = await calculateCommissionsWithRedistribution(
      supabase,
      orderId,
      baseValue,
      order.affiliate_n1_id,
      order.affiliate_n2_id,
      order.affiliate_n3_id,
      isIAProduct // ✅ NOVO: Flag de IA
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
    // ✅ NOVO: Ajustar metadados para refletir swap Renum/Slim Quality se for IA
    if (isIAProduct) {
      commissions.push({
        order_id: orderId,
        affiliate_id: null,
        level: 0, // Manager Nível 0
        percentage: result.renumPercentage,
        base_value_cents: baseValue,
        commission_value_cents: result.renumValue,
        original_percentage: 0.05,
        redistribution_applied: result.redistributionApplied,
        status: 'pending',
        metadata: {
          level: 'manager_slim_quality',
          is_ia: true,
          manager_name: 'Slim Quality' // Invertido: Slim Quality é a manager no Agente IA
        }
      });

      commissions.push({
        order_id: orderId,
        affiliate_id: null,
        level: 0,
        percentage: result.jbPercentage,
        base_value_cents: baseValue,
        commission_value_cents: result.jbValue,
        original_percentage: 0.05,
        redistribution_applied: result.redistributionApplied,
        status: 'pending',
        metadata: {
          level: 'manager_jb',
          is_ia: true,
          manager_name: 'JB'
        }
      });
    } else {
      // Fluxo normal (Colchões): Renum e JB são managers
      if (result.renumValue > 0) {
        commissions.push({
          order_id: orderId,
          affiliate_id: null,
          level: 0,
          percentage: result.renumPercentage,
          base_value_cents: baseValue,
          commission_value_cents: result.renumValue,
          original_percentage: 0.05,
          redistribution_applied: result.redistributionApplied,
          status: 'pending',
          metadata: { level: 'manager_renum', manager_name: 'Renum' }
        });
      }
      if (result.jbValue > 0) {
        commissions.push({
          order_id: orderId,
          affiliate_id: null,
          level: 0,
          percentage: result.jbPercentage,
          base_value_cents: baseValue,
          commission_value_cents: result.jbValue,
          original_percentage: 0.05,
          redistribution_applied: result.redistributionApplied,
          status: 'pending',
          metadata: { level: 'manager_jb', manager_name: 'JB' }
        });
      }
    }

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
      status: 'pending',
      // ✅ NOVO: Registrar beneficiário principal (Renum no Agente IA)
      main_receiver_wallet_id: isIAProduct ? process.env.ASAAS_WALLET_RENUM : null,
      asaas_response: {
        is_ia: isIAProduct,
        factory_beneficiary: isIAProduct ? 'Renum' : 'Slim Quality',
        manager_beneficiary: isIAProduct ? 'Slim Quality' : 'Renum'
      }
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
 * Registra compra de produtos Show Room
 * Fase 1 - Task 1.3: Registro de Compra no Webhook
 */
async function registerShowRoomPurchase(supabase, orderId) {
  try {
    console.log(`🏪 Verificando produtos Show Room no pedido ${orderId}`);

    // Buscar itens do pedido
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select(`
        product_id,
        products!inner(category)
      `)
      .eq('order_id', orderId);

    if (itemsError) {
      console.error('❌ Erro ao buscar itens do pedido:', itemsError);
      return;
    }

    if (!orderItems || orderItems.length === 0) {
      console.log('ℹ️ Pedido sem itens');
      return;
    }

    // Filtrar produtos Show Room
    const showRoomItems = orderItems.filter(item => 
      item.products?.category === 'show_row'
    );

    if (showRoomItems.length === 0) {
      console.log('ℹ️ Pedido não contém produtos Show Room');
      return;
    }

    console.log(`✅ Encontrados ${showRoomItems.length} produtos Show Room`);

    // Buscar customer_id do pedido
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('customer_id')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('❌ Erro ao buscar pedido:', orderError);
      return;
    }

    // Buscar afiliado do customer
    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .select('id, affiliate_type')
      .eq('user_id', order.customer_id)
      .single();

    if (affiliateError || !affiliate) {
      console.error('❌ Erro ao buscar afiliado:', affiliateError);
      return;
    }

    if (affiliate.affiliate_type !== 'logista') {
      console.warn('⚠️ Compra Show Room por não-logista detectada');
      return;
    }

    // Registrar cada produto Show Room
    for (const item of showRoomItems) {
      try {
        const { error: insertError } = await supabase
          .from('show_room_purchases')
          .insert({
            affiliate_id: affiliate.id,
            product_id: item.product_id,
            order_id: orderId,
            purchased_at: new Date().toISOString()
          });

        if (insertError) {
          // Se erro for de duplicação (constraint UNIQUE), apenas logar
          if (insertError.code === '23505') {
            console.log(`ℹ️ Compra Show Room já registrada: product_id=${item.product_id}`);
          } else {
            console.error('❌ Erro ao registrar compra Show Room:', insertError);
          }
        } else {
          console.log(`✅ Compra Show Room registrada: product_id=${item.product_id}, affiliate_id=${affiliate.id}`);
        }
      } catch (error) {
        console.error('❌ Erro ao processar item Show Room:', error);
      }
    }

    console.log(`🏪 Registro de compras Show Room concluído para pedido ${orderId}`);
  } catch (error) {
    console.error('❌ Erro ao registrar compras Show Room:', error);
    // Não falhar o webhook por causa do registro Show Room
  }
}

/**
 * Verifica se o pedido contém produtos Show Room
 * Fase 2 - Task 2.1: Detecção de produtos Show Room
 */
async function checkIfShowRoomOrder(supabase, orderId) {
  try {
    const { data: orderItems, error } = await supabase
      .from('order_items')
      .select(`
        product_id,
        products!inner(category)
      `)
      .eq('order_id', orderId);

    if (error || !orderItems) {
      console.error('Erro ao verificar produtos Show Room:', error);
      return false;
    }

    const hasShowRoom = orderItems.some(item => 
      item.products?.category === 'show_row'
    );

    return hasShowRoom;
  } catch (error) {
    console.error('Erro ao verificar produtos Show Room:', error);
    return false;
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
  n3Id,
  isIA = false // ✅ NOVO: Suporte a inversão de papéis
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
