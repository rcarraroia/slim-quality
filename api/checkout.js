/**
 * Vercel Serverless Function - Checkout Asaas
 * Processa pagamentos PIX e Cartão via Asaas
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  console.log('Trigger Vercel Deploy - Fix PIX Invoice URL'); // Force deploy
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET para diagnóstico COMPLETO (testa autenticação real no Asaas)
  if (req.method === 'GET') {
    const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
    const keyInfo = {
      hasKey: !!ASAAS_API_KEY,
      keyLength: ASAAS_API_KEY?.length || 0,
      keyPrefix: ASAAS_API_KEY?.substring(0, 10) || 'N/A',
      hasDollarPrefix: ASAAS_API_KEY?.startsWith('$') || false,
      trimmedLength: ASAAS_API_KEY?.trim().length || 0
    };

    // Detectar ambiente baseado na chave
    const trimmedKey = ASAAS_API_KEY?.trim() || '';
    const isProduction = trimmedKey.includes('_prod_');
    const asaasBaseUrl = isProduction
      ? 'https://api.asaas.com/v3'
      : 'https://api-sandbox.asaas.com/v3';

    // Teste de autenticação real no Asaas
    let authTestResult = { success: false, error: 'Não testado' };
    if (ASAAS_API_KEY) {
      try {
        const testResponse = await fetch(`${asaasBaseUrl}/customers?limit=1`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'access_token': trimmedKey
          }
        });

        const testData = await testResponse.json();

        if (testResponse.ok) {
          authTestResult = {
            success: true,
            status: testResponse.status,
            message: 'Autenticação OK! Chave válida.',
            customersFound: testData.totalCount || 0
          };
        } else {
          authTestResult = {
            success: false,
            status: testResponse.status,
            error: testData.errors?.[0]?.description || testData.message || 'Erro desconhecido',
            rawResponse: testData
          };
        }
      } catch (fetchError) {
        authTestResult = {
          success: false,
          error: `Erro de conexão: ${fetchError.message}`
        };
      }
    }

    return res.status(200).json({
      status: authTestResult.success ? 'ok' : 'auth_failed',
      message: authTestResult.success ? 'Checkout API funcionando' : 'Falha na autenticação do Asaas',
      keyDiagnostic: keyInfo,
      environment: isProduction ? 'PRODUCTION' : 'SANDBOX',
      asaasBaseUrl: asaasBaseUrl,
      authTest: authTestResult,
      env: {
        hasAsaasKey: !!ASAAS_API_KEY,
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
      console.error('❌ ASAAS_API_KEY está vazia ou não definida no process.env');
      return res.status(500).json({
        success: false,
        error: 'ASAAS_API_KEY não configurada',
        hint: 'Configure no Vercel Dashboard > Settings > Environment Variables'
      });
    }

    const trimmedKey = ASAAS_API_KEY.trim();
    // Produção: contém _prod_ | Sandbox: padrão contrário
    const isProduction = trimmedKey.includes('_prod_');
    const asaasBaseUrl = isProduction
      ? 'https://api.asaas.com/v3'
      : 'https://api-sandbox.asaas.com/v3';

    console.log('📡 Asaas Auth Diag:', {
      envDetected: isProduction ? 'PRODUCTION' : 'SANDBOX',
      keyLength: trimmedKey.length,
      keyPrefix: trimmedKey.substring(0, 10),
      hasDollarPrefix: trimmedKey.startsWith('$')
    });

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
    
    // ============================================================
    // GUARD: Rejeitar produtos IA (devem usar endpoint de assinaturas)
    // ============================================================
    const orderItems = body.orderItems || [];
    const hasIAProduct = orderItems.some(item => 
      item.product_sku === 'COL-707D80' || 
      item.sku === 'COL-707D80'
    );

    if (hasIAProduct) {
      console.log('[Checkout] ❌ Tentativa de processar produto IA - rejeitado');
      return res.status(400).json({
        success: false,
        error: 'Produtos de assinatura (Agente IA) devem ser processados via endpoint dedicado',
        hint: 'Use POST /api/subscriptions/create-payment para produtos IA',
        documentation: 'Consulte .spec/subscription-payment-flow/ para detalhes'
      });
    }

    const { customer, orderId, amount, billingType, description, installments, creditCard, creditCardHolderInfo, referralCode } = body;

    console.log('Checkout request:', { orderId, amount, billingType, referralCode: referralCode || 'none' });

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

    const headers = {
      'Content-Type': 'application/json',
      'access_token': trimmedKey
    };

    // Buscar ou criar customer
    let asaasCustomerId = null;

    // Limpar CPF/CNPJ - remover pontos, traços e espaços
    const cleanCpfCnpj = customer.cpfCnpj ? customer.cpfCnpj.replace(/\D/g, '') : null;

    const searchRes = await fetch(
      `${asaasBaseUrl}/customers?email=${encodeURIComponent(customer.email)}`,
      { method: 'GET', headers }
    );

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.data && searchData.data.length > 0) {
        const existingCustomer = searchData.data[0];
        asaasCustomerId = existingCustomer.id;

        // Se o customer existe mas não tem CPF, atualizar
        if (!existingCustomer.cpfCnpj && cleanCpfCnpj) {
          console.log('Updating existing Asaas customer with CPF:', asaasCustomerId);

          const updateRes = await fetch(`${asaasBaseUrl}/customers/${asaasCustomerId}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({
              cpfCnpj: cleanCpfCnpj
            })
          });

          if (!updateRes.ok) {
            const updateErr = await updateRes.json();
            console.error('Failed to update customer CPF:', updateErr);
          } else {
            console.log('Customer CPF updated successfully');
          }
        }
      }
    }

    if (!asaasCustomerId) {
      console.log('Creating Asaas customer:', {
        name: customer.name,
        email: customer.email,
        phone: customer.phone || customer.mobilePhone,
        cpfCnpj: cleanCpfCnpj,
        cpfCnpjLength: cleanCpfCnpj?.length
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

    // Criar data de vencimento (7 dias para PIX/Boleto)
    const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Calcular split baseado na rede de afiliados (apenas produtos físicos)
    const splits = await calculateAffiliateSplit(referralCode, ASAAS_WALLET_RENUM, ASAAS_WALLET_JB);

    console.log('Split calculado:', splits);
    console.log('Asaas Target: PAYMENT (produtos físicos)');

    // Endpoint sempre /payments para produtos físicos
    let asaasEndpoint = '/payments';
    let paymentPayload;
    // Endpoint sempre /payments para produtos físicos
    paymentPayload = {
      customer: asaasCustomerId,
      billingType: billingType,
      value: amount,
      externalReference: orderId,
      description: description || `Pedido ${orderId}`,
      split: splits,
      dueDate: dueDate,
      fine: { value: 0 },
      interest: { value: 0 }
    };

    // Adicionar parcelas se for cartão de crédito
    if (billingType === 'CREDIT_CARD' && installments && installments > 1) {
      paymentPayload.installmentCount = installments;
      paymentPayload.installmentValue = amount / installments;
    }
      } else {
        // Campos específicos de Assinatura
        paymentPayload.nextDueDate = dueDate;
        paymentPayload.cycle = 'MONTHLY'; // Fixo mensal para o Agente IA
      }
    }

    const paymentRes = await fetch(`${asaasBaseUrl}${asaasEndpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(paymentPayload)
    });

    const paymentData = await paymentRes.json();

    // ✅ CORREÇÃO: Log detalhado da resposta para debug do Payment First
    console.log('📡 Asaas Response Status:', paymentRes.status);
    console.log('📡 Asaas Response Headers:', Object.fromEntries(paymentRes.headers.entries()));
    
    if (!paymentRes.ok) {
      console.error('❌ Asaas payment error (Payment First):', JSON.stringify(paymentData, null, 2));
      console.error('❌ Request payload que falhou:', JSON.stringify({
        endpoint: `${asaasBaseUrl}${asaasEndpoint}`,
        method: 'POST',
        payloadKeys: Object.keys(paymentPayload),
        billingType: paymentPayload.billingType,
        hasCrediCard: !!paymentPayload.creditCard,
        hasCreditCardHolderInfo: !!paymentPayload.creditCardHolderInfo,
        hasRemoteIp: !!paymentPayload.remoteIp
      }, null, 2));
      
      return res.status(500).json({
        success: false,
        error: 'Erro ao criar pagamento no Asaas',
        details: paymentData,
        debug: {
          endpoint: asaasEndpoint,
          customerId: asaasCustomerId,
          billingType,
          amount,
          walletRenum: ASAAS_WALLET_RENUM?.substring(0, 10) + '...',
          walletJB: ASAAS_WALLET_JB?.substring(0, 10) + '...'
        }
      });
    }

    // Log de sucesso detalhado
    console.log('✅ Asaas payment created successfully:', {
      id: paymentData.id,
      status: paymentData.status,
      billingType: paymentData.billingType,
      value: paymentData.value
    });

    // Usar o ID do pagamento criado
    let paymentIdToProcess = paymentData.id;
    let finalInvoiceUrl = paymentData.invoiceUrl;
        headers
      });

      if (paymentsRes.ok) {
        const paymentsData = await paymentsRes.json();

        if (paymentsData.data && paymentsData.data.length > 0) {
          // Pegar a primeira cobrança (mais recente ou pendente)
          subscriptionFirstPayment = paymentsData.data[0];
          paymentIdToProcess = subscriptionFirstPayment.id;
          finalInvoiceUrl = subscriptionFirstPayment.invoiceUrl;
          console.log('Using real payment ID for operations:', paymentIdToProcess);
        } else {
          console.warn('No payments found for subscription yet');
        }
      } else {
        const paymentsError = await paymentsRes.text();
        console.error('Failed to fetch subscription payments:', paymentsError);
      }
    }

    // Se for PIX, buscar QR Code separadamente
    let pixQrCode = null;
    let pixCopyPaste = null;

    if (billingType === 'PIX') {
      // Buscar QR Code do pagamento
      console.log('Fetching PIX QR Code for payment:', paymentIdToProcess);

      const pixRes = await fetch(`${asaasBaseUrl}/payments/${paymentIdToProcess}/pixQrCode`, {
        method: 'GET',
        headers
      });

      if (pixRes.ok) {
        const pixData = await pixRes.json();
        pixQrCode = pixData.encodedImage;
        pixCopyPaste = pixData.payload;
        console.log('PIX QR Code obtained successfully');
      } else {
        const pixError = await pixRes.text();
        console.warn('Failed to get PIX QR Code:', pixError);
      }
    }

    // Se for cartão de crédito com dados do cartão, processar pagamento imediatamente
    if (billingType === 'CREDIT_CARD' && creditCard) {
      console.log('Processing credit card payment for payment ID:', paymentIdToProcess);

      const payWithCardRes = await fetch(`${asaasBaseUrl}/payments/${paymentIdToProcess}/payWithCreditCard`, {
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
            postalCode: customer.postalCode || '30112000', // Fallback CEP válido (Belo Horizonte/MG)
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

      // Determinar se pagamento foi confirmado
      const isConfirmed = cardPaymentData.status === 'CONFIRMED' || cardPaymentData.status === 'RECEIVED';

      // Registrar no banco de dados
      await savePaymentToDatabase({
        orderId,
        asaasPaymentId: paymentIdToProcess,
        asaasCustomerId,
        billingType,
        amount,
        status: isConfirmed ? 'confirmed' : 'pending',
        installments: installments || 1,
        cardBrand: cardPaymentData.creditCard?.creditCardBrand,
        cardLastDigits: creditCard.number?.slice(-4),
        referralCode: referralCode || null
      });

      // Se pagamento confirmado, atualizar status do pedido para 'paid'
      if (isConfirmed) {
        await updateOrderStatus(orderId, 'paid');
        console.log(`Pedido ${orderId} atualizado para 'paid' após confirmação do cartão`);
      }

      // Sucesso no pagamento com cartão
      return res.status(200).json({
        success: true,
        paymentId: paymentData.id,
        status: cardPaymentData.status,
        confirmedDate: cardPaymentData.confirmedDate,
        message: 'Pagamento com cartão processado com sucesso',
        orderStatus: isConfirmed ? 'paid' : 'pending'
      });
    }

    // Registrar no banco de dados
    await savePaymentToDatabase({
      orderId,
      asaasPaymentId: paymentIdToProcess,
      asaasCustomerId,
      billingType,
      amount,
      status: isConfirmed ? 'confirmed' : 'pending',
      installments: installments || 1,
          creditCard: {
            holderName: creditCard.holderName,
            number: creditCard.number,
            expiryMonth: creditCard.expiryMonth,
            expiryYear: creditCard.expiryYear,
            ccv: creditCard.ccv
          },
          creditCardHolderInfo: holderInfo,
          remoteIp: remoteIp
        })
      });

      const cardPaymentData = await payWithCardRes.json();

      if (!payWithCardRes.ok) {
        console.error('❌ Erro ao processar cartão na primeira cobrança:', JSON.stringify(cardPaymentData, null, 2));
        return res.status(500).json({
          success: false,
          error: 'Assinatura criada mas falha no processamento do cartão',
          details: cardPaymentData,
          subscriptionId: paymentData.id,
          paymentId: firstPaymentId
        });
      }

      // Verificar se pagamento foi confirmado
      const isConfirmed = cardPaymentData.status === 'CONFIRMED' || cardPaymentData.status === 'RECEIVED';
      
      console.log('✅ Payment First com processamento forçado:', {
        subscriptionId: paymentData.id,
        paymentId: firstPaymentId,
        paymentStatus: cardPaymentData.status,
        confirmed: isConfirmed,
        confirmedDate: cardPaymentData.confirmedDate
      });

      // Registrar no banco de dados
      await savePaymentToDatabase({
        orderId,
        asaasPaymentId: firstPaymentId, // ID da primeira cobrança (não da assinatura)
        asaasCustomerId,
        billingType,
        amount,
        status: isConfirmed ? 'confirmed' : 'pending',
        installments: 1,
        cardBrand: cardPaymentData.creditCard?.creditCardBrand,
        cardLastDigits: creditCard.number?.slice(-4),
        referralCode: referralCode || null,
        subscriptionId: paymentData.id, // ID da assinatura
        paymentFirst: true
      });

      // Se pagamento confirmado, atualizar status do pedido para 'paid'
      if (isConfirmed) {
        await updateOrderStatus(orderId, 'paid');
        console.log(`✅ Pedido ${orderId} atualizado para 'paid' após Payment First com processamento forçado`);
      }

      // URL da primeira cobrança para acompanhamento
      finalInvoiceUrl = cardPaymentData.invoiceUrl || `https://www.asaas.com/i/${firstPaymentId}`;

      // Sucesso no Payment First com processamento forçado
      return res.status(200).json({
        success: true,
        paymentId: firstPaymentId, // ID da cobrança processada
        subscriptionId: paymentData.id, // ID da assinatura
        status: cardPaymentData.status,
        confirmedDate: cardPaymentData.confirmedDate,
        invoiceUrl: finalInvoiceUrl,
        message: isConfirmed ? 'Assinatura criada e primeira cobrança processada com sucesso (Payment First)' : 'Assinatura criada, cartão processado mas aguardando confirmação',
        orderStatus: isConfirmed ? 'paid' : 'pending',
        paymentFirst: true,
        forcedProcessing: true // Flag para identificar que foi processamento forçado
      });
    }

    // Registrar pagamento PIX no banco de dados
    await savePaymentToDatabase({
      orderId,
      asaasPaymentId: paymentIdToProcess,
      asaasCustomerId,
      billingType,
      amount,
      status: 'pending',
      installments: 1,
      pixQrCode: pixQrCode,
      pixCopyPaste: pixCopyPaste,
      pixExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h
      referralCode: referralCode || null
    });

    // Sucesso (PIX ou aguardando dados do cartão)
    return res.status(200).json({
      success: true,
      paymentId: paymentIdToProcess,
      // ✅ SE for assinatura, use o invoiceUrl da primeira cobrança, senão use o da resposta original
      checkoutUrl: finalInvoiceUrl,
      pixQrCode: pixQrCode,
      pixCopyPaste: pixCopyPaste,
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

/**
 * Busca rede de afiliados pelo referral code
 * Retorna IDs de N1, N2 e N3
 */
async function getAffiliateNetwork(referralCode, supabase) {
  try {
    if (!referralCode) {
      return { n1: null, n2: null, n3: null };
    }

    // Buscar N1 pelo referral_code
    const { data: n1, error: n1Error } = await supabase
      .from('affiliates')
      .select('id, referred_by')
      .eq('referral_code', referralCode)
      .eq('status', 'active')
      .is('deleted_at', null)
      .single();

    if (n1Error || !n1) {
      console.log('N1 não encontrado:', referralCode);
      return { n1: null, n2: null, n3: null };
    }

    let n2Id = null;
    let n3Id = null;

    // Buscar N2 (quem indicou o N1)
    if (n1.referred_by) {
      const { data: n2 } = await supabase
        .from('affiliates')
        .select('id, referred_by')
        .eq('id', n1.referred_by)
        .eq('status', 'active')
        .is('deleted_at', null)
        .single();

      if (n2) {
        n2Id = n2.id;

        // Buscar N3 (quem indicou o N2)
        if (n2.referred_by) {
          const { data: n3 } = await supabase
            .from('affiliates')
            .select('id')
            .eq('id', n2.referred_by)
            .eq('status', 'active')
            .is('deleted_at', null)
            .single();

          if (n3) {
            n3Id = n3.id;
          }
        }
      }
    }

    console.log('Rede encontrada:', { n1: n1.id, n2: n2Id, n3: n3Id });

    return {
      n1: n1.id,
      n2: n2Id,
      n3: n3Id
    };
  } catch (error) {
    console.error('Erro ao buscar rede de afiliados:', error);
    return { n1: null, n2: null, n3: null };
  }
}

/**
 * Salva o pagamento no banco de dados (tabelas payments e asaas_transactions)
 */
async function savePaymentToDatabase(data) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase não configurado para salvar pagamento');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // ✅ NOVO: Buscar rede de afiliados se houver referralCode
    const affiliateNetwork = await getAffiliateNetwork(data.referralCode, supabase);

    // ✅ NOVO: Atualizar pedido com dados dos afiliados
    if (data.referralCode) {
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          referral_code: data.referralCode,
          affiliate_n1_id: affiliateNetwork.n1,
          affiliate_n2_id: affiliateNetwork.n2,
          affiliate_n3_id: affiliateNetwork.n3,
          updated_at: new Date().toISOString()
        })
        .eq('id', data.orderId);

      if (updateError) {
        console.error('Erro ao atualizar afiliados do pedido:', updateError);
      } else {
        console.log(`Pedido ${data.orderId} vinculado aos afiliados:`, affiliateNetwork);
      }
    }

    // Mapear billingType para payment_method
    const paymentMethodMap = {
      'PIX': 'pix',
      'CREDIT_CARD': 'credit_card',
      'BOLETO': 'boleto'
    };

    // 1. Criar registro na tabela payments
    const paymentRecord = {
      order_id: data.orderId,
      payment_method: paymentMethodMap[data.billingType] || 'pix',
      amount_cents: Math.round(data.amount * 100),
      status: data.status,
      asaas_payment_id: data.asaasPaymentId,
      installments: data.installments || 1,
      pix_qr_code: data.pixQrCode || null,
      pix_copy_paste: data.pixCopyPaste || null,
      pix_expires_at: data.pixExpiresAt || null,
      card_brand: data.cardBrand || null,
      card_last_digits: data.cardLastDigits || null
    };

    const { data: paymentData, error: paymentError } = await supabase
      .from('payments')
      .insert(paymentRecord)
      .select()
      .single();

    if (paymentError) {
      console.error('Erro ao criar registro de pagamento:', paymentError);
    } else {
      console.log('Pagamento registrado:', paymentData.id);
    }

    // 2. Registrar transação em asaas_transactions
    const transactionRecord = {
      order_id: data.orderId,
      payment_id: paymentData?.id || null,
      transaction_type: 'CREATE_PAYMENT',
      request_payload: { billingType: data.billingType, amount: data.amount },
      response_payload: { asaasPaymentId: data.asaasPaymentId, status: data.status },
      success: true,
      http_status: 200,
      asaas_customer_id: data.asaasCustomerId,
      asaas_payment_id: data.asaasPaymentId
    };

    const { error: transactionError } = await supabase
      .from('asaas_transactions')
      .insert(transactionRecord);

    if (transactionError) {
      console.error('Erro ao registrar transação:', transactionError);
    } else {
      console.log('Transação registrada com sucesso');
    }

  } catch (error) {
    console.error('Erro ao salvar pagamento no banco:', error);
  }
}

/**
 * Atualiza o status do pedido na tabela orders
 */
async function updateOrderStatus(orderId, status) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase não configurado para atualizar pedido');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error } = await supabase
      .from('orders')
      .update({
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (error) {
      console.error('Erro ao atualizar status do pedido:', error);
    } else {
      console.log(`Pedido ${orderId} atualizado para status: ${status}`);
    }
  } catch (error) {
    console.error('Erro ao atualizar pedido:', error);
  }
}

/**
 * Calcula o split de comissões baseado na rede de afiliados
 * 
 * REGRAS DE DISTRIBUIÇÃO (sempre 30% do total):
 * - Sem afiliado: 15% Renum + 15% JB
 * - Apenas N1: 15% N1 + 7.5% Renum + 7.5% JB
 * - N1 + N2: 15% N1 + 3% N2 + 6% Renum + 6% JB
 * - Rede completa: 15% N1 + 3% N2 + 2% N3 + 5% Renum + 5% JB
 * 
 * ✅ REGRA INVERTIDA (AGENTE IA - 70% RENUM):
 * - Renum (Principal): 70% (Diferente da venda física, aqui ela é a dona do produto)
 * - Rede (30% restantes): N1, N2, N3 mantêm proporções.
 * - Slim Quality (Fábrica): Assume o papel de gerente (5%).
 */
async function calculateAffiliateSplit(referralCode, walletRenum, walletJB) {
  // Se não tem referralCode, split vai todo para gestores
  if (!referralCode) {
    console.log('Sem referralCode - split 15% Renum + 15% JB');
    return [
      { walletId: walletRenum, percentualValue: 15 },
      { walletId: walletJB, percentualValue: 15 }
    ];
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase não configurado - usando split padrão');
      return [
        { walletId: walletRenum, percentualValue: 15 },
        { walletId: walletJB, percentualValue: 15 }
      ];
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar N1 pelo referral_code
    const { data: n1Affiliate, error: n1Error } = await supabase
      .from('affiliates')
      .select('id, wallet_id, referred_by')
      .eq('referral_code', referralCode)
      .eq('status', 'active')
      .is('deleted_at', null)
      .single();

    if (n1Error || !n1Affiliate) {
      console.log('Afiliado N1 não encontrado para referralCode:', referralCode);
      return [
        { walletId: walletRenum, percentualValue: 15 },
        { walletId: walletJB, percentualValue: 15 }
      ];
    }

    // Validar wallet_id do N1
    if (!n1Affiliate.wallet_id || !isValidWalletId(n1Affiliate.wallet_id)) {
      console.log('N1 sem wallet_id válido:', n1Affiliate.id);
      return [
        { walletId: walletRenum, percentualValue: 15 },
        { walletId: walletJB, percentualValue: 15 }
      ];
    }

    console.log('N1 encontrado:', { id: n1Affiliate.id, wallet: n1Affiliate.wallet_id.substring(0, 10) + '...' });

    // Buscar N2 (quem indicou o N1)
    let n2Affiliate = null;
    if (n1Affiliate.referred_by) {
      const { data: n2Data } = await supabase
        .from('affiliates')
        .select('id, wallet_id, referred_by')
        .eq('id', n1Affiliate.referred_by)
        .eq('status', 'active')
        .is('deleted_at', null)
        .single();

      if (n2Data?.wallet_id && isValidWalletId(n2Data.wallet_id)) {
        n2Affiliate = n2Data;
        console.log('N2 encontrado:', { id: n2Affiliate.id, wallet: n2Affiliate.wallet_id.substring(0, 10) + '...' });
      }
    }

    // Buscar N3 (quem indicou o N2)
    let n3Affiliate = null;
    if (n2Affiliate?.referred_by) {
      const { data: n3Data } = await supabase
        .from('affiliates')
        .select('id, wallet_id')
        .eq('id', n2Affiliate.referred_by)
        .eq('status', 'active')
        .is('deleted_at', null)
        .single();

      if (n3Data?.wallet_id && isValidWalletId(n3Data.wallet_id)) {
        n3Affiliate = n3Data;
        console.log('N3 encontrado:', { id: n3Affiliate.id, wallet: n3Affiliate.wallet_id.substring(0, 10) + '...' });
      }
    }

    // Calcular split baseado na rede encontrada (apenas produtos físicos)
    if (!n2Affiliate) {
      // APENAS N1: 15% N1 + 7.5% Renum + 7.5% JB = 30%
      console.log('Split: Apenas N1 (15% + 7.5% + 7.5%)');
      return [
        { walletId: n1Affiliate.wallet_id, percentualValue: 15 },
        { walletId: walletRenum, percentualValue: 7.5 },
        { walletId: walletJB, percentualValue: 7.5 }
      ];
    } else if (!n3Affiliate) {
      // N1 + N2: 15% N1 + 3% N2 + 6% Renum + 6% JB = 30%
      console.log('Split: N1+N2 (15% + 3% + 6% + 6%)');
      return [
        { walletId: n1Affiliate.wallet_id, percentualValue: 15 },
        { walletId: n2Affiliate.wallet_id, percentualValue: 3 },
        { walletId: walletRenum, percentualValue: 6 },
        { walletId: walletJB, percentualValue: 6 }
      ];
    } else {
      // REDE COMPLETA: 15% N1 + 3% N2 + 2% N3 + 5% Renum + 5% JB = 30%
      console.log('Split: Rede completa (15% + 3% + 2% + 5% + 5%)');
      return [
        { walletId: n1Affiliate.wallet_id, percentualValue: 15 },
        { walletId: n2Affiliate.wallet_id, percentualValue: 3 },
        { walletId: n3Affiliate.wallet_id, percentualValue: 2 },
        { walletId: walletRenum, percentualValue: 5 },
        { walletId: walletJB, percentualValue: 5 }
      ];
    }

  } catch (error) {
    console.error('Erro ao calcular split:', error);
    // Fallback para split padrão
    return [
      { walletId: walletRenum, percentualValue: 15 },
      { walletId: walletJB, percentualValue: 15 }
    ];
  }
}

/**
 * Valida formato de Wallet ID do Asaas
 */
function isValidWalletId(walletId) {
  if (!walletId) return false;
  // Formato UUID v4 (formato oficial do Asaas)
  const uuidFormat = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(walletId);
  return uuidFormat;
}
