/**
 * APIs para rastreamento de referrals e conversões
 */

import { Router } from 'express';
import { supabase } from '../../config/supabase';
import { z } from 'zod';

const router = Router();

// Schema de validação para clique
const TrackClickSchema = z.object({
  referral_code: z.string().min(1),
  url: z.string().url(),
  user_agent: z.string().optional(),
  timestamp: z.string().datetime()
});

// Schema de validação para conversão
const TrackConversionSchema = z.object({
  referral_code: z.string().min(1),
  order_id: z.string().uuid(),
  timestamp: z.string().datetime()
});

/**
 * POST /api/affiliates/track-click
 * Registra um clique em link de afiliado
 */
router.post('/track-click', async (req, res) => {
  try {
    const validatedData = TrackClickSchema.parse(req.body);

    // Verificar se o código de referência existe
    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .select('id, name')
      .eq('referral_code', validatedData.referral_code)
      .eq('status', 'active')
      .single();

    if (affiliateError || !affiliate) {
      return res.status(404).json({
        success: false,
        error: 'Código de referência não encontrado ou inativo'
      });
    }

    // Obter IP do cliente
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';

    // Verificar se já existe um clique recente do mesmo IP (deduplicação)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentClick } = await supabase
      .from('referral_clicks')
      .select('id')
      .eq('affiliate_id', affiliate.id)
      .eq('ip_address', clientIp)
      .gte('created_at', oneHourAgo)
      .single();

    if (recentClick) {
      // Clique duplicado, retornar sucesso mas não registrar
      return res.json({
        success: true,
        message: 'Clique já registrado recentemente',
        duplicate: true
      });
    }

    // Registrar o clique
    const { error: insertError } = await supabase
      .from('referral_clicks')
      .insert({
        affiliate_id: affiliate.id,
        referral_code: validatedData.referral_code,
        url: validatedData.url,
        ip_address: clientIp,
        user_agent: validatedData.user_agent,
        clicked_at: validatedData.timestamp
      });

    if (insertError) {
      console.error('Erro ao registrar clique:', insertError);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }

    res.json({
      success: true,
      message: 'Clique registrado com sucesso',
      affiliate_name: affiliate.name
    });

  } catch (error) {
    console.error('Erro no track-click:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * POST /api/affiliates/track-conversion
 * Registra uma conversão (venda) de afiliado
 */
router.post('/track-conversion', async (req, res) => {
  try {
    const validatedData = TrackConversionSchema.parse(req.body);

    // Verificar se o código de referência existe
    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .select('id, name')
      .eq('referral_code', validatedData.referral_code)
      .eq('status', 'active')
      .single();

    if (affiliateError || !affiliate) {
      return res.status(404).json({
        success: false,
        error: 'Código de referência não encontrado ou inativo'
      });
    }

    // Verificar se o pedido existe
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, total_amount, status')
      .eq('id', validatedData.order_id)
      .single();

    if (orderError || !order) {
      return res.status(404).json({
        success: false,
        error: 'Pedido não encontrado'
      });
    }

    // Verificar se já existe uma conversão para este pedido
    const { data: existingConversion } = await supabase
      .from('referral_conversions')
      .select('id')
      .eq('order_id', validatedData.order_id)
      .single();

    if (existingConversion) {
      return res.status(409).json({
        success: false,
        error: 'Conversão já registrada para este pedido'
      });
    }

    // Registrar a conversão
    const { error: insertError } = await supabase
      .from('referral_conversions')
      .insert({
        affiliate_id: affiliate.id,
        order_id: validatedData.order_id,
        referral_code: validatedData.referral_code,
        conversion_value: order.total_amount,
        converted_at: validatedData.timestamp
      });

    if (insertError) {
      console.error('Erro ao registrar conversão:', insertError);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }

    // Atualizar o pedido com o ID do afiliado
    const { error: updateError } = await supabase
      .from('orders')
      .update({ affiliate_id: affiliate.id })
      .eq('id', validatedData.order_id);

    if (updateError) {
      console.error('Erro ao atualizar pedido com afiliado:', updateError);
      // Não falhar a requisição por isso
    }

    res.json({
      success: true,
      message: 'Conversão registrada com sucesso',
      affiliate_name: affiliate.name,
      order_value: order.total_amount
    });

  } catch (error) {
    console.error('Erro no track-conversion:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * GET /api/affiliates/referral-stats/:code
 * Obtém estatísticas de um código de referência
 */
router.get('/referral-stats/:code', async (req, res) => {
  try {
    const { code } = req.params;

    // Verificar se o código existe
    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .select('id, name')
      .eq('referral_code', code)
      .single();

    if (affiliateError || !affiliate) {
      return res.status(404).json({
        success: false,
        error: 'Código de referência não encontrado'
      });
    }

    // Buscar estatísticas de cliques
    const { count: totalClicks } = await supabase
      .from('referral_clicks')
      .select('*', { count: 'exact', head: true })
      .eq('affiliate_id', affiliate.id);

    // Buscar estatísticas de conversões
    const { count: totalConversions, data: conversions } = await supabase
      .from('referral_conversions')
      .select('conversion_value', { count: 'exact' })
      .eq('affiliate_id', affiliate.id);

    // Calcular valor total das conversões
    const totalValue = conversions?.reduce((sum, conv) => sum + (conv.conversion_value || 0), 0) || 0;

    // Calcular taxa de conversão
    const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

    res.json({
      success: true,
      data: {
        affiliate_name: affiliate.name,
        referral_code: code,
        total_clicks: totalClicks || 0,
        total_conversions: totalConversions || 0,
        total_value: totalValue,
        conversion_rate: Math.round(conversionRate * 100) / 100
      }
    });

  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

export default router;