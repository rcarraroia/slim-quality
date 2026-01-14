/**
 * Serverless Function: Estatísticas do Afiliado
 * Endpoint: GET /api/affiliates/stats
 * 
 * Retorna métricas e dados para gráficos
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  // Apenas GET
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Método não permitido' 
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: req.headers.authorization || ''
        }
      }
    });

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Não autenticado' 
      });
    }

    // Buscar afiliado
    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .select('id, total_clicks, total_conversions, total_commissions_cents, created_at')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (affiliateError || !affiliate) {
      return res.status(404).json({ 
        success: false, 
        error: 'Afiliado não encontrado' 
      });
    }

    // Buscar comissões dos últimos 12 meses
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const { data: commissions } = await supabase
      .from('commissions')
      .select('commission_value_cents, level, status, created_at, paid_at')
      .eq('affiliate_id', affiliate.id)
      .gte('created_at', twelveMonthsAgo.toISOString())
      .order('created_at', { ascending: true });

    // Buscar cliques dos últimos 12 meses
    const { data: clicks } = await supabase
      .from('referral_clicks')
      .select('clicked_at')
      .eq('affiliate_id', affiliate.id)
      .gte('clicked_at', twelveMonthsAgo.toISOString())
      .order('clicked_at', { ascending: true });

    // Buscar conversões dos últimos 12 meses
    const { data: conversions } = await supabase
      .from('referral_conversions')
      .select('converted_at, order_value_cents')
      .eq('affiliate_id', affiliate.id)
      .gte('converted_at', twelveMonthsAgo.toISOString())
      .order('converted_at', { ascending: true });

    // Buscar crescimento da rede
    const { data: networkGrowth } = await supabase
      .from('affiliates')
      .select('created_at, referred_by')
      .eq('referred_by', affiliate.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    // Processar dados para gráficos
    const performanceData = processPerformanceData(commissions || [], clicks || [], conversions || []);
    const conversionFunnel = processConversionFunnel(
      affiliate.total_clicks || 0,
      affiliate.total_conversions || 0,
      commissions || []
    );
    const networkGrowthData = processNetworkGrowth(networkGrowth || []);

    // Métricas gerais
    const overview = {
      totalClicks: affiliate.total_clicks || 0,
      totalConversions: affiliate.total_conversions || 0,
      totalCommissions: (affiliate.total_commissions_cents || 0) / 100,
      conversionRate: affiliate.total_clicks > 0 
        ? ((affiliate.total_conversions / affiliate.total_clicks) * 100).toFixed(2)
        : '0.00',
      avgCommission: affiliate.total_conversions > 0
        ? ((affiliate.total_commissions_cents / 100) / affiliate.total_conversions).toFixed(2)
        : '0.00',
      memberSince: affiliate.created_at
    };

    return res.status(200).json({
      success: true,
      data: {
        overview,
        performance: performanceData,
        conversionFunnel,
        networkGrowth: networkGrowthData
      }
    });

  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Erro interno ao buscar estatísticas' 
    });
  }
}

/**
 * Processa dados de performance ao longo do tempo
 */
function processPerformanceData(commissions, clicks, conversions) {
  const monthlyData = {};

  // Processar comissões
  commissions.forEach(c => {
    const month = new Date(c.created_at).toISOString().slice(0, 7); // YYYY-MM
    if (!monthlyData[month]) {
      monthlyData[month] = { month, commissions: 0, clicks: 0, conversions: 0 };
    }
    monthlyData[month].commissions += (c.commission_value_cents || 0) / 100;
  });

  // Processar cliques
  clicks.forEach(c => {
    const month = new Date(c.clicked_at).toISOString().slice(0, 7);
    if (!monthlyData[month]) {
      monthlyData[month] = { month, commissions: 0, clicks: 0, conversions: 0 };
    }
    monthlyData[month].clicks += 1;
  });

  // Processar conversões
  conversions.forEach(c => {
    const month = new Date(c.converted_at).toISOString().slice(0, 7);
    if (!monthlyData[month]) {
      monthlyData[month] = { month, commissions: 0, clicks: 0, conversions: 0 };
    }
    monthlyData[month].conversions += 1;
  });

  // Converter para array e ordenar
  return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Processa funil de conversão
 */
function processConversionFunnel(totalClicks, totalConversions, commissions) {
  const paidCommissions = commissions.filter(c => c.status === 'paid').length;

  return [
    { stage: 'Cliques', value: totalClicks, percentage: 100 },
    { 
      stage: 'Conversões', 
      value: totalConversions, 
      percentage: totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(1) : 0 
    },
    { 
      stage: 'Comissões Pagas', 
      value: paidCommissions, 
      percentage: totalConversions > 0 ? ((paidCommissions / totalConversions) * 100).toFixed(1) : 0 
    }
  ];
}

/**
 * Processa crescimento da rede
 */
function processNetworkGrowth(networkData) {
  const monthlyGrowth = {};

  networkData.forEach(n => {
    const month = new Date(n.created_at).toISOString().slice(0, 7);
    if (!monthlyGrowth[month]) {
      monthlyGrowth[month] = { month, newAffiliates: 0 };
    }
    monthlyGrowth[month].newAffiliates += 1;
  });

  // Calcular total acumulado
  let accumulated = 0;
  const result = Object.values(monthlyGrowth)
    .sort((a, b) => a.month.localeCompare(b.month))
    .map(item => {
      accumulated += item.newAffiliates;
      return {
        ...item,
        total: accumulated
      };
    });

  return result;
}
