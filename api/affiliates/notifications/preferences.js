/**
 * Vercel Serverless Function - Affiliate Notification Preferences
 * POST: Salvar preferências de notificações do afiliado
 * GET: Buscar preferências de notificações do afiliado
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ success: false, error: 'Configuração do servidor incompleta' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Token de autenticação não fornecido' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ success: false, error: 'Usuário não autenticado' });
    }

    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .select('id')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (affiliateError || !affiliate) {
      return res.status(404).json({ success: false, error: 'Afiliado não encontrado' });
    }

    // GET: Buscar preferências
    if (req.method === 'GET') {
      const { data: preferences, error: preferencesError } = await supabase
        .from('affiliate_notification_preferences')
        .select('*')
        .eq('affiliate_id', affiliate.id)
        .maybeSingle();

      if (preferencesError && preferencesError.code !== 'PGRST116') {
        throw preferencesError;
      }

      // Se não existir, retornar valores padrão
      if (!preferences) {
        return res.status(200).json({
          success: true,
          data: {
            email_commissions: true,
            email_monthly_report: true,
            email_new_affiliates: true,
            email_promotions: false,
            whatsapp_commissions: false,
            whatsapp_monthly_report: false
          }
        });
      }

      return res.status(200).json({
        success: true,
        data: preferences
      });
    }

    // POST: Salvar preferências
    if (req.method === 'POST') {
      const {
        email_commissions,
        email_monthly_report,
        email_new_affiliates,
        email_promotions,
        whatsapp_commissions,
        whatsapp_monthly_report
      } = req.body;

      // Validar dados
      if (
        typeof email_commissions !== 'boolean' ||
        typeof email_monthly_report !== 'boolean' ||
        typeof email_new_affiliates !== 'boolean' ||
        typeof email_promotions !== 'boolean'
      ) {
        return res.status(400).json({ 
          success: false, 
          error: 'Dados inválidos. Todos os campos devem ser booleanos.' 
        });
      }

      const preferencesData = {
        affiliate_id: affiliate.id,
        email_commissions,
        email_monthly_report,
        email_new_affiliates,
        email_promotions,
        whatsapp_commissions: whatsapp_commissions || false,
        whatsapp_monthly_report: whatsapp_monthly_report || false,
        updated_at: new Date().toISOString()
      };

      // Upsert (insert ou update)
      const { data, error } = await supabase
        .from('affiliate_notification_preferences')
        .upsert(preferencesData, { 
          onConflict: 'affiliate_id',
          returning: 'representation'
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return res.status(200).json({
        success: true,
        message: 'Preferências salvas com sucesso',
        data
      });
    }

  } catch (error) {
    console.error('[Preferences] Erro:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Erro ao processar preferências',
      message: error.message 
    });
  }
}
