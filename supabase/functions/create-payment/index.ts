import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface CreatePaymentRequest {
  customer: {
    name: string;
    email: string;
    cpfCnpj: string;
    phone: string;
  };
  billingType: 'CREDIT_CARD' | 'PIX';
  value: number;
  description: string;
  dueDate: string;
  creditCard?: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  };
  creditCardHolderInfo?: {
    name: string;
    email: string;
    cpfCnpj: string;
    postalCode: string;
    addressNumber: string;
    phone: string;
  };
  correlationId: string;
}

interface AsaasPaymentResponse {
  object: string;
  id: string;
  dateCreated: string;
  customer: string;
  paymentLink: string;
  value: number;
  netValue: number;
  originalValue: number;
  interestValue: number;
  description: string;
  billingType: string;
  pixTransaction?: {
    encodedImage: string;
    payload: string;
    expirationDate: string;
  };
  status: string;
  dueDate: string;
  originalDueDate: string;
  paymentDate: string;
  clientPaymentDate: string;
  installmentNumber: number;
  invoiceUrl: string;
  invoiceNumber: string;
  externalReference: string;
  discount: {
    value: number;
    limitDate: string;
    dueDateLimitDays: number;
    type: string;
  };
  fine: {
    value: number;
    type: string;
  };
  interest: {
    value: number;
    type: string;
  };
  deleted: boolean;
  postalService: boolean;
  anticipated: boolean;
  anticipable: boolean;
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
    const requestData: CreatePaymentRequest = await req.json();

    // Validações básicas
    if (!requestData.customer || !requestData.billingType || !requestData.value || !requestData.correlationId) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields',
          required: ['customer', 'billingType', 'value', 'correlationId']
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

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

    // Preparar payload para Asaas
    const asaasPayload = {
      customer: requestData.customer,
      billingType: requestData.billingType,
      value: requestData.value,
      description: requestData.description,
      dueDate: requestData.dueDate,
      externalReference: requestData.correlationId,
      ...(requestData.creditCard && { creditCard: requestData.creditCard }),
      ...(requestData.creditCardHolderInfo && { creditCardHolderInfo: requestData.creditCardHolderInfo })
    };

    console.log(`[create-payment] Creating payment for correlation_id: ${requestData.correlationId}`);

    // Chamar API do Asaas
    const asaasResponse = await fetch('https://api.asaas.com/v3/payments', {
      method: 'POST',
      headers,
      body: JSON.stringify(asaasPayload)
    });

    if (!asaasResponse.ok) {
      const errorData = await asaasResponse.text();
      console.error(`[create-payment] Asaas API error: ${asaasResponse.status} - ${errorData}`);
      
      return new Response(
        JSON.stringify({ 
          error: 'Payment creation failed',
          details: errorData,
          status: asaasResponse.status
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const paymentData: AsaasPaymentResponse = await asaasResponse.json();

    console.log(`[create-payment] Payment created successfully: ${paymentData.id}`);

    // Retornar resposta padronizada
    return new Response(
      JSON.stringify({
        success: true,
        payment: {
          id: paymentData.id,
          status: paymentData.status,
          value: paymentData.value,
          billingType: paymentData.billingType,
          dueDate: paymentData.dueDate,
          paymentLink: paymentData.paymentLink,
          invoiceUrl: paymentData.invoiceUrl,
          pixTransaction: paymentData.pixTransaction,
          correlationId: requestData.correlationId
        },
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      }
    );

  } catch (error) {
    console.error('[create-payment] Unexpected error:', error);
    
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