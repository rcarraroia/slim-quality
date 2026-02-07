/**
 * Middleware de Validação de Assinatura do Agente IA
 * 
 * Valida se o afiliado autenticado possui assinatura ativa do Agente IA
 * antes de permitir acesso às rotas protegidas /api/agent/*
 * 
 * Uso:
 * - Importar em rotas que precisam de validação
 * - Aplicar como middleware antes do handler principal
 * - Retorna erro 403 se assinatura inativa
 */

import { createClient } from '@supabase/supabase-js';

/**
 * Middleware principal de validação de assinatura
 */
export async function validateAgentSubscription(req, res, next) {
  try {
    // 1. Verificar se já tem dados de autenticação (de middleware anterior)
    let user = req.user;
    let affiliate = req.affiliate;

    // 2. Se não tem, fazer autenticação
    if (!user || !affiliate) {
      const authResult = await authenticateRequest(req);
      user = authResult.user;
      affiliate = authResult.affiliate;
      
      // Anexar ao request para próximos middlewares
      req.user = user;
      req.affiliate = affiliate;
    }

    // 3. Validar assinatura do agente
    const subscriptionStatus = await checkAgentSubscription(affiliate.id);

    if (!subscriptionStatus.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Assinatura do Agente IA inativa',
        details: {
          status: subscriptionStatus.status,
          reason: subscriptionStatus.reason,
          expiresAt: subscriptionStatus.expiresAt
        },
        action: 'subscribe' // Indica que precisa assinar
      });
    }

    // 4. Anexar dados da assinatura ao request
    req.agentSubscription = subscriptionStatus;

    // 5. Continuar para próximo middleware/handler
    next();

  } catch (error) {
    console.error('[ValidateAgentSubscription] Erro:', error);
    
    if (error.message.includes('Token') || error.message.includes('autenticação')) {
      return res.status(401).json({
        success: false,
        error: 'Não autenticado',
        details: error.message
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Erro interno na validação de assinatura'
    });
  }
}

/**
 * Versão assíncrona para uso em handlers que já têm autenticação
 */
export async function validateAgentSubscriptionAsync(affiliateId) {
  try {
    const subscriptionStatus = await checkAgentSubscription(affiliateId);
    
    if (!subscriptionStatus.isActive) {
      throw new Error(`Assinatura inativa: ${subscriptionStatus.reason}`);
    }
    
    return subscriptionStatus;
  } catch (error) {
    throw new Error(`Validação de assinatura falhou: ${error.message}`);
  }
}

/**
 * Middleware específico para rotas de chat (mais permissivo)
 * Permite acesso mesmo com assinatura expirada recentemente (grace period)
 */
export async function validateAgentSubscriptionForChat(req, res, next) {
  try {
    const authResult = await authenticateRequest(req);
    req.user = authResult.user;
    req.affiliate = authResult.affiliate;

    const subscriptionStatus = await checkAgentSubscription(
      authResult.affiliate.id, 
      { gracePeriodDays: 3 } // 3 dias de tolerância
    );

    if (!subscriptionStatus.isActive && !subscriptionStatus.inGracePeriod) {
      return res.status(403).json({
        success: false,
        error: 'Assinatura do Agente IA expirada',
        details: {
          status: subscriptionStatus.status,
          reason: subscriptionStatus.reason,
          expiresAt: subscriptionStatus.expiresAt,
          gracePeriodExpired: true
        }
      });
    }

    // Anexar status (pode estar em grace period)
    req.agentSubscription = subscriptionStatus;
    
    next();

  } catch (error) {
    console.error('[ValidateAgentSubscriptionForChat] Erro:', error);
    return res.status(401).json({
      success: false,
      error: 'Erro na validação de assinatura para chat'
    });
  }
}

// ============================================
// HELPER: AUTHENTICATE REQUEST
// ============================================
async function authenticateRequest(req) {
  const supabase = getSupabaseClient();

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Token de autenticação não fornecido');
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    throw new Error('Token de autenticação inválido');
  }

  const { data: affiliate, error: affiliateError } = await supabase
    .from('affiliates')
    .select('id, name, email, status')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single();

  if (affiliateError || !affiliate) {
    throw new Error('Afiliado não encontrado');
  }

  if (affiliate.status !== 'active') {
    throw new Error('Afiliado não está ativo');
  }

  return { user, affiliate };
}

// ============================================
// HELPER: CHECK AGENT SUBSCRIPTION
// ============================================
async function checkAgentSubscription(affiliateId, options = {}) {
  const supabase = getSupabaseClient();
  const { gracePeriodDays = 0 } = options;

  try {
    // 1. Buscar assinatura ativa
    const { data: subscription } = await supabase
      .from('multi_agent_subscriptions')
      .select('*')
      .eq('affiliate_id', affiliateId)
      .in('status', ['active', 'overdue'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // 2. Buscar serviço do afiliado
    const { data: service } = await supabase
      .from('affiliate_services')
      .select('*')
      .eq('affiliate_id', affiliateId)
      .eq('service_type', 'agente_ia')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // 3. Buscar tenant
    const { data: tenant } = await supabase
      .from('multi_agent_tenants')
      .select('id, status, agent_name, suspended_at')
      .eq('affiliate_id', affiliateId)
      .single();

    // 4. Determinar status da assinatura
    const now = new Date();
    let isActive = false;
    let status = 'inactive';
    let reason = 'Nenhuma assinatura encontrada';
    let expiresAt = null;
    let inGracePeriod = false;

    if (subscription) {
      expiresAt = subscription.next_due_date;
      const expiryDate = new Date(subscription.next_due_date);
      const gracePeriodEnd = new Date(expiryDate.getTime() + (gracePeriodDays * 24 * 60 * 60 * 1000));

      if (subscription.status === 'active') {
        if (now <= expiryDate) {
          isActive = true;
          status = 'active';
          reason = 'Assinatura ativa';
        } else if (gracePeriodDays > 0 && now <= gracePeriodEnd) {
          isActive = false;
          inGracePeriod = true;
          status = 'grace_period';
          reason = `Assinatura expirada, mas em período de tolerância (${gracePeriodDays} dias)`;
        } else {
          status = 'expired';
          reason = 'Assinatura expirada';
        }
      } else if (subscription.status === 'overdue') {
        if (gracePeriodDays > 0 && now <= gracePeriodEnd) {
          isActive = false;
          inGracePeriod = true;
          status = 'grace_period';
          reason = 'Assinatura em atraso, mas em período de tolerância';
        } else {
          status = 'overdue';
          reason = 'Assinatura em atraso';
        }
      } else {
        status = subscription.status;
        reason = `Assinatura ${subscription.status}`;
      }
    }

    // 5. Verificar consistência com serviço
    if (service && service.status === 'active' && service.expires_at) {
      const serviceExpiry = new Date(service.expires_at);
      if (now <= serviceExpiry && !isActive) {
        // Serviço ativo mas assinatura não - usar serviço como referência
        isActive = true;
        status = 'active';
        reason = 'Ativo via serviço do afiliado';
        expiresAt = service.expires_at;
      }
    }

    // 6. Verificar se tenant está suspenso
    if (tenant && tenant.status === 'suspended') {
      isActive = false;
      status = 'suspended';
      reason = 'Tenant suspenso';
    }

    return {
      isActive,
      inGracePeriod,
      status,
      reason,
      expiresAt,
      subscription,
      service,
      tenant,
      checkedAt: now.toISOString()
    };

  } catch (error) {
    console.error('Erro ao verificar assinatura:', error);
    return {
      isActive: false,
      inGracePeriod: false,
      status: 'error',
      reason: `Erro na verificação: ${error.message}`,
      expiresAt: null,
      subscription: null,
      service: null,
      tenant: null,
      checkedAt: new Date().toISOString()
    };
  }
}

// ============================================
// HELPER: GET SUPABASE CLIENT
// ============================================
function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Configuração do Supabase não encontrada');
  }

  return createClient(supabaseUrl, supabaseKey);
}

// ============================================
// HELPER: LOG SUBSCRIPTION CHECK
// ============================================
async function logSubscriptionCheck(affiliateId, result, action = 'validation') {
  try {
    const supabase = getSupabaseClient();
    
    await supabase
      .from('agent_subscription_logs')
      .insert({
        affiliate_id: affiliateId,
        action,
        result: {
          isActive: result.isActive,
          status: result.status,
          reason: result.reason
        },
        checked_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Erro ao registrar log de assinatura:', error);
    // Não falhar por causa do log
  }
}

// ============================================
// EXPORTS ADICIONAIS
// ============================================

/**
 * Função utilitária para verificar assinatura sem middleware
 */
export async function checkAffiliateAgentSubscription(affiliateId) {
  return await checkAgentSubscription(affiliateId);
}

/**
 * Função para verificar múltiplas assinaturas
 */
export async function checkMultipleAgentSubscriptions(affiliateIds) {
  const results = {};
  
  for (const affiliateId of affiliateIds) {
    try {
      results[affiliateId] = await checkAgentSubscription(affiliateId);
    } catch (error) {
      results[affiliateId] = {
        isActive: false,
        status: 'error',
        reason: error.message
      };
    }
  }
  
  return results;
}