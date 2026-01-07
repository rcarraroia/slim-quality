/**
 * Rotas de Administração de Afiliados
 * BLOCO 2: APIs Backend - Painel Admin
 */

import { Router } from 'express';
import { supabase } from '../../../config/supabase';
import { verifyAdmin, AdminRequest } from '../../middleware/auth';
import { auditLogger } from '../../../services/audit-logger.service';
import { asaasValidator } from '../../../services/asaas-validator.service';

const router = Router();

// Cache simples em memória para métricas (5 minutos)
let metricsCache: { data: any; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Task 2.1: API de Métricas do Dashboard
 * GET /api/admin/affiliates/metrics
 */
router.get('/metrics', verifyAdmin, async (req: AdminRequest, res) => {
  try {
    // Verificar cache
    if (metricsCache && Date.now() - metricsCache.timestamp < CACHE_TTL) {
      return res.json(metricsCache.data);
    }

    // Buscar métricas do banco
    const [
      affiliatesResult,
      commissionsResult,
      ordersResult,
      clicksResult
    ] = await Promise.all([
      // Afiliados por status
      supabase
        .from('affiliates')
        .select('status')
        .is('deleted_at', null),
      
      // Comissões pagas
      supabase
        .from('commissions')
        .select('commission_value_cents, status'),
      
      // Vendas geradas por afiliados
      supabase
        .from('orders')
        .select('total_cents, affiliate_n1_id')
        .not('affiliate_n1_id', 'is', null),
      
      // Cliques em links de afiliados
      supabase
        .from('referral_clicks')
        .select('id, clicked_at')
        .gte('clicked_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    ]);

    // Processar dados dos afiliados
    const affiliatesData = affiliatesResult.data || [];
    const affiliatesStats = {
      total: affiliatesData.length,
      active: affiliatesData.filter(a => a.status === 'active').length,
      pending: affiliatesData.filter(a => a.status === 'pending').length,
      inactive: affiliatesData.filter(a => a.status === 'inactive').length,
      suspended: affiliatesData.filter(a => a.status === 'suspended').length
    };

    // Processar dados das comissões
    const commissionsData = commissionsResult.data || [];
    const totalCommissionsCents = commissionsData
      .filter(c => c.status === 'paid')
      .reduce((sum, c) => sum + (c.commission_value_cents || 0), 0);

    // Processar dados das vendas
    const ordersData = ordersResult.data || [];
    const totalSalesCents = ordersData.reduce((sum, o) => sum + (o.total_cents || 0), 0);

    // Processar dados dos cliques
    const clicksData = clicksResult.data || [];
    const totalClicks = clicksData.length;

    // Calcular taxa de conversão
    const conversionRate = totalClicks > 0 ? (ordersData.length / totalClicks) * 100 : 0;

    // Montar resposta
    const metrics = {
      affiliates: affiliatesStats,
      financial: {
        totalCommissionsPaid: Math.round(totalCommissionsCents / 100), // Converter para reais
        totalSalesGenerated: Math.round(totalSalesCents / 100), // Converter para reais
        averageCommissionPerAffiliate: affiliatesStats.active > 0 
          ? Math.round(totalCommissionsCents / affiliatesStats.active / 100) 
          : 0
      },
      performance: {
        totalClicks: totalClicks,
        totalConversions: ordersData.length,
        conversionRate: Math.round(conversionRate * 100) / 100 // 2 casas decimais
      },
      period: {
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        to: new Date().toISOString()
      }
    };

    // Salvar no cache
    metricsCache = {
      data: metrics,
      timestamp: Date.now()
    };

    // Log da ação
    await auditLogger.logAction({
      adminId: req.admin!.id,
      action: 'view_metrics',
      resourceType: 'dashboard',
      details: { metricsRequested: true }
    });

    res.json(metrics);
  } catch (error) {
    console.error('Erro ao buscar métricas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * Task 2.2: API de Listagem de Afiliados
 * GET /api/admin/affiliates
 */
router.get('/', verifyAdmin, async (req: AdminRequest, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    // Construir query
    let query = supabase
      .from('affiliates')
      .select(`
        id,
        name,
        email,
        phone,
        referral_code,
        wallet_id,
        status,
        total_clicks,
        total_conversions,
        total_commissions_cents,
        created_at,
        updated_at
      `)
      .is('deleted_at', null);

    // Aplicar filtros
    if (status) {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Aplicar ordenação
    const validSortFields = ['name', 'email', 'status', 'created_at', 'total_conversions'];
    const sortField = validSortFields.includes(String(sortBy)) ? String(sortBy) : 'created_at';
    const order = sortOrder === 'asc' ? true : false;

    query = query.order(sortField, { ascending: order });

    // Aplicar paginação
    query = query.range(offset, offset + Number(limit) - 1);

    const { data: affiliates, error, count } = await query;

    if (error) {
      throw error;
    }

    // Buscar total de registros para paginação
    const { count: totalCount } = await supabase
      .from('affiliates')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null);

    // Formatar dados
    const formattedAffiliates = (affiliates || []).map(affiliate => ({
      ...affiliate,
      total_commissions: Math.round((affiliate.total_commissions_cents || 0) / 100),
      conversion_rate: affiliate.total_clicks > 0 
        ? Math.round((affiliate.total_conversions / affiliate.total_clicks) * 10000) / 100
        : 0
    }));

    // Log da ação
    await auditLogger.logAction({
      adminId: req.admin!.id,
      action: 'list_affiliates',
      resourceType: 'affiliate',
      details: { 
        filters: { status, search, page, limit },
        resultsCount: affiliates?.length || 0
      }
    });

    res.json({
      data: formattedAffiliates,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / Number(limit))
      }
    });
  } catch (error) {
    console.error('Erro ao listar afiliados:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
/**
 * Task 2.3: API de Gestão de Solicitações
 * GET /api/admin/affiliates/requests - Listar pendentes
 */
router.get('/requests', verifyAdmin, async (req: AdminRequest, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // Buscar solicitações pendentes
    const { data: requests, error } = await supabase
      .from('affiliates')
      .select(`
        id,
        name,
        email,
        phone,
        document,
        wallet_id,
        referral_code,
        created_at
      `)
      .eq('status', 'pending')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (error) {
      throw error;
    }

    // Buscar total
    const { count: totalCount } = await supabase
      .from('affiliates')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .is('deleted_at', null);

    // Log da ação
    await auditLogger.logAction({
      adminId: req.admin!.id,
      action: 'list_requests',
      resourceType: 'affiliate',
      details: { 
        page: Number(page),
        limit: Number(limit),
        resultsCount: requests?.length || 0
      }
    });

    res.json({
      data: requests || [],
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / Number(limit))
      }
    });
  } catch (error) {
    console.error('Erro ao listar solicitações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * POST /api/admin/affiliates/:id/approve - Aprovar afiliado
 */
router.post('/:id/approve', verifyAdmin, async (req: AdminRequest, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    // Buscar afiliado
    const { data: affiliate, error: fetchError } = await supabase
      .from('affiliates')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !affiliate) {
      return res.status(404).json({ error: 'Afiliado não encontrado' });
    }

    if (affiliate.status !== 'pending') {
      return res.status(400).json({ error: 'Afiliado não está pendente de aprovação' });
    }

    // Validar Wallet ID se fornecido
    if (affiliate.wallet_id) {
      const validation = await asaasValidator.validateWallet(affiliate.wallet_id);
      if (!validation.isValid || !validation.isActive) {
        return res.status(400).json({ 
          error: 'Wallet ID inválida ou inativa',
          details: validation.error
        });
      }
    }

    // Aprovar afiliado
    const { error: updateError } = await supabase
      .from('affiliates')
      .update({
        status: 'active',
        approved_by: req.admin!.id,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    // Log da ação
    await auditLogger.logAction({
      adminId: req.admin!.id,
      action: 'approve_affiliate',
      resourceType: 'affiliate',
      resourceId: id,
      details: { 
        affiliateName: affiliate.name,
        affiliateEmail: affiliate.email,
        notes: notes || null
      }
    });

    res.json({ 
      message: 'Afiliado aprovado com sucesso',
      affiliate: {
        id: affiliate.id,
        name: affiliate.name,
        email: affiliate.email,
        status: 'active'
      }
    });
  } catch (error) {
    console.error('Erro ao aprovar afiliado:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * POST /api/admin/affiliates/:id/reject - Rejeitar afiliado
 */
router.post('/:id/reject', verifyAdmin, async (req: AdminRequest, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Motivo da rejeição é obrigatório' });
    }

    // Buscar afiliado
    const { data: affiliate, error: fetchError } = await supabase
      .from('affiliates')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !affiliate) {
      return res.status(404).json({ error: 'Afiliado não encontrado' });
    }

    if (affiliate.status !== 'pending') {
      return res.status(400).json({ error: 'Afiliado não está pendente de aprovação' });
    }

    // Rejeitar afiliado
    const { error: updateError } = await supabase
      .from('affiliates')
      .update({
        status: 'rejected',
        rejection_reason: reason,
        approved_by: req.admin!.id,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    // Log da ação
    await auditLogger.logAction({
      adminId: req.admin!.id,
      action: 'reject_affiliate',
      resourceType: 'affiliate',
      resourceId: id,
      details: { 
        affiliateName: affiliate.name,
        affiliateEmail: affiliate.email,
        rejectionReason: reason
      }
    });

    res.json({ 
      message: 'Afiliado rejeitado com sucesso',
      affiliate: {
        id: affiliate.id,
        name: affiliate.name,
        email: affiliate.email,
        status: 'rejected'
      }
    });
  } catch (error) {
    console.error('Erro ao rejeitar afiliado:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * Task 2.4: API de Edição de Afiliados
 * GET /api/admin/affiliates/:id - Detalhes do afiliado
 */
router.get('/:id', verifyAdmin, async (req: AdminRequest, res) => {
  try {
    const { id } = req.params;

    // Buscar afiliado com dados relacionados
    const { data: affiliate, error } = await supabase
      .from('affiliates')
      .select(`
        *,
        approved_by_admin:admins!affiliates_approved_by_fkey(name, email)
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error || !affiliate) {
      return res.status(404).json({ error: 'Afiliado não encontrado' });
    }

    // Buscar estatísticas do afiliado
    const [commissionsResult, networkResult] = await Promise.all([
      // Comissões do afiliado
      supabase
        .from('commissions')
        .select('commission_value_cents, status, created_at')
        .eq('affiliate_id', id),
      
      // Rede do afiliado (indicados diretos)
      supabase
        .from('affiliate_network')
        .select(`
          affiliate_id,
          level,
          affiliate:affiliates!affiliate_network_affiliate_id_fkey(name, email, status, created_at)
        `)
        .eq('parent_id', id)
    ]);

    // Processar dados
    const commissions = commissionsResult.data || [];
    const network = networkResult.data || [];

    const affiliateDetails = {
      ...affiliate,
      total_commissions: Math.round((affiliate.total_commissions_cents || 0) / 100),
      conversion_rate: affiliate.total_clicks > 0 
        ? Math.round((affiliate.total_conversions / affiliate.total_clicks) * 10000) / 100
        : 0,
      statistics: {
        totalCommissions: commissions.length,
        paidCommissions: commissions.filter(c => c.status === 'paid').length,
        pendingCommissions: commissions.filter(c => c.status === 'pending').length,
        networkSize: network.length,
        directReferrals: network.filter(n => n.level === 2).length
      },
      recentCommissions: commissions
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5)
        .map(c => ({
          ...c,
          commission_value: Math.round(c.commission_value_cents / 100)
        })),
      network: network.map(n => ({
        ...n.affiliate,
        level: n.level
      }))
    };

    // Log da ação
    await auditLogger.logAction({
      adminId: req.admin!.id,
      action: 'view_affiliate',
      resourceType: 'affiliate',
      resourceId: id,
      details: { affiliateName: affiliate.name }
    });

    res.json(affiliateDetails);
  } catch (error) {
    console.error('Erro ao buscar detalhes do afiliado:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * PUT /api/admin/affiliates/:id - Editar afiliado
 */
router.put('/:id', verifyAdmin, async (req: AdminRequest, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      email, 
      phone, 
      document, 
      wallet_id,
      notification_email,
      notification_whatsapp,
      city,
      state,
      cep
    } = req.body;

    // Buscar afiliado atual
    const { data: currentAffiliate, error: fetchError } = await supabase
      .from('affiliates')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !currentAffiliate) {
      return res.status(404).json({ error: 'Afiliado não encontrado' });
    }

    // Validar Wallet ID se foi alterada
    if (wallet_id && wallet_id !== currentAffiliate.wallet_id) {
      const validation = await asaasValidator.validateWallet(wallet_id);
      if (!validation.isValid || !validation.isActive) {
        return res.status(400).json({ 
          error: 'Wallet ID inválida ou inativa',
          details: validation.error
        });
      }
    }

    // Preparar dados para atualização
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (document) updateData.document = document;
    if (wallet_id) {
      updateData.wallet_id = wallet_id;
      updateData.wallet_validated_at = new Date().toISOString();
    }
    if (typeof notification_email === 'boolean') updateData.notification_email = notification_email;
    if (typeof notification_whatsapp === 'boolean') updateData.notification_whatsapp = notification_whatsapp;
    if (city) updateData.city = city;
    if (state) updateData.state = state;
    if (cep) updateData.cep = cep;

    // Atualizar afiliado
    const { data: updatedAffiliate, error: updateError } = await supabase
      .from('affiliates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Log da ação
    await auditLogger.logAction({
      adminId: req.admin!.id,
      action: 'update_affiliate',
      resourceType: 'affiliate',
      resourceId: id,
      details: { 
        affiliateName: currentAffiliate.name,
        updatedFields: Object.keys(updateData),
        changes: updateData
      }
    });

    res.json({
      message: 'Afiliado atualizado com sucesso',
      affiliate: updatedAffiliate
    });
  } catch (error) {
    console.error('Erro ao atualizar afiliado:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * POST /api/admin/affiliates/:id/activate - Ativar afiliado
 */
router.post('/:id/activate', verifyAdmin, async (req: AdminRequest, res) => {
  try {
    const { id } = req.params;

    // Buscar afiliado
    const { data: affiliate, error: fetchError } = await supabase
      .from('affiliates')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !affiliate) {
      return res.status(404).json({ error: 'Afiliado não encontrado' });
    }

    if (affiliate.status === 'active') {
      return res.status(400).json({ error: 'Afiliado já está ativo' });
    }

    // Ativar afiliado
    const { error: updateError } = await supabase
      .from('affiliates')
      .update({
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    // Log da ação
    await auditLogger.logAction({
      adminId: req.admin!.id,
      action: 'activate_affiliate',
      resourceType: 'affiliate',
      resourceId: id,
      details: { 
        affiliateName: affiliate.name,
        previousStatus: affiliate.status
      }
    });

    res.json({ 
      message: 'Afiliado ativado com sucesso',
      affiliate: {
        id: affiliate.id,
        name: affiliate.name,
        status: 'active'
      }
    });
  } catch (error) {
    console.error('Erro ao ativar afiliado:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * POST /api/admin/affiliates/:id/deactivate - Desativar afiliado
 */
router.post('/:id/deactivate', verifyAdmin, async (req: AdminRequest, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Buscar afiliado
    const { data: affiliate, error: fetchError } = await supabase
      .from('affiliates')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !affiliate) {
      return res.status(404).json({ error: 'Afiliado não encontrado' });
    }

    if (affiliate.status === 'inactive') {
      return res.status(400).json({ error: 'Afiliado já está inativo' });
    }

    // Desativar afiliado
    const { error: updateError } = await supabase
      .from('affiliates')
      .update({
        status: 'inactive',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    // Log da ação
    await auditLogger.logAction({
      adminId: req.admin!.id,
      action: 'deactivate_affiliate',
      resourceType: 'affiliate',
      resourceId: id,
      details: { 
        affiliateName: affiliate.name,
        previousStatus: affiliate.status,
        reason: reason || null
      }
    });

    res.json({ 
      message: 'Afiliado desativado com sucesso',
      affiliate: {
        id: affiliate.id,
        name: affiliate.name,
        status: 'inactive'
      }
    });
  } catch (error) {
    console.error('Erro ao desativar afiliado:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});
/**
 * Task 2.6: API de Rede Genealógica
 * GET /api/admin/affiliates/network - Estrutura da árvore genealógica
 */
router.get('/network', verifyAdmin, async (req: AdminRequest, res) => {
  try {
    const { affiliate_id, max_depth = 3 } = req.query;

    let networkQuery;

    if (affiliate_id) {
      // Buscar rede específica de um afiliado
      networkQuery = supabase
        .from('affiliate_network')
        .select(`
          id,
          affiliate_id,
          parent_id,
          level,
          path,
          created_at,
          affiliate:affiliates!affiliate_network_affiliate_id_fkey(
            id, name, email, status, referral_code, total_conversions, total_commissions_cents, created_at
          ),
          parent:affiliates!affiliate_network_parent_id_fkey(
            id, name, email, referral_code
          )
        `)
        .or(`affiliate_id.eq.${affiliate_id},parent_id.eq.${affiliate_id}`)
        .lte('level', Number(max_depth))
        .order('level', { ascending: true });
    } else {
      // Buscar toda a rede (limitada por profundidade)
      networkQuery = supabase
        .from('affiliate_network')
        .select(`
          id,
          affiliate_id,
          parent_id,
          level,
          path,
          created_at,
          affiliate:affiliates!affiliate_network_affiliate_id_fkey(
            id, name, email, status, referral_code, total_conversions, total_commissions_cents, created_at
          ),
          parent:affiliates!affiliate_network_parent_id_fkey(
            id, name, email, referral_code
          )
        `)
        .lte('level', Number(max_depth))
        .order('level', { ascending: true });
    }

    const { data: networkData, error } = await networkQuery;

    if (error) {
      throw error;
    }

    // Processar dados da rede
    const processedNetwork = (networkData || []).map(node => ({
      ...node,
      affiliate: node.affiliate ? {
        ...node.affiliate,
        total_commissions: Math.round((node.affiliate.total_commissions_cents || 0) / 100),
        conversion_rate: node.affiliate.total_clicks > 0 
          ? Math.round((node.affiliate.total_conversions / node.affiliate.total_clicks) * 10000) / 100
          : 0
      } : null
    }));

    // Calcular estatísticas da rede
    const networkStats = {
      totalNodes: processedNetwork.length,
      byLevel: {
        level1: processedNetwork.filter(n => n.level === 1).length,
        level2: processedNetwork.filter(n => n.level === 2).length,
        level3: processedNetwork.filter(n => n.level === 3).length
      },
      byStatus: {
        active: processedNetwork.filter(n => n.affiliate?.status === 'active').length,
        inactive: processedNetwork.filter(n => n.affiliate?.status === 'inactive').length,
        pending: processedNetwork.filter(n => n.affiliate?.status === 'pending').length
      },
      totalCommissions: processedNetwork.reduce((sum, n) => 
        sum + (n.affiliate?.total_commissions || 0), 0
      ),
      totalConversions: processedNetwork.reduce((sum, n) => 
        sum + (n.affiliate?.total_conversions || 0), 0
      )
    };

    // Organizar em estrutura hierárquica
    const buildTree = (nodes: any[], parentId: string | null = null): any[] => {
      return nodes
        .filter(node => node.parent_id === parentId)
        .map(node => ({
          ...node,
          children: buildTree(nodes, node.affiliate_id)
        }));
    };

    const hierarchicalNetwork = buildTree(processedNetwork);

    // Log da ação
    await auditLogger.logAction({
      adminId: req.admin!.id,
      action: 'view_network',
      resourceType: 'affiliate_network',
      details: { 
        affiliateId: affiliate_id || 'all',
        maxDepth: Number(max_depth),
        nodesCount: processedNetwork.length
      }
    });

    res.json({
      network: processedNetwork,
      hierarchical: hierarchicalNetwork,
      statistics: networkStats,
      metadata: {
        maxDepth: Number(max_depth),
        affiliateId: affiliate_id || null,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Erro ao buscar rede genealógica:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});