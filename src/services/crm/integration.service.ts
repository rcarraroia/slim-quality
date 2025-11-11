/**
 * CRM Integration Service
 * Sprint 5: Sistema de CRM - Fase 4
 * 
 * Integra o CRM com sistemas existentes:
 * - Sistema de Vendas (Orders)
 * - Sistema de Afiliados
 * - Sincronização automática de dados
 * - Eventos cross-system
 */

import { supabase } from '@/config/supabase';
import { Logger } from '@/utils/logger';
import { TimelineService } from './timeline.service';
import { TagService } from './tag.service';
import { CustomerService } from './customer.service';
import type { OrderResponse, OrderStatus } from '@/types/sales.types';
import type { Affiliate } from '@/types/affiliate.types';

export class CRMIntegrationService {
  private timelineService: TimelineService;
  private tagService: TagService;
  private customerService: CustomerService;

  constructor() {
    this.timelineService = new TimelineService();
    this.tagService = new TagService();
    this.customerService = new CustomerService();
  }

  /**
   * Processa evento de pedido criado
   * Integração: Sistema de Vendas → CRM
   */
  async handleOrderCreated(order: OrderResponse): Promise<void> {
    try {
      Logger.info('CRMIntegrationService', 'Processing order created event', {
        orderId: order.id,
        customerId: order.customer_id,
        total: order.total_cents / 100,
      });

      // 1. Buscar ou criar cliente no CRM
      let customer = await this.customerService.findByContact(
        order.customer_email,
        order.customer_phone
      );

      if (!customer) {
        // Criar cliente automaticamente
        const createResult = await this.customerService.create({
          name: order.customer_name,
          email: order.customer_email,
          phone: order.customer_phone,
          document: order.customer_cpf,
          source: 'order',
          notes: `Cliente criado automaticamente via pedido #${order.order_number}`,
        });

        if (createResult) {
          customer = createResult;
        } else {
          Logger.error('CRMIntegrationService', 'Failed to create customer from order');
          return;
        }
      }

      // 2. Registrar evento na timeline
      await this.timelineService.logEvent(customer.id, {
        event_type: 'order_created',
        title: `Pedido #${order.order_number} realizado`,
        description: `Pedido no valor de R$ ${(order.total_cents / 100).toFixed(2)}`,
        metadata: {
          order_id: order.id,
          order_number: order.order_number,
          total_cents: order.total_cents,
          status: order.status,
          items_count: order.items?.length || 0,
        },
      });

      // 3. Aplicar tag "Cliente Ativo" se for primeira compra
      const { data: previousOrders } = await supabase
        .from('orders')
        .select('id')
        .eq('customer_id', order.customer_id)
        .neq('id', order.id)
        .is('deleted_at', null);

      if (!previousOrders || previousOrders.length === 0) {
        // Primeira compra - aplicar tag
        const activeTag = await this.tagService.findOrCreateTag({
          name: 'Cliente Ativo',
          color: '#10B981',
          description: 'Cliente que realizou pelo menos uma compra',
          category: 'status',
        });

        if (activeTag) {
          await this.customerService.addTag(customer.id, activeTag.id);
        }
      }

      // 4. Se houver código de indicação, aplicar tag de indicação
      if (order.referral_code) {
        const referralTag = await this.tagService.findOrCreateTag({
          name: 'Indicação',
          color: '#8B5CF6',
          description: 'Cliente veio por indicação de afiliado',
          category: 'origem',
        });

        if (referralTag) {
          await this.customerService.addTag(customer.id, referralTag.id);
        }

        // Registrar origem na timeline
        await this.timelineService.logEvent(customer.id, {
          event_type: 'referral_identified',
          title: 'Cliente indicado por afiliado',
          description: `Código de indicação: ${order.referral_code}`,
          metadata: {
            referral_code: order.referral_code,
            order_id: order.id,
          },
        });
      }

      Logger.info('CRMIntegrationService', 'Order created event processed successfully', {
        customerId: customer.id,
        orderId: order.id,
      });
    } catch (error) {
      Logger.error('CRMIntegrationService', 'Error processing order created event', error as Error);
    }
  }

  /**
   * Processa evento de mudança de status do pedido
   * Integração: Sistema de Vendas → CRM
   */
  async handleOrderStatusChanged(
    order: OrderResponse,
    oldStatus: OrderStatus,
    newStatus: OrderStatus
  ): Promise<void> {
    try {
      Logger.info('CRMIntegrationService', 'Processing order status changed', {
        orderId: order.id,
        oldStatus,
        newStatus,
      });

      // Buscar cliente
      const customer = await this.customerService.findByContact(
        order.customer_email,
        order.customer_phone
      );

      if (!customer) {
        Logger.warn('CRMIntegrationService', 'Customer not found for order status change', {
          orderId: order.id,
        });
        return;
      }

      // Mapear status para eventos da timeline
      const statusEventMap: Record<OrderStatus, { title: string; description: string }> = {
        pending: {
          title: 'Pedido aguardando pagamento',
          description: 'Pedido criado e aguardando confirmação de pagamento',
        },
        paid: {
          title: 'Pagamento confirmado',
          description: 'Pagamento do pedido foi confirmado',
        },
        processing: {
          title: 'Pedido em processamento',
          description: 'Pedido está sendo preparado para envio',
        },
        shipped: {
          title: 'Pedido enviado',
          description: 'Pedido foi enviado para entrega',
        },
        delivered: {
          title: 'Pedido entregue',
          description: 'Pedido foi entregue ao cliente',
        },
        cancelled: {
          title: 'Pedido cancelado',
          description: 'Pedido foi cancelado',
        },
      };

      const eventInfo = statusEventMap[newStatus];

      // Registrar mudança de status na timeline
      await this.timelineService.logEvent(customer.id, {
        event_type: 'order_status_changed',
        title: `${eventInfo.title} - Pedido #${order.order_number}`,
        description: eventInfo.description,
        metadata: {
          order_id: order.id,
          order_number: order.order_number,
          old_status: oldStatus,
          new_status: newStatus,
        },
      });

      // Se pedido foi entregue, aplicar tag "Cliente Satisfeito"
      if (newStatus === 'delivered') {
        const satisfiedTag = await this.tagService.findOrCreateTag({
          name: 'Cliente Satisfeito',
          color: '#10B981',
          description: 'Cliente recebeu pedido com sucesso',
          category: 'status',
        });

        if (satisfiedTag) {
          await this.customerService.addTag(customer.id, satisfiedTag.id);
        }
      }

      Logger.info('CRMIntegrationService', 'Order status changed event processed', {
        customerId: customer.id,
        orderId: order.id,
        newStatus,
      });
    } catch (error) {
      Logger.error('CRMIntegrationService', 'Error processing order status change', error as Error);
    }
  }

  /**
   * Calcula LTV (Lifetime Value) do cliente
   * Integração: Sistema de Vendas → CRM
   */
  async calculateCustomerLTV(customerId: string): Promise<number> {
    try {
      // Buscar todos os pedidos pagos do cliente
      const { data: orders } = await supabase
        .from('orders')
        .select('total_cents')
        .eq('customer_id', customerId)
        .in('status', ['paid', 'processing', 'shipped', 'delivered'])
        .is('deleted_at', null);

      if (!orders || orders.length === 0) {
        return 0;
      }

      const totalCents = orders.reduce((sum, order) => sum + order.total_cents, 0);
      return totalCents / 100; // Retornar em reais
    } catch (error) {
      Logger.error('CRMIntegrationService', 'Error calculating customer LTV', error as Error);
      return 0;
    }
  }

  /**
   * Calcula métricas de compra do cliente
   * Integração: Sistema de Vendas → CRM
   */
  async calculateCustomerMetrics(customerId: string): Promise<{
    totalOrders: number;
    totalSpent: number;
    averageOrderValue: number;
    lastOrderDate: string | null;
    daysSinceLastOrder: number | null;
  }> {
    try {
      const { data: orders } = await supabase
        .from('orders')
        .select('total_cents, created_at')
        .eq('customer_id', customerId)
        .in('status', ['paid', 'processing', 'shipped', 'delivered'])
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (!orders || orders.length === 0) {
        return {
          totalOrders: 0,
          totalSpent: 0,
          averageOrderValue: 0,
          lastOrderDate: null,
          daysSinceLastOrder: null,
        };
      }

      const totalSpent = orders.reduce((sum, order) => sum + order.total_cents, 0) / 100;
      const lastOrderDate = orders[0].created_at;
      const daysSinceLastOrder = Math.floor(
        (Date.now() - new Date(lastOrderDate).getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        totalOrders: orders.length,
        totalSpent,
        averageOrderValue: totalSpent / orders.length,
        lastOrderDate,
        daysSinceLastOrder,
      };
    } catch (error) {
      Logger.error('CRMIntegrationService', 'Error calculating customer metrics', error as Error);
      return {
        totalOrders: 0,
        totalSpent: 0,
        averageOrderValue: 0,
        lastOrderDate: null,
        daysSinceLastOrder: null,
      };
    }
  }

  /**
   * Processa cadastro de afiliado
   * Integração: Sistema de Afiliados → CRM
   */
  async handleAffiliateCreated(affiliate: Affiliate): Promise<void> {
    try {
      Logger.info('CRMIntegrationService', 'Processing affiliate created event', {
        affiliateId: affiliate.id,
        email: affiliate.email,
      });

      // 1. Buscar ou criar cliente no CRM
      let customer = await this.customerService.findByContact(
        affiliate.email,
        affiliate.phone
      );

      if (!customer) {
        // Criar cliente automaticamente
        const createResult = await this.customerService.create({
          name: affiliate.name,
          email: affiliate.email,
          phone: affiliate.phone,
          document: affiliate.cpf_cnpj,
          source: 'affiliate',
          notes: `Afiliado cadastrado - Código: ${affiliate.referral_code}`,
        });

        if (createResult) {
          customer = createResult;
        } else {
          Logger.error('CRMIntegrationService', 'Failed to create customer from affiliate');
          return;
        }
      }

      // 2. Aplicar tag "Afiliado"
      const affiliateTag = await this.tagService.findOrCreateTag({
        name: 'Afiliado',
        color: '#F59E0B',
        description: 'Cliente que também é afiliado',
        category: 'tipo',
      });

      if (affiliateTag) {
        await this.customerService.addTag(customer.id, affiliateTag.id);
      }

      // 3. Registrar evento na timeline
      await this.timelineService.logEvent(customer.id, {
        event_type: 'affiliate_registered',
        title: 'Cadastrado como afiliado',
        description: `Código de indicação: ${affiliate.referral_code}`,
        metadata: {
          affiliate_id: affiliate.id,
          referral_code: affiliate.referral_code,
          wallet_id: affiliate.wallet_id,
          status: affiliate.status,
        },
      });

      // 4. Se foi indicado por outro afiliado, registrar
      if (affiliate.referred_by) {
        await this.timelineService.logEvent(customer.id, {
          event_type: 'referred_by_affiliate',
          title: 'Indicado por outro afiliado',
          description: 'Cliente foi indicado por outro afiliado da rede',
          metadata: {
            referred_by: affiliate.referred_by,
          },
        });

        const referredTag = await this.tagService.findOrCreateTag({
          name: 'Afiliado Indicado',
          color: '#8B5CF6',
          description: 'Afiliado que foi indicado por outro afiliado',
          category: 'origem',
        });

        if (referredTag) {
          await this.customerService.addTag(customer.id, referredTag.id);
        }
      }

      Logger.info('CRMIntegrationService', 'Affiliate created event processed', {
        customerId: customer.id,
        affiliateId: affiliate.id,
      });
    } catch (error) {
      Logger.error('CRMIntegrationService', 'Error processing affiliate created', error as Error);
    }
  }

  /**
   * Processa mudança de status do afiliado
   * Integração: Sistema de Afiliados → CRM
   */
  async handleAffiliateStatusChanged(
    affiliate: Affiliate,
    oldStatus: string,
    newStatus: string
  ): Promise<void> {
    try {
      Logger.info('CRMIntegrationService', 'Processing affiliate status changed', {
        affiliateId: affiliate.id,
        oldStatus,
        newStatus,
      });

      // Buscar cliente
      const customer = await this.customerService.findByContact(
        affiliate.email,
        affiliate.phone
      );

      if (!customer) {
        Logger.warn('CRMIntegrationService', 'Customer not found for affiliate status change');
        return;
      }

      // Registrar mudança de status na timeline
      await this.timelineService.logEvent(customer.id, {
        event_type: 'affiliate_status_changed',
        title: `Status de afiliado alterado: ${newStatus}`,
        description: `Status mudou de ${oldStatus} para ${newStatus}`,
        metadata: {
          affiliate_id: affiliate.id,
          old_status: oldStatus,
          new_status: newStatus,
        },
      });

      // Aplicar/remover tags baseado no status
      if (newStatus === 'active') {
        const activeTag = await this.tagService.findOrCreateTag({
          name: 'Afiliado Ativo',
          color: '#10B981',
          description: 'Afiliado com status ativo',
          category: 'status',
        });

        if (activeTag) {
          await this.customerService.addTag(customer.id, activeTag.id);
        }
      } else if (newStatus === 'inactive') {
        // Remover tag de ativo se existir
        const { data: tags } = await supabase
          .from('crm_tags')
          .select('id')
          .eq('name', 'Afiliado Ativo')
          .single();

        if (tags) {
          await this.customerService.removeTag(customer.id, tags.id);
        }
      }

      Logger.info('CRMIntegrationService', 'Affiliate status changed event processed', {
        customerId: customer.id,
        affiliateId: affiliate.id,
      });
    } catch (error) {
      Logger.error('CRMIntegrationService', 'Error processing affiliate status change', error as Error);
    }
  }

  /**
   * Identifica origem do cliente (orgânico, afiliado, etc)
   * Integração: Sistema de Afiliados → CRM
   */
  async identifyCustomerSource(customerId: string): Promise<{
    source: 'organic' | 'affiliate' | 'n8n' | 'order' | 'unknown';
    referralCode?: string;
    affiliateId?: string;
  }> {
    try {
      // Buscar cliente
      const customer = await this.customerService.findById(customerId);
      if (!customer) {
        return { source: 'unknown' };
      }

      // Verificar se tem código de indicação em pedidos
      const { data: orderWithReferral } = await supabase
        .from('orders')
        .select('referral_code')
        .eq('customer_id', customerId)
        .not('referral_code', 'is', null)
        .limit(1)
        .single();

      if (orderWithReferral?.referral_code) {
        // Buscar afiliado pelo código
        const { data: affiliate } = await supabase
          .from('affiliates')
          .select('id')
          .eq('referral_code', orderWithReferral.referral_code)
          .single();

        return {
          source: 'affiliate',
          referralCode: orderWithReferral.referral_code,
          affiliateId: affiliate?.id,
        };
      }

      // Verificar origem no registro do cliente
      if (customer.source) {
        return {
          source: customer.source as any,
        };
      }

      return { source: 'organic' };
    } catch (error) {
      Logger.error('CRMIntegrationService', 'Error identifying customer source', error as Error);
      return { source: 'unknown' };
    }
  }

  /**
   * Gera relatório de conversão por fonte
   * Integração: Sistema de Afiliados → CRM
   */
  async generateConversionReport(startDate?: Date, endDate?: Date): Promise<{
    bySource: Record<string, { customers: number; orders: number; revenue: number }>;
    byAffiliate: Array<{
      affiliateId: string;
      affiliateName: string;
      referralCode: string;
      customers: number;
      orders: number;
      revenue: number;
    }>;
  }> {
    try {
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 dias atrás
      const end = endDate || new Date();

      // Conversões por fonte
      const { data: customers } = await supabase
        .from('crm_customers')
        .select('id, source')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .is('deleted_at', null);

      const bySource: Record<string, { customers: number; orders: number; revenue: number }> = {};

      for (const customer of customers || []) {
        const source = customer.source || 'unknown';
        if (!bySource[source]) {
          bySource[source] = { customers: 0, orders: 0, revenue: 0 };
        }
        bySource[source].customers++;

        // Buscar pedidos do cliente
        const { data: orders } = await supabase
          .from('orders')
          .select('total_cents')
          .eq('customer_id', customer.id)
          .in('status', ['paid', 'processing', 'shipped', 'delivered'])
          .is('deleted_at', null);

        if (orders) {
          bySource[source].orders += orders.length;
          bySource[source].revenue += orders.reduce((sum, o) => sum + o.total_cents, 0) / 100;
        }
      }

      // Conversões por afiliado
      const { data: affiliateOrders } = await supabase
        .from('orders')
        .select('referral_code, total_cents, customer_id')
        .not('referral_code', 'is', null)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .in('status', ['paid', 'processing', 'shipped', 'delivered'])
        .is('deleted_at', null);

      const affiliateMap = new Map<string, {
        customers: Set<string>;
        orders: number;
        revenue: number;
      }>();

      for (const order of affiliateOrders || []) {
        if (!affiliateMap.has(order.referral_code)) {
          affiliateMap.set(order.referral_code, {
            customers: new Set(),
            orders: 0,
            revenue: 0,
          });
        }

        const stats = affiliateMap.get(order.referral_code)!;
        stats.customers.add(order.customer_id);
        stats.orders++;
        stats.revenue += order.total_cents / 100;
      }

      // Buscar informações dos afiliados
      const byAffiliate = [];
      for (const [referralCode, stats] of affiliateMap.entries()) {
        const { data: affiliate } = await supabase
          .from('affiliates')
          .select('id, name')
          .eq('referral_code', referralCode)
          .single();

        if (affiliate) {
          byAffiliate.push({
            affiliateId: affiliate.id,
            affiliateName: affiliate.name,
            referralCode,
            customers: stats.customers.size,
            orders: stats.orders,
            revenue: stats.revenue,
          });
        }
      }

      return { bySource, byAffiliate };
    } catch (error) {
      Logger.error('CRMIntegrationService', 'Error generating conversion report', error as Error);
      return { bySource: {}, byAffiliate: [] };
    }
  }

  /**
   * Sincroniza dados de cliente entre sistemas
   * Garante consistência entre CRM, Vendas e Afiliados
   */
  async syncCustomerData(customerId: string): Promise<void> {
    try {
      Logger.info('CRMIntegrationService', 'Syncing customer data', { customerId });

      // Buscar cliente no CRM
      const customer = await this.customerService.findById(customerId);
      if (!customer) {
        Logger.warn('CRMIntegrationService', 'Customer not found for sync');
        return;
      }

      // Atualizar métricas de vendas
      const metrics = await this.calculateCustomerMetrics(customerId);
      
      // Atualizar preferências do cliente com métricas
      await supabase
        .from('crm_customers')
        .update({
          preferences: {
            ...customer.preferences,
            metrics: {
              total_orders: metrics.totalOrders,
              total_spent: metrics.totalSpent,
              average_order_value: metrics.averageOrderValue,
              last_order_date: metrics.lastOrderDate,
              days_since_last_order: metrics.daysSinceLastOrder,
              ltv: await this.calculateCustomerLTV(customerId),
            },
          },
        })
        .eq('id', customerId);

      // Identificar e atualizar origem
      const source = await this.identifyCustomerSource(customerId);
      if (source.source !== 'unknown' && customer.source !== source.source) {
        await supabase
          .from('crm_customers')
          .update({ source: source.source })
          .eq('id', customerId);
      }

      Logger.info('CRMIntegrationService', 'Customer data synced successfully', {
        customerId,
        metrics,
        source: source.source,
      });
    } catch (error) {
      Logger.error('CRMIntegrationService', 'Error syncing customer data', error as Error);
    }
  }
}

export const crmIntegrationService = new CRMIntegrationService();
