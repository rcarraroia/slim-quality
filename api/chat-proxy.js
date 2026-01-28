/**
 * Vercel Serverless Function - Proxy para Agente
 * Resolve problemas de CORS redirecionando para o agente real
 */

export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Responder OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Apenas POST permitido
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { message, sessionId } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Mensagem é obrigatória' });
    }

    console.log('🔄 Proxy: Redirecionando para agente real...');

    // URLs do agente para tentar
    const agentUrls = [
      'https://slimquality-agent.wpjtfd.easypanel.host/api/chat',
      'http://slimquality-agent.wpjtfd.easypanel.host/api/chat'
    ];

    let agentResponse = null;

    for (const agentUrl of agentUrls) {
      try {
        console.log(`Tentando: ${agentUrl}`);

        const response = await fetch(agentUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: message,
            lead_id: `site_${sessionId || 'anonymous'}`,
            platform: 'site'
          }),
          timeout: 10000 // 10 segundos
        });

        if (response.ok) {
          const data = await response.json();
          if (data.status === 'success' && data.response) {
            agentResponse = data.response;
            console.log(`✅ Sucesso via: ${agentUrl}`);
            break;
          }
        } else {
          console.log(`❌ ${agentUrl}: ${response.status}`);
        }
      } catch (error) {
        console.log(`❌ ${agentUrl}: ${error.message}`);
      }
    }

    if (agentResponse) {
      return res.status(200).json({
        success: true,
        response: agentResponse,
        source: 'agent'
      });
    }

    // Fallback: Resposta inteligente local
    console.log('🤖 Usando fallback inteligente...');

    const fallbackResponse = generateSmartResponse(message);

    return res.status(200).json({
      success: true,
      response: fallbackResponse,
      source: 'fallback'
    });

  } catch (error) {
    console.error('❌ Erro no proxy:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
}

function generateSmartResponse(message) {
  const msg = message.toLowerCase();

  // Respostas contextuais baseadas em palavras-chave
  if (msg.includes('dor') || msg.includes('dores')) {
    return "Entendo sua preocupação com dores. Nossos colchões magnéticos são especialmente desenvolvidos para ajudar com dores nas costas e articulações. O Sistema Magnético de 800 Gauss pode ajudar a melhorar a circulação e reduzir inflamações. Gostaria de saber mais sobre como funciona?";
  }

  if (msg.includes('sono') || msg.includes('dormir') || msg.includes('insônia')) {
    return "Problemas de sono são muito comuns! Nossos colchões têm tecnologia de Infravermelho Longo e Vibromassagem que ajudam a relaxar o corpo e melhorar a qualidade do sono. Muitos clientes relatam dormir melhor já nas primeiras noites. Que tipo de dificuldade você tem para dormir?";
  }

  if (msg.includes('preço') || msg.includes('valor') || msg.includes('custa') || msg.includes('quanto')) {
    return "Nossos colchões custam a partir de R$ 3.190 (solteiro) até R$ 4.890 (king). Isso dá menos que uma pizza por dia quando você pensa no investimento em saúde! Temos condições especiais de pagamento. Qual tamanho você precisa?";
  }

  if (msg.includes('tecnologia') || msg.includes('como funciona') || msg.includes('magnético')) {
    return "Nossos colchões têm 8 tecnologias integradas: Sistema Magnético (240 ímãs), Infravermelho Longo, Energia Bioquântica, Vibromassagem, Densidade Progressiva, Cromoterapia, Perfilado High-Tech e Tratamento Sanitário. Cada uma tem benefícios específicos para sua saúde. Sobre qual gostaria de saber mais?";
  }

  if (msg.includes('entrega') || msg.includes('prazo') || msg.includes('frete')) {
    return "Fazemos entrega em todo o Brasil! O prazo varia de 5 a 15 dias úteis dependendo da sua região. O frete é calculado no checkout baseado no seu CEP. Em algumas regiões temos frete grátis em promoções especiais. Qual sua cidade?";
  }

  // Saudações
  if (msg.includes('oi') || msg.includes('olá') || msg.includes('boa tarde') || msg.includes('bom dia') || msg.includes('boa noite')) {
    return "Olá! 👋 Sou a BIA, consultora da Slim Quality. Estou aqui para ajudar você a encontrar a solução ideal para seus problemas de sono e saúde. Como posso te ajudar hoje?";
  }

  // Resposta padrão
  return "Obrigada pela sua mensagem! Sou a BIA da Slim Quality. Nossos colchões magnéticos terapêuticos podem ajudar com diversos problemas de saúde como dores, má circulação e problemas de sono. Para um atendimento mais personalizado, utilize nosso formulário Fale Conosco no rodapé da página. Como posso ajudar você hoje?";
}