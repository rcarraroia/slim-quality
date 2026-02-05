import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface PollPaymentRequest {
  paymentId: string;
  correlationId: string;
  timeoutSeconds?: number;
  intervalSeconds?: number;
}

interface AsaasPaymentStatus {
  object: string;
  id: string;
  status: 'PENDING' | 'RECEIVED' | 'CONFIRMED' | 'OVERDUE' | 'REFUNDED' | 'RECEIVED_IN_CASH' | 'REFUND_REQUESTED' | 'REFUND_IN_PROGRESS' | 'CHARGEBACK_REQUESTED' | 'CHARGEBACK_DISPUTE' | 'AWAITING_CHARGEBACK_REVERSAL' | 'DUNNING_REQUESTED' | 'DUNNING_RECEIVED' | 'AWAITING_RISK_ANALYSIS';
  value: number;
  netValue: number;
  paymentDate: string;
  clientPaymentDate: string;
  billingType: string;
  pixTransaction?: {
    encodedImage: string;
    payload: string;
    expirationDate: string;
  };
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
    const requestData: PollPaymentRequest = await req.json();

    // Validações básicas
    if (!requestData.paymentId || !requestData.correlationId) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields',
          required: ['paymentId', 'correlationId']
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Configurar parâmetros de polling (conforme spec: 15s timeout, 1s interval)
    const timeoutSeconds = requestData.timeoutSeconds || 15;
    const intervalSeconds = requestData.intervalSeconds || 1;
    const maxAttempts = Math.floor(timeoutSeconds / intervalSeconds);

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

    console.log(`[poll-payment-status] Starting polling for payment ${requestData.paymentId} (correlation: ${requestData.correlationId})`);
    console.log(`[poll-payment-status] Timeout: ${timeoutSeconds}s, Interval: ${intervalSeconds}s, Max attempts: ${maxAttempts}`);

    let attempt = 0;
    const startTime = Date.now();

    // Loop de polling
    while (attempt < maxAttempts) {
      attempt++;
      const attemptStartTime = Date.now();

      try {
        // Consultar status do pagamento no Asaas
        const asaasResponse = await fetch(`https://api.asaas.com/v3/payments/${requestData.paymentId}`, {
          method: 'GET',
          headers
        });

        if (!asaasResponse.ok) {
          console.error(`[poll-payment-status] Asaas API error on attempt ${attempt}: ${asaasResponse.status}`);
          
          // Se for erro 404, pagamento não existe
          if (asaasResponse.status === 404) {
            return new Response(
              JSON.stringify({ 
                success: false,
                error: 'Payment not found',
                paymentId: requestData.paymentId,
                correlationId: requestData.correlationId,
                attempts: attempt,
                elapsedTime: Date.now() - startTime
              }),
              { 
                status: 404,
                headers: { 'Content-Type': 'application/json' }
              }
            );
          }

          // Para outros erros, continuar tentando
          if (attempt < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, intervalSeconds * 1000));
            continue;
          } else {
            throw new Error(`Asaas API error: ${asaasResponse.status}`);
          }
        }

        const paymentData: AsaasPaymentStatus = await asaasResponse.json();
        const attemptDuration = Date.now() - attemptStartTime;

        console.log(`[poll-payment-status] Attempt ${attempt}: Status = ${paymentData.status} (${attemptDuration}ms)`);

        // Verificar se pagamento foi confirmado
        if (paymentData.status === 'RECEIVED' || paymentData.status === 'CONFIRMED') {
          const totalElapsed = Date.now() - startTime;
          
          console.log(`[poll-payment-status] Payment confirmed after ${attempt} attempts (${totalElapsed}ms)`);
          
          return new Response(
            JSON.stringify({
              success: true,
              confirmed: true,
              payment: {
                id: paymentData.id,
                status: paymentData.status,
                value: paymentData.value,
                netValue: paymentData.netValue,
                paymentDate: paymentData.paymentDate,
                clientPaymentDate: paymentData.clientPaymentDate,
                billingType: paymentData.billingType
              },
              polling: {
                attempts: attempt,
                elapsedTime: totalElapsed,
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
        }

        // Verificar se pagamento falhou definitivamente
        if (paymentData.status === 'OVERDUE' || paymentData.status === 'REFUNDED') {
          const totalElapsed = Date.now() - startTime;
          
          console.log(`[poll-payment-status] Payment failed with status: ${paymentData.status}`);
          
          return new Response(
            JSON.stringify({
              success: true,
              confirmed: false,
              failed: true,
              payment: {
                id: paymentData.id,
                status: paymentData.status,
                value: paymentData.value,
                billingType: paymentData.billingType
              },
              polling: {
                attempts: attempt,
                elapsedTime: totalElapsed,
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
        }

        // Se ainda está pendente e não é a última tentativa, aguardar intervalo
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, intervalSeconds * 1000));
        }

      } catch (attemptError) {
        console.error(`[poll-payment-status] Error on attempt ${attempt}:`, attemptError);
        
        // Se não é a última tentativa, continuar
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, intervalSeconds * 1000));
          continue;
        } else {
          throw attemptError;
        }
      }
    }

    // Timeout atingido sem confirmação
    const totalElapsed = Date.now() - startTime;
    
    console.log(`[poll-payment-status] Timeout reached after ${maxAttempts} attempts (${totalElapsed}ms)`);
    
    return new Response(
      JSON.stringify({
        success: true,
        confirmed: false,
        timeout: true,
        polling: {
          attempts: maxAttempts,
          elapsedTime: totalElapsed,
          timeoutSeconds,
          intervalSeconds,
          correlationId: requestData.correlationId
        },
        message: 'Payment confirmation timeout - check status later',
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
    console.error('[poll-payment-status] Unexpected error:', error);
    
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