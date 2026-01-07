/**
 * Servidor Express principal
 * Sprint 5: Painel Admin - Agente IA
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

// Importar middlewares de segurança
import {
  helmetConfig,
  generalRateLimit,
  authRateLimit,
  adminRateLimit,
  securityLogger,
  validateContentType,
  sanitizeInput,
  corsConfig
} from './api/middleware/security';

// Importar rotas existentes
import affiliatesRoutes from './api/routes/affiliates';
import referralTrackingRoutes from './api/routes/referral-tracking';
import asaasWebhookRoutes from './api/routes/webhooks/asaas-webhook';
import adminAffiliatesRoutes from './api/routes/admin/affiliates';
import adminCommissionsRoutes from './api/routes/admin/commissions';
import adminWithdrawalsRoutes from './api/routes/admin/withdrawals';
import mcpRoutes from './api/routes/mcp';
import authRoutes from './api/routes/auth';

const app = express();

// ============================================
// MIDDLEWARES DE SEGURANÇA (BLOCO 3)
// ============================================

// 1. Helmet para headers de segurança
app.use(helmetConfig);

// 2. CORS configurado com origens específicas
app.use(cors(corsConfig));

// 3. Rate limiting geral
app.use(generalRateLimit);

// 4. Logging de segurança
app.use(securityLogger);

// 5. Parsing JSON com limite de tamanho
app.use(express.json({ limit: '10mb' }));

// 6. Validação de Content-Type
app.use(validateContentType);

// 7. Sanitização de input
app.use(sanitizeInput);

// Configurar Supabase
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Variáveis de ambiente do Supabase não configuradas');
}

const supabase = createClient(supabaseUrl!, supabaseKey!);

// ============================================
// ROTAS COM RATE LIMITING ESPECÍFICO
// ============================================

// Rotas de autenticação com rate limiting restritivo
app.use('/api/auth', authRateLimit, authRoutes);

// Rotas administrativas com rate limiting moderado
app.use('/api/admin/affiliates', adminRateLimit, adminAffiliatesRoutes);
app.use('/api/admin/commissions', adminRateLimit, adminCommissionsRoutes);
app.use('/api/admin/withdrawals', adminRateLimit, adminWithdrawalsRoutes);

// Rotas gerais (já protegidas pelo rate limiting geral)
app.use('/api/affiliates', affiliatesRoutes);
app.use('/api/referral', referralTrackingRoutes);
app.use('/api/webhooks', asaasWebhookRoutes);
app.use('/api/mcp', mcpRoutes);

// Nova rota para chat do site
app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId, customerName, customerEmail } = req.body;

    // Validação básica
    if (!message || !sessionId) {
      return res.status(400).json({ 
        error: 'Mensagem e sessionId são obrigatórios' 
      });
    }

    // Rate limiting simples (10 mensagens por minuto por IP)
    const clientIP = req.ip || req.connection.remoteAddress;
    // TODO: Implementar rate limiting com Redis ou cache

    // Buscar ou criar conversa
    let conversation;
    const { data: existingConversation } = await supabase
      .from('conversations')
      .select('*')
      .eq('session_id', sessionId)
      .eq('channel', 'site')
      .single();

    if (existingConversation) {
      conversation = existingConversation;
    } else {
      // Criar nova conversa
      const { data: newConversation, error: conversationError } = await supabase
        .from('conversations')
        .insert({
          session_id: sessionId,
          channel: 'site',
          status: 'open',
          customer_name: customerName || 'Visitante do Site',
          customer_email: customerEmail || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (conversationError) {
        console.error('Erro ao criar conversa:', conversationError);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }

      conversation = newConversation;
    }

    // Salvar mensagem do usuário
    const { error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        content: message,
        sender_type: 'customer',
        created_at: new Date().toISOString()
      });

    if (messageError) {
      console.error('Erro ao salvar mensagem:', messageError);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    // Atualizar timestamp da conversa
    await supabase
      .from('conversations')
      .update({ 
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', conversation.id);

    // TODO: Integrar com Evolution API para resposta do agente
    // Por enquanto, retornar resposta simples
    const agentResponse = "Obrigado pela sua mensagem! Em breve um de nossos especialistas entrará em contato.";

    // Salvar resposta do agente
    await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        content: agentResponse,
        sender_type: 'agent',
        created_at: new Date().toISOString()
      });

    res.json({
      success: true,
      conversationId: conversation.id,
      response: agentResponse
    });

  } catch (error) {
    console.error('Erro no endpoint /api/chat:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Iniciar servidor
const PORT = process.env.PORT || 3333;
app.listen(PORT, () => {
  console.log(`🚀 Servidor Express rodando na porta ${PORT}`);
  console.log(`📡 MCP Gateway: ${process.env.MCP_GATEWAY_URL || 'http://localhost:8082'}`);
});

export default app;