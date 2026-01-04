/**
 * SupabaseService - Serviço para acesso aos dados reais
 * CORREÇÃO URGENTE: Usar nomes REAIS das colunas do banco
 * 
 * ⚠️ COLUNAS REAIS VERIFICADAS:
 * - orders.total_cents (nome correto da coluna)
 * - orders.customer_name (já existe na tabela)
 * - orders.customer_email (já existe na tabela)
 * - orders.customer_phone (já existe na tabela)
 */

import { supabase } from '@/config/supabase';

export interface Order {
  id: string;
  created_at: string;
  total_cents: number;  // NOME REAL DA COLUNA
  status: 'pending' | 'paid' | 'cancelled';
  customer_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  order_items?: {
    product_name: string;
  }[];
}

export interface Sale extends Order {
  status: 'paid'; // Vendas são APENAS pedidos pagos
}

export interface DashboardMetrics {
  // PEDIDOS (todos os status)
  pedidos_realizados: number;
  pedidos_pendentes: number;
  pedidos_cancelados: number;
  
  // VENDAS (apenas 'paid')
  vendas_confirmadas: number;
  valor_vendas_mes: number;
  ticket_medio: number;
  taxa_conversao: number;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

export interface Product {
  id: string;
  name: string;
  price_cents: number;
  is_active: boolean;
}

export class SupabaseService {
  /**
   * Valida conexão com Supabase
   */
  static async validateConnection(): Promise<boolean> {
    try {
      console.log('🔍 Validando conexão com Supabase...');
      
      const { data, error } = await supabase
        .from('orders')
        .select('id')
        .limit(1);
      
      if (error) {
        console.error('❌ Erro na validação:', error);
        return false;
      }
      
      console.log('✅ Conexão com Supabase validada');
      return true;
    } catch (error) {
      console.error('💥 Erro geral na validação:', error);
      return false;
    }
  }

  /**
   * Busca TODOS os pedidos (independente do status)
   */
  static async getAllOrders(limit?: number): Promise<Order[]> {
    try {
      console.log('📦 Buscando todos os pedidos...');
      
      const operation = async () => {
        let query = supabase
          .from('orders')
          .select(`
            id,
            created_at,
            total_cents,
            status,
            customer_id,
            customer_name,
            customer_email,
            customer_phone,
            order_items(product_name)
          `)
          .order('created_at', { ascending: false });
        
        if (limit && limit > 0) {
          query = query.limit(limit);
        }
        
        return await query;
      };

      const { data, error } = await this.withRetry(operation);
      
      if (error) {
        console.error('❌ Erro ao buscar pedidos:', error);
        throw error;
      }
      
      // Validar dados antes de retornar
      if (!Array.isArray(data)) {
        console.warn('⚠️ Dados de pedidos não são um array válido');
        return [];
      }

      const validOrders = data.filter(order => this.validateOrder(order));
      const invalidCount = data.length - validOrders.length;
      
      if (invalidCount > 0) {
        console.warn(`⚠️ ${invalidCount} pedidos inválidos foram filtrados`);
        // Log para auditoria
        console.log('🔍 Auditoria de pedidos:', {
          total_recebidos: data.length,
          validos: validOrders.length,
          invalidos: invalidCount,
          timestamp: new Date().toISOString()
        });
      }
      
      console.log(`✅ ${validOrders.length} pedidos válidos carregados`);
      return validOrders;
    } catch (error) {
      console.error('💥 Erro geral ao buscar pedidos:', error);
      // Log de erro para auditoria
      console.error('🔍 Detalhes do erro getAllOrders:', {
        limit,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString()
      });
      return [];
    }
  }

  /**
   * Busca APENAS vendas confirmadas (status 'paid')
   */
  static async getSalesOnly(limit?: number): Promise<Sale[]> {
    try {
      console.log('💰 Buscando apenas vendas confirmadas (status paid)...');
      
      const operation = async () => {
        let query = supabase
          .from('orders')
          .select(`
            id,
            created_at,
            total_cents,
            status,
            customer_id,
            customer_name,
            customer_email,
            customer_phone,
            order_items(product_name)
          `)
          .eq('status', 'paid') // FILTRO CRÍTICO: apenas vendas pagas
          .order('created_at', { ascending: false });
        
        if (limit && limit > 0) {
          query = query.limit(limit);
        }
        
        return await query;
      };

      const { data, error } = await this.withRetry(operation);
      
      if (error) {
        console.error('❌ Erro ao buscar vendas:', error);
        throw error;
      }
      
      // Validar dados antes de retornar
      if (!Array.isArray(data)) {
        console.warn('⚠️ Dados de vendas não são um array válido');
        return [];
      }

      const validSales = data.filter(order => {
        const isValid = this.validateOrder(order);
        const isPaid = order.status === 'paid';
        
        if (isValid && !isPaid) {
          console.warn('⚠️ Venda com status incorreto filtrada:', order.id, order.status);
        }
        
        return isValid && isPaid;
      });
      
      const invalidCount = data.length - validSales.length;
      
      if (invalidCount > 0) {
        console.warn(`⚠️ ${invalidCount} vendas inválidas foram filtradas`);
        // Log para auditoria
        console.log('🔍 Auditoria de vendas:', {
          total_recebidas: data.length,
          validas: validSales.length,
          invalidas: invalidCount,
          timestamp: new Date().toISOString()
        });
      }
      
      console.log(`✅ ${validSales.length} vendas confirmadas válidas carregadas`);
      return validSales as Sale[];
    } catch (error) {
      console.error('💥 Erro geral ao buscar vendas:', error);
      // Log de erro para auditoria
      console.error('🔍 Detalhes do erro getSalesOnly:', {
        limit,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString()
      });
      return [];
    }
  }

  /**
   * Calcula métricas do dashboard com separação correta
   */
  static async getDashboardMetrics(periodo: 'mes' | 'trimestre' | 'ano' = 'mes'): Promise<DashboardMetrics> {
    try {
      console.log(`📊 Calculando métricas do dashboard (período: ${periodo})...`);
      
      // Validar parâmetro de período
      if (!['mes', 'trimestre', 'ano'].includes(periodo)) {
        console.warn('⚠️ Período inválido, usando "mes" como padrão');
        periodo = 'mes';
      }
      
      // Calcular período
      const now = new Date();
      const startDate = new Date();
      
      switch (periodo) {
        case 'mes':
          startDate.setDate(1);
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'trimestre':
          startDate.setMonth(now.getMonth() - 3);
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'ano':
          startDate.setMonth(0, 1);
          startDate.setHours(0, 0, 0, 0);
          break;
      }
      
      // Log da consulta para auditoria
      console.log(`🔍 Buscando pedidos desde: ${startDate.toISOString()}`);
      
      // Buscar TODOS os pedidos do período com retry
      const { data: allOrders, error: ordersError } = await this.withRetry(async () => {
        return await supabase
          .from('orders')
          .select('id, status, total_cents')
          .gte('created_at', startDate.toISOString());
      });
      
      if (ordersError) {
        console.error('❌ Erro ao buscar pedidos para métricas:', ordersError);
        throw ordersError;
      }
      
      // Validar dados recebidos
      if (!Array.isArray(allOrders)) {
        console.warn('⚠️ Dados de pedidos inválidos, usando array vazio');
        const metricasVazias = this.validateMetrics({
          pedidos_realizados: 0,
          pedidos_pendentes: 0,
          pedidos_cancelados: 0,
          vendas_confirmadas: 0,
          valor_vendas_mes: 0,
          ticket_medio: 0,
          taxa_conversao: 0
        });
        return metricasVazias;
      }
      
      // Filtrar e validar pedidos
      const pedidosValidos = allOrders.filter(order => {
        if (!this.validateOrderForMetrics(order)) {
          console.warn('⚠️ Pedido inválido filtrado:', order?.id);
          return false;
        }
        return true;
      });
      
      console.log(`📊 ${pedidosValidos.length}/${allOrders.length} pedidos válidos para métricas`);
      
      // Separar por status
      const pedidosPendentes = pedidosValidos.filter(o => o.status === 'pending');
      const vendasConfirmadas = pedidosValidos.filter(o => o.status === 'paid');
      const pedidosCancelados = pedidosValidos.filter(o => o.status === 'cancelled');
      
      // Calcular valores (apenas vendas pagas) com validação
      const valorVendasMes = vendasConfirmadas.reduce((acc, venda) => {
        const valor = this.convertCentsToReais(venda.total_cents);
        return acc + valor;
      }, 0);
      
      // Ticket médio (apenas vendas pagas) com validação de divisão por zero
      const ticketMedio = vendasConfirmadas.length > 0 
        ? valorVendasMes / vendasConfirmadas.length 
        : 0;
      
      // Taxa de conversão (vendas pagas / total pedidos) com validação
      const totalPedidos = pedidosValidos.length;
      const taxaConversao = totalPedidos > 0 
        ? (vendasConfirmadas.length / totalPedidos) * 100 
        : 0;
      
      const metricas: DashboardMetrics = {
        // PEDIDOS (todos)
        pedidos_realizados: totalPedidos,
        pedidos_pendentes: pedidosPendentes.length,
        pedidos_cancelados: pedidosCancelados.length,
        
        // VENDAS (apenas 'paid')
        vendas_confirmadas: vendasConfirmadas.length,
        valor_vendas_mes: valorVendasMes,
        ticket_medio: ticketMedio,
        taxa_conversao: taxaConversao
      };
      
      // Validar e sanitizar métricas antes de retornar
      const metricasValidadas = this.validateMetrics(metricas);
      
      // Log para auditoria
      console.log('✅ Métricas calculadas e validadas:', {
        periodo,
        total_pedidos_brutos: allOrders.length,
        pedidos_validos: pedidosValidos.length,
        metricas: metricasValidadas
      });
      
      return metricasValidadas;
      
    } catch (error) {
      console.error('💥 Erro ao calcular métricas:', error);
      
      // Log de erro para auditoria
      console.error('🔍 Detalhes do erro:', {
        periodo,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      return this.validateMetrics({
        pedidos_realizados: 0,
        pedidos_pendentes: 0,
        pedidos_cancelados: 0,
        vendas_confirmadas: 0,
        valor_vendas_mes: 0,
        ticket_medio: 0,
        taxa_conversao: 0
      });
    }
  }

  /**
   * Valida dados de pedido antes de processar
   */
  static validateOrder(order: any): boolean {
    if (!order || typeof order !== 'object') {
      console.warn('⚠️ Pedido inválido: não é um objeto');
      return false;
    }

    if (!order.id || typeof order.id !== 'string') {
      console.warn('⚠️ Pedido inválido: ID ausente ou inválido');
      return false;
    }

    if (typeof order.total_cents !== 'number' || order.total_cents < 0) {
      console.warn('⚠️ Pedido inválido: total_cents ausente ou negativo');
      return false;
    }

    if (!['pending', 'paid', 'cancelled'].includes(order.status)) {
      console.warn('⚠️ Pedido inválido: status inválido', order.status);
      return false;
    }

    return true;
  }

  /**
   * Sanitiza e valida métricas calculadas
   */
  static validateMetrics(metricas: DashboardMetrics): DashboardMetrics {
    const validadas = {
      pedidos_realizados: Math.max(0, Math.floor(metricas.pedidos_realizados || 0)),
      pedidos_pendentes: Math.max(0, Math.floor(metricas.pedidos_pendentes || 0)),
      pedidos_cancelados: Math.max(0, Math.floor(metricas.pedidos_cancelados || 0)),
      vendas_confirmadas: Math.max(0, Math.floor(metricas.vendas_confirmadas || 0)),
      valor_vendas_mes: Math.max(0, Number(metricas.valor_vendas_mes || 0)),
      ticket_medio: Math.max(0, Number(metricas.ticket_medio || 0)),
      taxa_conversao: Math.max(0, Math.min(100, Number(metricas.taxa_conversao || 0)))
    };

    // Validação de consistência
    if (validadas.pedidos_realizados < (validadas.pedidos_pendentes + validadas.vendas_confirmadas + validadas.pedidos_cancelados)) {
      console.warn('⚠️ Inconsistência detectada: total de pedidos menor que soma dos status');
    }

    return validadas;
  }

  /**
   * Valida pedido específico para cálculo de métricas
   */
  static validateOrderForMetrics(order: any): boolean {
    if (!order || typeof order !== 'object') {
      return false;
    }

    if (!order.id || typeof order.id !== 'string') {
      return false;
    }

    if (typeof order.total_cents !== 'number' || order.total_cents < 0) {
      return false;
    }

    if (!['pending', 'paid', 'cancelled'].includes(order.status)) {
      return false;
    }

    return true;
  }

  /**
   * Converte cents para reais com validação
   */
  static convertCentsToReais(cents: number): number {
    if (typeof cents !== 'number' || isNaN(cents) || cents < 0) {
      console.warn('⚠️ Valor em cents inválido:', cents);
      return 0;
    }
    return cents / 100;
  }

  /**
   * Executa operação com retry automático
   */
  static async withRetry<T>(
    operation: () => Promise<T>, 
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Tentativa ${attempt}/${maxRetries}...`);
        return await operation();
      } catch (error) {
        lastError = error as Error;
        console.warn(`⚠️ Tentativa ${attempt} falhou:`, error);
        
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`⏳ Aguardando ${delay}ms antes da próxima tentativa...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    console.error(`❌ Todas as ${maxRetries} tentativas falharam`);
    throw lastError!;
  }
}