/**
 * Vercel Serverless Function - Checkout Asaas
 * Processa pagamentos PIX e Cartão via Asaas
 */

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET para diagnóstico
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      message: 'Checkout API funcionando',
      env: {
        hasAsaasKey: !!process.env.ASAAS_API_KEY,
        hasWalletRenum: !!process.env.ASAAS_WALLET_RENUM,
        hasWalletJB: !!process.env.ASAAS_WALLET_JB,
        hasSupabaseUrl: !!process.env.SUPABASE_URL || !!process.env.VITE_SUPABASE_URL,
        nodeEnv: process.env.NODE_ENV || 'not-set'
      },
      timestamp: new Date().toISOString()
    });
  }

  // Apenas POST permitido para checkout
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  try {
    // Verificar variáveis de ambiente
    const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
    const ASAAS_WALLET_RENUM = process.env.ASAAS_WALLET_RENUM;
    const ASAAS_WALLET_JB = process.env.ASAAS_WALLET_JB;

    if (!ASAAS_API_KEY) {
      return res.status(500).json({ 
        success: false, 
        error: 'ASAAS_API_KEY não configurada',
        hint: 'Configure no Vercel Dashboard > Settings > Environment Variables'
      });
    }

    if (!ASAAS_WALLET_RENUM || !ASAAS_WALLET_JB) {
      return res.status(500).json({ 
        success: false, 
        error: 'Wallets não configuradas',
        missing: {
          ASAAS_WALLET_RENUM: !ASAAS_WALLET_RENUM,
          ASAAS_WALLET_JB: !ASAAS_WALLET_JB
        }
      });
    }

    // Parse body
    const body = req.body || {};
    const { customer, orderId, amount, billingType, description } = body;

    if (!customer || !orderId || !amount || !billingType) {
      return res.status(400).json({ 
        success: false, 
        error: 'Dados obrigatórios faltando',
        required: ['customer', 'orderId', 'amount', 'billingType'],
        received: { 
          hasCustomer: !!customer, 
          orderId: orderId || null, 
          amount: amount || null, 
          billingType: billingType || null 
        }
      });
    }

    // Headers para Asaas
    const headers = {
      'Content-Type': 'application/json',
      'access_token': ASAAS_API_KEY
    };

    // Buscar ou criar customer
    let asaasCustomerId = null;
    
    const searchRes = await fetch(
      `https://api.asaas.com/v3/customers?email=${encodeURIComponent(customer.email)}`,
      { method: 'GET', headers }
    );
    
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.data && searchData.data.length > 0) {
        asaasCustomerId = searchData.data[0].id;
      }
    }

    if (!asaasCustomerId) {
      const createRes = await fetch('https://api.asaas.com/v3/customers', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: customer.name,
          email: customer.email,
          phone: customer.phone || customer.mobilePhone,
          cpfCnpj: customer.cpfCnpj
        })
      });

      if (!createRes.ok) {
        const errData = await createRes.json();
        return res.status(500).json({ 
          success: false, 
          error: 'Erro ao criar customer no Asaas',
          details: errData
        });
      }

      const newCustomer = await createRes.json();
      asaasCustomerId = newCustomer.id;
    }

    // Criar pagamento
    const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const paymentRes = await fetch('https://api.asaas.com/v3/payments', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        customer: asaasCustomerId,
        billingType: billingType,
        value: amount,
        dueDate: dueDate,
        description: description || `Pedido ${orderId}`,
        externalReference: orderId,
        split: [
          { walletId: ASAAS_WALLET_RENUM, percentualValue: 15 },
          { walletId: ASAAS_WALLET_JB, percentualValue: 15 }
        ]
      })
    });

    const paymentData = await paymentRes.json();

    if (!paymentRes.ok) {
      return res.status(500).json({ 
        success: false, 
        error: 'Erro ao criar pagamento no Asaas',
        details: paymentData
      });
    }

    // Sucesso
    return res.status(200).json({
      success: true,
      paymentId: paymentData.id,
      checkoutUrl: paymentData.invoiceUrl,
      pixQrCode: paymentData.pixQrCode,
      pixCopyPaste: paymentData.pixCopyPaste,
      boletoUrl: paymentData.bankSlipUrl,
      status: paymentData.status
    });

  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro interno',
      type: error.name || 'Error'
    });
  }
}
