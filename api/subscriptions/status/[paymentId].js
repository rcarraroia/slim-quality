/**
 * API REST para verificação de status de pagamento de assinatura
 * Rota: GET /api/subscriptions/status/[paymentId]
 * 
 * Implementa polling para verificar status do pagamento:
 * 1. Consulta status no Asaas
 * 2. Atualiza banco de dados se necessário
 * 3. Retorna status atual
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Apenas GET permitido
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Método não permitido' 
    });
  }

  try {
    // Verificar variáveis de ambiente
    const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

    if (!ASAAS_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Configuração do servidor incompleta'
      });
    }

    // Extrair paymentId da URL
    const { paymentId } = req.query;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        error: 'Payment ID é obrigatório'
      });
    }

    // Detectar ambiente
    const trimmedKey = ASAAS_API_KEY.trim();
    const isProduction = trimmedKey.includes('_prod_');
    const asaasBaseUrl = isProduction
      ? 'https://api.asaas.com/v3'
      : 'https://api-sandbox.asaas.com/v3';

    // Headers para Asaas
    const asaasHeaders = {
      'Content-Type': 'application/json',
      'access_token': trimmedKey
    };

    console.log('🔍 Verificando status do pagamento:', paymentId);

    // 1. CONSULTAR STATUS NO ASAAS
    const statusRes = await fetch(`${asaasBaseUrl}/payments/${paymentId}`, {
      method: 'GET',
      headers: asaasHeaders
    });

    if (!statusRes.ok) {
      const errorData = await statusRes.json();
      console.error('❌ Erro ao consultar status no Asaas:', errorData);
      return res.status(500).json({
        success: false,
        error: 'Erro ao consultar status no Asaas',
        details: errorData
      });
    }

    const paymentData = await statusRes.json();

    console.log('📊 Status atual do pagamento:', {
      id: paymentData.id,
      status: paymentData.status,
      value: paymentData.value,
      confirmedDate: paymentData.confirmedDate
    });

    // 2. ATUALIZAR BANCO DE DADOS SE NECESSÁRIO
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Buscar registro no banco
    const { data: subscriptionOrder, error: fetchError } = await supabase
      .from('subscription_orders')
      .select('*')
      .eq('asaas_payment_id', paymentId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('❌ Erro ao buscar subscription order:', fetchError);
    }

    // Atualizar status se mudou
    if (subscriptionOrder) {
      const newStatus = mapAsaasStatusToInternal(paymentData.status);
      
      if (subscriptionOrder.status !== newStatus) {
        console.log('📝 Atualizando status no banco:', {
          from: subscriptionOrder.status,
          to: newStatus
        });

        const { error: updateError } = await supabase
          .from('subscription_orders')
          .update({
            status: newStatus,
            asaas_status: paymentData.status,
            confirmed_at: paymentData.confirmedDate || null,
            updated_at: new Date().toISOString()
          })
          .eq('asaas_payment_id', paymentId);

        if (updateError) {
          console.error('❌ Erro ao atualizar status:', updateError);
        }
      }
    }

    // 3. REGISTRAR LOG DE POLLING
    const { error: logError } = await supabase
      .from('subscription_polling_logs')
      .insert({
        payment_id: paymentId,
        status_checked: paymentData.status,
        response_data: paymentData,
        checked_at: new Date().toISOString()
      });

    if (logError) {
      console.warn('⚠️ Erro ao registrar log de polling:', logError);
    }

    // 4. RETORNAR STATUS ATUAL
    const internalStatus = mapAsaasStatusToInternal(paymentData.status);
    
    return res.status(200).json({
      success: true,
      data: {
        paymentId: paymentData.id,
        status: internalStatus,
        asaasStatus: paymentData.status,
        confirmedAt: paymentData.confirmedDate,
        correlationId: subscriptionOrder?.correlation_id || null
      }
    });

  } catch (error) {
    console.error('❌ Erro interno na verificação de status:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
}

/**
 * Mapeia status do Asaas para status interno
 */
function mapAsaasStatusToInternal(asaasStatus) {
  const statusMap = {
    'PENDING': 'PENDING',
    'RECEIVED': 'CONFIRMED',
    'CONFIRMED': 'CONFIRMED',
    'OVERDUE': 'FAILED',
    'REFUNDED': 'CANCELLED',
    'RECEIVED_IN_CASH': 'CONFIRMED',
    'REFUND_REQUESTED': 'CANCELLED',
    'CHARGEBACK_REQUESTED': 'FAILED',
    'CHARGEBACK_DISPUTE': 'FAILED',
    'AWAITING_CHARGEBACK_REVERSAL': 'FAILED',
    'DUNNING_REQUESTED': 'FAILED',
    'DUNNING_RECEIVED': 'FAILED',
    'AWAITING_RISK_ANALYSIS': 'PENDING'
  };

  return statusMap[asaasStatus] || 'PENDING';
}