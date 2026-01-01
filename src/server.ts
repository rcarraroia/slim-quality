/**
 * Servidor Express principal
 * Sprint 5: Painel Admin - Agente IA
 */

import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

// Importar rotas existentes
import affiliatesRoutes from './api/routes/affiliates';
import referralTrackingRoutes from './api/routes/referral-tracking';
import asaasWebhookRoutes from './api/routes/webhooks/asaas-webhook';
import adminAffiliatesRoutes from './api/routes/admin/affiliates';

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Configurar Supabase
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Variáveis de ambiente do Supabase não configuradas');
}

const supabase = createClient(supabaseUrl!, supabaseKey!);

// Rotas existentes
app.use('/api/affiliates', affiliatesRoutes);
app.use('/api/referral', referralTrackingRoutes);
app.use('/api/webhooks', asaasWebhookRoutes);
app.use('/api/admin/affiliates', adminAffiliatesRoutes);

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

export default app;