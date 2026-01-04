/**
 * MetricsCalculator - Calculadora de métricas com separação Pedidos vs Vendas
 * TASK 4: Implementar cálculos corretos
 * 
 * ⚠️ REGRAS OBRIGATÓRIAS:
 * - Calcular vendas usando apenas status 'paid'
 * - Converter cents para reais corretamente
 * - Implementar cálculo correto de taxa de conversão
 * - Tratar divisão por zero
 * - Validar dados antes de calcular
 */

import { Order, Sale } from './SupabaseService';

export interface CalculatedMetrics {
  // Valores financeiros (em reais)
  valor_total_pedidos: number;
  valor_vendas_confirmadas: number;
  valor_pedidos_pendentes: number;
  
  // Quantidades
  total_pedidos: number;
  vendas_confirmadas: number;
  pedidos_pendentes: number;
  pedidos_cancelados: number;
  
  // Métricas calculadas
  ticket_medio_geral: number;
  ticket_medio_vendas: number;
  taxa_conversao: number;
}

export class MetricsCalculator {
  /**
   * Converte cents para reais
   * OBRIGATÓRIO: Tratar valores nulos/inválidos
   */
  static centsToReais(cents: number | null | undefined): number {
    if (cents === null || cents === undefined || isNaN(cents)) {
      console.warn('⚠️ Valor em cents inválido:', cents);
      return 0;
    }
    return cents / 100;
  }

  /**
   * Formata valor em reais para exibição
   */
  static formatCurrency(value: number): string {
    if (isNaN(value) || value === null || value === undefined) {
      return 'R$ 0,00';
    }
    
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  /**
   * Calcula vendas do mês (apenas status 'paid')
   * OBRIGATÓRIO: Filtrar apenas pedidos pagos
   */
  static calculateMonthSales(orders: Order[]): number {
    if (!Array.isArray(orders)) {
      console.warn('⚠️ Orders não é um array:', orders);
      return 0;
    }

    // Filtrar apenas vendas confirmadas (status 'paid')
    const salesOnly = orders.filter(order => order.status === 'paid');
    
    const totalValue = salesOnly.reduce((acc, sale) => {
      const value = this.centsToReais(sale.total_cents); // NOME REAL DA COLUNA
      return acc + value;
    }, 0);

    console.log(`💰 Vendas do mês: ${salesOnly.length} vendas = R$ ${totalValue.toFixed(2)}`);
    return totalValue;
  }

  /**
   * Calcula taxa de conversão
   * OBRIGATÓRIO: (pedidos_pagos / total_pedidos * 100)
   */
  static calculateConversionRate(totalOrders: number, paidOrders: number): number {
    // Validar dados
    if (!totalOrders || totalOrders <= 0) {
      console.warn('⚠️ Total de pedidos inválido:', totalOrders);
      return 0;
    }

    if (!paidOrders || paidOrders < 0) {
      console.warn('⚠️ Pedidos pagos inválido:', paidOrders);
      return 0;
    }

    if (paidOrders > totalOrders) {
      console.warn('⚠️ Pedidos pagos maior que total:', { paidOrders, totalOrders });
      return 0;
    }

    const rate = (paidOrders / totalOrders) * 100;
    console.log(`📊 Taxa de conversão: ${paidOrders}/${totalOrders} = ${rate.toFixed(1)}%`);
    
    return rate;
  }

  /**
   * Calcula ticket médio
   * OBRIGATÓRIO: Dividir valor total por pedidos pagos (não todos)
   */
  static calculateAverageTicket(totalValue: number, paidOrders: number): number {
    // Validar dados
    if (!paidOrders || paidOrders <= 0) {
      console.warn('⚠️ Nenhum pedido pago para calcular ticket médio');
      return 0;
    }

    if (!totalValue || totalValue < 0) {
      console.warn('⚠️ Valor total inválido:', totalValue);
      return 0;
    }

    const averageTicket = totalValue / paidOrders;
    console.log(`🎯 Ticket médio: R$ ${totalValue.toFixed(2)} / ${paidOrders} = R$ ${averageTicket.toFixed(2)}`);
    
    return averageTicket;
  }

  /**
   * Calcula todas as métricas de uma vez
   * Separando claramente Pedidos de Vendas
   */
  static calculateAllMetrics(orders: Order[]): CalculatedMetrics {
    console.log('📊 Calculando todas as métricas...');
    
    if (!Array.isArray(orders)) {
      console.error('❌ Orders não é um array válido');
      return this.getEmptyMetrics();
    }

    try {
      // Separar por status
      const pedidosPendentes = orders.filter(o => o.status === 'pending');
      const vendasConfirmadas = orders.filter(o => o.status === 'paid');
      const pedidosCancelados = orders.filter(o => o.status === 'cancelled');

      // Calcular valores financeiros (USANDO NOME REAL: total_cents)
      const valorTotalPedidos = orders.reduce((acc, order) => 
        acc + this.centsToReais(order.total_cents), 0
      );

      const valorVendasConfirmadas = vendasConfirmadas.reduce((acc, venda) => 
        acc + this.centsToReais(venda.total_cents), 0
      );

      const valorPedidosPendentes = pedidosPendentes.reduce((acc, pedido) => 
        acc + this.centsToReais(pedido.total_cents), 0
      );

      // Calcular métricas
      const ticketMedioGeral = this.calculateAverageTicket(valorTotalPedidos, orders.length);
      const ticketMedioVendas = this.calculateAverageTicket(valorVendasConfirmadas, vendasConfirmadas.length);
      const taxaConversao = this.calculateConversionRate(orders.length, vendasConfirmadas.length);

      const metrics: CalculatedMetrics = {
        // Valores financeiros
        valor_total_pedidos: valorTotalPedidos,
        valor_vendas_confirmadas: valorVendasConfirmadas,
        valor_pedidos_pendentes: valorPedidosPendentes,
        
        // Quantidades
        total_pedidos: orders.length,
        vendas_confirmadas: vendasConfirmadas.length,
        pedidos_pendentes: pedidosPendentes.length,
        pedidos_cancelados: pedidosCancelados.length,
        
        // Métricas calculadas
        ticket_medio_geral: ticketMedioGeral,
        ticket_medio_vendas: ticketMedioVendas,
        taxa_conversao: taxaConversao
      };

      console.log('✅ Métricas calculadas:', metrics);
      return metrics;

    } catch (error) {
      console.error('💥 Erro ao calcular métricas:', error);
      return this.getEmptyMetrics();
    }
  }

  /**
   * Retorna métricas vazias em caso de erro
   */
  private static getEmptyMetrics(): CalculatedMetrics {
    return {
      valor_total_pedidos: 0,
      valor_vendas_confirmadas: 0,
      valor_pedidos_pendentes: 0,
      total_pedidos: 0,
      vendas_confirmadas: 0,
      pedidos_pendentes: 0,
      pedidos_cancelados: 0,
      ticket_medio_geral: 0,
      ticket_medio_vendas: 0,
      taxa_conversao: 0
    };
  }

  /**
   * Valida se os dados estão consistentes
   */
  static validateMetrics(metrics: CalculatedMetrics): boolean {
    const issues: string[] = [];

    // Validar que vendas confirmadas não excedem total
    if (metrics.vendas_confirmadas > metrics.total_pedidos) {
      issues.push('Vendas confirmadas > Total de pedidos');
    }

    // Validar que soma dos status = total
    const somaStatus = metrics.vendas_confirmadas + metrics.pedidos_pendentes + metrics.pedidos_cancelados;
    if (somaStatus !== metrics.total_pedidos) {
      issues.push(`Soma dos status (${somaStatus}) ≠ Total pedidos (${metrics.total_pedidos})`);
    }

    // Validar valores financeiros
    if (metrics.valor_vendas_confirmadas > metrics.valor_total_pedidos) {
      issues.push('Valor vendas > Valor total pedidos');
    }

    // Validar taxa de conversão
    if (metrics.taxa_conversao < 0 || metrics.taxa_conversao > 100) {
      issues.push(`Taxa de conversão inválida: ${metrics.taxa_conversao}%`);
    }

    if (issues.length > 0) {
      console.error('❌ Métricas inconsistentes:', issues);
      return false;
    }

    console.log('✅ Métricas validadas com sucesso');
    return true;
  }

  /**
   * Calcula métricas para um período específico
   */
  static calculatePeriodMetrics(
    orders: Order[], 
    startDate: Date, 
    endDate: Date
  ): CalculatedMetrics {
    console.log(`📅 Calculando métricas do período: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`);
    
    // Filtrar pedidos do período
    const periodOrders = orders.filter(order => {
      const orderDate = new Date(order.created_at);
      return orderDate >= startDate && orderDate <= endDate;
    });

    console.log(`📊 ${periodOrders.length} pedidos encontrados no período`);
    
    return this.calculateAllMetrics(periodOrders);
  }
}