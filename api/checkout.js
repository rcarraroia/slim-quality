/**
 * Vercel Serverless Function - Checkout Asaas
 * Processa pagamentos de forma segura (API key no servidor)
 */

const { createClient } = require('@supabase/supabase-js');

// Configuração
const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
const ASAAS_WALLET_RENUM = process.env.ASAAS_WALLET_RENUM;
const ASAAS_WALLET_JB = process.env.ASAAS_WALLET_JB;
const ASAAS_BASE_URL = 'https://api.asaas.com/v3';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

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
    console.error('[Checkout] ❌ Erro:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro ao processar pagamento' 
    });
  }
};

// Busca rede de afiliados (N1, N2, N3)
async function buildAffiliateNetwork(referralCode) {
  const network = {};

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

  if (n1.referred_by) {
    const { data: n2 } = await supabase
      .from('affiliates')
      .select('id, wallet_id, referred_by')
      .eq('id', n1.referred_by)
      .eq('status', 'active')
      .single();

    if (n2 && n2.wallet_id && isValidWalletId(n2.wallet_id)) {
      network.n2 = { id: n2.id, walletId: n2.wallet_id };

      if (n2.referred_by) {
        const { data: n3 } = await supabase
          .from('affiliates')
          .select('id, wallet_id')
          .eq('id', n2.referred_by)
          .eq('status', 'active')
          .single();

        if (n3 && n3.wallet_id && isValidWalletId(n3.wallet_id)) {
          network.n3 = { id: n3.id, walletId: n3.wallet_id };
        }
      }
    }
  }

  return network;
}

function isValidWalletId(walletId) {
  const walFormat = /^wal_[a-zA-Z0-9]{16,32}$/.test(walletId);
  const uuidFormat = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(walletId);
  return walFormat || uuidFormat;
}

function calculateSplit(network) {
  if (!ASAAS_WALLET_RENUM || !ASAAS_WALLET_JB) {
    console.error('[Checkout] ❌ Wallets dos gestores não configuradas');
    throw new Error('Wallets dos gestores não configuradas');
  }

  const splits = [];

  if (!network.n1) {
    splits.push(
      { walletId: ASAAS_WALLET_RENUM, percentualValue: 15 },
      { walletId: ASAAS_WALLET_JB, percentualValue: 15 }
    );
  } else if (!network.n2) {
    splits.push(
      { walletId: network.n1.walletId, percentualValue: 15 },
      { walletId: ASAAS_WALLET_RENUM, percentualValue: 7.5 },
      { walletId: ASAAS_WALLET_JB, percentualValue: 7.5 }
    );
  } else if (!network.n3) {
    splits.push(
      { walletId: network.n1.walletId, percentualValue: 15 },
      { walletId: network.n2.walletId, percentualValue: 3 },
      { walletId: ASAAS_WALLET_RENUM, percentualValue: 6 },
      { walletId: ASAAS_WALLET_JB, percentualValue: 6 }
    );
  } else {
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

async function createOrFindAsaasCustomer(customerData) {
  const headers = {
    'Content-Type': 'application/json',
    'access_token': ASAAS_API_KEY
  };

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
