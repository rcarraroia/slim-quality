/**
 * Order Service
 * Sprint 3: Sistema de Vendas
 * 
 * Gerencia criação, consulta e atualização de pedidos
 */

import { supabase } from '@/config/supabase';
import { Logger } from '@/utils/logger';
import { crmIntegrationService } from '@/services/crm/integration.service';
import type {
  Order,
  OrderItem,
  OrderStatus,
  ShippingAddress,
  OrderStatusHistory,
  CreateOrderInput,
  UpdateOrderInput,
  ListOrdersInput,
  OrderResponse,
  ListResponse,
  ServiceResponse,
} from '@/types/sales.types';

export class OrderService {
  /**
   * Cria um novo pedido
   */
  async createOrder(
    userId: string,
    input: CreateOrderInput
  ): Promise<ServiceResponse<OrderResponse>> {
    try {
      Logger.info('OrderService', 'Criando pedido', { userId, itemsCount: input.items.length });

      // 1. Validar produtos e calcular total
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, sku, price_cents, stock_quantity, active')
        .in('id', input.items.map(item => item.product_id));

      if (productsError) {
        Logger.error('OrderService', 'Erro ao buscar produtos', productsError);
        return { success: false, error: 'Erro ao buscar produtos', code: 'PRODUCTS_ERROR' };
      }

      if (!products || products.length !== input.items.length) {
        return { success: false, error: 'Um ou mais produtos não encontrados', code: 'PRODUCTS_NOT_FOUND' };
      }

      // Validar produtos ativos e estoque
      for (const item of input.items) {
        const product = products.find(p => p.id === item.product_id);
        if (!product) {
          return { success: false, error: `Produto ${item.product_id} não encontrado`, code: 'PRODUCT_NOT_FOUND' };
        }
        if (!product.active) {
          return { success: false, error: `Produto ${product.name} não está disponível`, code: 'PRODUCT_INACTIVE' };
        }
        if (product.stock_quantity < item.quantity) {
          return { success: false, error: `Estoque insuficiente para ${product.name}`, code: 'INSUFFICIENT_STOCK' };
        }
      }

      // Calcular totais
      let subtotalCents = 0;
      const orderItems = input.items.map(item => {
        const product = products.find(p => p.id === item.product_id)!;
        const totalPrice = product.price_cents * item.quantity;
        subtotalCents += totalPrice;

        return {
          product_id: item.product_id,
          product_name: product.name,
          product_sku: product.sku,
          quantity: item.quantity,
          unit_price_cents: product.price_cents,
          total_price_cents: totalPrice,
        };
      });

      const shippingCents = 0; // TODO: Calcular frete
      const discountCents = 0; // TODO: Aplicar descontos
      const totalCents = subtotalCents + shippingCents - discountCents;

      // 2. Criar pedido (transaction)
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: userId,
          customer_name: input.customer.name,
          customer_email: input.customer.email,
          customer_phone: input.customer.phone,
          customer_cpf: input.customer.cpfCnpj,
          subtotal_cents: subtotalCents,
          shipping_cents: shippingCents,
          discount_cents: discountCents,
          total_cents: totalCents,
          status: 'pending' as OrderStatus,
          referral_code: input.referral_code,
          notes: input.notes,
        })
        .select()
        .single();

      if (orderError) {
        Logger.error('OrderService', 'Erro ao criar pedido', orderError);
        return { success: false, error: 'Erro ao criar pedido', code: 'ORDER_CREATE_ERROR' };
      }

      // 3. Criar items do pedido
      const itemsToInsert = orderItems.map(item => ({
        order_id: order.id,
        ...item,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(itemsToInsert);

      if (itemsError) {
        Logger.error('OrderService', 'Erro ao criar items', itemsError);
        // Rollback: deletar pedido
        await supabase.from('orders').delete().eq('id', order.id);
        return { success: false, error: 'Erro ao criar items do pedido', code: 'ORDER_ITEMS_ERROR' };
      }

      // 4. Criar endereço de entrega
      const { error: shippingError } = await supabase
        .from('shipping_addresses')
        .insert({
          order_id: order.id,
          recipient_name: input.shipping_address.recipient_name,
          street: input.shipping_address.street,
          number: input.shipping_address.number,
          complement: input.shipping_address.complement,
          neighborhood: input.shipping_address.neighborhood,
          city: input.shipping_address.city,
          state: input.shipping_address.state,
          postal_code: input.shipping_address.postal_code,
          phone: input.shipping_address.phone,
        });

      if (shippingError) {
        Logger.error('OrderService', 'Erro ao criar endereço', shippingError);
        // Rollback: deletar pedido e items
        await supabase.from('order_items').delete().eq('order_id', order.id);
        await supabase.from('orders').delete().eq('id', order.id);
        return { success: false, error: 'Erro ao criar endereço de entrega', code: 'SHIPPING_ADDRESS_ERROR' };
      }

      Logger.info('OrderService', 'Pedido criado com sucesso', {
        orderId: order.id,
        orderNumber: order.order_number,
        total: totalCents / 100,
      });

      // Buscar pedido completo
      const fullOrder = await this.getOrderById(order.id, userId);
      if (!fullOrder.success || !fullOrder.data) {
        return { success: false, error: 'Erro ao buscar pedido criado', code: 'ORDER_FETCH_ERROR' };
      }

      // Integração CRM: Registrar evento de pedido criado
      try {
        await crmIntegrationService.handleOrderCreated(fullOrder.data);
      } catch (error) {
        Logger.error('OrderService', 'Erro ao integrar com CRM (não crítico)', error as Error);
        // Não falhar a operação se integração CRM falhar
      }

      return { success: true, data: fullOrder.data };
    } catch (error) {
      Logger.error('OrderService', 'Erro inesperado ao criar pedido', error as Error);
      return { success: false, error: 'Erro inesperado ao criar pedido', code: 'UNEXPECTED_ERROR' };
    }
  }

  /**
   * Busca pedido por ID
   */
  async getOrderById(
    orderId: string,
    userId?: string
  ): Promise<ServiceResponse<OrderResponse>> {
    try {
      let query = supabase
        .from('orders')
        .select(`
          *,
          items:order_items(*),
          payment:payments(*),
          shipping_address:shipping_addresses(*)
        `)
        .eq('id', orderId)
        .is('deleted_at', null)
        .single();

      // Se userId fornecido, validar ownership
      if (userId) {
        query = query.eq('customer_id', userId);
      }

      const { data: order, error } = await query;

      if (error) {
        if (error.code === 'PGRST116') {
          return { success: false, error: 'Pedido não encontrado', code: 'ORDER_NOT_FOUND' };
        }
        Logger.error('OrderService', 'Erro ao buscar pedido', error);
        return { success: false, error: 'Erro ao buscar pedido', code: 'ORDER_FETCH_ERROR' };
      }

      // Converter para camelCase
      const orderResponse: OrderResponse = {
        ...order,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        deletedAt: order.deleted_at,
        items: order.items,
        payment: order.payment?.[0],
        shippingAddress: order.shipping_address?.[0],
      };

      return { success: true, data: orderResponse };
    } catch (error) {
      Logger.error('OrderService', 'Erro inesperado ao buscar pedido', error as Error);
      return { success: false, error: 'Erro inesperado', code: 'UNEXPECTED_ERROR' };
    }
  }

  /**
   * Lista pedidos do usuário
   */
  async getMyOrders(
    userId: string,
    filters?: ListOrdersInput
  ): Promise<ServiceResponse<ListResponse<OrderResponse>>> {
    try {
      const page = filters?.page || 1;
      const limit = filters?.limit || 20;
      const offset = (page - 1) * limit;

      let query = supabase
        .from('orders')
        .select(`
          *,
          items:order_items(*),
          payment:payments(*),
          shipping_address:shipping_addresses(*)
        `, { count: 'exact' })
        .eq('customer_id', userId)
        .is('deleted_at', null);

      // Aplicar filtros
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.order_number) {
        query = query.eq('order_number', filters.order_number);
      }
      if (filters?.date_from) {
        query = query.gte('created_at', filters.date_from);
      }
      if (filters?.date_to) {
        query = query.lte('created_at', filters.date_to);
      }

      // Ordenar e paginar
      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data: orders, error, count } = await query;

      if (error) {
        Logger.error('OrderService', 'Erro ao listar pedidos', error);
        return { success: false, error: 'Erro ao listar pedidos', code: 'ORDERS_LIST_ERROR' };
      }

      // Converter para camelCase
      const ordersResponse: OrderResponse[] = (orders || []).map(order => ({
        ...order,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        deletedAt: order.deleted_at,
        items: order.items,
        payment: order.payment?.[0],
        shippingAddress: order.shipping_address?.[0],
      }));

      return {
        success: true,
        data: {
          data: ordersResponse,
          pagination: {
            page,
            limit,
            total: count || 0,
            totalPages: Math.ceil((count || 0) / limit),
          },
        },
      };
    } catch (error) {
      Logger.error('OrderService', 'Erro inesperado ao listar pedidos', error as Error);
      return { success: false, error: 'Erro inesperado', code: 'UNEXPECTED_ERROR' };
    }
  }

  /**
   * Atualiza status do pedido
   */
  async updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    userId?: string,
    notes?: string
  ): Promise<ServiceResponse<OrderResponse>> {
    try {
      Logger.info('OrderService', 'Atualizando status do pedido', {
        orderId,
        newStatus,
        userId,
      });

      // 1. Buscar pedido atual
      const { data: currentOrder, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .is('deleted_at', null)
        .single();

      if (fetchError || !currentOrder) {
        return { success: false, error: 'Pedido não encontrado', code: 'ORDER_NOT_FOUND' };
      }

      const oldStatus = currentOrder.status;

      // 2. Validar transição de status
      const validTransitions: Record<OrderStatus, OrderStatus[]> = {
        pending: ['paid', 'cancelled'],
        paid: ['processing', 'cancelled'],
        processing: ['shipped', 'cancelled'],
        shipped: ['delivered', 'cancelled'],
        delivered: [],
        cancelled: [],
      };

      if (!validTransitions[oldStatus as OrderStatus]?.includes(newStatus)) {
        return {
          success: false,
          error: `Transição inválida: ${oldStatus} → ${newStatus}`,
          code: 'INVALID_STATUS_TRANSITION',
        };
      }

      // 3. Atualizar status
      const { data: updatedOrder, error: updateError } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId)
        .select()
        .single();

      if (updateError) {
        Logger.error('OrderService', 'Erro ao atualizar status', updateError);
        return { success: false, error: 'Erro ao atualizar status', code: 'STATUS_UPDATE_ERROR' };
      }

      // 4. Registrar no histórico
      const { error: historyError } = await supabase
        .from('order_status_history')
        .insert({
          order_id: orderId,
          from_status: oldStatus,
          to_status: newStatus,
          changed_by: userId,
          notes,
        });

      if (historyError) {
        Logger.error('OrderService', 'Erro ao registrar histórico', historyError);
        // Não falhar a operação por causa do histórico
      }

      Logger.info('OrderService', 'Status atualizado com sucesso', {
        orderId,
        oldStatus,
        newStatus,
      });

      // Buscar pedido completo
      const fullOrder = await this.getOrderById(orderId);
      if (!fullOrder.success || !fullOrder.data) {
        return { success: false, error: 'Erro ao buscar pedido atualizado', code: 'ORDER_FETCH_ERROR' };
      }

      // Integração CRM: Registrar mudança de status
      try {
        await crmIntegrationService.handleOrderStatusChanged(fullOrder.data, oldStatus as OrderStatus, newStatus);
      } catch (error) {
        Logger.error('OrderService', 'Erro ao integrar mudança de status com CRM (não crítico)', error as Error);
        // Não falhar a operação se integração CRM falhar
      }

      return { success: true, data: fullOrder.data };
    } catch (error) {
      Logger.error('OrderService', 'Erro inesperado ao atualizar status', error as Error);
      return { success: false, error: 'Erro inesperado', code: 'UNEXPECTED_ERROR' };
    }
  }

  /**
   * Cancela pedido
   */
  async cancelOrder(
    orderId: string,
    userId: string,
    reason?: string
  ): Promise<ServiceResponse<OrderResponse>> {
    try {
      Logger.info('OrderService', 'Cancelando pedido', { orderId, userId, reason });

      // 1. Buscar pedido
      const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .eq('customer_id', userId)
        .is('deleted_at', null)
        .single();

      if (fetchError || !order) {
        return { success: false, error: 'Pedido não encontrado', code: 'ORDER_NOT_FOUND' };
      }

      // 2. Validar se pode cancelar
      const cancellableStatuses: OrderStatus[] = ['pending', 'paid', 'processing'];
      if (!cancellableStatuses.includes(order.status as OrderStatus)) {
        return {
          success: false,
          error: `Pedido não pode ser cancelado no status: ${order.status}`,
          code: 'CANNOT_CANCEL',
        };
      }

      // 3. Atualizar status para cancelled
      return await this.updateOrderStatus(orderId, 'cancelled', userId, reason);
    } catch (error) {
      Logger.error('OrderService', 'Erro inesperado ao cancelar pedido', error as Error);
      return { success: false, error: 'Erro inesperado', code: 'UNEXPECTED_ERROR' };
    }
  }

  /**
   * Lista todos os pedidos (admin)
   */
  async getAllOrders(
    filters?: ListOrdersInput
  ): Promise<ServiceResponse<ListResponse<OrderResponse>>> {
    try {
      const page = filters?.page || 1;
      const limit = filters?.limit || 20;
      const offset = (page - 1) * limit;

      let query = supabase
        .from('orders')
        .select(`
          *,
          items:order_items(*),
          payment:payments(*),
          shipping_address:shipping_addresses(*)
        `, { count: 'exact' })
        .is('deleted_at', null);

      // Aplicar filtros
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.customer_id) {
        query = query.eq('customer_id', filters.customer_id);
      }
      if (filters?.order_number) {
        query = query.eq('order_number', filters.order_number);
      }
      if (filters?.date_from) {
        query = query.gte('created_at', filters.date_from);
      }
      if (filters?.date_to) {
        query = query.lte('created_at', filters.date_to);
      }

      // Ordenar e paginar
      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data: orders, error, count } = await query;

      if (error) {
        Logger.error('OrderService', 'Erro ao listar todos os pedidos', error);
        return { success: false, error: 'Erro ao listar pedidos', code: 'ORDERS_LIST_ERROR' };
      }

      // Converter para camelCase
      const ordersResponse: OrderResponse[] = (orders || []).map(order => ({
        ...order,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        deletedAt: order.deleted_at,
        items: order.items,
        payment: order.payment?.[0],
        shippingAddress: order.shipping_address?.[0],
      }));

      return {
        success: true,
        data: {
          data: ordersResponse,
          pagination: {
            page,
            limit,
            total: count || 0,
            totalPages: Math.ceil((count || 0) / limit),
          },
        },
      };
    } catch (error) {
      Logger.error('OrderService', 'Erro inesperado ao listar todos os pedidos', error as Error);
      return { success: false, error: 'Erro inesperado', code: 'UNEXPECTED_ERROR' };
    }
  }

  /**
   * Busca histórico de status do pedido
   */
  async getOrderStatusHistory(
    orderId: string
  ): Promise<ServiceResponse<OrderStatusHistory[]>> {
    try {
      const { data: history, error } = await supabase
        .from('order_status_history')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      if (error) {
        Logger.error('OrderService', 'Erro ao buscar histórico', error);
        return { success: false, error: 'Erro ao buscar histórico', code: 'HISTORY_FETCH_ERROR' };
      }

      return { success: true, data: history || [] };
    } catch (error) {
      Logger.error('OrderService', 'Erro inesperado ao buscar histórico', error as Error);
      return { success: false, error: 'Erro inesperado', code: 'UNEXPECTED_ERROR' };
    }
  }

  /**
   * Calcula estatísticas de pedidos (admin)
   */
  async getOrderStats(): Promise<ServiceResponse<{
    totalOrders: number;
    totalRevenue: number;
    ordersByStatus: Record<OrderStatus, number>;
    revenueByMonth: Array<{ month: string; revenue: number }>;
  }>> {
    try {
      // Total de pedidos
      const { count: totalOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null);

      // Receita total (apenas pedidos pagos)
      const { data: paidOrders } = await supabase
        .from('orders')
        .select('total_cents')
        .in('status', ['paid', 'processing', 'shipped', 'delivered'])
        .is('deleted_at', null);

      const totalRevenue = (paidOrders || []).reduce((sum, order) => sum + order.total_cents, 0) / 100;

      // Pedidos por status
      const { data: ordersByStatusData } = await supabase
        .from('orders')
        .select('status')
        .is('deleted_at', null);

      const ordersByStatus = (ordersByStatusData || []).reduce((acc, order) => {
        acc[order.status as OrderStatus] = (acc[order.status as OrderStatus] || 0) + 1;
        return acc;
      }, {} as Record<OrderStatus, number>);

      // Receita por mês (últimos 12 meses)
      const { data: revenueData } = await supabase
        .from('orders')
        .select('created_at, total_cents')
        .in('status', ['paid', 'processing', 'shipped', 'delivered'])
        .is('deleted_at', null)
        .gte('created_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString());

      const revenueByMonth = (revenueData || []).reduce((acc, order) => {
        const month = new Date(order.created_at).toISOString().slice(0, 7); // YYYY-MM
        const existing = acc.find(item => item.month === month);
        if (existing) {
          existing.revenue += order.total_cents / 100;
        } else {
          acc.push({ month, revenue: order.total_cents / 100 });
        }
        return acc;
      }, [] as Array<{ month: string; revenue: number }>);

      return {
        success: true,
        data: {
          totalOrders: totalOrders || 0,
          totalRevenue,
          ordersByStatus,
          revenueByMonth: revenueByMonth.sort((a, b) => a.month.localeCompare(b.month)),
        },
      };
    } catch (error) {
      Logger.error('OrderService', 'Erro inesperado ao calcular estatísticas', error as Error);
      return { success: false, error: 'Erro inesperado', code: 'UNEXPECTED_ERROR' };
    }
  }
}

export const orderService = new OrderService();
