/**
 * API CONSOLIDADA DE REFERRAL
 * Rastreamento de cliques e conversões de afiliados
 * 
 * Rotas:
 * - POST ?action=track-click
 * - POST ?action=track-conversion
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Método não permitido' 
    });
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

  // Roteamento
  switch (action) {
    case 'track-click':
      return handleTrackClick(req, res, supabase);
    case 'track-conversion':
      return handleTrackConversion(req, res, supabase);
    default:
      return res.status(404).json({ success: false, error: 'Action não encontrada' });
  }
}

// ============================================
// HANDLER: TRACK CLICK
// ============================================
async function handleTrackClick(req, res, supabase) {
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

// ============================================
// HANDLER: TRACK CONVERSION
// ============================================
async function handleTrackConversion(req, res, supabase) {
  try {
    const {
      referralCode,
      orderId,
      orderValueCents,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      utmTerm
    } = req.body;

    if (!referralCode || !orderId) {
      return res.status(400).json({
        success: false,
        error: 'referralCode e orderId são obrigatórios'
      });
    }

    console.log(`[TrackConversion] 💰 Conversão registrada: ${referralCode} -> ${orderId}`);

    // Buscar affiliate_id pelo código
    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .select('id')
      .eq('referral_code', referralCode)
      .eq('status', 'active')
      .is('deleted_at', null)
      .maybeSingle();

    if (affiliateError || !affiliate) {
      console.log(`[TrackConversion] ⚠️ Afiliado não encontrado: ${referralCode}`);
      return res.status(404).json({
        success: false,
        error: 'Afiliado não encontrado'
      });
    }

    // Buscar pedido
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('customer_id, total_cents')
      .eq('id', orderId)
      .maybeSingle();

    if (orderError || !order) {
      console.log(`[TrackConversion] ⚠️ Pedido não encontrado: ${orderId}`);
      return res.status(404).json({
        success: false,
        error: 'Pedido não encontrado'
      });
    }

    // Calcular comissão (15% para N1)
    const commissionPercentage = 15;
    const orderValue = orderValueCents || order.total_cents;
    const commissionValueCents = Math.round(orderValue * (commissionPercentage / 100));

    // Registrar conversão
    const { data: conversion, error: conversionError } = await supabase
      .from('referral_conversions')
      .insert({
        referral_code: referralCode,
        affiliate_id: affiliate.id,
        order_id: orderId,
        order_value_cents: orderValue,
        commission_percentage: commissionPercentage,
        commission_value_cents: commissionValueCents,
        customer_id: order.customer_id,
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
        utm_content: utmContent,
        utm_term: utmTerm,
        converted_at: new Date().toISOString(),
        status: 'confirmed'
      })
      .select()
      .single();

    if (conversionError) {
      console.error(`[TrackConversion] ❌ Erro ao salvar conversão:`, conversionError);
      return res.status(500).json({
        success: false,
        error: 'Erro ao registrar conversão'
      });
    }

    console.log(`[TrackConversion] ✅ Conversão salva: ${conversion.id}`);

    return res.status(200).json({
      success: true,
      message: 'Conversão registrada com sucesso',
      conversionId: conversion.id,
      commissionValueCents: commissionValueCents
    });

  } catch (error) {
    console.error('[TrackConversion] ❌ Erro crítico:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
}
