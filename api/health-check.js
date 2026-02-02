/**
 * Vercel Serverless Function - Health Check Asaas
 * Monitora a conexão com o Asaas e envia alertas se houver problemas
 * 
 * Executa: Manualmente via GET ou via Cron Job da Vercel
 */

export const config = {
    // Cron: Roda a cada 6 horas
    cron: '0 */6 * * *'
};

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const ASAAS_API_KEY = process.env.ASAAS_API_KEY?.trim();
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const ALERT_EMAIL = 'rcarrarocoach@gmail.com';
    const ALERT_WHATSAPP = '+5533998384177';

    // Detectar ambiente
    const isProduction = ASAAS_API_KEY?.includes('_prod_');
    const asaasBaseUrl = isProduction
        ? 'https://api.asaas.com/v3'
        : 'https://api-sandbox.asaas.com/v3';

    const timestamp = new Date().toISOString();
    const results = {
        timestamp,
        environment: isProduction ? 'PRODUCTION' : 'SANDBOX',
        checks: {},
        alerts_sent: []
    };

    // ========================================
    // CHECK 1: Variáveis de Ambiente
    // ========================================
    results.checks.env_vars = {
        asaas_key: !!ASAAS_API_KEY,
        resend_key: !!RESEND_API_KEY,
        wallet_renum: !!process.env.ASAAS_WALLET_RENUM,
        wallet_jb: !!process.env.ASAAS_WALLET_JB
    };

    // ========================================
    // CHECK 2: Autenticação Asaas
    // ========================================
    let asaasOk = false;
    let asaasError = null;

    if (ASAAS_API_KEY) {
        try {
            const testResponse = await fetch(`${asaasBaseUrl}/customers?limit=1`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'access_token': ASAAS_API_KEY
                }
            });

            const testData = await testResponse.json();

            if (testResponse.ok) {
                asaasOk = true;
                results.checks.asaas_auth = {
                    status: 'OK',
                    http_status: testResponse.status,
                    customers_count: testData.totalCount || 0
                };
            } else {
                asaasError = testData.errors?.[0]?.description || testData.message || 'Erro desconhecido';
                results.checks.asaas_auth = {
                    status: 'FAILED',
                    http_status: testResponse.status,
                    error: asaasError
                };
            }
        } catch (fetchError) {
            asaasError = `Erro de conexão: ${fetchError.message}`;
            results.checks.asaas_auth = {
                status: 'ERROR',
                error: asaasError
            };
        }
    } else {
        asaasError = 'ASAAS_API_KEY não configurada';
        results.checks.asaas_auth = {
            status: 'MISSING',
            error: asaasError
        };
    }

    // ========================================
    // ALERTAS (se houver problemas)
    // ========================================
    if (!asaasOk) {
        const alertMessage = `🚨 ALERTA SLIM QUALITY - ASAAS FORA DO AR!

⏰ Data/Hora: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
🔴 Status: FALHA NA AUTENTICAÇÃO
❌ Erro: ${asaasError}
🌍 Ambiente: ${isProduction ? 'PRODUÇÃO' : 'SANDBOX'}

⚠️ AÇÃO NECESSÁRIA:
1. Acesse o painel do Asaas
2. Verifique se a chave de API está ativa
3. Se necessário, gere uma nova chave
4. Atualize a variável ASAAS_API_KEY na Vercel

🔗 Painel Asaas: https://www.asaas.com/minhaConta/apiKey
🔗 Vercel: https://vercel.com/rcarraroia/slim-quality/settings/environment-variables`;

        // Enviar email via Resend
        if (RESEND_API_KEY) {
            try {
                const emailResponse = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${RESEND_API_KEY}`
                    },
                    body: JSON.stringify({
                        from: 'Slim Quality <alertas@slimquality.com.br>',
                        to: [ALERT_EMAIL],
                        subject: '🚨 URGENTE: Sistema de Pagamentos Asaas FORA DO AR!',
                        text: alertMessage,
                        html: `<pre style="font-family: monospace; background: #1a1a1a; color: #fff; padding: 20px; border-radius: 8px;">${alertMessage}</pre>`
                    })
                });

                if (emailResponse.ok) {
                    results.alerts_sent.push({ type: 'email', to: ALERT_EMAIL, status: 'sent' });
                } else {
                    const emailError = await emailResponse.text();
                    results.alerts_sent.push({ type: 'email', to: ALERT_EMAIL, status: 'failed', error: emailError });
                }
            } catch (emailErr) {
                results.alerts_sent.push({ type: 'email', to: ALERT_EMAIL, status: 'error', error: emailErr.message });
            }
        }

        // Enviar WhatsApp via Evolution API (se configurado)
        const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
        const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
        const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || 'slimquality';

        if (EVOLUTION_API_URL && EVOLUTION_API_KEY) {
            try {
                const whatsappResponse = await fetch(`${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': EVOLUTION_API_KEY
                    },
                    body: JSON.stringify({
                        number: ALERT_WHATSAPP.replace(/\D/g, ''),
                        text: alertMessage
                    })
                });

                if (whatsappResponse.ok) {
                    results.alerts_sent.push({ type: 'whatsapp', to: ALERT_WHATSAPP, status: 'sent' });
                } else {
                    const whatsappError = await whatsappResponse.text();
                    results.alerts_sent.push({ type: 'whatsapp', to: ALERT_WHATSAPP, status: 'failed', error: whatsappError });
                }
            } catch (whatsappErr) {
                results.alerts_sent.push({ type: 'whatsapp', to: ALERT_WHATSAPP, status: 'error', error: whatsappErr.message });
            }
        } else {
            results.alerts_sent.push({ type: 'whatsapp', to: ALERT_WHATSAPP, status: 'skipped', reason: 'Evolution API não configurada' });
        }
    }

    // ========================================
    // RESPOSTA FINAL
    // ========================================
    const overallStatus = asaasOk ? 'healthy' : 'unhealthy';

    return res.status(asaasOk ? 200 : 503).json({
        status: overallStatus,
        message: asaasOk ? '✅ Todos os sistemas operacionais' : '🚨 Problema detectado no Asaas',
        ...results
    });
}
