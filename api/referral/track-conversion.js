/**
 * Vercel Serverless Function - Track Referral Conversion
 * Registra conversões (vendas) de afiliados
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

    // Inicializar Supabase
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('[TrackConversion] Supabase não configurado');
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
