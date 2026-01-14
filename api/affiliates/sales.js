/**
 * Vercel Serverless Function - Affiliate Sales
 * GET: Buscar vendas que geraram comissões para o afiliado
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
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

    // Parâmetros de paginação e filtros
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;
    const level = req.query.level;
    const search = req.query.search;

    const offset = (page - 1) * limit;

    // Construir query
    let query = supabase
      .from('commissions')
      .select(`
        id,
        commission_value_cents,
        level,
        status,
        created_at,
        order_id,
        orders (
          id,
          total_cents,
          status,
          created_at,
          customers (name)
        )
      `, { count: 'exact' })
      .eq('affiliate_id', affiliate.id);

    // Aplicar filtros
    if (status && status !== 'todos') {
      query = query.eq('orders.status', status);
    }

    if (level && level !== 'todos') {
      const levelNum = parseInt(level.replace('N', ''));
      query = query.eq('level', levelNum);
    }

    if (search) {
      // Buscar por ID do pedido ou nome do cliente
      query = query.or(`order_id.ilike.%${search}%,orders.customers.name.ilike.%${search}%`);
    }

    // Ordenar e paginar
    const { data: commissions, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[Sales] Erro ao buscar:', error);
      return res.status(500).json({ success: false, error: 'Erro ao buscar vendas' });
    }

    // Mapear vendas
    const sales = (commissions || []).map(c => ({
      id: c.id,
      orderId: c.orders?.id || c.order_id,
      createdAt: c.orders?.created_at || c.created_at,
      customerName: c.orders?.customers?.name || 'Cliente não informado',
      productName: 'Slim Quality',
      totalValue: (c.orders?.total_cents || 0) / 100,
      commissionValue: (c.commission_value_cents || 0) / 100,
      level: `N${c.level || 1}`,
      status: c.orders?.status || c.status
    }));

    // Calcular totais
    const totalValue = sales.reduce((sum, s) => sum + s.totalValue, 0);
    const totalCommissions = sales.reduce((sum, s) => sum + s.commissionValue, 0);

    return res.status(200).json({
      success: true,
      data: {
        sales,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        },
        summary: {
          totalSales: count || 0,
          totalValue,
          totalCommissions
        }
      }
    });
  } catch (error) {
    console.error('[Sales] Erro:', error);
    return res.status(500).json({ success: false, error: 'Erro ao buscar vendas' });
  }
}
