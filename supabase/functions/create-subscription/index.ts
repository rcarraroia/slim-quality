import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

interface CreateSubscriptionRequest {
  paymentId: string;
  customerId: string;
  planId: string;
  correlationId: string;
  orderItems: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
}

interface AsaasSubscriptionPayload {
  customer: string;
  billingType: 'CREDIT_CARD' | 'PIX';
  nextDueDate: string;
  value: number;
  cycle: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'BIMONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY';
  description: string;
  endDate?: string;
  maxPayments?: number;
  externalReference: string;
}

interface AsaasSubscriptionResponse {
  object: string;
  id: string;
  dateCreated: string;
  customer: string;
  paymentLink: string;
  billingType: string;
  cycle: string;
  value: number;
  nextDueDate: string;
  description: string;
  endDate: string;
  maxPayments: number;
  status: 'ACTIVE' | 'EXPIRED' | 'INACTIVE';
  externalReference: string;
  deleted: boolean;
}

Deno.serve(async (req: Request) => {
  // Verificar método HTTP
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    // Parse do body da requisição
    const requestData: CreateSubscriptionRequest = await req.json();

    // Validações básicas
    if (!requestData.paymentId || !requestData.customerId || !requestData.planId || !requestData.correlationId) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields',
          required: ['paymentId', 'customerId', 'planId', 'correlationId']
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Validar order_items
    if (!requestData.orderItems || !Array.isArray(requestData.orderItems) || requestData.orderItems.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid order_items',
          message: 'order_items must be a non-empty array'
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Configurar Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Configurar headers para Asaas
    const asaasApiKey = Deno.env.get('ASAAS_API_KEY');
    if (!asaasApiKey) {
      throw new Error('ASAAS_API_KEY not configured');
    }

    const headers = {
      'Content-Type': 'application/json',
      'access_token': asaasApiKey,
      'User-Agent': 'SlimQuality-EdgeFunction/1.0'
    };

    console.log(`[create-subscription] Creating subscription for payment ${requestData.paymentId} (correlation: ${requestData.correlationId})`);

    // 1. Buscar detalhes do plano no banco
    const { data: planData, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', requestData.planId)
      .single();

    if (planError || !planData) {
      console.error('[create-subscription] Plan not found:', planError);
      return new Response(
        JSON.stringify({ 
          error: 'Plan not found',
          planId: requestData.planId
        }),
        { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // 2. Calcular valor total dos order_items
    const totalValue = requestData.orderItems.reduce((sum, item) => sum + item.totalPrice, 0);

    // 3. Calcular próxima data de vencimento (30 dias a partir de hoje)
    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + 30);
    const nextDueDateStr = nextDueDate.toISOString().split('T')[0]; // YYYY-MM-DD

    // 4. Preparar payload para Asaas
    const asaasPayload: AsaasSubscriptionPayload = {
      customer: requestData.customerId,
      billingType: 'CREDIT_CARD', // Assumindo cartão para assinaturas
      nextDueDate: nextDueDateStr,
      value: totalValue,
      cycle: planData.billing_cycle.toUpperCase() as any,
      description: `Assinatura ${planData.name} - Slim Quality`,
      externalReference: requestData.correlationId
    };

    // 5. Criar assinatura no Asaas
    const asaasResponse = await fetch('https://api.asaas.com/v3/subscriptions', {
      method: 'POST',
      headers,
      body: JSON.stringify(asaasPayload)
    });

    if (!asaasResponse.ok) {
      const errorData = await asaasResponse.text();
      console.error(`[create-subscription] Asaas API error: ${asaasResponse.status} - ${errorData}`);
      
      return new Response(
        JSON.stringify({ 
          error: 'Subscription creation failed',
          details: errorData,
          status: asaasResponse.status
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const subscriptionData: AsaasSubscriptionResponse = await asaasResponse.json();

    console.log(`[create-subscription] Asaas subscription created: ${subscriptionData.id}`);

    // 6. Salvar assinatura no banco de dados
    const { data: dbSubscription, error: dbError } = await supabase
      .from('subscriptions')
      .insert({
        id: crypto.randomUUID(),
        asaas_subscription_id: subscriptionData.id,
        customer_id: requestData.customerId,
        plan_id: requestData.planId,
        status: subscriptionData.status.toLowerCase(),
        current_period_start: new Date().toISOString(),
        current_period_end: subscriptionData.nextDueDate,
        billing_cycle: planData.billing_cycle,
        amount: totalValue,
        currency: 'BRL',
        payment_method: subscriptionData.billingType.toLowerCase(),
        correlation_id: requestData.correlationId,
        metadata: {
          asaas_customer_id: subscriptionData.customer,
          payment_link: subscriptionData.paymentLink,
          original_payment_id: requestData.paymentId
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (dbError) {
      console.error('[create-subscription] Database error:', dbError);
      
      // Tentar cancelar assinatura no Asaas se falhou no banco
      try {
        await fetch(`https://api.asaas.com/v3/subscriptions/${subscriptionData.id}`, {
          method: 'DELETE',
          headers
        });
        console.log('[create-subscription] Asaas subscription cancelled due to database error');
      } catch (cancelError) {
        console.error('[create-subscription] Failed to cancel Asaas subscription:', cancelError);
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Database error',
          details: dbError.message
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // 7. Salvar order_items da assinatura
    const subscriptionItems = requestData.orderItems.map(item => ({
      id: crypto.randomUUID(),
      subscription_id: dbSubscription.id,
      product_id: item.productId,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_price: item.totalPrice,
      created_at: new Date().toISOString()
    }));

    const { error: itemsError } = await supabase
      .from('subscription_items')
      .insert(subscriptionItems);

    if (itemsError) {
      console.error('[create-subscription] Error saving subscription items:', itemsError);
      // Não cancelar assinatura por erro nos items, apenas logar
    }

    console.log(`[create-subscription] Subscription created successfully: ${dbSubscription.id}`);

    // 8. Retornar resposta de sucesso
    return new Response(
      JSON.stringify({
        success: true,
        subscription: {
          id: dbSubscription.id,
          asaasSubscriptionId: subscriptionData.id,
          status: subscriptionData.status,
          customerId: requestData.customerId,
          planId: requestData.planId,
          value: totalValue,
          billingCycle: planData.billing_cycle,
          nextDueDate: subscriptionData.nextDueDate,
          paymentLink: subscriptionData.paymentLink,
          correlationId: requestData.correlationId
        },
        orderItems: subscriptionItems.length,
        timestamp: new Date().toISOString()
      }),
      {
        status: 201,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      }
    );

  } catch (error) {
    console.error('[create-subscription] Unexpected error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});