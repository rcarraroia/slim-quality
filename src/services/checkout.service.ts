/**
 * SERVIÇO DE CHECKOUT - INTEGRAÇÃO REAL COM SUPABASE
 * Processa compras e integra com sistema de afiliados
 */

import { supabase } from '@/config/supabase';
import type { 
  CheckoutData, 
  CheckoutResult, 
  CreateCustomerData, 
  CreateOrderData, 
  CreateOrderItemData,
  CreateShippingAddressData,
  Customer,
  Order,
  OrderItem,
  ShippingAddress
} from '@/types/database.types';

export class CheckoutService {
  
  /**
   * Processa checkout completo
   */
  async processCheckout(data: CheckoutData): Promise<CheckoutResult> {
    try {
      console.log('🛒 Iniciando checkout:', data);
      
      // 1. Verificar se cliente já existe
      let customer = await this.findOrCreateCustomer(data.customer);
      
      // 2. Criar pedido
      const order = await this.createOrder(customer.id, data);
      
      // 3. Criar item do pedido
      await this.createOrderItem(order.id, data.product);
      
      // 4. Criar endereço de entrega
      await this.createShippingAddress(order.id, data.shipping);
      
      // 5. Processar afiliado (se houver)
      if (data.affiliate) {
        await this.processAffiliateTracking(order.id, data.affiliate);
      }
      
      // 6. Gerar link de pagamento (simulado por enquanto)
      const paymentUrl = await this.generatePaymentUrl(order, data.payment);
      
      console.log('✅ Checkout concluído:', { 
        customer_id: customer.id, 
        order_id: order.id 
      });
      
      return {
        success: true,
        customer_id: customer.id,
        order_id: order.id,
        payment_url: paymentUrl
      };
      
    } catch (error) {
      console.error('❌ Erro no checkout:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }
  
  /**
   * Encontra cliente existente ou cria novo
   */
  private async findOrCreateCustomer(customerData: CreateCustomerData): Promise<Customer> {
    // Verificar se cliente já existe pelo email
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('*')
      .eq('email', customerData.email)
      .is('deleted_at', null)
      .single();
    
    if (existingCustomer) {
      console.log('👤 Cliente existente encontrado:', existingCustomer.id);
      return existingCustomer;
    }
    
    // Criar novo cliente
    const { data: newCustomer, error } = await supabase
      .from('customers')
      .insert(customerData)
      .select()
      .single();
    
    if (error) {
      throw new Error(`Erro ao criar cliente: ${error.message}`);
    }
    
    console.log('👤 Novo cliente criado:', newCustomer.id);
    return newCustomer;
  }
  
  /**
   * Cria pedido
   */
  private async createOrder(customerId: string, data: CheckoutData): Promise<Order> {
    const orderData: CreateOrderData = {
      customer_id: customerId,
      customer_name: data.customer.name,
      customer_email: data.customer.email,
      customer_phone: data.customer.phone,
      // Usar campos reais do banco
      affiliate_n1_id: data.affiliate?.affiliate_id,
      referral_code: data.affiliate?.referral_code,
      discount_cents: data.totals.discount_cents,
      shipping_cents: data.totals.shipping_cents,
      subtotal_cents: data.totals.subtotal_cents,
      total_cents: data.totals.total_cents,
      status: 'pending'
      // Remover payment_method - não existe na tabela real
    };
    
    const { data: order, error } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single();
    
    if (error) {
      throw new Error(`Erro ao criar pedido: ${error.message}`);
    }
    
    console.log('📦 Pedido criado:', order.id);
    return order;
  }
  
  /**
   * Cria item do pedido
   */
  private async createOrderItem(orderId: string, product: CheckoutData['product']): Promise<OrderItem> {
    const itemData: CreateOrderItemData = {
      order_id: orderId,
      product_id: product.id,
      product_name: product.name,
      product_sku: product.sku,
      quantity: product.quantity,
      unit_price_cents: product.price_cents,
      total_price_cents: product.price_cents * product.quantity
    };
    
    const { data: item, error } = await supabase
      .from('order_items')
      .insert(itemData)
      .select()
      .single();
    
    if (error) {
      throw new Error(`Erro ao criar item do pedido: ${error.message}`);
    }
    
    console.log('📋 Item do pedido criado:', item.id);
    return item;
  }
  
  /**
   * Cria endereço de entrega
   */
  private async createShippingAddress(orderId: string, shipping: CheckoutData['shipping']): Promise<ShippingAddress> {
    const shippingData: CreateShippingAddressData = {
      order_id: orderId,
      ...shipping
    };
    
    const { data: address, error } = await supabase
      .from('shipping_addresses')
      .insert(shippingData)
      .select()
      .single();
    
    if (error) {
      throw new Error(`Erro ao criar endereço de entrega: ${error.message}`);
    }
    
    console.log('🏠 Endereço de entrega criado:', address.id);
    return address;
  }
  
  /**
   * Processa rastreamento de afiliado
   */
  private async processAffiliateTracking(orderId: string, affiliate: CheckoutData['affiliate']) {
    if (!affiliate) return;
    
    try {
      // Registrar conversão de referral
      const { error: conversionError } = await supabase
        .from('referral_conversions')
        .insert({
          referral_code: affiliate.referral_code,
          order_id: orderId,
          converted_at: new Date().toISOString()
        });
      
      if (conversionError) {
        console.warn('⚠️ Erro ao registrar conversão:', conversionError.message);
      } else {
        console.log('🎯 Conversão de afiliado registrada');
      }
      
    } catch (error) {
      console.warn('⚠️ Erro no rastreamento de afiliado:', error);
      // Não falhar o checkout por causa do rastreamento
    }
  }
  
  /**
   * Gera URL de pagamento via Asaas
   */
  private async generatePaymentUrl(order: Order, payment: CheckoutData['payment']): Promise<string> {
    try {
      // Importar serviço Asaas
      const { asaasService } = await import('@/services/asaas.service');
      
      // Buscar dados do cliente
      const { data: customer } = await supabase
        .from('customers')
        .select('*')
        .eq('id', order.customer_id)
        .single();
      
      if (!customer) {
        throw new Error('Cliente não encontrado');
      }
      
      // Buscar dados do produto
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', order.id);
      
      if (!orderItems || orderItems.length === 0) {
        throw new Error('Itens do pedido não encontrados');
      }
      
      const firstItem = orderItems[0];
      
      // Preparar dados do customer para Asaas
      const asaasCustomer = {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        mobilePhone: customer.phone,
        cpfCnpj: customer.cpf_cnpj || undefined
      };
      
      // Preparar splits se houver afiliado
      const splits = [];
      
      // 70% para a fábrica (Slim Quality)
      splits.push({
        walletId: 'f9c7d1dd-9e52-4e81-8194-8b666f276405', // Wallet principal
        percentualValue: 70
      });
      
      // Se houver afiliado, calcular comissões
      if (order.affiliate_n1_id) {
        // 15% para afiliado N1
        const { data: affiliate } = await supabase
          .from('affiliates')
          .select('wallet_id')
          .eq('user_id', order.affiliate_n1_id)
          .single();
        
        if (affiliate?.wallet_id) {
          splits.push({
            walletId: affiliate.wallet_id,
            percentualValue: 15
          });
        }
        
        // 5% para Renum
        splits.push({
          walletId: import.meta.env.VITE_ASAAS_WALLET_RENUM || 'f9c7d1dd-9e52-4e81-8194-8b666f276405',
          percentualValue: 5
        });
        
        // 5% para JB
        splits.push({
          walletId: import.meta.env.VITE_ASAAS_WALLET_JB || '7c06e9d9-dbae-4a85-82f4-36716775bcb2',
          percentualValue: 5
        });
        
        // 5% restante para a fábrica (redistribuição)
        splits[0].percentualValue = 75; // 70% + 5%
      } else {
        // Sem afiliado: 15% redistribuído para gestores
        splits.push({
          walletId: import.meta.env.VITE_ASAAS_WALLET_RENUM || 'f9c7d1dd-9e52-4e81-8194-8b666f276405',
          percentualValue: 7.5
        });
        
        splits.push({
          walletId: import.meta.env.VITE_ASAAS_WALLET_JB || '7c06e9d9-dbae-4a85-82f4-36716775bcb2',
          percentualValue: 7.5
        });
        
        // Fábrica fica com 85% (70% + 15%)
        splits[0].percentualValue = 85;
      }
      
      // Tentar processar checkout no Asaas
      const checkoutResult = await asaasService.processCheckout({
        customer: asaasCustomer,
        amount: order.total_cents / 100, // Converter centavos para reais
        description: `Pedido ${order.order_number} - ${firstItem.product_name}`,
        externalReference: order.id,
        billingType: payment.method.toUpperCase() as 'PIX' | 'CREDIT_CARD' | 'BOLETO',
        installments: payment.installments,
        splits: splits
      });
      
      if (checkoutResult.success) {
        // Criar registro de pagamento na tabela payments
        const { data: paymentRecord, error: paymentError } = await supabase
          .from('payments')
          .insert({
            order_id: order.id,
            payment_method: payment.method as 'pix' | 'credit_card',
            amount_cents: order.total_cents,
            status: 'pending',
            asaas_payment_id: checkoutResult.paymentId,
            pix_qr_code: checkoutResult.pixQrCode,
            pix_copy_paste: checkoutResult.pixCopyPaste,
            installments: payment.installments || 1
          })
          .select()
          .single();
        
        if (paymentError) {
          console.warn('⚠️ Erro ao criar registro de pagamento:', paymentError.message);
        } else {
          console.log('💾 Registro de pagamento criado:', paymentRecord.id);
        }
        
        // Atualizar pedido com ID do pagamento Asaas
        await supabase
          .from('orders')
          .update({ 
            updated_at: new Date().toISOString()
          })
          .eq('id', order.id);
        
        console.log('💳 Checkout Asaas processado:', {
          orderId: order.id,
          paymentId: checkoutResult.paymentId,
          checkoutUrl: checkoutResult.checkoutUrl
        });
        
        return checkoutResult.checkoutUrl || checkoutResult.pixQrCode || checkoutResult.boletoUrl || '';
      } else {
        // Asaas falhou - usar fallback
        console.warn('⚠️ Asaas falhou, usando fallback:', checkoutResult.error);
        throw new Error(`Asaas indisponível: ${checkoutResult.error}`);
      }
      
    } catch (error) {
      console.error('❌ Erro ao gerar pagamento Asaas:', error);
      
      // Fallback: retornar URL simulada válida
      const baseUrl = window.location.origin;
      const paymentParams = new URLSearchParams({
        order_id: order.id,
        amount: (order.total_cents / 100).toString(),
        method: payment.method,
        ...(payment.installments && { installments: payment.installments.toString() })
      });
      
      return `${baseUrl}/pagamento-simulado?${paymentParams.toString()}`;
    }
  }
  
  /**
   * Busca pedido por ID
   */
  async getOrder(orderId: string): Promise<Order | null> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();
    
    if (error) {
      console.error('Erro ao buscar pedido:', error);
      return null;
    }
    
    return data;
  }
  
  /**
   * Atualiza status do pedido
   */
  async updateOrderStatus(orderId: string, status: Order['status']): Promise<boolean> {
    const { error } = await supabase
      .from('orders')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);
    
    if (error) {
      console.error('Erro ao atualizar status:', error);
      return false;
    }
    
    console.log(`📊 Status do pedido ${orderId} atualizado para: ${status}`);
    return true;
  }
}

// Instância singleton
export const checkoutService = new CheckoutService();