/**
 * Process Split Edge Function
 * Sprint 4: Sistema de Afiliados Multinível
 * 
 * Edge Function para executar splits automáticos no Asaas
 * - Busca dados do split calculado
 * - Valida todas as Wallet IDs
 * - Executa split via API Asaas
 * - Atualiza status e registra logs
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Tipos
interface ProcessSplitRequest {
  orderId: string;
  splitId: string;
}

interface SplitItem {
  walletId: string;
  fixedValue: number;
  description?: string;
}

interface AsaasSplitResponse {
  id: string;
  status: string;
  splits: any[];
  totalValue: number;
  dateCreated: string;
}

// Configuração
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const asaasApiKey = Deno.env.get('ASAAS_API_KEY')!;
const asaasEnvironment = Deno.env.get('ASAAS_ENVIRONMENT') || 'sandbox';
const walletFabrica = Deno.env.get('ASAAS_WALLET_FABRICA')!;
const walletRenum = Deno.env.get('ASAAS_WALLET_RENUM')!;
const walletJB = Deno.env.get('ASAAS_WALLET_JB')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const asaasBaseUrl = asaasEnvironment === 'sandbox'
  ? 'https://sandbox.asaas.com/api/v3'
  : 'https://api.asaas.com/v3';

serve(async (req) => {
  try {
    // Validar método
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse do body
    const { orderId, splitId }: ProcessSplitRequest = await req.json();

    console.log('Starting split processing', { orderId, splitId });

    // 1. Validar entrada
    if (!orderId || !splitId) {
      return new Response(JSON.stringify({
        error: 'Order ID and Split ID are required',
        code: 'INVALID_INPUT',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Buscar dados do split calculado
    const { data: commissionSplit, error: splitError } = await supabase
      .from('commission_splits')
      .select('*')
      .eq('id', splitId)
      .eq('order_id', orderId)
      .single();

    if (splitError || !commissionSplit) {
      console.error('Commission split not found:', splitError);
      return new Response(JSON.stringify({
        error: 'Commission split not found',
        code: 'SPLIT_NOT_FOUND',
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Verificar se split já foi processado (idempotência)
    if (commissionSplit.asaas_split_id) {
      console.log('Split already processed', {
        orderId,
        splitId,
        asaasSplitId: commissionSplit.asaas_split_id,
      });

      return new Response(JSON.stringify({
        success: true,
        message: 'Split already processed',
        asaasSplitId: commissionSplit.asaas_split_id,
        status: commissionSplit.status,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 4. Buscar dados do pedido e pagamento
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        payments!inner(asaas_payment_id, status)
      `)
      .eq('id', orderId)
      .is('deleted_at', null)
      .single();

    if (orderError || !order) {
      console.error('Order not found:', orderError);
      return new Response(JSON.stringify({
        error: 'Order not found',
        code: 'ORDER_NOT_FOUND',
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const asaasPaymentId = order.payments[0]?.asaas_payment_id;
    if (!asaasPaymentId) {
      console.error('Asaas payment ID not found for order:', orderId);
      return new Response(JSON.stringify({
        error: 'Asaas payment ID not found',
        code: 'PAYMENT_ID_NOT_FOUND',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 5. Preparar splits para o Asaas
    const splits = await prepareSplitsForAsaas(commissionSplit);

    // 6. Validar todas as Wallet IDs
    const validationResult = await validateAllWallets(splits);
    if (!validationResult.success) {
      console.error('Wallet validation failed:', validationResult.error);

      // Marcar split como falha
      await updateSplitStatus(splitId, 'failed', validationResult.error);

      return new Response(JSON.stringify({
        error: validationResult.error,
        code: 'WALLET_VALIDATION_FAILED',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 7. Executar split no Asaas
    const splitResult = await executeSplitInAsaas(asaasPaymentId, splits);
    if (!splitResult.success) {
      console.error('Asaas split execution failed:', splitResult.error);

      // Marcar split como falha
      await updateSplitStatus(splitId, 'failed', splitResult.error, splitResult.response);

      return new Response(JSON.stringify({
        error: splitResult.error,
        code: 'ASAAS_SPLIT_FAILED',
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 8. Atualizar status do split como enviado
    await updateSplitStatus(
      splitId,
      'sent',
      null,
      splitResult.response,
      splitResult.response?.id
    );

    // 9. Atualizar status das comissões individuais
    await updateCommissionStatuses(orderId, 'pending');

    // 10. Ativar serviço se for ferramenta IA
    if (commissionSplit.main_receiver_wallet_id === walletRenum) {
      await activateAffiliateService(order.affiliate_n1_id, 'agente_ia');

      // NOVO: Provisionar tenant no sistema Multi-Agent
      await provisionMultiAgentTenant(order.affiliate_n1_id, order.payments?.asaas_payment_id);
    }

    // 11. Registrar log de auditoria
    await logSplitOperation(orderId, splitResult.response, splits);

    console.log('Split processed successfully', {
      orderId,
      splitId,
      asaasSplitId: splitResult.response?.id,
    });

    return new Response(JSON.stringify({
      success: true,
      asaasSplitId: splitResult.response?.id,
      status: 'sent',
      totalValue: splitResult.response?.totalValue,
      splitsCount: splits.length,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in process-split function:', error);

    return new Response(JSON.stringify({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      details: error.message,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

/**
 * Prepara splits para envio ao Asaas
 */
async function prepareSplitsForAsaas(commissionSplit: any): Promise<SplitItem[]> {
  const splits: SplitItem[] = [];

  // Recebedor Principal (70% - Fábrica ou Renum)
  const mainWallet = commissionSplit.main_receiver_wallet_id || walletFabrica;
  const isRenum = mainWallet === walletRenum;

  splits.push({
    walletId: mainWallet,
    fixedValue: commissionSplit.factory_value_cents / 100, // Converter para reais
    description: isRenum ? 'Renum - 70% (IA Service)' : 'Fábrica - 70%',
  });

  // N1 (15% se houver)
  if (commissionSplit.n1_affiliate_id && commissionSplit.n1_value_cents > 0) {
    const { data: n1Affiliate } = await supabase
      .from('affiliates')
      .select('wallet_id')
      .eq('id', commissionSplit.n1_affiliate_id)
      .single();

    if (n1Affiliate?.wallet_id) {
      splits.push({
        walletId: n1Affiliate.wallet_id,
        fixedValue: commissionSplit.n1_value_cents / 100,
        description: 'Afiliado N1 - 15%',
      });
    }
  }

  // N2 (3% se houver)
  if (commissionSplit.n2_affiliate_id && commissionSplit.n2_value_cents > 0) {
    const { data: n2Affiliate } = await supabase
      .from('affiliates')
      .select('wallet_id')
      .eq('id', commissionSplit.n2_affiliate_id)
      .single();

    if (n2Affiliate?.wallet_id) {
      splits.push({
        walletId: n2Affiliate.wallet_id,
        fixedValue: commissionSplit.n2_value_cents / 100,
        description: 'Afiliado N2 - 3%',
      });
    }
  }

  // N3 (2% se houver)
  if (commissionSplit.n3_affiliate_id && commissionSplit.n3_value_cents > 0) {
    const { data: n3Affiliate } = await supabase
      .from('affiliates')
      .select('wallet_id')
      .eq('id', commissionSplit.n3_affiliate_id)
      .single();

    if (n3Affiliate?.wallet_id) {
      splits.push({
        walletId: n3Affiliate.wallet_id,
        fixedValue: commissionSplit.n3_value_cents / 100,
        description: 'Afiliado N3 - 2%',
      });
    }
  }

  // Renum (5% + redistribuição)
  splits.push({
    walletId: walletRenum,
    fixedValue: commissionSplit.renum_value_cents / 100,
    description: `Gestor Renum - ${commissionSplit.renum_percentage}%`,
  });

  // JB (5% + redistribuição)
  splits.push({
    walletId: walletJB,
    fixedValue: commissionSplit.jb_value_cents / 100,
    description: `Gestor JB - ${commissionSplit.jb_percentage}%`,
  });

  console.log('Splits prepared for Asaas', {
    splitsCount: splits.length,
    totalValue: splits.reduce((sum, split) => sum + split.fixedValue, 0),
  });

  return splits;
}

/**
 * Valida todas as Wallet IDs
 */
async function validateAllWallets(splits: SplitItem[]): Promise<{ success: boolean; error?: string }> {
  try {
    const walletIds = splits.map(split => split.walletId);
    const uniqueWalletIds = [...new Set(walletIds)];

    console.log('Validating wallets', { walletIds: uniqueWalletIds });

    // Validar cada wallet via função do banco (que usa cache)
    for (const walletId of uniqueWalletIds) {
      const { data: validation } = await supabase
        .rpc('validate_asaas_wallet', { p_wallet_id: walletId })
        .single();

      if (!validation?.is_valid || !validation?.is_active) {
        return {
          success: false,
          error: `Wallet ID inválida ou inativa: ${walletId}`,
        };
      }
    }

    // Verificar se não há valores negativos ou zero
    const invalidValues = splits.filter(split => split.fixedValue <= 0);
    if (invalidValues.length > 0) {
      return {
        success: false,
        error: 'Valores devem ser positivos',
      };
    }

    console.log('All wallets validated successfully');
    return { success: true };

  } catch (error) {
    console.error('Error validating wallets:', error);
    return {
      success: false,
      error: 'Erro ao validar wallets',
    };
  }
}

/**
 * Executa split no Asaas
 */
async function executeSplitInAsaas(
  paymentId: string,
  splits: SplitItem[]
): Promise<{ success: boolean; error?: string; response?: any }> {
  try {
    console.log('Executing split in Asaas', { paymentId, splitsCount: splits.length });

    const response = await fetch(`${asaasBaseUrl}/payments/${paymentId}/split`, {
      method: 'POST',
      headers: {
        'access_token': asaasApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ splits }),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Asaas API error:', {
        status: response.status,
        statusText: response.statusText,
        data: responseData,
      });

      return {
        success: false,
        error: `Erro na API Asaas: ${response.status} - ${responseData.errors?.[0]?.description || response.statusText}`,
        response: responseData,
      };
    }

    console.log('Split executed successfully in Asaas', {
      splitId: responseData.id,
      status: responseData.status,
    });

    return {
      success: true,
      response: responseData,
    };

  } catch (error) {
    console.error('Error executing split in Asaas:', error);
    return {
      success: false,
      error: 'Erro de conexão com Asaas',
    };
  }
}

/**
 * Atualiza status do split
 */
async function updateSplitStatus(
  splitId: string,
  status: string,
  errorMessage?: string | null,
  asaasResponse?: any,
  asaasSplitId?: string
): Promise<void> {
  try {
    await supabase
      .from('commission_splits')
      .update({
        status,
        asaas_split_id: asaasSplitId,
        asaas_response: asaasResponse,
        updated_at: new Date().toISOString(),
      })
      .eq('id', splitId);

    console.log('Split status updated', { splitId, status, asaasSplitId });

  } catch (error) {
    console.error('Error updating split status:', error);
  }
}

/**
 * Atualiza status das comissões individuais
 */
async function updateCommissionStatuses(orderId: string, status: string): Promise<void> {
  try {
    await supabase
      .from('commissions')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('order_id', orderId);

    console.log('Commission statuses updated', { orderId, status });

  } catch (error) {
    console.error('Error updating commission statuses:', error);
  }
}

/**
 * Ativa o serviço para o afiliado
 */
async function activateAffiliateService(userId: string, serviceType: string): Promise<void> {
  try {
    // Buscar o ID do afiliado a partir do User ID
    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!affiliate) return;

    // Ativar ou renovar por 30 dias
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const { error } = await supabase
      .from('affiliate_services')
      .upsert({
        affiliate_id: affiliate.id,
        service_type: serviceType,
        status: 'active',
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'affiliate_id,service_type' });

    if (error) {
      console.error('Error activating service:', error);
    } else {
      console.log('Service activated successfully', { userId, serviceType });
    }
  } catch (error) {
    console.error('Error in activateAffiliateService:', error);
  }
}

/**
 * Provisiona tenant no sistema Multi-Agent
 * Cria registros em multi_agent_tenants e multi_agent_subscriptions
 */
async function provisionMultiAgentTenant(userId: string, asaasPaymentId?: string): Promise<void> {
  try {
    // 1. Buscar dados do afiliado
    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('id, name, phone')
      .eq('user_id', userId)
      .single();

    if (!affiliate) {
      console.log('Affiliate not found for tenant provisioning:', userId);
      return;
    }

    // 2. Verificar se tenant já existe (idempotência)
    const { data: existingTenant } = await supabase
      .from('multi_agent_tenants')
      .select('id, status')
      .eq('affiliate_id', affiliate.id)
      .single();

    if (existingTenant) {
      // Reativar se existia como canceled/suspended
      if (existingTenant.status !== 'active') {
        await supabase
          .from('multi_agent_tenants')
          .update({
            status: 'active',
            activated_at: new Date().toISOString(),
            suspended_at: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingTenant.id);
        console.log('Tenant reactivated:', existingTenant.id);
      } else {
        console.log('Tenant already active:', existingTenant.id);
      }
      return;
    }

    // 3. Criar novo tenant
    const { data: newTenant, error: tenantError } = await supabase
      .from('multi_agent_tenants')
      .insert({
        affiliate_id: affiliate.id,
        status: 'active',
        agent_name: `Agente de ${affiliate.name || 'Afiliado'}`,
        agent_personality: 'Você é um assistente de vendas especializado em colchões magnéticos terapêuticos da Slim Quality.',
        knowledge_enabled: true,
        activated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (tenantError) {
      console.error('Error creating tenant:', tenantError);
      return;
    }

    // 4. Criar subscription vinculada
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const { error: subError } = await supabase
      .from('multi_agent_subscriptions')
      .insert({
        tenant_id: newTenant.id,
        affiliate_id: affiliate.id,
        // Usa subscription_id se existir (assinaturas) ou payment_id (cobranças avulsas)
        asaas_subscription_id: asaasPaymentId || 'manual_activation',
        asaas_customer_id: 'pending_sync',
        status: 'active',
        plan_value_cents: 39700, // R$ 397,00
        billing_type: 'MONTHLY',
        next_due_date: expiresAt.toISOString().split('T')[0]
      });

    if (subError) {
      console.error('Error creating subscription:', subError);
    } else {
      console.log('Multi-agent tenant provisioned:', newTenant.id);
    }

  } catch (error) {
    console.error('Error in provisionMultiAgentTenant:', error);
    // Não falhar o split por erro de provisionamento
  }
}

/**
 * Registra log de auditoria
 */
async function logSplitOperation(
  orderId: string,
  asaasResponse: any,
  splits: SplitItem[]
): Promise<void> {
  try {
    const operationDetails = {
      operation: 'asaas_split_executed',
      splits_count: splits.length,
      total_value: splits.reduce((sum, split) => sum + split.fixedValue, 0),
      asaas_split_id: asaasResponse?.id,
      asaas_status: asaasResponse?.status,
    };

    await supabase.rpc('log_commission_operation', {
      p_order_id: orderId,
      p_operation_type: 'split_sent',
      p_operation_details: operationDetails,
      p_after_state: asaasResponse,
      p_success: true,
    });

  } catch (error) {
    console.error('Error logging split operation:', error);
    // Não falhar o split por erro de log
  }
}