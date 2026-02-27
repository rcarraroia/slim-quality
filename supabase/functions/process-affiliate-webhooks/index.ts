import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

interface AsaasWebhookPayload {
  event: 'PAYMENT_CREATED' | 'PAYMENT_UPDATED' | 'PAYMENT_CONFIRMED' | 'PAYMENT_RECEIVED' | 'PAYMENT_OVERDUE' | 'PAYMENT_DELETED' | 'PAYMENT_RESTORED' | 'PAYMENT_REFUNDED';
  payment: {
    object: string;
    id: string;
    dateCreated: string;
    customer: string;
    subscription?: string;
    value: number;
    netValue: number;
    description: string;
    billingType: 'BOLETO' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'TRANSFER' | 'DEPOSIT' | 'PIX' | 'UNDEFINED';
    status: 'PENDING' | 'RECEIVED' | 'CONFIRMED' | 'OVERDUE' | 'REFUNDED';
    dueDate: string;
    originalDueDate: string;
    paymentDate?: string;
    clientPaymentDate?: string;
    invoiceUrl: string;
    externalReference?: string;
    deleted: boolean;
  };
}

// Constantes de comissionamento
const COMMISSION_RATES = {
  SLIM: 0.10,      // 10% para Slim Quality
  SELLER: 0.15,    // 15% para N1
  N1: 0.03,        // 3% para N2
  N2: 0.02,        // 2% para N3
  RENUM: 0.05,     // 5% base para Renum
  JB: 0.05,        // 5% base para JB
  TOTAL: 0.20      // 20% total de comissões (excluindo Slim)
};

Deno.serve(async (req: Request) => {
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
    console.log('[process-affiliate-webhooks] Iniciando processamento');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: events, error: fetchError } = await supabase
      .from('subscription_webhook_events')
      .select('*')
      .eq('processed', false)
      .order('created_at', { ascending: true })
      .limit(10);

    if (fetchError) {
      console.error('[process-affiliate-webhooks] Erro ao buscar eventos:', fetchError);
      throw fetchError;
    }

    if (!events || events.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No pending events',
          processed: 0
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const results = [];
    for (const event of events) {
      const result = await processEvent(supabase, event);
      results.push(result);
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        processed: events.length,
        successCount,
        failureCount,
        results
      }),
      {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );

  } catch (error) {
    console.error('[process-affiliate-webhooks] Erro critico:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: (error as Error).message
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

async function processEvent(supabase: any, event: any) {
  const startTime = Date.now();
  const webhookData: AsaasWebhookPayload = event.payload;
  const payment = webhookData.payment;

  try {
    const affiliateId = payment.externalReference?.replace('affiliate_', '');
    
    if (!affiliateId) {
      throw new Error('externalReference invalido');
    }

    let processResult;
    switch (event.event_type) {
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED':
        processResult = await handlePaymentSuccess(supabase, payment, affiliateId);
        break;
        
      case 'PAYMENT_OVERDUE':
        processResult = await handlePaymentOverdue(supabase, payment, affiliateId);
        break;
        
      default:
        processResult = { success: true, message: 'Event logged' };
    }

    await supabase
      .from('subscription_webhook_events')
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
        processing_time_ms: Date.now() - startTime,
        processing_result: processResult
      })
      .eq('id', event.id);

    return { success: true, eventId: event.id, ...processResult };

  } catch (error) {
    await supabase
      .from('subscription_webhook_events')
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
        processing_time_ms: Date.now() - startTime,
        error_message: (error as Error).message
      })
      .eq('id', event.id);

    return { success: false, eventId: event.id, error: (error as Error).message };
  }
}

async function handlePaymentSuccess(supabase: any, payment: any, affiliateId: string) {
  const { data: affiliatePayment, error: paymentError } = await supabase
    .from('affiliate_payments')
    .update({
      status: 'paid',
      paid_at: payment.paymentDate || payment.clientPaymentDate || new Date().toISOString(),
      asaas_payment_status: payment.status,
      updated_at: new Date().toISOString()
    })
    .eq('asaas_payment_id', payment.id)
    .select('id, payment_type, affiliate_id')
    .single();

  if (paymentError || !affiliatePayment) {
    throw new Error(`Pagamento nao encontrado: ${payment.id}`);
  }

  await supabase
    .from('affiliates')
    .update({
      payment_status: 'active',
      updated_at: new Date().toISOString()
    })
    .eq('id', affiliateId);

  // Calcular comissoes para taxas de adesao e mensalidades
  if (affiliatePayment.payment_type === 'membership_fee' || affiliatePayment.payment_type === 'monthly_subscription') {
    console.log(`[handlePaymentSuccess] Calculando comissoes para ${affiliatePayment.payment_type}`);
    
    try {
      await calculateAndSaveCommissions(supabase, affiliateId, payment.value, payment.id);
    } catch (commissionError) {
      console.error('[handlePaymentSuccess] Erro ao calcular comissoes:', commissionError);
      // Nao bloquear o fluxo se comissao falhar
    }
  }

  // Criar notificacao
  try {
    await supabase
      .from('notifications')
      .insert({
        affiliate_id: affiliateId,
        type: 'payment_confirmed',
        title: 'Pagamento confirmado!',
        message: `Seu pagamento de R$ ${(payment.value).toFixed(2)} foi confirmado com sucesso.`,
        link: '/afiliados/dashboard/pagamentos'
      });
  } catch (notifError) {
    console.error('Erro ao criar notificacao:', notifError);
  }

  return {
    success: true,
    message: 'Payment processed successfully',
    affiliatePaymentId: affiliatePayment.id
  };
}

async function handlePaymentOverdue(supabase: any, payment: any, affiliateId: string) {
  await supabase
    .from('affiliate_payments')
    .update({
      status: 'overdue',
      asaas_payment_status: payment.status,
      updated_at: new Date().toISOString()
    })
    .eq('asaas_payment_id', payment.id);

  await supabase
    .from('affiliates')
    .update({
      payment_status: 'overdue',
      updated_at: new Date().toISOString()
    })
    .eq('id', affiliateId);

  const { data: affiliate } = await supabase
    .from('affiliates')
    .select('affiliate_type, show_row')
    .eq('id', affiliateId)
    .single();

  if (affiliate?.affiliate_type === 'logista' && affiliate.show_row) {
    await supabase
      .from('store_profiles')
      .update({
        is_visible_in_showcase: false,
        updated_at: new Date().toISOString()
      })
      .eq('affiliate_id', affiliateId);
  }

  try {
    const daysOverdue = Math.floor(
      (new Date().getTime() - new Date(payment.dueDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    await supabase
      .from('notifications')
      .insert({
        affiliate_id: affiliateId,
        type: 'overdue',
        title: 'Pagamento em atraso',
        message: `Seu pagamento de R$ ${(payment.value).toFixed(2)} esta em atraso ha ${daysOverdue} dias. ${affiliate?.affiliate_type === 'logista' ? 'Sua vitrine foi temporariamente desativada.' : 'Regularize para evitar suspensao.'}`,
        link: '/afiliados/dashboard/pagamentos'
      });
  } catch (notifError) {
    console.error('Erro ao criar notificacao:', notifError);
  }

  return {
    success: true,
    message: 'Overdue payment processed',
    vitrineBlocked: affiliate?.affiliate_type === 'logista'
  };
}

/**
 * Calcula e salva comissoes para taxas de adesao e mensalidades
 * Regras: 10% Slim + N1(15%) + N2(3%) + N3(2%) + Renum/JB (restante 50/50)
 */
async function calculateAndSaveCommissions(supabase: any, affiliateId: string, paymentValue: number, paymentId: string) {
  console.log(`[calculateCommissions] Iniciando calculo para afiliado ${affiliateId}, valor: R$ ${paymentValue.toFixed(2)}`);

  // 1. Buscar afiliado N1 e sua rede
  const { data: n1Affiliate } = await supabase
    .from('affiliates')
    .select('id, referred_by, name, payment_status, wallet_id')
    .eq('id', affiliateId)
    .is('deleted_at', null)
    .single();

  if (!n1Affiliate) {
    throw new Error(`Afiliado N1 nao encontrado: ${affiliateId}`);
  }

  const n1IsActive = n1Affiliate.payment_status === 'active';

  // 2. Buscar N2 e N3
  let n2Affiliate = null;
  let n3Affiliate = null;
  let n2IsActive = false;
  let n3IsActive = false;

  if (n1Affiliate.referred_by) {
    const { data: n2Data } = await supabase
      .from('affiliates')
      .select('id, referred_by, name, payment_status, wallet_id')
      .eq('id', n1Affiliate.referred_by)
      .is('deleted_at', null)
      .single();

    n2Affiliate = n2Data;
    n2IsActive = n2Affiliate?.payment_status === 'active';

    if (n2Affiliate?.referred_by) {
      const { data: n3Data } = await supabase
        .from('affiliates')
        .select('id, referred_by, name, payment_status, wallet_id')
        .eq('id', n2Affiliate.referred_by)
        .is('deleted_at', null)
        .single();

      n3Affiliate = n3Data;
      n3IsActive = n3Affiliate?.payment_status === 'active';
    }
  }

  // 3. Calcular valores (apenas para ativos)
  const slimValue = Math.round(paymentValue * COMMISSION_RATES.SLIM);
  const n1Value = n1IsActive ? Math.round(paymentValue * COMMISSION_RATES.SELLER) : 0;
  const n2Value = (n2Affiliate && n2IsActive) ? Math.round(paymentValue * COMMISSION_RATES.N1) : 0;
  const n3Value = (n3Affiliate && n3IsActive) ? Math.round(paymentValue * COMMISSION_RATES.N2) : 0;

  // 4. Calcular redistribuicao para gestores
  const usedPercentage = (n1IsActive ? COMMISSION_RATES.SELLER : 0) +
    (n2Affiliate && n2IsActive ? COMMISSION_RATES.N1 : 0) +
    (n3Affiliate && n3IsActive ? COMMISSION_RATES.N2 : 0);
  
  const unusedPercentage = COMMISSION_RATES.SELLER + COMMISSION_RATES.N1 + COMMISSION_RATES.N2 - usedPercentage;
  
  let renumPercentage = COMMISSION_RATES.RENUM;
  let jbPercentage = COMMISSION_RATES.JB;
  
  if (unusedPercentage > 0) {
    const redistributionPerGestor = unusedPercentage / 2;
    renumPercentage += redistributionPerGestor;
    jbPercentage += redistributionPerGestor;
  }

  const renumValue = Math.round(paymentValue * renumPercentage);
  const jbValue = Math.round(paymentValue * jbPercentage);

  console.log(`[calculateCommissions] Valores calculados:`, {
    slim: slimValue,
    n1: n1Value,
    n2: n2Value,
    n3: n3Value,
    renum: renumValue,
    jb: jbValue,
    total: slimValue + n1Value + n2Value + n3Value + renumValue + jbValue
  });

  // 5. Salvar comissoes no banco (apenas afiliados ativos)
  const commissions = [];

  if (n1IsActive) {
    commissions.push({
      affiliate_id: n1Affiliate.id,
      payment_id: paymentId,
      level: 1,
      percentage: COMMISSION_RATES.SELLER,
      base_value_cents: Math.round(paymentValue * 100),
      commission_value_cents: Math.round(n1Value * 100),
      status: 'pending',
      calculation_details: {
        paymentValue,
        calculatedAt: new Date().toISOString(),
        source: 'affiliate_payment'
      }
    });
  }

  if (n2Affiliate && n2IsActive) {
    commissions.push({
      affiliate_id: n2Affiliate.id,
      payment_id: paymentId,
      level: 2,
      percentage: COMMISSION_RATES.N1,
      base_value_cents: Math.round(paymentValue * 100),
      commission_value_cents: Math.round(n2Value * 100),
      status: 'pending',
      calculation_details: {
        paymentValue,
        calculatedAt: new Date().toISOString(),
        source: 'affiliate_payment'
      }
    });
  }

  if (n3Affiliate && n3IsActive) {
    commissions.push({
      affiliate_id: n3Affiliate.id,
      payment_id: paymentId,
      level: 3,
      percentage: COMMISSION_RATES.N2,
      base_value_cents: Math.round(paymentValue * 100),
      commission_value_cents: Math.round(n3Value * 100),
      status: 'pending',
      calculation_details: {
        paymentValue,
        calculatedAt: new Date().toISOString(),
        source: 'affiliate_payment'
      }
    });
  }

  if (commissions.length > 0) {
    const { error: commissionError } = await supabase
      .from('commissions')
      .insert(commissions);

    if (commissionError) {
      console.error('[calculateCommissions] Erro ao salvar comissoes:', commissionError);
      throw commissionError;
    }

    console.log(`[calculateCommissions] ${commissions.length} comissoes salvas com sucesso`);
  }
}
