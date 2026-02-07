/**
 * API CONSOLIDADA DE AGENTE MULTI-TENANT
 * Integração entre Slim Quality (Express) e Agente Multi-Tenant (FastAPI)
 * 
 * Rotas:
 * - POST ?action=subscribe - Criar/ativar assinatura de agente
 * - GET  ?action=status - Status do agente do afiliado
 * - PUT  ?action=config - Configurar agente (PROTEGIDA)
 * - POST ?action=chat - Proxy para FastAPI (PROTEGIDA)
 */

import { createClient } from '@supabase/supabase-js';
import { validateAgentSubscriptionAsync } from './middleware/validateAgentSubscription.js';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action } = req.query;

  if (!action) {
    return res.status(400).json({ 
      success: false, 
      error: 'Parâmetro "action" é obrigatório' 
    });
  }

  // Inicializar Supabase
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ success: false, error: 'Configuração do servidor incompleta' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Roteamento com validação de assinatura
  switch (action) {
    case 'subscribe':
      return handleSubscribe(req, res, supabase);
    case 'status':
      return handleStatus(req, res, supabase);
    case 'config':
      return handleConfigWithValidation(req, res, supabase);
    case 'chat':
      return handleChatWithValidation(req, res, supabase);
    default:
      return res.status(404).json({ success: false, error: 'Action não encontrada' });
  }
}

// ============================================
// HANDLER: SUBSCRIBE
// ============================================
async function handleSubscribe(req, res, supabase) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  try {
    const { user, affiliate } = await authenticateAffiliate(req, supabase);
    if (!affiliate) {
      return res.status(404).json({ success: false, error: 'Afiliado não encontrado' });
    }

    const { agentName, agentPersonality } = req.body;

    if (!agentName || agentName.trim().length < 3) {
      return res.status(400).json({ 
        success: false, 
        error: 'Nome do agente deve ter pelo menos 3 caracteres' 
      });
    }

    // 1. Verificar se já tem assinatura ativa
    const { data: existingService } = await supabase
      .from('affiliate_services')
      .select('*')
      .eq('affiliate_id', affiliate.id)
      .eq('service_type', 'agente_ia')
      .eq('status', 'active')
      .single();

    if (existingService) {
      return res.status(400).json({
        success: false,
        error: 'Afiliado já possui assinatura ativa do Agente IA'
      });
    }

    // 2. Criar assinatura de serviço
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 1 ano

    const { data: service, error: serviceError } = await supabase
      .from('affiliate_services')
      .insert({
        affiliate_id: affiliate.id,
        user_id: user.id,
        service_type: 'agente_ia',
        status: 'active',
        expires_at: expiresAt.toISOString(),
        metadata: {
          agent_name: agentName,
          agent_personality: agentPersonality || 'IA amigável e eficiente para suporte',
          created_via: 'api_subscribe',
          created_at: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (serviceError) {
      console.error('Erro ao criar serviço:', serviceError);
      return res.status(500).json({ 
        success: false, 
        error: 'Erro ao criar assinatura do agente' 
      });
    }

    // 3. Criar tenant no sistema multi-tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('multi_agent_tenants')
      .insert({
        affiliate_id: affiliate.id,
        status: 'active',
        agent_name: agentName,
        agent_personality: agentPersonality || 'IA amigável e eficiente para suporte',
        knowledge_enabled: true,
        whatsapp_provider: 'evolution',
        whatsapp_status: 'disconnected',
        chatwoot_account_id: null, // Será configurado depois
        chatwoot_inbox_id: null,
        chatwoot_api_access_token: null,
        openai_api_key: null // Usará chave global
      })
      .select()
      .single();

    if (tenantError) {
      console.error('Erro ao criar tenant:', tenantError);
      // Reverter criação do serviço
      await supabase
        .from('affiliate_services')
        .delete()
        .eq('id', service.id);
      
      return res.status(500).json({ 
        success: false, 
        error: 'Erro ao configurar tenant do agente' 
      });
    }

    // 4. Criar assinatura no multi_agent_subscriptions
    const { error: subscriptionError } = await supabase
      .from('multi_agent_subscriptions')
      .insert({
        tenant_id: tenant.id,
        affiliate_id: affiliate.id,
        asaas_subscription_id: `manual_${Date.now()}`, // Placeholder
        asaas_customer_id: `cus_${affiliate.id}`,
        status: 'active',
        plan_value_cents: 9900, // R$ 99,00
        billing_type: 'CREDIT_CARD',
        next_due_date: expiresAt.toISOString().split('T')[0]
      });

    if (subscriptionError) {
      console.error('Erro ao criar subscription:', subscriptionError);
      // Não reverter - subscription é opcional para funcionamento
    }

    return res.status(201).json({
      success: true,
      data: {
        serviceId: service.id,
        tenantId: tenant.id,
        agentName: tenant.agent_name,
        status: 'active',
        expiresAt: service.expires_at,
        message: 'Agente IA ativado com sucesso!'
      }
    });

  } catch (error) {
    console.error('[Subscribe] Erro:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
}

// ============================================
// HANDLER: STATUS
// ============================================
async function handleStatus(req, res, supabase) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  try {
    const { user, affiliate } = await authenticateAffiliate(req, supabase);
    if (!affiliate) {
      return res.status(404).json({ success: false, error: 'Afiliado não encontrado' });
    }

    // 1. Buscar serviço ativo
    const { data: service } = await supabase
      .from('affiliate_services')
      .select('*')
      .eq('affiliate_id', affiliate.id)
      .eq('service_type', 'agente_ia')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!service) {
      return res.status(200).json({
        success: true,
        data: {
          hasAgent: false,
          status: 'inactive',
          message: 'Nenhum agente configurado'
        }
      });
    }

    // 2. Buscar tenant correspondente
    const { data: tenant } = await supabase
      .from('multi_agent_tenants')
      .select('*')
      .eq('affiliate_id', affiliate.id)
      .single();

    // 3. Buscar subscription
    const { data: subscription } = await supabase
      .from('multi_agent_subscriptions')
      .select('*')
      .eq('affiliate_id', affiliate.id)
      .eq('status', 'active')
      .single();

    // 4. Verificar status do agente via FastAPI
    let agentHealth = null;
    try {
      const fastApiUrl = process.env.AGENTE_MULTI_TENANT_URL || 'https://agente-multi-tenant.wpjtfd.easypanel.host';
      const healthResponse = await fetch(`${fastApiUrl}/health`, {
        method: 'GET',
        timeout: 5000
      });
      
      if (healthResponse.ok) {
        agentHealth = await healthResponse.json();
      }
    } catch (error) {
      console.log('FastAPI não disponível:', error.message);
    }

    const isActive = service.status === 'active' && 
                    (!service.expires_at || new Date(service.expires_at) > new Date());

    return res.status(200).json({
      success: true,
      data: {
        hasAgent: true,
        status: isActive ? 'active' : 'expired',
        agentName: tenant?.agent_name || service.metadata?.agent_name,
        agentPersonality: tenant?.agent_personality || service.metadata?.agent_personality,
        expiresAt: service.expires_at,
        whatsappStatus: tenant?.whatsapp_status || 'disconnected',
        chatwootConnected: !!tenant?.chatwoot_account_id,
        subscriptionActive: !!subscription,
        fastApiHealth: agentHealth,
        tenantId: tenant?.id,
        serviceId: service.id
      }
    });

  } catch (error) {
    console.error('[Status] Erro:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Erro ao verificar status do agente' 
    });
  }
}

// ============================================
// HANDLER: CONFIG (COM VALIDAÇÃO)
// ============================================
async function handleConfigWithValidation(req, res, supabase) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  try {
    // 1. Autenticar e validar assinatura
    const { user, affiliate } = await authenticateAffiliate(req, supabase);
    if (!affiliate) {
      return res.status(404).json({ success: false, error: 'Afiliado não encontrado' });
    }

    // 2. Validar assinatura do agente
    const subscriptionStatus = await validateAgentSubscriptionAsync(affiliate.id);
    
    if (!subscriptionStatus.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Assinatura do Agente IA inativa',
        details: {
          status: subscriptionStatus.status,
          reason: subscriptionStatus.reason,
          expiresAt: subscriptionStatus.expiresAt
        },
        action: 'subscribe'
      });
    }

    // 3. Continuar com lógica original do handleConfig
    return await handleConfig(req, res, supabase, { user, affiliate, subscription: subscriptionStatus });

  } catch (error) {
    console.error('[ConfigWithValidation] Erro:', error);
    
    if (error.message.includes('Assinatura inativa')) {
      return res.status(403).json({
        success: false,
        error: 'Assinatura do Agente IA necessária',
        details: error.message
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
}

// ============================================
// HANDLER: CHAT (COM VALIDAÇÃO)
// ============================================
async function handleChatWithValidation(req, res, supabase) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  try {
    // 1. Autenticar
    const { user, affiliate } = await authenticateAffiliate(req, supabase);
    if (!affiliate) {
      return res.status(404).json({ success: false, error: 'Afiliado não encontrado' });
    }

    // 2. Validar assinatura com grace period para chat
    const subscriptionStatus = await validateAgentSubscriptionAsync(affiliate.id);
    
    // Para chat, permitir grace period de 3 dias
    const now = new Date();
    const gracePeriodDays = 3;
    let allowChat = subscriptionStatus.isActive;
    
    if (!subscriptionStatus.isActive && subscriptionStatus.expiresAt) {
      const expiryDate = new Date(subscriptionStatus.expiresAt);
      const gracePeriodEnd = new Date(expiryDate.getTime() + (gracePeriodDays * 24 * 60 * 60 * 1000));
      
      if (now <= gracePeriodEnd) {
        allowChat = true;
        console.log(`🔄 Chat permitido em grace period para afiliado ${affiliate.id}`);
      }
    }
    
    if (!allowChat) {
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

    // 3. Continuar com lógica original do handleChat
    return await handleChat(req, res, supabase, { user, affiliate, subscription: subscriptionStatus });

  } catch (error) {
    console.error('[ChatWithValidation] Erro:', error);
    
    if (error.message.includes('Assinatura inativa')) {
      return res.status(403).json({
        success: false,
        error: 'Assinatura do Agente IA necessária para chat',
        details: error.message
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
}

// ============================================
// HANDLER: CONFIG (ORIGINAL - AGORA INTERNO)
// ============================================
async function handleConfig(req, res, supabase, authData = null) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  try {
    // 1. Usar dados de autenticação se fornecidos, senão autenticar
    let user, affiliate;
    
    if (authData) {
      user = authData.user;
      affiliate = authData.affiliate;
    } else {
      const authResult = await authenticateAffiliate(req, supabase);
      user = authResult.user;
      affiliate = authResult.affiliate;
      
      if (!affiliate) {
        return res.status(404).json({ success: false, error: 'Afiliado não encontrado' });
      }
    }

    const { agentName, agentPersonality, openaiApiKey } = req.body;

    // 1. Buscar tenant existente
    const { data: tenant, error: tenantError } = await supabase
      .from('multi_agent_tenants')
      .select('*')
      .eq('affiliate_id', affiliate.id)
      .single();

    if (tenantError || !tenant) {
      return res.status(404).json({ 
        success: false, 
        error: 'Agente não encontrado. Crie uma assinatura primeiro.' 
      });
    }

    // 2. Preparar dados de atualização
    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (agentName && agentName.trim().length >= 3) {
      updateData.agent_name = agentName.trim();
    }

    if (agentPersonality && agentPersonality.trim().length >= 10) {
      updateData.agent_personality = agentPersonality.trim();
    }

    if (openaiApiKey && openaiApiKey.startsWith('sk-')) {
      updateData.openai_api_key = openaiApiKey;
    }

    // 3. Atualizar tenant
    const { data: updatedTenant, error: updateError } = await supabase
      .from('multi_agent_tenants')
      .update(updateData)
      .eq('id', tenant.id)
      .select()
      .single();

    if (updateError) {
      console.error('Erro ao atualizar tenant:', updateError);
      return res.status(500).json({ 
        success: false, 
        error: 'Erro ao atualizar configuração do agente' 
      });
    }

    // 4. Atualizar metadata do serviço também
    const { error: serviceUpdateError } = await supabase
      .from('affiliate_services')
      .update({
        metadata: {
          ...tenant.metadata,
          agent_name: updatedTenant.agent_name,
          agent_personality: updatedTenant.agent_personality,
          updated_at: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      })
      .eq('affiliate_id', affiliate.id)
      .eq('service_type', 'agente_ia');

    if (serviceUpdateError) {
      console.log('Aviso: Erro ao atualizar metadata do serviço:', serviceUpdateError);
    }

    return res.status(200).json({
      success: true,
      data: {
        tenantId: updatedTenant.id,
        agentName: updatedTenant.agent_name,
        agentPersonality: updatedTenant.agent_personality,
        hasCustomOpenAI: !!updatedTenant.openai_api_key,
        updatedAt: updatedTenant.updated_at,
        message: 'Configuração do agente atualizada com sucesso!'
      }
    });

  } catch (error) {
    console.error('[Config] Erro:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
}

// ============================================
// HANDLER: CHAT (PROXY PARA FASTAPI - ORIGINAL - AGORA INTERNO)
// ============================================
async function handleChat(req, res, supabase, authData = null) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  try {
    // 1. Usar dados de autenticação se fornecidos, senão autenticar
    let user, affiliate;
    
    if (authData) {
      user = authData.user;
      affiliate = authData.affiliate;
    } else {
      const authResult = await authenticateAffiliate(req, supabase);
      user = authResult.user;
      affiliate = authResult.affiliate;
      
      if (!affiliate) {
        return res.status(404).json({ success: false, error: 'Afiliado não encontrado' });
      }
    }

    const { message, sessionId, platform } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Mensagem é obrigatória' 
      });
    }

    // 2. Buscar tenant (validação de assinatura já foi feita no wrapper)
    const { data: tenant } = await supabase
      .from('multi_agent_tenants')
      .select('*')
      .eq('affiliate_id', affiliate.id)
      .single();

    if (!tenant) {
      return res.status(404).json({ 
        success: false, 
        error: 'Configuração do agente não encontrada' 
      });
    }

    // 3. Fazer proxy para FastAPI
    const fastApiUrl = process.env.AGENTE_MULTI_TENANT_URL || 'https://agente-multi-tenant.wpjtfd.easypanel.host';
    const chatEndpoint = `${fastApiUrl}/api/v1/conversations/chat`;

    console.log(`🔄 [Proxy] Chat para FastAPI: ${chatEndpoint} | Tenant: ${tenant.id} | Afiliado: ${affiliate.id}`);

    // 4. Criar headers com tenant context
    const authToken = req.headers.authorization; // Repassar token do usuário
    const proxyHeaders = {
      'Content-Type': 'application/json',
      'Authorization': authToken,
      'X-Tenant-ID': tenant.id.toString(),
      'X-Affiliate-ID': affiliate.id.toString(),
      'X-Agent-Name': tenant.agent_name || 'Agente',
      'X-Request-Source': 'slim-quality-express'
    };

    const proxyPayload = {
      message: message.trim(),
      session_id: sessionId || `web_${Date.now()}`,
      platform: platform || 'web',
      tenant_context: {
        tenant_id: tenant.id,
        affiliate_id: affiliate.id,
        agent_name: tenant.agent_name,
        agent_personality: tenant.agent_personality
      }
    };

    console.log(`📤 [Proxy] Enviando para FastAPI:`, {
      endpoint: chatEndpoint,
      headers: Object.keys(proxyHeaders),
      payload_size: JSON.stringify(proxyPayload).length
    });

    try {
      const startTime = Date.now();
      
      const fastApiResponse = await fetch(chatEndpoint, {
        method: 'POST',
        headers: proxyHeaders,
        body: JSON.stringify(proxyPayload),
        timeout: 30000 // 30 segundos
      });

      const responseTime = Date.now() - startTime;
      
      console.log(`📥 [Proxy] Resposta FastAPI:`, {
        status: fastApiResponse.status,
        ok: fastApiResponse.ok,
        response_time_ms: responseTime
      });

      if (!fastApiResponse.ok) {
        const errorText = await fastApiResponse.text();
        console.error(`❌ [Proxy] FastAPI erro ${fastApiResponse.status}:`, errorText);
        
        // Tratamento específico por código de erro
        if (fastApiResponse.status === 401) {
          return res.status(401).json({
            success: false,
            error: 'Não autorizado no sistema de agentes',
            details: 'Token inválido ou expirado'
          });
        }
        
        if (fastApiResponse.status === 403) {
          return res.status(403).json({
            success: false,
            error: 'Acesso negado ao agente',
            details: 'Tenant não autorizado ou suspenso'
          });
        }
        
        if (fastApiResponse.status === 404) {
          return res.status(404).json({
            success: false,
            error: 'Agente não encontrado',
            details: 'Configuração do agente não localizada'
          });
        }
        
        return res.status(502).json({
          success: false,
          error: 'Agente temporariamente indisponível',
          details: `FastAPI retornou ${fastApiResponse.status}`,
          retry_after: 30
        });
      }

      const fastApiData = await fastApiResponse.json();
      
      console.log(`✅ [Proxy] Sucesso:`, {
        response_length: JSON.stringify(fastApiData).length,
        session_id: fastApiData.session_id,
        response_time_ms: responseTime
      });

      // 5. Retornar resposta do FastAPI
      return res.status(200).json({
        success: true,
        data: {
          response: fastApiData.response || fastApiData.message,
          sessionId: fastApiData.session_id || sessionId,
          agentName: tenant.agent_name,
          timestamp: new Date().toISOString(),
          source: 'fastapi',
          responseTime: responseTime
        }
      });

    } catch (fetchError) {
      const errorType = fetchError.name || 'UnknownError';
      console.error(`💥 [Proxy] Erro de conexão (${errorType}):`, fetchError.message);
      
      // Log detalhado do erro
      console.error(`🔍 [Proxy] Detalhes do erro:`, {
        error_type: errorType,
        message: fetchError.message,
        endpoint: chatEndpoint,
        tenant_id: tenant.id,
        affiliate_id: affiliate.id
      });
      
      // Fallback: resposta local
      const fallbackResponse = generateFallbackResponse(message, tenant.agent_name);
      
      console.log(`🔄 [Proxy] Usando fallback response para tenant ${tenant.id}`);
      
      return res.status(200).json({
        success: true,
        data: {
          response: fallbackResponse,
          sessionId: sessionId || `fallback_${Date.now()}`,
          agentName: tenant.agent_name,
          timestamp: new Date().toISOString(),
          source: 'fallback',
          reason: 'fastapi_unavailable'
        }
      });
    }

  } catch (error) {
    console.error('[Chat] Erro:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
}

// ============================================
// HELPER: AUTHENTICATE AFFILIATE
// ============================================
async function authenticateAffiliate(req, supabase) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Token de autenticação não fornecido');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Token inválido');
    }

    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .select('id')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single();

    if (affiliateError || !affiliate) {
      throw new Error('Afiliado não encontrado');
    }

    return { user, affiliate };
  } catch (error) {
    console.error('[Auth] Erro na autenticação:', error.message);
    throw error;
  }
}

// ============================================
// HELPER: FALLBACK RESPONSE
// ============================================
function generateFallbackResponse(message, agentName) {
  const msg = message.toLowerCase();
  const name = agentName || 'Assistente';

  if (msg.includes('oi') || msg.includes('olá') || msg.includes('bom dia') || msg.includes('boa tarde')) {
    return `Olá! Sou ${name}, seu assistente virtual. Como posso ajudar você hoje?`;
  }

  if (msg.includes('obrigad') || msg.includes('valeu') || msg.includes('thanks')) {
    return `Por nada! Fico feliz em ajudar. Se precisar de mais alguma coisa, é só falar!`;
  }

  return `Olá! Sou ${name}. No momento estou com dificuldades técnicas, mas em breve estarei funcionando perfeitamente. Como posso ajudar você?`;
}