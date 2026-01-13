/**
 * Vercel Serverless Function - Track Referral Click
 * Registra cliques em links de afiliados
 */

import { createClient } from '@supabase/supabase-js';

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
    return res.status(405).json({ 
      success: false, 
      error: 'Método não permitido' 
    });
  }

  try {
    const {
      referralCode,
      url,
      userAgent,
      referer,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      utmTerm
    } = req.body;

    if (!referralCode) {
      return res.status(400).json({
        success: false,
        error: 'referralCode é obrigatório'
      });
    }

    console.log(`[TrackClick] 🖱️ Clique registrado: ${referralCode}`);

    // Inicializar Supabase
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('[TrackClick] Supabase não configurado');
      return res.status(500).json({
        success: false,
        error: 'Configuração do servidor incompleta'
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar affiliate_id pelo código
    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .select('id')
      .eq('referral_code', referralCode)
      .eq('status', 'active')
      .is('deleted_at', null)
      .maybeSingle();

    if (affiliateError || !affiliate) {
      console.log(`[TrackClick] ⚠️ Afiliado não encontrado: ${referralCode}`);
      return res.status(404).json({
        success: false,
        error: 'Afiliado não encontrado'
      });
    }

    // Obter IP do cliente
    const clientIP = req.headers['x-forwarded-for'] || 
                    req.headers['x-real-ip'] || 
                    req.socket?.remoteAddress || 
                    'unknown';

    // Registrar clique
    const { data: click, error: clickError } = await supabase
      .from('referral_clicks')
      .insert({
        referral_code: referralCode,
        affiliate_id: affiliate.id,
        ip_address: clientIP,
        user_agent: userAgent,
        referer: referer,
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
        utm_content: utmContent,
        utm_term: utmTerm,
        clicked_at: new Date().toISOString()
      })
      .select()
      .single();

    if (clickError) {
      console.error(`[TrackClick] ❌ Erro ao salvar clique:`, clickError);
      return res.status(500).json({
        success: false,
        error: 'Erro ao registrar clique'
      });
    }

    console.log(`[TrackClick] ✅ Clique salvo: ${click.id}`);

    return res.status(200).json({
      success: true,
      message: 'Clique registrado com sucesso',
      clickId: click.id
    });

  } catch (error) {
    console.error('[TrackClick] ❌ Erro crítico:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
}
