/**
 * Vercel Serverless Function - Contact Form Handler
 * Envia notificações de contato para os administradores
 */

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Apenas POST permitido
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Método não permitido' });
    }

    try {
        const { name, email, subject, message } = req.body;

        // Validação básica
        if (!name || !email || !message) {
            return res.status(400).json({
                success: false,
                error: 'Campos obrigatórios: name, email, message'
            });
        }

        console.log(`[Contact] 📩 Nova mensagem de: ${name} (${email})`);

        const adminEmails = [
            'colchoesslimquality@gmail.com',
            'jbmkt01@gmail.com'
        ];

        // Lógica de envio de email
        // Como não há Resend API Key configurada no .env, vamos tentar usar um Webhook do n8n como fallback
        // ou simplesmente logar e retornar sucesso simulado se estiver em desenvolvimento.

        const RESEND_API_KEY = process.env.RESEND_API_KEY;
        const N8N_CONTACT_WEBHOOK = process.env.N8N_CONTACT_WEBHOOK;

        if (RESEND_API_KEY) {
            console.log('[Contact] Enviando via Resend...');
            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${RESEND_API_KEY}`
                },
                body: JSON.stringify({
                    from: 'Slim Quality <contato@slimquality.com.br>',
                    to: adminEmails,
                    subject: subject || `Novo contato: ${name}`,
                    html: `
            <h3>Nova mensagem do site</h3>
            <p><strong>Nome:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Assunto:</strong> ${subject || 'Sem assunto'}</p>
            <hr />
            <p><strong>Mensagem:</strong></p>
            <p>${message.replace(/\n/g, '<br>')}</p>
          `
                })
            });

            if (!response.ok) {
                throw new Error('Falha ao enviar email via Resend');
            }
        } else if (N8N_CONTACT_WEBHOOK) {
            console.log('[Contact] Enviando via n8n Webhook...');
            await fetch(N8N_CONTACT_WEBHOOK, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, subject, message, type: 'contact_form' })
            });
        } else {
            console.warn('[Contact] ⚠️ Nenhuma integração de email/webhook configurada.');
            // Em desenvolvimento, consideramos sucesso para permitir o teste do frontend
            if (process.env.NODE_ENV !== 'production') {
                return res.status(200).json({
                    success: true,
                    message: 'Mensagem recebida com sucesso (Modo Desenvolvimento)',
                    data: { name, email }
                });
            }

            return res.status(503).json({
                success: false,
                error: 'Serviço de envio de email não configurado.'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Mensagem enviada com sucesso!'
        });

    } catch (error) {
        console.error('[Contact] ❌ Erro:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno ao processar o formulário. Tente novamente mais tarde.'
        });
    }
}
