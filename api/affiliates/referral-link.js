/**
 * Vercel Serverless Function - Get Referral Link
 * Gera link de indicação do afiliado autenticado
 * Endpoint: GET /api/affiliates/referral-link
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Apenas GET permitido
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Método não permitido' 
    });
  }

  try {
    console.log('[ReferralLink] 🔗 Gerando link de indicação');

    // Inicializar Supabase
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('[ReferralLink] Supabase não configurado');
      return res.status(500).json({
        success: false,
        error: 'Configuração do servidor incompleta'
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Obter token de autenticação do header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Token de autenticação não fornecido'
      });
    }

    const token = authHeader.replace('Bearer ', '');

    // Verificar usuário autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.log('[ReferralLink] ⚠️ Usuário não autenticado');
      return res.status(401).json({
        success: false,
        error: 'Usuário não autenticado'
      });
    }

    // Buscar dados do afiliado
    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .select('slug, referral_code')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (affiliateError || !affiliate) {
      console.log('[ReferralLink] ⚠️ Afiliado não encontrado');
      return res.status(404).json({
        success: false,
        error: 'Afiliado não encontrado'
      });
    }

    // Usar slug se existir, senão usa referral_code
    const identifier = affiliate.slug || affiliate.referral_code;

    // Montar link com parâmetro ?ref=
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'https://slimquality.com.br';
    
    const link = `${baseUrl}?ref=${identifier}`;

    // Gerar QR Code
    const qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(link)}`;

    console.log('[ReferralLink] ✅ Link gerado com sucesso');

    return res.status(200).json({
      success: true,
      data: {
        link,
        qrCode,
        referralCode: affiliate.referral_code,
        slug: affiliate.slug || undefined
      }
    });

  } catch (error) {
    console.error('[ReferralLink] ❌ Erro crítico:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
}
