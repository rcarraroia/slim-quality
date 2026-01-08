/**
 * Webhook Asaas - Recebe notificações de pagamento
 * Atualiza status do pedido no Supabase quando pagamento é confirmado
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

  try {
    const event = req.body;
    
    console.log('Webhook Asaas recebido:', JSON.stringify(event, null, 2));

    // Validar que é um evento de pagamento
    if (!event || !event.event || !event.payment) {
      console.log('Evento inválido ou não é de pagamento');
      return res.status(200).json({ received: true, message: 'Evento ignorado' });
    }

    const { event: eventType, payment } = event;
    const orderId = payment.externalReference;

    if (!orderId) {
      console.log('Pagamento sem externalReference (orderId)');
      return res.status(200).json({ received: true, message: 'Sem orderId' });
    }

    console.log(`Processando evento ${eventType} para pedido ${orderId}`);

    // Inicializar Supabase
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase não configurado');
      return res.status(500).json({ error: 'Supabase não configurado' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Mapear status do Asaas para status do pedido
    let orderStatus = null;
    let paymentStatus = null;

    switch (eventType) {
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED':
        orderStatus = 'confirmed';
        paymentStatus = 'paid';
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
        // Não alterar status, apenas registrar
        paymentStatus = payment.status?.toLowerCase() || 'pending';
        break;
      default:
        console.log(`Evento ${eventType} não mapeado`);
        return res.status(200).json({ received: true, message: 'Evento não processado' });
    }

    // Atualizar pedido no banco
    const updateData = {
      payment_status: paymentStatus,
      asaas_payment_id: payment.id,
      updated_at: new Date().toISOString()
    };

    if (orderStatus) {
      updateData.status = orderStatus;
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId);

    if (updateError) {
      console.error('Erro ao atualizar pedido:', updateError);
      // Retornar 200 mesmo com erro para não penalizar webhook
      return res.status(200).json({ 
        received: true, 
        error: 'Erro ao atualizar pedido',
        details: updateError.message 
      });
    }

    console.log(`Pedido ${orderId} atualizado: status=${orderStatus}, payment_status=${paymentStatus}`);

    return res.status(200).json({ 
      received: true, 
      orderId,
      status: orderStatus,
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
