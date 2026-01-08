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
    const { customer, orderId, amount, billingType, description, installments, creditCard, creditCardHolderInfo } = body;

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

    // Validar CPF/CNPJ obrigatório para Asaas
    if (!customer.cpfCnpj) {
      return res.status(400).json({ 
        success: false, 
        error: 'CPF/CNPJ é obrigatório para processamento do pagamento',
        hint: 'O campo cpfCnpj deve ser enviado no objeto customer'
      });
    }

    // Validar dados do cartão se for pagamento com cartão
    if (billingType === 'CREDIT_CARD' && !creditCard) {
      return res.status(400).json({ 
        success: false, 
        error: 'Dados do cartão são obrigatórios para pagamento com cartão de crédito',
        required: ['creditCard.holderName', 'creditCard.number', 'creditCard.expiryMonth', 'creditCard.expiryYear', 'creditCard.ccv']
      });
    }

    // Headers para Asaas
    // Detectar ambiente baseado na API key
    // Produção: $aact_prod_... ou $aact_MjA... (contém _prod_ ou começa com padrão de produção)
    // Sandbox: $aact_YTU5... (não contém _prod_)
    const isProduction = ASAAS_API_KEY.includes('_prod_');
    const asaasBaseUrl = isProduction 
      ? 'https://api.asaas.com/v3'
      : 'https://api-sandbox.asaas.com/v3';
    
    console.log('Asaas environment:', isProduction ? 'PRODUCTION' : 'SANDBOX');
    console.log('API Key prefix:', ASAAS_API_KEY.substring(0, 15) + '...');
    
    const headers = {
      'Content-Type': 'application/json',
      'access_token': ASAAS_API_KEY
    };

    // Buscar ou criar customer
    let asaasCustomerId = null;
    
    const searchRes = await fetch(
      `${asaasBaseUrl}/customers?email=${encodeURIComponent(customer.email)}`,
      { method: 'GET', headers }
    );
    
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.data && searchData.data.length > 0) {
        asaasCustomerId = searchData.data[0].id;
      }
    }

    if (!asaasCustomerId) {
      // Limpar CPF/CNPJ - remover pontos, traços e espaços
      const cleanCpfCnpj = customer.cpfCnpj.replace(/\D/g, '');
      
      console.log('Creating Asaas customer:', {
        name: customer.name,
        email: customer.email,
        phone: customer.phone || customer.mobilePhone,
        cpfCnpj: cleanCpfCnpj,
        cpfCnpjLength: cleanCpfCnpj.length
      });

      const createRes = await fetch(`${asaasBaseUrl}/customers`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: customer.name,
          email: customer.email,
          phone: customer.phone || customer.mobilePhone,
          cpfCnpj: cleanCpfCnpj
        })
      });

      const responseData = await createRes.json();
      
      if (!createRes.ok) {
        console.error('Asaas customer creation error:', JSON.stringify(responseData, null, 2));
        return res.status(500).json({ 
          success: false, 
          error: 'Erro ao criar customer no Asaas',
          details: responseData,
          debug: {
            statusCode: createRes.status,
            cpfCnpjSent: cleanCpfCnpj,
            cpfCnpjLength: cleanCpfCnpj.length
          }
        });
      }

      asaasCustomerId = responseData.id;
      console.log('Asaas customer created:', asaasCustomerId);
    }

    // Criar pagamento
    const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Payload base do pagamento
    const paymentPayload = {
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
    };

    // Adicionar parcelas se for cartão de crédito
    if (billingType === 'CREDIT_CARD' && installments && installments > 1) {
      paymentPayload.installmentCount = installments;
      paymentPayload.installmentValue = amount / installments;
    }

    const paymentRes = await fetch(`${asaasBaseUrl}/payments`, {
      method: 'POST',
      headers,
      body: JSON.stringify(paymentPayload)
    });

    const paymentData = await paymentRes.json();

    if (!paymentRes.ok) {
      console.error('Asaas payment error:', JSON.stringify(paymentData, null, 2));
      return res.status(500).json({ 
        success: false, 
        error: 'Erro ao criar pagamento no Asaas',
        details: paymentData,
        debug: {
          customerId: asaasCustomerId,
          billingType,
          amount,
          walletRenum: ASAAS_WALLET_RENUM?.substring(0, 10) + '...',
          walletJB: ASAAS_WALLET_JB?.substring(0, 10) + '...'
        }
      });
    }

    // Se for cartão de crédito com dados do cartão, processar pagamento imediatamente
    if (billingType === 'CREDIT_CARD' && creditCard) {
      console.log('Processing credit card payment for payment:', paymentData.id);
      
      const payWithCardRes = await fetch(`${asaasBaseUrl}/payments/${paymentData.id}/payWithCreditCard`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          creditCard: {
            holderName: creditCard.holderName,
            number: creditCard.number,
            expiryMonth: creditCard.expiryMonth,
            expiryYear: creditCard.expiryYear,
            ccv: creditCard.ccv
          },
          creditCardHolderInfo: creditCardHolderInfo || {
            name: customer.name,
            email: customer.email,
            cpfCnpj: customer.cpfCnpj,
            postalCode: customer.postalCode || '00000000',
            addressNumber: customer.addressNumber || 'S/N',
            phone: customer.phone || customer.mobilePhone
          }
        })
      });

      const cardPaymentData = await payWithCardRes.json();

      if (!payWithCardRes.ok) {
        console.error('Asaas card payment error:', JSON.stringify(cardPaymentData, null, 2));
        return res.status(500).json({ 
          success: false, 
          error: 'Erro ao processar pagamento com cartão',
          details: cardPaymentData
        });
      }

      // Sucesso no pagamento com cartão
      return res.status(200).json({
        success: true,
        paymentId: paymentData.id,
        status: cardPaymentData.status,
        confirmedDate: cardPaymentData.confirmedDate,
        message: 'Pagamento com cartão processado com sucesso'
      });
    }

    // Sucesso (PIX ou aguardando dados do cartão)
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
