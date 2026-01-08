/**
 * Vercel Serverless Function - Checkout Asaas
 * Versão ultra-defensiva para debug
 */

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

  // Wrap TUDO em try-catch
  try {
    // 1. Verificar variáveis de ambiente
    const envCheck = {
      ASAAS_API_KEY: !!process.env.ASAAS_API_KEY,
      ASAAS_WALLET_RENUM: !!process.env.ASAAS_WALLET_RENUM,
      ASAAS_WALLET_JB: !!process.env.ASAAS_WALLET_JB,
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      VITE_SUPABASE_URL: !!process.env.VITE_SUPABASE_URL,
      SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY,
      NODE_ENV: process.env.NODE_ENV || 'unknown'
    };

    console.log('[Checkout] ENV Check:', JSON.stringify(envCheck));

    // Validar variáveis críticas
    if (!process.env.ASAAS_API_KEY) {
      return res.status(500).json({ 
        success: false, 
        error: 'ASAAS_API_KEY não configurada no Vercel',
        envCheck
      });
    }

    if (!process.env.ASAAS_WALLET_RENUM || !process.env.ASAAS_WALLET_JB) {
      return res.status(500).json({ 
        success: false, 
        error: 'ASAAS_WALLET_RENUM ou ASAAS_WALLET_JB não configuradas',
        envCheck
      });
    }

    // 2. Parse do body
    const body = req.body || {};
    const { customer, orderId, amount, billingType, description, installments } = body;

    console.log('[Checkout] Request:', JSON.stringify({ orderId, amount, billingType, hasCustomer: !!customer }));

    if (!customer || !orderId || !amount || !billingType) {
      return res.status(400).json({ 
        success: false, 
        error: 'Dados obrigatórios: customer, orderId, amount, billingType',
        received: { hasCustomer: !!customer, orderId, amount, billingType }
      });
    }

    // 3. Configurar headers para Asaas
    const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
    const ASAAS_WALLET_RENUM = process.env.ASAAS_WALLET_RENUM;
    const ASAAS_WALLET_JB = process.env.ASAAS_WALLET_JB;
    const ASAAS_BASE_URL = 'https://api.asaas.com/v3';

    const headers = {
      'Content-Type': 'application/json',
      'access_token': ASAAS_API_KEY
    };

    // 4. Buscar/criar customer no Asaas
    console.log('[Checkout] Buscando customer no Asaas...');
    
    let asaasCustomerId;
    
    // Buscar customer existente
    const searchUrl = `${ASAAS_BASE_URL}/customers?email=${encodeURIComponent(customer.email)}`;
    const searchResponse = await fetch(searchUrl, { method: 'GET', headers });
    
    if (searchResponse.ok) {
      const searchResult = await searchResponse.json();
      if (searchResult.data && searchResult.data.length > 0) {
        asaasCustomerId = searchResult.data[0].id;
        console.log('[Checkout] Customer existente:', asaasCustomerId);
      }
    }

    // Criar customer se não existe
    if (!asaasCustomerId) {
      console.log('[Checkout] Criando novo customer...');
      const createCustomerResponse = await fetch(`${ASAAS_BASE_URL}/customers`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: customer.name,
          email: customer.email,
          phone: customer.phone || customer.mobilePhone,
          cpfCnpj: customer.cpfCnpj
        })
      });

      if (!createCustomerResponse.ok) {
        const errorData = await createCustomerResponse.json();
        console.error('[Checkout] Erro criar customer:', JSON.stringify(errorData));
        return res.status(500).json({ 
          success: false, 
          error: `Erro ao criar customer no Asaas: ${errorData.errors?.[0]?.description || 'Erro desconhecido'}`,
          asaasError: errorData
        });
      }

      const newCustomer = await createCustomerResponse.json();
      asaasCustomerId = newCustomer.id;
      console.log('[Checkout] Novo customer criado:', asaasCustomerId);
    }

    // 5. Criar pagamento com split
    console.log('[Checkout] Criando pagamento...');
    
    const splits = [
      { walletId: ASAAS_WALLET_RENUM, percentualValue: 15 },
      { walletId: ASAAS_WALLET_JB, percentualValue: 15 }
    ];

    const paymentPayload = {
      customer: asaasCustomerId,
      billingType: billingType,
      value: amount,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      description: description || `Pedido ${orderId}`,
      externalReference: orderId,
      split: splits
    };

    console.log('[Checkout] Payment payload:', JSON.stringify(paymentPayload));

    const paymentResponse = await fetch(`${ASAAS_BASE_URL}/payments`, {
      method: 'POST',
      headers,
      body: JSON.stringify(paymentPayload)
    });

    const paymentResult = await paymentResponse.json();

    if (!paymentResponse.ok) {
      console.error('[Checkout] Erro criar pagamento:', JSON.stringify(paymentResult));
      return res.status(500).json({ 
        success: false, 
        error: `Erro ao criar pagamento no Asaas: ${paymentResult.errors?.[0]?.description || 'Erro desconhecido'}`,
        asaasError: paymentResult
      });
    }

    console.log('[Checkout] Pagamento criado:', paymentResult.id);

    // 6. Retornar sucesso
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
    console.error('[Checkout] ERRO FATAL:', error.message, error.stack);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro interno do servidor',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
