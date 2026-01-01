/**
 * Servidor Express para API do chat
 * Sprint 5: Painel Admin - Agente IA
 */

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors({
  origin: ['https://slimquality.com.br', 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// Configurar Supabase
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Rate limiting simples em memória
const rateLimitMap = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minuto
  const maxRequests = 10; // 10 requests por minuto

  const current = rateLimitMap.get(ip);
  
  if (!current || now > current.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (current.count >= maxRequests) {
    return false;
  }
  
  current.count++;
  return true;
}

// Rota principal do chat
app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId, customerName, customerEmail } = req.body;

    // Validação básica
    if (!message || !sessionId) {
      return res.status(400).json({ 
        error: 'Mensagem e sessionId são obrigatórios' 
      });
    }

    // Rate limiting
    const clientIP = req.headers['x-forwarded-for'] || 
                    req.headers['x-real-ip'] || 
                    req.connection.remoteAddress || 
                    'unknown';

    if (!checkRateLimit(clientIP)) {
      return res.status(429).json({ 
        error: 'Muitas requisições. Tente novamente em alguns instantes.' 
      });
    }

    console.log(`💬 Nova mensagem de ${clientIP}: "${message.substring(0, 50)}..."`);

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
      console.log(`🔄 Conversa existente encontrada: ${conversation.id}`);
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
        console.error('❌ Erro ao criar conversa:', conversationError);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }

      conversation = newConversation;
      console.log(`✅ Nova conversa criada: ${conversation.id}`);
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
      console.error('❌ Erro ao salvar mensagem:', messageError);
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

    // Gerar resposta inteligente baseada na mensagem
    let agentResponse = "Obrigado pela sua mensagem! Sou a BIA, consultora da Slim Quality. Como posso te ajudar hoje?";
    
    // Respostas contextuais baseadas na mensagem
    const messageLower = message.toLowerCase();
    
    if (messageLower.includes('dor') || messageLower.includes('coluna') || messageLower.includes('costas') || messageLower.includes('lombar')) {
      agentResponse = "Entendo que você tem dores nas costas! 😔 Nossos colchões magnéticos são especialmente desenvolvidos para alívio de dores e melhora da postura. A magnetoterapia ajuda a relaxar os músculos e melhorar a circulação. Gostaria de saber mais sobre como pode te ajudar?";
    } else if (messageLower.includes('sono') || messageLower.includes('dormir') || messageLower.includes('insônia') || messageLower.includes('acordar')) {
      agentResponse = "Problemas de sono são muito comuns! 😴 Nossos colchões com tecnologia magnética e infravermelho longo ajudam a relaxar o corpo e melhorar a qualidade do sono. Muitos clientes relatam dormir melhor já na primeira semana. Posso te explicar como funciona?";
    } else if (messageLower.includes('preço') || messageLower.includes('valor') || messageLower.includes('quanto') || messageLower.includes('custa')) {
      agentResponse = "Nossos colchões custam a partir de R$ 3.190 (solteiro) até R$ 4.890 (king). 💰 Isso dá menos de R$ 9 por dia - menos que uma pizza! Considerando os benefícios para sua saúde e qualidade de vida, é um investimento que vale muito a pena. Quer saber sobre as opções de pagamento?";
    } else if (messageLower.includes('entrega') || messageLower.includes('frete') || messageLower.includes('prazo') || messageLower.includes('envio')) {
      agentResponse = "Fazemos entrega para todo o Brasil! 🚚 O prazo varia de 5 a 15 dias úteis dependendo da sua região. O frete é calculado no checkout. Qual sua cidade para eu verificar o prazo exato?";
    } else if (messageLower.includes('olá') || messageLower.includes('oi') || messageLower.includes('bom dia') || messageLower.includes('boa tarde') || messageLower.includes('boa noite')) {
      agentResponse = "Olá! 👋 Sou a BIA, consultora da Slim Quality. Estou aqui para te ajudar a encontrar a solução ideal para seus problemas de sono e dores. Nossos colchões magnéticos já transformaram a vida de milhares de pessoas. Como posso te ajudar hoje?";
    } else if (messageLower.includes('magnético') || messageLower.includes('magnetoterapia') || messageLower.includes('tecnologia')) {
      agentResponse = "Que bom que você quer saber sobre nossa tecnologia! 🧲 Nossos colchões têm 240 ímãs de neodímio que criam um campo magnético terapêutico. Isso melhora a circulação, reduz dores e acelera a recuperação muscular. Também temos infravermelho longo, vibromassagem e outras 6 tecnologias. Quer que eu detalhe alguma específica?";
    } else if (messageLower.includes('fibromialgia') || messageLower.includes('artrite') || messageLower.includes('artrose') || messageLower.includes('reumatismo')) {
      agentResponse = "Entendo sua preocupação com essas condições. 🩺 Nossos colchões magnéticos são especialmente indicados para fibromialgia, artrite e outras condições inflamatórias. A magnetoterapia ajuda a reduzir a inflamação e a dor. Muitos clientes com essas condições relatam melhora significativa. Gostaria de conversar sobre seu caso específico?";
    } else if (messageLower.includes('circulação') || messageLower.includes('varizes') || messageLower.includes('pernas') || messageLower.includes('inchaço')) {
      agentResponse = "Problemas circulatórios são muito comuns! 🩸 A magnetoterapia do nosso colchão melhora significativamente a circulação sanguínea, ajudando com varizes, pernas pesadas e inchaço. O campo magnético estimula o fluxo sanguíneo durante toda a noite. Você sente esses sintomas com frequência?";
    }

    // Salvar resposta do agente
    await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        content: agentResponse,
        sender_type: 'agent',
        created_at: new Date().toISOString()
      });

    console.log(`✅ Resposta enviada para conversa ${conversation.id}`);

    res.json({
      success: true,
      conversationId: conversation.id,
      response: agentResponse
    });

  } catch (error) {
    console.error('❌ Erro no endpoint /api/chat:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Rota raiz
app.get('/', (req, res) => {
  res.json({ 
    message: 'Slim Quality Chat API',
    version: '1.0.0',
    endpoints: ['/api/chat', '/api/health']
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
  console.log(`💬 Chat endpoint: http://localhost:${PORT}/api/chat`);
});