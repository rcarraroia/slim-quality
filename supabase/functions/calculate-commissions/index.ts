/**
 * Calculate Commissions Edge Function - REFATORADO
 * Sprint 4: Sistema de Afiliados Multinível
 * 
 * Edge Function para cálculo automático de comissões
 * Disparada quando um pagamento é confirmado via webhook
 * 
 * ORQUESTRADOR - Delega cálculo para função SQL
 * - Validação de entrada
 * - Execução da função SQL calculate_commission_split
 * - Logs de auditoria
 * - Resposta estruturada
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Tipos
interface CalculateCommissionsRequest {
  orderId: string;
  orderValueCents: number;
  affiliateUserId?: string; // N1 se houver
}

interface CommissionSplitResult {
  id: string;
  order_id: string;
  total_order_value_cents: number;
  factory_percentage: number;
  factory_value_cents: number;
  n1_affiliate_id?: string;
  n1_percentage?: number;
  n1_value_cents?: number;
  n2_affiliate_id?: string;
  n2_percentage?: number;
  n2_value_cents?: number;
  n3_affiliate_id?: string;
  n3_percentage?: number;
  n3_value_cents?: number;
  renum_percentage: number;
  renum_value_cents: number;
  jb_percentage: number;
  jb_value_cents: number;
  redistribution_applied: boolean;
  redistribution_details?: any;
}

// Configuração do Supabase
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    const { orderId, orderValueCents, affiliateUserId }: CalculateCommissionsRequest = await req.json();

    console.log('Starting commission calculation orchestration', {
      orderId,
      orderValueCents,
      hasAffiliate: !!affiliateUserId,
    });

    // 1. Validar entrada
    if (!orderId || !orderValueCents || orderValueCents <= 0) {
      return new Response(JSON.stringify({
        error: 'Invalid input parameters',
        code: 'INVALID_INPUT',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Validar se pedido existe e tem valor correto
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, total_cents, status, affiliate_n1_id')
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

    if (order.total_cents !== orderValueCents) {
      console.error('Order value mismatch:', { 
        expected: order.total_cents, 
        received: orderValueCents 
      });
      return new Response(JSON.stringify({
        error: 'Order value mismatch',
        code: 'ORDER_VALUE_MISMATCH',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Verificar se split já existe
    const { data: existingSplit } = await supabase
      .from('commission_splits')
      .select('id')
      .eq('order_id', orderId)
      .single();

    if (existingSplit) {
      console.warn('Commission split already exists:', { orderId, splitId: existingSplit.id });
      return new Response(JSON.stringify({
        error: 'Commission split already exists',
        code: 'SPLIT_ALREADY_EXISTS',
        splitId: existingSplit.id,
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 4. Executar cálculo via função SQL (fonte única da verdade)
    console.log('Executing SQL calculation function');
    const { data: splitId, error: sqlError } = await supabase
      .rpc('calculate_commission_split', { p_order_id: orderId })
      .single();

    if (sqlError) {
      console.error('Error in SQL calculation:', sqlError);
      return new Response(JSON.stringify({
        error: 'Failed to calculate commissions',
        code: 'SQL_CALCULATION_ERROR',
        details: sqlError.message,
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 5. Buscar resultado calculado
    const { data: split, error: splitError } = await supabase
      .from('commission_splits')
      .select('*')
      .eq('id', splitId)
      .single();

    if (splitError || !split) {
      console.error('Split not found after calculation:', splitError);
      return new Response(JSON.stringify({
        error: 'Calculation result not found',
        code: 'RESULT_NOT_FOUND',
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 6. Registrar log de auditoria
    await logCalculationOrchestration(orderId, splitId, split);

    console.log('Commission calculation orchestration completed successfully', {
      orderId,
      splitId,
      redistributionApplied: split.redistribution_applied,
      totalValue: split.total_order_value_cents,
    });

    // 7. Converter resultado para formato de resposta
    const result = convertSplitToResult(split);

    return new Response(JSON.stringify({
      success: true,
      splitId,
      calculation: result,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in calculate-commissions function:', error);
    
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
 * Converte resultado do split para formato de resposta
 */
function convertSplitToResult(split: CommissionSplitResult): any {
  const result: any = {
    orderId: split.order_id,
    totalValueCents: split.total_order_value_cents,
    factory: {
      percentage: split.factory_percentage,
      valueCents: split.factory_value_cents,
    },
    renum: {
      percentage: split.renum_percentage,
      valueCents: split.renum_value_cents,
    },
    jb: {
      percentage: split.jb_percentage,
      valueCents: split.jb_value_cents,
    },
    redistributionApplied: split.redistribution_applied,
    redistributionDetails: split.redistribution_details,
    totalPercentage: 100.00, // Sempre 100% por design
  };

  // Adicionar afiliados se existirem
  if (split.n1_affiliate_id && split.n1_value_cents) {
    result.n1 = {
      affiliateId: split.n1_affiliate_id,
      percentage: split.n1_percentage,
      valueCents: split.n1_value_cents,
    };
  }

  if (split.n2_affiliate_id && split.n2_value_cents) {
    result.n2 = {
      affiliateId: split.n2_affiliate_id,
      percentage: split.n2_percentage,
      valueCents: split.n2_value_cents,
    };
  }

  if (split.n3_affiliate_id && split.n3_value_cents) {
    result.n3 = {
      affiliateId: split.n3_affiliate_id,
      percentage: split.n3_percentage,
      valueCents: split.n3_value_cents,
    };
  }

  return result;
}

/**
 * Registra log de auditoria da orquestração
 */
async function logCalculationOrchestration(
  orderId: string,
  splitId: string,
  split: CommissionSplitResult
): Promise<void> {
  try {
    const operationDetails = {
      calculation_method: 'sql_function_orchestration',
      sql_function: 'calculate_commission_split',
      split_id: splitId,
      orchestrator: 'edge_function_calculate_commissions',
      network_structure: {
        has_n1: !!split.n1_affiliate_id,
        has_n2: !!split.n2_affiliate_id,
        has_n3: !!split.n3_affiliate_id,
      },
      percentages: {
        factory: split.factory_percentage,
        n1: split.n1_percentage,
        n2: split.n2_percentage,
        n3: split.n3_percentage,
        renum: split.renum_percentage,
        jb: split.jb_percentage,
      },
      redistribution_applied: split.redistribution_applied,
      redistribution_details: split.redistribution_details,
    };

    await supabase.rpc('log_commission_operation', {
      p_order_id: orderId,
      p_operation_type: 'commission_orchestrated_edge_function',
      p_operation_details: operationDetails,
      p_after_state: split,
      p_total_value_cents: split.total_order_value_cents,
      p_commission_value_cents: (split.n1_value_cents || 0) + (split.n2_value_cents || 0) + (split.n3_value_cents || 0),
      p_n1_affiliate_id: split.n1_affiliate_id,
      p_n2_affiliate_id: split.n2_affiliate_id,
      p_n3_affiliate_id: split.n3_affiliate_id,
      p_success: true,
    });

  } catch (error) {
    console.error('Error logging orchestration:', error);
    // Não falhar por erro de log
  }
}