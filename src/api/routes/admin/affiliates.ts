/**
 * Rotas administrativas para Afiliados
 * Task 8.4: Implementar APIs administrativas
 */

import { Router } from 'express';
import { z } from 'zod';
import { affiliateService } from '@/services/affiliates/affiliate.service';
import { supabase } from '@/config/supabase';

const router = Router();

// Schemas de validação
const UpdateStatusSchema = z.object({
  status: z.enum(['pending', 'active', 'inactive', 'suspended', 'rejected']),
  reason: z.string().min(10).max(500).optional()
});

const QuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
  status: z.enum(['pending', 'active', 'inactive', 'suspended', 'rejected']).optional(),
  search: z.string().optional()
});

/**
 * GET /api/admin/affiliates
 * Listar todos os afiliados com paginação
 */
router.get('/', requireAdmin, async (req, res) => {
  try {
    const query = QuerySchema.parse(req.query);
    const offset = (query.page - 1) * query.limit;

    // Construir query base
    let supabaseQuery = supabase
      .from('affiliates')
      .select(`
        *,
        user:auth.users(email),
        network:affiliate_network(level, parent_id)
      `, { count: 'exact' })
      .is('deleted_at', null);

    // Aplicar filtros
    if (query.status) {
      supabaseQuery = supabaseQuery.eq('status', query.status);
    }

    if (query.search) {
      supabaseQuery = supabaseQuery.or(`
        name.ilike.%${query.search}%,
        email.ilike.%${query.search}%,
        referral_code.ilike.%${query.search}%
      `);
    }

    // Aplicar paginação e ordenação
    const { data, error, count } = await supabaseQuery
      .order('created_at', { ascending: false })
      .range(offset, offset + query.limit - 1);

    if (error) {
      throw new Error(`Erro ao buscar afiliados: ${error.message}`);
    }

    const totalPages = Math.ceil((count || 0) / query.limit);

    res.json({
      success: true,
      data: {
        affiliates: data?.map(mapAffiliateForAdmin) || [],
        pagination: {
          page: query.page,
          limit: query.limit,
          total: count || 0,
          totalPages,
          hasMore: query.page < totalPages
        }
      }
    });

  } catch (error) {
    console.error('Erro ao listar afiliados:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Erro interno' 
    });
  }
});

/**
 * GET /api/admin/affiliates/:id
 * Buscar afiliado específico com detalhes completos
 */
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar afiliado com dados relacionados
    const { data: affiliate, error } = await supabase
      .from('affiliates')
      .select(`
        *,
        user:auth.users(email, created_at),
        network:affiliate_network(*),
        commissions(
          id, level, commission_value, status, created_at,
          order:orders(id, total_cents, status, created_at)
        )
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error || !affiliate) {
      return res.status(404).json({ error: 'Afiliado não encontrado' });
    }

    // Buscar estatísticas
    const stats = await affiliateService.getAffiliateStats(id);

    // Buscar rede genealógica
    const networkTree = await affiliateService.getNetworkTree(id);

    res.json({
      success: true,
      data: {
        affiliate: mapAffiliateForAdmin(affiliate),
        stats,
        networkTree,
        commissions: affiliate.commissions || []
      }
    });

  } catch (error) {
    console.error('Erro ao buscar afiliado:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

/**
 * PUT /api/admin/affiliates/:id/status
 * Atualizar status do afiliado
 */
router.put('/:id/status', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const validation = UpdateStatusSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: validation.error.issues
      });
    }

    const { status, reason } = validation.data;
    const adminId = req.user.id;

    // Atualizar status
    const updatedAffiliate = await affiliateService.updateStatus(id, status, adminId);

    // Registrar log da ação
    await logAdminAction({
      adminId,
      action: 'update_affiliate_status',
      targetId: id,
      details: { status, reason },
      ip: req.ip
    });

    res.json({
      success: true,
      data: updatedAffiliate,
      message: `Status atualizado para ${status}`
    });

  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    res.status(400).json({ 
      error: error instanceof Error ? error.message : 'Erro interno' 
    });
  }
});

/**
 * GET /api/admin/affiliates/:id/network
 * Visualizar rede genealógica completa do afiliado
 */
router.get('/:id/network', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se afiliado existe
    const affiliate = await affiliateService.getById(id);
    if (!affiliate) {
      return res.status(404).json({ error: 'Afiliado não encontrado' });
    }

    // Buscar rede completa
    const networkTree = await affiliateService.getNetworkTree(id);

    // Buscar estatísticas da rede
    const networkStats = await getNetworkStats(id);

    res.json({
      success: true,
      data: {
        affiliate,
        networkTree,
        stats: networkStats
      }
    });

  } catch (error) {
    console.error('Erro ao buscar rede:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

/**
 * GET /api/admin/affiliates/stats/overview
 * Estatísticas gerais do sistema de afiliados
 */
router.get('/stats/overview', requireAdmin, async (req, res) => {
  try {
    // Buscar estatísticas gerais
    const { data: stats, error } = await supabase
      .rpc('get_affiliates_overview_stats');

    if (error) {
      throw new Error(`Erro ao buscar estatísticas: ${error.message}`);
    }

    res.json({
      success: true,
      data: stats[0] || {}
    });

  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

/**
 * POST /api/admin/affiliates/:id/recalculate-commissions
 * Recalcular comissões de um afiliado (para correções)
 */
router.post('/:id/recalculate-commissions', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'Order ID é obrigatório' });
    }

    // Recalcular comissões
    const result = await commissionCalculator.calculateCommissions(orderId);

    // Registrar ação administrativa
    await logAdminAction({
      adminId: req.user.id,
      action: 'recalculate_commissions',
      targetId: id,
      details: { orderId, result },
      ip: req.ip
    });

    res.json({
      success: true,
      data: result,
      message: 'Comissões recalculadas com sucesso'
    });

  } catch (error) {
    console.error('Erro ao recalcular comissões:', error);
    res.status(400).json({ 
      error: error instanceof Error ? error.message : 'Erro interno' 
    });
  }
});

// Funções auxiliares
function mapAffiliateForAdmin(affiliate: any) {
  return {
    id: affiliate.id,
    name: affiliate.name,
    email: affiliate.email,
    phone: affiliate.phone,
    document: affiliate.document,
    referralCode: affiliate.referral_code,
    walletId: affiliate.wallet_id,
    status: affiliate.status,
    totalClicks: affiliate.total_clicks,
    totalConversions: affiliate.total_conversions,
    totalCommissions: (affiliate.total_commissions_cents || 0) / 100,
    createdAt: affiliate.created_at,
    updatedAt: affiliate.updated_at,
    approvedAt: affiliate.approved_at,
    approvedBy: affiliate.approved_by,
    // Dados da rede
    level: affiliate.network?.[0]?.level,
    parentId: affiliate.network?.[0]?.parent_id
  };
}

async function getNetworkStats(affiliateId: string) {
  try {
    const { data, error } = await supabase
      .rpc('get_network_stats', { root_affiliate_id: affiliateId });

    if (error) throw error;
    return data[0] || {};
  } catch (error) {
    console.error('Erro ao buscar stats da rede:', error);
    return {};
  }
}

async function logAdminAction(action: {
  adminId: string;
  action: string;
  targetId: string;
  details: any;
  ip: string;
}) {
  try {
    await supabase
      .from('admin_logs')
      .insert({
        admin_id: action.adminId,
        action: action.action,
        target_type: 'affiliate',
        target_id: action.targetId,
        details: action.details,
        ip_address: action.ip
      });
  } catch (error) {
    console.error('Erro ao registrar log admin:', error);
  }
}

// Middleware de autorização admin
function requireAdmin(req: any, res: any, next: any) {
  if (!req.user) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  // Verificar se usuário é admin (implementar conforme sistema de roles)
  if (!req.user.roles?.includes('admin') && !req.user.roles?.includes('super_admin')) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  next();
}

export default router;