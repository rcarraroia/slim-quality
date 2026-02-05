/**
 * API REST para criação de pagamentos de assinatura
 * Rota: POST /api/subscriptions/create-payment
 * 
 * Implementa o fluxo Payment First para assinaturas:
 * 1. Cria cliente no Asaas
 * 2. Cria pagamento inicial (primeira mensalidade)
 * 3. Retorna dados para polling
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Apenas POST permitido
  if (req.method !== 'POST') {
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

    // Detectar ambiente
    const trimmedKey = ASAAS_API_KEY.trim();
    const isProduction = trimmedKey.includes('_prod_');
    const asaasBaseUrl = isProduction
      ? 'https://api.asaas.com/v3'
      : 'https://api-sandbox.asaas.com/v3';

    // Parse e validação do body
    const {
      userId,
      planId,
      amount,
      orderItems,
      customerData,
      paymentMethod,
      affiliateData
    } = req.body;

    // Validações obrigatórias
    if (!userId || !planId || !amount || !orderItems || !customerData || !paymentMethod) {
      return res.status(400).json({
        success: false,
        error: 'Dados obrigatórios faltando',
        details: [
          { field: 'userId', required: !userId },
          { field: 'planId', required: !planId },
          { field: 'amount', required: !amount },
          { field: 'orderItems', required: !orderItems },
          { field: 'customerData', required: !customerData },
          { field: 'paymentMethod', required: !paymentMethod }
        ]
      });
    }

    // Validar Order Items (CRÍTICO para detecção IA)
    if (!Array.isArray(orderItems) || orderItems.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Order Items é obrigatório - necessário para detecção de produtos IA e cálculo de comissões'
      });
    }

    // Validar CPF
    const cleanCpf = customerData.cpf?.replace(/\D/g, '');
    if (!cleanCpf || cleanCpf.length !== 11) {
      return res.status(400).json({
        success: false,
        error: 'CPF inválido - deve ter 11 dígitos'
      });
    }

    // Headers para Asaas
    const asaasHeaders = {
      'Content-Type': 'application/json',
      'access_token': trimmedKey
    };

    console.log('🚀 Iniciando fluxo Payment First para assinatura:', {
      userId,
      planId,
      amount,
      paymentMethod: paymentMethod.type,
      orderItemsCount: orderItems.length,
      hasAffiliate: !!affiliateData
    });

    // 1. CRIAR CLIENTE NO ASAAS
    console.log('👤 Criando cliente no Asaas...');
    
    // Buscar cliente existente primeiro
    let asaasCustomerId = null;
    const searchRes = await fetch(
      `${asaasBaseUrl}/customers?email=${encodeURIComponent(customerData.email)}`,
      { method: 'GET', headers: asaasHeaders }
    );

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.data && searchData.data.length > 0) {
        asaasCustomerId = searchData.data[0].id;
        console.log('👤 Cliente existente encontrado:', asaasCustomerId);
      }
    }

    // Criar cliente se não existir
    if (!asaasCustomerId) {
      const createCustomerRes = await fetch(`${asaasBaseUrl}/customers`, {
        method: 'POST',
        headers: asaasHeaders,
        body: JSON.stringify({
          name: customerData.name,
          email: customerData.email,
          phone: customerData.phone?.replace(/\D/g, ''),
          cpfCnpj: cleanCpf,
          postalCode: customerData.address?.zipCode?.replace(/\D/g, ''),
          address: customerData.address?.street,
          addressNumber: customerData.address?.number,
          complement: customerData.address?.complement,
          province: customerData.address?.neighborhood,
          city: customerData.address?.city,
          state: customerData.address?.state
        })
      });

      const customerResult = await createCustomerRes.json();

      if (!createCustomerRes.ok) {
        console.error('❌ Erro ao criar cliente:', customerResult);
        return res.status(500).json({
          success: false,
          error: 'Erro ao criar cliente no Asaas',
          details: customerResult
        });
      }

      asaasCustomerId = customerResult.id;
      console.log('👤 Cliente criado:', asaasCustomerId);
    }

    // 2. CRIAR PAGAMENTO INICIAL (PRIMEIRA MENSALIDADE)
    console.log('💰 Criando pagamento inicial...');

    const paymentPayload = {
      customer: asaasCustomerId,
      billingType: paymentMethod.type,
      value: amount,
      dueDate: new Date().toISOString().split('T')[0], // HOJE para processamento imediato
      description: `Primeira mensalidade - ${orderItems[0].name}`,
      externalReference: `subscription_${userId}_${Date.now()}`,
      orderItems: orderItems.map(item => ({
        id: item.id,
        description: item.name,
        value: item.value,
        quantity: item.quantity
      }))
    };

    // Adicionar dados do cartão se necessário
    if (paymentMethod.type === 'CREDIT_CARD' && paymentMethod.creditCard) {
      paymentPayload.creditCard = {
        holderName: paymentMethod.creditCard.holderName,
        number: paymentMethod.creditCard.number,
        expiryMonth: paymentMethod.creditCard.expiryMonth,
        expiryYear: paymentMethod.creditCard.expiryYear,
        ccv: paymentMethod.creditCard.ccv
      };

      paymentPayload.creditCardHolderInfo = {
        name: customerData.name,
        email: customerData.email,
        cpfCnpj: cleanCpf,
        postalCode: customerData.address?.zipCode?.replace(/\D/g, '') || '30112000',
        addressNumber: customerData.address?.number || 'S/N',
        phone: customerData.phone?.replace(/\D/g, '') || '11999999999'
      };
    }

    // Criar pagamento usando /v3/payments (não /v3/subscriptions)
    const paymentRes = await fetch(`${asaasBaseUrl}/payments`, {
      method: 'POST',
      headers: asaasHeaders,
      body: JSON.stringify(paymentPayload)
    });

    const paymentResult = await paymentRes.json();

    if (!paymentRes.ok) {
      console.error('❌ Erro ao criar pagamento:', paymentResult);
      return res.status(500).json({
        success: false,
        error: 'Erro ao criar pagamento no Asaas',
        details: paymentResult
      });
    }

    console.log('✅ Pagamento criado:', {
      id: paymentResult.id,
      status: paymentResult.status,
      value: paymentResult.value
    });

    // 3. SALVAR NO BANCO DE DADOS
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const subscriptionRecord = {
      user_id: userId,
      asaas_payment_id: paymentResult.id,
      asaas_customer_id: asaasCustomerId,
      status: 'payment_processing',
      amount: amount,
      order_items: orderItems,
      payment_method: paymentMethod.type,
      affiliate_data: affiliateData || null,
      correlation_id: paymentPayload.externalReference
    };

    const { error: dbError } = await supabase
      .from('subscription_orders')
      .insert(subscriptionRecord);

    if (dbError) {
      console.error('❌ Erro ao salvar no banco:', dbError);
      // Não falhar a requisição por erro de banco
    }

    // 4. RETORNAR DADOS PARA POLLING
    const correlationId = paymentPayload.externalReference;
    
    return res.status(200).json({
      success: true,
      data: {
        paymentId: paymentResult.id,
        status: paymentResult.status,
        amount: amount,
        correlationId: correlationId,
        pollingUrl: `/api/subscriptions/status/${paymentResult.id}`
      }
    });

  } catch (error) {
    console.error('❌ Erro interno na API de assinaturas:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
}