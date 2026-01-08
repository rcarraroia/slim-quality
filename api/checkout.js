/**
 * Vercel Serverless Function - Checkout Asaas
 * Processa pagamentos de forma segura (API key no servidor)
 */

const { createClient } = require('@supabase/supabase-js');

// Configuração Asaas
const ASAAS_BASE_URL = 'https://api.asaas.com/v3';

module.exports = async function handler(req, res) {
  // CORS - sempre primeiro
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  // Variáveis de ambiente - carregar dentro do handler
  const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
  const ASAAS_WALLET_RENUM = process.env.ASAAS_WALLET_RENUM;
  const ASAAS_WALLET_JB = process.env.ASAAS_WALLET_JB;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  // Log de debug das variáveis
  console.log('[Checkout] ENV Check:', {
    hasAsaasKey: !!ASAAS_API_KEY,
    hasWalletRenum: !!ASAAS_WALLET_RENUM,
    hasWalletJB: !!ASAAS_WALLET_JB,
    hasSupabaseUrl: !!supabaseUrl,
    hasSupabaseKey: !!supabaseKey,
    supabaseUrlPrefix: supabaseUrl ? supabaseUrl.substring(0, 30) : 'MISSING'
  });

  try {
    // Validar variáveis críticas
    if (!ASAAS_API_KEY) {
      console.error('[Checkout] ❌ ASAAS_API_KEY não configurada');
      return res.status(500).json({ 
        success: false, 
        error: 'ASAAS_API_KEY não configurada no Vercel' 
      });
    }

    if (!ASAAS_WALLET_RENUM || !ASAAS_WALLET_JB) {
      console.error('[Checkout] ❌ Wallets não configuradas');
      return res.status(500).json({ 
        success: false, 
        error: 'ASAAS_WALLET_RENUM ou ASAAS_WALLET_JB não configuradas' 
      });
    }

    // Parse do body
    const { customer, orderId, amount, description, billingType, installments, referralCode } = req.body || {};

    console.log('[Checkout] 🛒 Request:', { orderId, amount, billingType, hasCustomer: !!customer });

    // Validar dados obrigatórios
    if (!customer || !orderId || !amount || !billingType) {
      return res.status(400).json({ 
        success: false, 
        error: 'Dados obrigatórios: customer, orderId, amount, billingType' 
      });
    }

    // Calcular split (sem afiliado por enquanto para simplificar)
    const splits = [
      { walletId: ASAAS_WALLET_RENUM, percentualValue: 15 },
      { walletId: ASAAS_WALLET_JB, percentualValue: 15 }
    ];

    console.log('[Checkout] 📊 Split calculado:', splits);

    // 1. Criar/buscar customer no Asaas
    console.log('[Checkout] 👤 Buscando/criando customer no Asaas...');
    const asaasCustomerId = await createOrFindAsaasCustomer(customer, ASAAS_API_KEY);
    console.log('[Checkout] ✅ Customer ID:', asaasCustomerId);

    // 2. Criar cobrança com split
    console.log('[Checkout] 💳 Criando pagamento no Asaas...');
    const paymentResult = await createAsaasPayment({
      customerId: asaasCustomerId,
      amount,
      description: description || `Pedido ${orderId}`,
      externalReference: orderId,
      billingType,
      installments,
      splits,
      apiKey: ASAAS_API_KEY
    });
    console.log('[Checkout] ✅ Pagamento criado:', paymentResult.id);

    // 3. Salvar no banco (opcional - não bloquear se falhar)
    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        await supabase.from('payments').insert({
          order_id: orderId,
          payment_method: billingType.toLowerCase(),
          amount_cents: Math.round(amount * 100),
          status: 'pending',
          asaas_payment_id: paymentResult.id,
          pix_qr_code: paymentResult.pixQrCode || null,
          pix_copy_paste: paymentResult.pixCopyPaste || null,
          installments: installments || 1
        });
        console.log('[Checkout] 💾 Payment salvo no banco');
      } catch (dbError) {
        console.warn('[Checkout] ⚠️ Erro ao salvar no banco (não crítico):', dbError.message);
      }
    }

    // Retornar sucesso
    return res.status(200).json({
      success: true,
      paymentId: paymentResult.id,
      checkoutUrl: paymentResult.invoiceUrl,
      pixQrCode: paymentResult.pixQrCode,
      pixCopyPaste: paymentResult.pixCopyPaste,
      boletoUrl: paymentResult.bankSlipUrl,
      status: paymentResult.status
    });

  } catch (error) {
    console.error('[Checkout] ❌ Erro completo:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro ao processar pagamento',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

async function createOrFindAsaasCustomer(customerData, apiKey) {
  const headers = {
    'Content-Type': 'application/json',
    'access_token': apiKey
  };

  // Buscar customer existente
  const searchResponse = await fetch(
    `${ASAAS_BASE_URL}/customers?email=${encodeURIComponent(customerData.email)}`,
    { method: 'GET', headers }
  );

  if (searchResponse.ok) {
    const result = await searchResponse.json();
    if (result.data && result.data.length > 0) {
      console.log('[Checkout] 👤 Customer existente encontrado');
      return result.data[0].id;
    }
  }

  // Criar novo customer
  console.log('[Checkout] 👤 Criando novo customer...');
  const createResponse = await fetch(`${ASAAS_BASE_URL}/customers`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: customerData.name,
      email: customerData.email,
      phone: customerData.phone || customerData.mobilePhone,
      cpfCnpj: customerData.cpfCnpj
    })
  });

  if (!createResponse.ok) {
    const errorData = await createResponse.json();
    console.error('[Checkout] ❌ Erro Asaas customer:', errorData);
    throw new Error(`Erro ao criar customer: ${errorData.errors?.[0]?.description || createResponse.statusText}`);
  }

  const customer = await createResponse.json();
  return customer.id;
}

async function createAsaasPayment({ customerId, amount, description, externalReference, billingType, installments, splits, apiKey }) {
  const headers = {
    'Content-Type': 'application/json',
    'access_token': apiKey
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

  console.log('[Checkout] 📤 Payload Asaas:', JSON.stringify(payload, null, 2));

  const response = await fetch(`${ASAAS_BASE_URL}/payments`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  const responseData = await response.json();

  if (!response.ok) {
    console.error('[Checkout] ❌ Erro Asaas payment:', responseData);
    throw new Error(`Erro ao criar pagamento: ${responseData.errors?.[0]?.description || response.statusText}`);
  }

  console.log('[Checkout] ✅ Resposta Asaas:', responseData);
  return responseData;
}
