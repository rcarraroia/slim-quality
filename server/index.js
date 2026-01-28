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
// CHECKOUT ASAAS - Processamento Seguro
// ============================================

// Configuração Asaas (API key segura no backend)
const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
const ASAAS_WALLET_RENUM = process.env.ASAAS_WALLET_RENUM;
const ASAAS_WALLET_JB = process.env.ASAAS_WALLET_JB;
const ASAAS_BASE_URL = 'https://api.asaas.com/v3';

/**
 * POST /api/checkout
 * Processa checkout de forma segura (API key no backend)
 */
app.post('/api/checkout', async (req, res) => {
  try {
    const { customer, orderId, amount, description, billingType, installments, referralCode } = req.body;

    console.log(`[Checkout] 🛒 Processando pedido: ${orderId}`);

    // Validar dados obrigatórios
    if (!customer || !orderId || !amount || !billingType) {
      return res.status(400).json({
        success: false,
        error: 'Dados obrigatórios: customer, orderId, amount, billingType'
      });
    }

    // Verificar se API key está configurada
    if (!ASAAS_API_KEY) {
      console.error('[Checkout] ❌ ASAAS_API_KEY não configurada');
      return res.status(500).json({
        success: false,
        error: 'Gateway de pagamento não configurado'
      });
    }

    // Buscar rede de afiliados se houver referralCode
    let affiliateNetwork = {};
    if (referralCode) {
      affiliateNetwork = await buildAffiliateNetwork(referralCode);
    }

    // Calcular split
    const splits = calculateSplit(affiliateNetwork);

    // 1. Criar/buscar customer no Asaas
    const asaasCustomerId = await createOrFindAsaasCustomer(customer);

    // 2. Criar cobrança com split
    const paymentResult = await createAsaasPayment({
      customerId: asaasCustomerId,
      amount,
      description: description || `Pedido ${orderId}`,
      externalReference: orderId,
      billingType,
      installments,
      splits
    });

    // 3. Salvar registro de pagamento no banco
    await supabase.from('payments').insert({
      order_id: orderId,
      payment_method: billingType.toLowerCase(),
      amount_cents: Math.round(amount * 100),
      status: 'pending',
      asaas_payment_id: paymentResult.id,
      pix_qr_code: paymentResult.pixQrCode,
      pix_copy_paste: paymentResult.pixCopyPaste,
      installments: installments || 1
    });

    // 4. Salvar log de auditoria do split
    await supabase.from('commission_logs').insert({
      order_id: orderId,
      action: 'SPLIT_CALCULATED',
      details: JSON.stringify({
        splits,
        network: affiliateNetwork,
        total_percentage: 30,
        calculated_at: new Date().toISOString()
      })
    });

    // 5. Atualizar pedido com afiliado
    if (affiliateNetwork.n1) {
      await supabase.from('orders').update({
        affiliate_n1_id: affiliateNetwork.n1.id,
        updated_at: new Date().toISOString()
      }).eq('id', orderId);
    }

    console.log(`[Checkout] ✅ Pagamento criado: ${paymentResult.id}`);

    res.json({
      success: true,
      paymentId: paymentResult.id,
      checkoutUrl: paymentResult.invoiceUrl,
      pixQrCode: paymentResult.pixQrCode,
      pixCopyPaste: paymentResult.pixCopyPaste,
      boletoUrl: paymentResult.bankSlipUrl,
      status: paymentResult.status
    });

  } catch (error) {
    console.error('[Checkout] ❌ Erro:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao processar pagamento'
    });
  }
});

// Busca rede de afiliados (N1, N2, N3)
async function buildAffiliateNetwork(referralCode) {
  const network = {};

  // Buscar N1
  const { data: n1 } = await supabase
    .from('affiliates')
    .select('id, wallet_id, referred_by')
    .eq('referral_code', referralCode)
    .eq('status', 'active')
    .single();

  if (!n1 || !n1.wallet_id || !isValidWalletId(n1.wallet_id)) {
    return network;
  }

  network.n1 = { id: n1.id, walletId: n1.wallet_id };

  // Buscar N2
  if (n1.referred_by) {
    const { data: n2 } = await supabase
      .from('affiliates')
      .select('id, wallet_id, referred_by')
      .eq('id', n1.referred_by)
      .eq('status', 'active')
      .single();

    if (n2?.wallet_id && isValidWalletId(n2.wallet_id)) {
      network.n2 = { id: n2.id, walletId: n2.wallet_id };

      // Buscar N3
      if (n2.referred_by) {
        const { data: n3 } = await supabase
          .from('affiliates')
          .select('id, wallet_id')
          .eq('id', n2.referred_by)
          .eq('status', 'active')
          .single();

        if (n3?.wallet_id && isValidWalletId(n3.wallet_id)) {
          network.n3 = { id: n3.id, walletId: n3.wallet_id };
        }
      }
    }
  }

  return network;
}

// Valida formato de Wallet ID
function isValidWalletId(walletId) {
  const walFormat = /^wal_[a-zA-Z0-9]{16,32}$/.test(walletId);
  const uuidFormat = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(walletId);
  return walFormat || uuidFormat;
}

// Calcula split baseado na rede de afiliados
function calculateSplit(network) {
  if (!ASAAS_WALLET_RENUM || !ASAAS_WALLET_JB) {
    console.error('[Checkout] ❌ Wallets dos gestores não configuradas');
    throw new Error('Wallets dos gestores não configuradas');
  }

  const splits = [];

  if (!network.n1) {
    // SEM AFILIADO: 15% cada para gestores
    splits.push(
      { walletId: ASAAS_WALLET_RENUM, percentualValue: 15 },
      { walletId: ASAAS_WALLET_JB, percentualValue: 15 }
    );
  } else if (!network.n2) {
    // APENAS N1: 15% N1 + 7.5% Renum + 7.5% JB
    splits.push(
      { walletId: network.n1.walletId, percentualValue: 15 },
      { walletId: ASAAS_WALLET_RENUM, percentualValue: 7.5 },
      { walletId: ASAAS_WALLET_JB, percentualValue: 7.5 }
    );
  } else if (!network.n3) {
    // N1+N2: 15% N1 + 3% N2 + 6% Renum + 6% JB
    splits.push(
      { walletId: network.n1.walletId, percentualValue: 15 },
      { walletId: network.n2.walletId, percentualValue: 3 },
      { walletId: ASAAS_WALLET_RENUM, percentualValue: 6 },
      { walletId: ASAAS_WALLET_JB, percentualValue: 6 }
    );
  } else {
    // REDE COMPLETA: 15% N1 + 3% N2 + 2% N3 + 5% Renum + 5% JB
    splits.push(
      { walletId: network.n1.walletId, percentualValue: 15 },
      { walletId: network.n2.walletId, percentualValue: 3 },
      { walletId: network.n3.walletId, percentualValue: 2 },
      { walletId: ASAAS_WALLET_RENUM, percentualValue: 5 },
      { walletId: ASAAS_WALLET_JB, percentualValue: 5 }
    );
  }

  return splits;
}

// Cria ou busca customer no Asaas
async function createOrFindAsaasCustomer(customerData) {
  const headers = {
    'Content-Type': 'application/json',
    'access_token': ASAAS_API_KEY
  };

  // Buscar existente
  const searchResponse = await fetch(
    `${ASAAS_BASE_URL}/customers?email=${encodeURIComponent(customerData.email)}`,
    { method: 'GET', headers }
  );

  if (searchResponse.ok) {
    const result = await searchResponse.json();
    if (result.data && result.data.length > 0) {
      return result.data[0].id;
    }
  }

  // Criar novo
  const createResponse = await fetch(`${ASAAS_BASE_URL}/customers`, {
    method: 'POST',
    headers,
    body: JSON.stringify(customerData)
  });

  if (!createResponse.ok) {
    const error = await createResponse.json();
    throw new Error(`Erro ao criar customer: ${error.errors?.[0]?.description || createResponse.statusText}`);
  }

  const customer = await createResponse.json();
  return customer.id;
}

// Cria pagamento no Asaas com split
async function createAsaasPayment({ customerId, amount, description, externalReference, billingType, installments, splits }) {
  const headers = {
    'Content-Type': 'application/json',
    'access_token': ASAAS_API_KEY
  };

  const payload = {
    customer: customerId,
    billingType,
    value: amount,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    description,
    externalReference,
    split: splits
  };

  if (billingType === 'CREDIT_CARD' && installments > 1) {
    payload.installmentCount = installments;
    payload.installmentValue = amount / installments;
  }

  console.log('[Checkout] 💳 Criando pagamento:', { amount, billingType, splits: splits.length });

  const response = await fetch(`${ASAAS_BASE_URL}/payments`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Erro ao criar pagamento: ${error.errors?.[0]?.description || response.statusText}`);
  }

  return await response.json();
}

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