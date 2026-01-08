/**
 * Webhook handler para processar notificações do Asaas
 * Processa pagamentos, splits e calcula comissões automaticamente
 * 
 * Task 3: Correção Sistema Pagamentos
 */

import { Router } from 'express';
import crypto from 'crypto';
import { supabase } from '../../../config/supabase';

const router = Router();

// Eventos suportados pelo webhook
const SUPPORTED_EVENTS = {
  PAYMENT_RECEIVED: 'handlePaymentReceived',
  PAYMENT_CONFIRMED: 'handlePaymentConfirmed',
  PAYMENT_SPLIT_CANCELLED: 'handleSplitError',
  PAYMENT_SPLIT_DIVERGENCE_BLOCK: 'handleSplitError',
  PAYMENT_OVERDUE: 'handlePaymentOverdue',
  PAYMENT_REFUNDED: 'handlePaymentRefunded'
} as const;

interface AsaasWebhookPayload {
  event: string;
  payment: {
    id: string;
    status: string;
    value: number;
    netValue: number;
    originalValue: number;
    externalReference?: string;
    customer: string;
    dateCreated: string;
    dueDate: string;
    paymentDate?: string;
    split?: Array<{
      walletId: string;
      percentualValue: number;
      status: string;
    }>;
  };
}

interface ProcessingResult {
  success: boolean;
  orderId?: string;
  affiliateId?: string;
  affiliateName?: string;
  commissionsCalculated?: boolean;
  totalCommission?: number;
  error?: string;
}

/**
 * Verifica a assinatura do webhook do Asaas
 */
function verifyAsaasSignature(payload: string, signature: string): boolean {
  const webhookSecret = process.env.ASAAS_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.warn('[AsaasWebhook] ASAAS_WEBHOOK_SECRET não configurado');
    return true; // Permitir em desenvolvimento
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch {
    return false;
  }
}

/**
 * POST /api/webhooks/asaas
 * Processa notificações de pagamento do Asaas
 */
router.post('/asaas', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const signature = req.headers['x-asaas-signature'] as string;
    const payload = JSON.stringify(req.body);

    // Verificar assinatura (em produção)
    if (process.env.NODE_ENV === 'production' && signature) {
      if (!verifyAsaasSignature(payload, signature)) {
        console.error('[AsaasWebhook] ❌ Assinatura inválida');
        await logWebhookError(req.body, new Error('Assinatura inválida'));
        return res.status(401).json({ error: 'Assinatura inválida' });
      }
    }

    const webhookData: AsaasWebhookPayload = req.body;
    
    console.log(`[AsaasWebhook] 📥 Recebido: ${webhookData.event} | Payment: ${webhookData.payment.id}`);

    // Verificar se é um evento suportado
    if (!(webhookData.event in SUPPORTED_EVENTS)) {
      console.log(`[AsaasWebhook] ⏭️ Evento não suportado: ${webhookData.event}`);
      return res.json({ message: 'Evento não suportado', event: webhookData.event });
    }

    // Processar evento com retry
    const result = await processWithRetry(webhookData, 3);

    // Log do tempo de processamento
    const processingTime = Date.now() - startTime;
    console.log(`[AsaasWebhook] ⏱️ Processado em ${processingTime}ms`);

    // Registrar webhook no log
    await logWebhookEvent(webhookData, result, processingTime);

    res.json({
      success: result.success,
      message: result.success ? 'Webhook processado com sucesso' : 'Falha no processamento',
      orderId: result.orderId,
      processingTime: `${processingTime}ms`,
      result
    });

  } catch (error) {
    console.error('[AsaasWebhook] ❌ Erro crítico:', error);
    await logWebhookError(req.body, error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

/**
 * Processa webhook com retry automático
 */
async function processWithRetry(
  webhookData: AsaasWebhookPayload, 
  maxRetries: number
): Promise<ProcessingResult> {
  const retryDelays = [0, 1000, 3000]; // ms
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`[AsaasWebhook] 🔄 Tentativa ${attempt + 1}/${maxRetries}`);
        await delay(retryDelays[attempt]);
      }
      
      return await processWebhookEvent(webhookData);
    } catch (error) {
      console.error(`[AsaasWebhook] ❌ Tentativa ${attempt + 1} falhou:`, error);
      
      if (attempt === maxRetries - 1) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido após retries'
        };
      }
    }
  }
  
  return { success: false, error: 'Máximo de tentativas excedido' };
}

/**
 * Processa evento do webhook baseado no tipo
 */
async function processWebhookEvent(webhookData: AsaasWebhookPayload): Promise<ProcessingResult> {
  const { event, payment } = webhookData;
  
  switch (event) {
    case 'PAYMENT_RECEIVED':
      return handlePaymentReceived(payment);
    case 'PAYMENT_CONFIRMED':
      return handlePaymentConfirmed(payment);
    case 'PAYMENT_SPLIT_CANCELLED':
    case 'PAYMENT_SPLIT_DIVERGENCE_BLOCK':
      return handleSplitError(payment, event);
    case 'PAYMENT_OVERDUE':
      return handlePaymentOverdue(payment);
    case 'PAYMENT_REFUNDED':
      return handlePaymentRefunded(payment);
    default:
      return { success: true, error: `Evento não processado: ${event}` };
  }
}

/**
 * Handler: PAYMENT_RECEIVED - Pagamento recebido (PIX, Cartão)
 */
async function handlePaymentReceived(payment: AsaasWebhookPayload['payment']): Promise<ProcessingResult> {
  console.log(`[AsaasWebhook] 💰 Pagamento recebido: ${payment.id}`);
  
  // Buscar pedido
  const orderId = await findOrderByAsaasPaymentId(payment.id, payment.externalReference);
  if (!orderId) {
    return { success: false, error: `Pedido não encontrado para payment: ${payment.id}` };
  }
  
  // Atualizar status do pedido
  await updateOrderStatus(orderId, 'processing', payment);
  
  // Atualizar status do pagamento
  await updatePaymentStatus(payment.id, 'received');
  
  return { success: true, orderId };
}

/**
 * Handler: PAYMENT_CONFIRMED - Pagamento confirmado (dispara comissões)
 */
async function handlePaymentConfirmed(payment: AsaasWebhookPayload['payment']): Promise<ProcessingResult> {
  console.log(`[AsaasWebhook] ✅ Pagamento confirmado: ${payment.id}`);
  
  // Buscar pedido
  const orderId = await findOrderByAsaasPaymentId(payment.id, payment.externalReference);
  if (!orderId) {
    return { success: false, error: `Pedido não encontrado para payment: ${payment.id}` };
  }
  
  // Atualizar status do pedido para pago
  await updateOrderStatus(orderId, 'paid', payment);
  
  // Atualizar status do pagamento
  await updatePaymentStatus(payment.id, 'confirmed');
  
  // Processar afiliados e comissões
  const commissionResult = await processOrderCommissions(orderId, payment.value);
  
  return {
    success: true,
    orderId,
    affiliateId: commissionResult.affiliateId,
    affiliateName: commissionResult.affiliateName,
    commissionsCalculated: commissionResult.calculated,
    totalCommission: commissionResult.totalCommission
  };
}

/**
 * Handler: PAYMENT_SPLIT_CANCELLED / PAYMENT_SPLIT_DIVERGENCE_BLOCK
 */
async function handleSplitError(
  payment: AsaasWebhookPayload['payment'], 
  event: string
): Promise<ProcessingResult> {
  console.error(`[AsaasWebhook] ⚠️ Erro de split: ${event} | Payment: ${payment.id}`);
  
  const orderId = await findOrderByAsaasPaymentId(payment.id, payment.externalReference);
  
  // Registrar erro crítico
  await supabase.from('commission_logs').insert({
    order_id: orderId,
    action: 'SPLIT_ERROR',
    details: JSON.stringify({
      event,
      payment_id: payment.id,
      split_data: payment.split,
      error_at: new Date().toISOString()
    })
  });
  
  // Notificar administradores (TODO: implementar notificação)
  console.error(`[AsaasWebhook] 🚨 ALERTA: Split falhou para pedido ${orderId}`);
  
  return { 
    success: false, 
    orderId: orderId || undefined,
    error: `Split error: ${event}` 
  };
}

/**
 * Handler: PAYMENT_OVERDUE - Pagamento vencido
 */
async function handlePaymentOverdue(payment: AsaasWebhookPayload['payment']): Promise<ProcessingResult> {
  console.log(`[AsaasWebhook] ⏰ Pagamento vencido: ${payment.id}`);
  
  const orderId = await findOrderByAsaasPaymentId(payment.id, payment.externalReference);
  if (orderId) {
    await updateOrderStatus(orderId, 'overdue', payment);
    await updatePaymentStatus(payment.id, 'overdue');
  }
  
  return { success: true, orderId: orderId || undefined };
}

/**
 * Handler: PAYMENT_REFUNDED - Pagamento estornado
 */
async function handlePaymentRefunded(payment: AsaasWebhookPayload['payment']): Promise<ProcessingResult> {
  console.log(`[AsaasWebhook] 💸 Pagamento estornado: ${payment.id}`);
  
  const orderId = await findOrderByAsaasPaymentId(payment.id, payment.externalReference);
  if (orderId) {
    await updateOrderStatus(orderId, 'refunded', payment);
    await updatePaymentStatus(payment.id, 'refunded');
    
    // Cancelar comissões se existirem
    await cancelOrderCommissions(orderId);
  }
  
  return { success: true, orderId: orderId || undefined };
}

/**
 * Busca o pedido pelo ID do pagamento do Asaas
 */
async function findOrderByAsaasPaymentId(
  asaasPaymentId: string, 
  externalReference?: string
): Promise<string | null> {
  try {
    // 1. Tentar pela referência externa (order_id)
    if (externalReference) {
      const { data: orderByRef } = await supabase
        .from('orders')
        .select('id')
        .eq('id', externalReference)
        .single();
      
      if (orderByRef) return orderByRef.id;
    }

    // 2. Buscar na tabela payments pelo asaas_payment_id
    const { data: payment } = await supabase
      .from('payments')
      .select('order_id')
      .eq('asaas_payment_id', asaasPaymentId)
      .single();

    if (payment) return payment.order_id;

    // 3. Buscar na tabela asaas_transactions
    const { data: transaction } = await supabase
      .from('asaas_transactions')
      .select('order_id')
      .eq('asaas_payment_id', asaasPaymentId)
      .single();

    if (transaction) return transaction.order_id;

    return null;
  } catch (error) {
    console.error('[AsaasWebhook] Erro ao buscar pedido:', error);
    return null;
  }
}

/**
 * Atualiza o status do pedido
 */
async function updateOrderStatus(
  orderId: string, 
  status: string, 
  paymentData: AsaasWebhookPayload['payment']
): Promise<void> {
  try {
    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'paid') {
      updateData.paid_at = paymentData.paymentDate || new Date().toISOString();
    }

    await supabase.from('orders').update(updateData).eq('id', orderId);
    console.log(`[AsaasWebhook] 📊 Pedido ${orderId} atualizado para: ${status}`);
  } catch (error) {
    console.error('[AsaasWebhook] Erro ao atualizar pedido:', error);
  }
}

/**
 * Atualiza o status do pagamento
 */
async function updatePaymentStatus(asaasPaymentId: string, status: string): Promise<void> {
  try {
    await supabase
      .from('payments')
      .update({ 
        status, 
        updated_at: new Date().toISOString() 
      })
      .eq('asaas_payment_id', asaasPaymentId);
  } catch (error) {
    console.error('[AsaasWebhook] Erro ao atualizar pagamento:', error);
  }
}

/**
 * Processa comissões do pedido
 */
async function processOrderCommissions(
  orderId: string, 
  orderValue: number
): Promise<{
  calculated: boolean;
  affiliateId?: string;
  affiliateName?: string;
  totalCommission?: number;
}> {
  try {
    // Buscar pedido com dados do afiliado
    const { data: order } = await supabase
      .from('orders')
      .select('*, referral_code, affiliate_n1_id')
      .eq('id', orderId)
      .single();

    if (!order?.referral_code) {
      console.log(`[AsaasWebhook] Pedido ${orderId} sem afiliado`);
      return { calculated: false };
    }

    // Buscar afiliado pelo referral_code
    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('id, user_id, wallet_id, referral_code, referred_by')
      .eq('referral_code', order.referral_code)
      .eq('status', 'active')
      .single();

    if (!affiliate) {
      console.log(`[AsaasWebhook] Afiliado não encontrado: ${order.referral_code}`);
      return { calculated: false };
    }

    // Buscar nome do afiliado
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', affiliate.user_id)
      .single();

    // Calcular comissões (30% do valor)
    const totalCommission = orderValue * 0.30;

    // Registrar log de comissão calculada
    await supabase.from('commission_logs').insert({
      order_id: orderId,
      action: 'COMMISSION_CALCULATED',
      details: JSON.stringify({
        affiliate_id: affiliate.id,
        referral_code: order.referral_code,
        order_value: orderValue,
        total_commission: totalCommission,
        calculated_at: new Date().toISOString()
      })
    });

    console.log(`[AsaasWebhook] 💰 Comissão calculada: R$ ${totalCommission.toFixed(2)} para ${profile?.full_name || affiliate.id}`);

    return {
      calculated: true,
      affiliateId: affiliate.id,
      affiliateName: profile?.full_name,
      totalCommission
    };
  } catch (error) {
    console.error('[AsaasWebhook] Erro ao processar comissões:', error);
    return { calculated: false };
  }
}

/**
 * Cancela comissões de um pedido (em caso de estorno)
 */
async function cancelOrderCommissions(orderId: string): Promise<void> {
  try {
    await supabase
      .from('commissions')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('order_id', orderId);

    await supabase.from('commission_logs').insert({
      order_id: orderId,
      action: 'COMMISSION_CANCELLED',
      details: JSON.stringify({
        reason: 'Payment refunded',
        cancelled_at: new Date().toISOString()
      })
    });

    console.log(`[AsaasWebhook] ❌ Comissões canceladas para pedido: ${orderId}`);
  } catch (error) {
    console.error('[AsaasWebhook] Erro ao cancelar comissões:', error);
  }
}

/**
 * Registra o evento do webhook no log
 */
async function logWebhookEvent(
  webhookData: AsaasWebhookPayload, 
  result: ProcessingResult,
  processingTime: number
): Promise<void> {
  try {
    await supabase.from('webhook_logs').insert({
      provider: 'asaas',
      event_type: webhookData.event,
      payment_id: webhookData.payment.id,
      status: result.success ? 'success' : 'error',
      payload: webhookData,
      processing_result: result,
      processing_time_ms: processingTime,
      processed_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('[AsaasWebhook] Erro ao registrar log:', error);
  }
}

/**
 * Registra erro do webhook no log
 */
async function logWebhookError(payload: unknown, error: unknown): Promise<void> {
  try {
    const webhookPayload = payload as AsaasWebhookPayload;
    await supabase.from('webhook_logs').insert({
      provider: 'asaas',
      event_type: webhookPayload?.event || 'unknown',
      payment_id: webhookPayload?.payment?.id || 'unknown',
      status: 'error',
      payload,
      error_message: error instanceof Error ? error.message : String(error),
      processed_at: new Date().toISOString()
    });
  } catch (logError) {
    console.error('[AsaasWebhook] Erro ao salvar log de erro:', logError);
  }
}

/**
 * Utility: delay
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * GET /api/webhooks/asaas/health
 * Health check do webhook
 */
router.get('/asaas/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    supportedEvents: Object.keys(SUPPORTED_EVENTS)
  });
});

export default router;
