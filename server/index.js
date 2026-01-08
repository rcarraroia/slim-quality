/**
 * Servidor Express para API do chat
 * Sprint 5: Painel Admin - Agente IA
 */

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors({
  origin: ['https://slimquality.com.br', 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// Configurar Supabase
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Rate limiting simples em memória
const rateLimitMap = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minuto
  const maxRequests = 10; // 10 requests por minuto

  const current = rateLimitMap.get(ip);
  
  if (!current || now > current.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (current.count >= maxRequests) {
    return false;
  }
  
  current.count++;
  return true;
}

// Rota para salvar conversa (proxy para Supabase)
app.post('/server/api/save-conversation', async (req, res) => {
  try {
    const { sessionId, userMessage, agentResponse, channel } = req.body;

    if (!sessionId || !userMessage || !agentResponse) {
      return res.status(400).json({ 
        error: 'sessionId, userMessage e agentResponse são obrigatórios' 
      });
    }

    console.log(`💾 Salvando conversa: ${sessionId} - ${channel}`);

    // Buscar ou criar conversa
    let conversation;
    const { data: existingConversation } = await supabase
      .from('conversations')
      .select('*')
      .eq('session_id', sessionId)
      .eq('channel', channel || 'site')
      .single();

    if (existingConversation) {
      conversation = existingConversation;
      console.log(`🔄 Conversa existente: ${conversation.id}`);
    } else {
      // Criar nova conversa
      const { data: newConversation, error: conversationError } = await supabase
        .from('conversations')
        .insert({
          session_id: sessionId,
          channel: channel || 'site',
          status: 'open',
          customer_name: 'Visitante do Site',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (conversationError) {
        console.error('❌ Erro ao criar conversa:', conversationError);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }

      conversation = newConversation;
      console.log(`✅ Nova conversa criada: ${conversation.id}`);
    }

    // Salvar mensagem do usuário
    await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        content: userMessage,
        sender_type: 'customer',
        created_at: new Date().toISOString()
      });

    // Salvar resposta do agente
    await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        content: agentResponse,
        sender_type: 'agent',
        created_at: new Date().toISOString()
      });

    // Atualizar timestamp da conversa
    await supabase
      .from('conversations')
      .update({ 
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', conversation.id);

    console.log(`✅ Conversa salva com sucesso: ${conversation.id}`);

    res.json({
      success: true,
      conversationId: conversation.id
    });

  } catch (error) {
    console.error('❌ Erro ao salvar conversa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota principal do chat
app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId, customerName, customerEmail } = req.body;

    // Validação básica
    if (!message || !sessionId) {
      return res.status(400).json({ 
        error: 'Mensagem e sessionId são obrigatórios' 
      });
    }

    // Rate limiting
    const clientIP = req.headers['x-forwarded-for'] || 
                    req.headers['x-real-ip'] || 
                    req.connection.remoteAddress || 
                    'unknown';

    if (!checkRateLimit(clientIP)) {
      return res.status(429).json({ 
        error: 'Muitas requisições. Tente novamente em alguns instantes.' 
      });
    }

    console.log(`💬 Nova mensagem de ${clientIP}: "${message.substring(0, 50)}..."`);

    // Buscar ou criar conversa
    let conversation;
    const { data: existingConversation } = await supabase
      .from('conversations')
      .select('*')
      .eq('session_id', sessionId)
      .eq('channel', 'site')
      .single();

    if (existingConversation) {
      conversation = existingConversation;
      console.log(`🔄 Conversa existente encontrada: ${conversation.id}`);
    } else {
      // Criar nova conversa
      const { data: newConversation, error: conversationError } = await supabase
        .from('conversations')
        .insert({
          session_id: sessionId,
          channel: 'site',
          status: 'open',
          customer_name: customerName || 'Visitante do Site',
          customer_email: customerEmail || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (conversationError) {
        console.error('❌ Erro ao criar conversa:', conversationError);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }

      conversation = newConversation;
      console.log(`✅ Nova conversa criada: ${conversation.id}`);
    }

    // Salvar mensagem do usuário
    const { error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        content: message,
        sender_type: 'customer',
        created_at: new Date().toISOString()
      });

    if (messageError) {
      console.error('❌ Erro ao salvar mensagem:', messageError);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    // Atualizar timestamp da conversa
    await supabase
      .from('conversations')
      .update({ 
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', conversation.id);

    // Gerar resposta inteligente baseada na mensagem
    let agentResponse = "Obrigado pela sua mensagem! Sou a BIA, consultora da Slim Quality. Como posso te ajudar hoje?";
    
    // Respostas contextuais baseadas na mensagem
    const messageLower = message.toLowerCase();
    
    if (messageLower.includes('dor') || messageLower.includes('coluna') || messageLower.includes('costas') || messageLower.includes('lombar')) {
      agentResponse = "Entendo que você tem dores nas costas! 😔 Nossos colchões magnéticos são especialmente desenvolvidos para alívio de dores e melhora da postura. A magnetoterapia ajuda a relaxar os músculos e melhorar a circulação. Gostaria de saber mais sobre como pode te ajudar?";
    } else if (messageLower.includes('sono') || messageLower.includes('dormir') || messageLower.includes('insônia') || messageLower.includes('acordar')) {
      agentResponse = "Problemas de sono são muito comuns! 😴 Nossos colchões com tecnologia magnética e infravermelho longo ajudam a relaxar o corpo e melhorar a qualidade do sono. Muitos clientes relatam dormir melhor já na primeira semana. Posso te explicar como funciona?";
    } else if (messageLower.includes('preço') || messageLower.includes('valor') || messageLower.includes('quanto') || messageLower.includes('custa')) {
      agentResponse = "Nossos colchões custam a partir de R$ 3.190 (solteiro) até R$ 4.890 (king). 💰 Isso dá menos de R$ 9 por dia - menos que uma pizza! Considerando os benefícios para sua saúde e qualidade de vida, é um investimento que vale muito a pena. Quer saber sobre as opções de pagamento?";
    } else if (messageLower.includes('entrega') || messageLower.includes('frete') || messageLower.includes('prazo') || messageLower.includes('envio')) {
      agentResponse = "Fazemos entrega para todo o Brasil! 🚚 O prazo varia de 5 a 15 dias úteis dependendo da sua região. O frete é calculado no checkout. Qual sua cidade para eu verificar o prazo exato?";
    } else if (messageLower.includes('olá') || messageLower.includes('oi') || messageLower.includes('bom dia') || messageLower.includes('boa tarde') || messageLower.includes('boa noite')) {
      agentResponse = "Olá! 👋 Sou a BIA, consultora da Slim Quality. Estou aqui para te ajudar a encontrar a solução ideal para seus problemas de sono e dores. Nossos colchões magnéticos já transformaram a vida de milhares de pessoas. Como posso te ajudar hoje?";
    } else if (messageLower.includes('magnético') || messageLower.includes('magnetoterapia') || messageLower.includes('tecnologia')) {
      agentResponse = "Que bom que você quer saber sobre nossa tecnologia! 🧲 Nossos colchões têm 240 ímãs de neodímio que criam um campo magnético terapêutico. Isso melhora a circulação, reduz dores e acelera a recuperação muscular. Também temos infravermelho longo, vibromassagem e outras 6 tecnologias. Quer que eu detalhe alguma específica?";
    } else if (messageLower.includes('fibromialgia') || messageLower.includes('artrite') || messageLower.includes('artrose') || messageLower.includes('reumatismo')) {
      agentResponse = "Entendo sua preocupação com essas condições. 🩺 Nossos colchões magnéticos são especialmente indicados para fibromialgia, artrite e outras condições inflamatórias. A magnetoterapia ajuda a reduzir a inflamação e a dor. Muitos clientes com essas condições relatam melhora significativa. Gostaria de conversar sobre seu caso específico?";
    } else if (messageLower.includes('circulação') || messageLower.includes('varizes') || messageLower.includes('pernas') || messageLower.includes('inchaço')) {
      agentResponse = "Problemas circulatórios são muito comuns! 🩸 A magnetoterapia do nosso colchão melhora significativamente a circulação sanguínea, ajudando com varizes, pernas pesadas e inchaço. O campo magnético estimula o fluxo sanguíneo durante toda a noite. Você sente esses sintomas com frequência?";
    }

    // Salvar resposta do agente
    await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        content: agentResponse,
        sender_type: 'agent',
        created_at: new Date().toISOString()
      });

    console.log(`✅ Resposta enviada para conversa ${conversation.id}`);

    res.json({
      success: true,
      conversationId: conversation.id,
      response: agentResponse
    });

  } catch (error) {
    console.error('❌ Erro no endpoint /api/chat:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ============================================
// WEBHOOK ASAAS - Sistema de Pagamentos
// ============================================

// Eventos suportados pelo webhook
const SUPPORTED_WEBHOOK_EVENTS = [
  'PAYMENT_RECEIVED',
  'PAYMENT_CONFIRMED', 
  'PAYMENT_SPLIT_CANCELLED',
  'PAYMENT_SPLIT_DIVERGENCE_BLOCK',
  'PAYMENT_OVERDUE',
  'PAYMENT_REFUNDED'
];

/**
 * POST /api/webhooks/asaas
 * Processa notificações de pagamento do Asaas
 */
app.post('/api/webhooks/asaas', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const webhookData = req.body;
    const event = webhookData.event;
    const payment = webhookData.payment;
    
    console.log(`[AsaasWebhook] 📥 Recebido: ${event} | Payment: ${payment?.id}`);

    // Verificar se é um evento suportado
    if (!SUPPORTED_WEBHOOK_EVENTS.includes(event)) {
      console.log(`[AsaasWebhook] ⏭️ Evento não suportado: ${event}`);
      return res.json({ message: 'Evento não suportado', event });
    }

    // Processar evento
    let result = { success: false };
    
    switch (event) {
      case 'PAYMENT_RECEIVED':
        result = await handlePaymentReceived(payment);
        break;
      case 'PAYMENT_CONFIRMED':
        result = await handlePaymentConfirmed(payment);
        break;
      case 'PAYMENT_SPLIT_CANCELLED':
      case 'PAYMENT_SPLIT_DIVERGENCE_BLOCK':
        result = await handleSplitError(payment, event);
        break;
      case 'PAYMENT_OVERDUE':
        result = await handlePaymentOverdue(payment);
        break;
      case 'PAYMENT_REFUNDED':
        result = await handlePaymentRefunded(payment);
        break;
    }

    // Log do tempo de processamento
    const processingTime = Date.now() - startTime;
    console.log(`[AsaasWebhook] ⏱️ Processado em ${processingTime}ms`);

    // Registrar webhook no log
    await logWebhookEvent(webhookData, result, processingTime);

    res.json({
      success: result.success,
      message: result.success ? 'Webhook processado com sucesso' : 'Falha no processamento',
      orderId: result.orderId,
      processingTime: `${processingTime}ms`
    });

  } catch (error) {
    console.error('[AsaasWebhook] ❌ Erro crítico:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/webhooks/asaas/health
 * Health check do webhook
 */
app.get('/api/webhooks/asaas/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    supportedEvents: SUPPORTED_WEBHOOK_EVENTS
  });
});

// Handler: PAYMENT_RECEIVED
async function handlePaymentReceived(payment) {
  console.log(`[AsaasWebhook] 💰 Pagamento recebido: ${payment.id}`);
  
  const orderId = await findOrderByAsaasPaymentId(payment.id, payment.externalReference);
  if (!orderId) {
    return { success: false, error: `Pedido não encontrado para payment: ${payment.id}` };
  }
  
  await updateOrderStatus(orderId, 'processing');
  return { success: true, orderId };
}

// Handler: PAYMENT_CONFIRMED
async function handlePaymentConfirmed(payment) {
  console.log(`[AsaasWebhook] ✅ Pagamento confirmado: ${payment.id}`);
  
  const orderId = await findOrderByAsaasPaymentId(payment.id, payment.externalReference);
  if (!orderId) {
    return { success: false, error: `Pedido não encontrado para payment: ${payment.id}` };
  }
  
  await updateOrderStatus(orderId, 'paid');
  
  // Processar comissões
  const commissionResult = await processOrderCommissions(orderId, payment.value);
  
  return {
    success: true,
    orderId,
    commissionsCalculated: commissionResult.calculated,
    totalCommission: commissionResult.totalCommission
  };
}

// Handler: SPLIT_ERROR
async function handleSplitError(payment, event) {
  console.error(`[AsaasWebhook] ⚠️ Erro de split: ${event} | Payment: ${payment.id}`);
  
  const orderId = await findOrderByAsaasPaymentId(payment.id, payment.externalReference);
  
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
  
  return { success: false, orderId, error: `Split error: ${event}` };
}

// Handler: PAYMENT_OVERDUE
async function handlePaymentOverdue(payment) {
  console.log(`[AsaasWebhook] ⏰ Pagamento vencido: ${payment.id}`);
  
  const orderId = await findOrderByAsaasPaymentId(payment.id, payment.externalReference);
  if (orderId) {
    await updateOrderStatus(orderId, 'overdue');
  }
  
  return { success: true, orderId };
}

// Handler: PAYMENT_REFUNDED
async function handlePaymentRefunded(payment) {
  console.log(`[AsaasWebhook] 💸 Pagamento estornado: ${payment.id}`);
  
  const orderId = await findOrderByAsaasPaymentId(payment.id, payment.externalReference);
  if (orderId) {
    await updateOrderStatus(orderId, 'refunded');
    await cancelOrderCommissions(orderId);
  }
  
  return { success: true, orderId };
}

// Busca pedido pelo ID do pagamento Asaas
async function findOrderByAsaasPaymentId(asaasPaymentId, externalReference) {
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

    // 2. Buscar na tabela payments
    const { data: payment } = await supabase
      .from('payments')
      .select('order_id')
      .eq('asaas_payment_id', asaasPaymentId)
      .single();

    if (payment) return payment.order_id;

    return null;
  } catch (error) {
    console.error('[AsaasWebhook] Erro ao buscar pedido:', error);
    return null;
  }
}

// Atualiza status do pedido
async function updateOrderStatus(orderId, status) {
  try {
    const updateData = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'paid') {
      updateData.paid_at = new Date().toISOString();
    }

    await supabase.from('orders').update(updateData).eq('id', orderId);
    console.log(`[AsaasWebhook] 📊 Pedido ${orderId} atualizado para: ${status}`);
  } catch (error) {
    console.error('[AsaasWebhook] Erro ao atualizar pedido:', error);
  }
}

// Processa comissões do pedido
async function processOrderCommissions(orderId, orderValue) {
  try {
    const { data: order } = await supabase
      .from('orders')
      .select('*, referral_code, affiliate_n1_id')
      .eq('id', orderId)
      .single();

    if (!order?.referral_code) {
      console.log(`[AsaasWebhook] Pedido ${orderId} sem afiliado`);
      return { calculated: false };
    }

    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('id, user_id, wallet_id')
      .eq('referral_code', order.referral_code)
      .eq('status', 'active')
      .single();

    if (!affiliate) {
      return { calculated: false };
    }

    const totalCommission = orderValue * 0.30;

    await supabase.from('commission_logs').insert({
      order_id: orderId,
      action: 'COMMISSION_CALCULATED',
      details: JSON.stringify({
        affiliate_id: affiliate.id,
        order_value: orderValue,
        total_commission: totalCommission,
        calculated_at: new Date().toISOString()
      })
    });

    console.log(`[AsaasWebhook] 💰 Comissão calculada: R$ ${totalCommission.toFixed(2)}`);

    return { calculated: true, totalCommission };
  } catch (error) {
    console.error('[AsaasWebhook] Erro ao processar comissões:', error);
    return { calculated: false };
  }
}

// Cancela comissões de um pedido
async function cancelOrderCommissions(orderId) {
  try {
    await supabase
      .from('commissions')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('order_id', orderId);

    console.log(`[AsaasWebhook] ❌ Comissões canceladas para pedido: ${orderId}`);
  } catch (error) {
    console.error('[AsaasWebhook] Erro ao cancelar comissões:', error);
  }
}

// Registra evento do webhook no log
async function logWebhookEvent(webhookData, result, processingTime) {
  try {
    await supabase.from('webhook_logs').insert({
      provider: 'asaas',
      event_type: webhookData.event,
      payment_id: webhookData.payment?.id,
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

// ============================================
// FIM WEBHOOK ASAAS
// ============================================

// Rota raiz
app.get('/', (req, res) => {
  res.json({ 
    message: 'Slim Quality Chat API',
    version: '1.0.0',
    endpoints: [
      '/api/chat', 
      '/api/health',
      '/api/webhooks/asaas',
      '/api/webhooks/asaas/health'
    ]
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
  console.log(`💬 Chat endpoint: http://localhost:${PORT}/api/chat`);
});