/**
 * Webhook handler para processar notificações do Asaas
 * Processa pagamentos e calcula comissões automaticamente
 */

import { Router } from 'express';
import crypto from 'crypto';
import { OrderAffiliateProcessor } from '../../../services/sales/order-affiliate-processor';
import { supabase } from '../../../config/supabase';

const router = Router();

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
  };
}

/**
 * Verifica a assinatura do webhook do Asaas
 */
function verifyAsaasSignature(payload: string, signature: string): boolean {
  const webhookSecret = process.env.ASAAS_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.warn('[AsaasWebhook] ASAAS_WEBHOOK_SECRET não configurado');
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

/**
 * POST /api/webhooks/asaas
 * Processa notificações de pagamento do Asaas
 */
router.post('/asaas', async (req, res) => {
  try {
    const signature = req.headers['x-asaas-signature'] as string;
    const payload = JSON.stringify(req.body);

    // Verificar assinatura (em produção)
    if (process.env.NODE_ENV === 'production' && signature) {
      if (!verifyAsaasSignature(payload, signature)) {
        console.error('[AsaasWebhook] Assinatura inválida');
        return res.status(401).json({ error: 'Assinatura inválida' });
      }
    }

    const webhookData: AsaasWebhookPayload = req.body;
    
    console.log(`[AsaasWebhook] Recebido evento: ${webhookData.event} para pagamento: ${webhookData.payment.id}`);

    // Processar apenas eventos de pagamento confirmado
    if (webhookData.event !== 'PAYMENT_RECEIVED' && webhookData.event !== 'PAYMENT_CONFIRMED') {
      console.log(`[AsaasWebhook] Evento ignorado: ${webhookData.event}`);
      return res.json({ message: 'Evento ignorado', event: webhookData.event });
    }

    // Verificar se o pagamento foi realmente confirmado
    if (webhookData.payment.status !== 'RECEIVED' && webhookData.payment.status !== 'CONFIRMED') {
      console.log(`[AsaasWebhook] Status de pagamento ignorado: ${webhookData.payment.status}`);
      return res.json({ message: 'Status ignorado', status: webhookData.payment.status });
    }

    // Buscar o pedido pelo ID do pagamento do Asaas
    const orderId = await findOrderByAsaasPaymentId(webhookData.payment.id);
    if (!orderId) {
      console.warn(`[AsaasWebhook] Pedido não encontrado para pagamento: ${webhookData.payment.id}`);
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    // Atualizar status do pedido
    await updateOrderStatus(orderId, 'paid', webhookData.payment);

    // Processar afiliados e comissões
    const processingResult = await OrderAffiliateProcessor.processOrderFromWebhook({
      orderId,
      status: webhookData.payment.status,
      totalAmount: webhookData.payment.value
    });

    // Log do resultado
    if (processingResult.success) {
      console.log(`[AsaasWebhook] Pedido processado com sucesso: ${orderId}`, {
        affiliateId: processingResult.affiliateId,
        affiliateName: processingResult.affiliateName,
        commissionsCalculated: processingResult.commissionsCalculated,
        totalCommission: processingResult.totalCommission
      });
    } else {
      console.warn(`[AsaasWebhook] Falha ao processar pedido: ${orderId}`, {
        error: processingResult.error
      });
    }

    // Registrar webhook no log
    await logWebhookEvent(webhookData, processingResult);

    res.json({
      success: true,
      message: 'Webhook processado com sucesso',
      orderId,
      processingResult
    });

  } catch (error) {
    console.error('[AsaasWebhook] Erro ao processar webhook:', error);
    
    // Registrar erro no log
    await logWebhookError(req.body, error);

    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * Busca o pedido pelo ID do pagamento do Asaas
 */
async function findOrderByAsaasPaymentId(asaasPaymentId: string): Promise<string | null> {
  try {
    // Primeiro, tentar pela referência externa
    const { data: orderByRef, error: refError } = await supabase
      .from('orders')
      .select('id')
      .eq('asaas_payment_id', asaasPaymentId)
      .single();

    if (!refError && orderByRef) {
      return orderByRef.id;
    }

    // Se não encontrou, buscar na tabela de transações do Asaas
    const { data: transaction, error: transError } = await supabase
      .from('asaas_transactions')
      .select('order_id')
      .eq('asaas_payment_id', asaasPaymentId)
      .single();

    if (!transError && transaction) {
      return transaction.order_id;
    }

    return null;
  } catch (error) {
    console.error('Erro ao buscar pedido por ID do Asaas:', error);
    return null;
  }
}

/**
 * Atualiza o status do pedido
 */
async function updateOrderStatus(orderId: string, status: string, paymentData: any): Promise<void> {
  try {
    const { error } = await supabase
      .from('orders')
      .update({
        status,
        payment_status: 'paid',
        paid_at: paymentData.paymentDate || new Date().toISOString(),
        asaas_payment_data: paymentData,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (error) {
      console.error('Erro ao atualizar status do pedido:', error);
    }
  } catch (error) {
    console.error('Erro ao atualizar pedido:', error);
  }
}

/**
 * Registra o evento do webhook no log
 */
async function logWebhookEvent(webhookData: AsaasWebhookPayload, processingResult: any): Promise<void> {
  try {
    const { error } = await supabase
      .from('webhook_logs')
      .insert({
        provider: 'asaas',
        event_type: webhookData.event,
        payment_id: webhookData.payment.id,
        status: webhookData.payment.status,
        payload: webhookData,
        processing_result: processingResult,
        processed_at: new Date().toISOString()
      });

    if (error) {
      console.error('Erro ao registrar log do webhook:', error);
    }
  } catch (error) {
    console.error('Erro ao salvar log:', error);
  }
}

/**
 * Registra erro do webhook no log
 */
async function logWebhookError(payload: any, error: any): Promise<void> {
  try {
    const { error: logError } = await supabase
      .from('webhook_logs')
      .insert({
        provider: 'asaas',
        event_type: payload.event || 'unknown',
        payment_id: payload.payment?.id || 'unknown',
        status: 'error',
        payload,
        error_message: error instanceof Error ? error.message : String(error),
        processed_at: new Date().toISOString()
      });

    if (logError) {
      console.error('Erro ao registrar log de erro:', logError);
    }
  } catch (logError) {
    console.error('Erro ao salvar log de erro:', logError);
  }
}

/**
 * GET /api/webhooks/asaas/test
 * Endpoint para testar o webhook (desenvolvimento)
 */
router.get('/asaas/test', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Endpoint não disponível em produção' });
  }

  const testPayload: AsaasWebhookPayload = {
    event: 'PAYMENT_RECEIVED',
    payment: {
      id: 'pay_test_123',
      status: 'RECEIVED',
      value: 3290.00,
      netValue: 3290.00,
      originalValue: 3290.00,
      customer: 'cus_test_123',
      dateCreated: new Date().toISOString(),
      dueDate: new Date().toISOString(),
      paymentDate: new Date().toISOString()
    }
  };

  // Simular processamento
  req.body = testPayload;
  req.headers['x-asaas-signature'] = 'test-signature';

  console.log('[AsaasWebhook] Executando teste do webhook');
  
  res.json({
    message: 'Teste do webhook executado',
    payload: testPayload,
    note: 'Este é um endpoint de teste. Verifique os logs para ver o resultado.'
  });
});

export default router;