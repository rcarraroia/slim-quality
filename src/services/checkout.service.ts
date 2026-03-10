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
      const customer = await this.findOrCreateCustomer(data.customer);

      // 2. Criar pedido
      const order = await this.createOrder(customer.id, data);

      // 3. Criar item do pedido
      await this.createOrderItem(order.id, data.product);

      // 4. Criar endereço de entrega (Apenas para produtos físicos)
      const isDigital = data.product.sku === 'COL-707D80';
      if (!isDigital) {
        await this.createShippingAddress(order.id, data.shipping);
      }

      // 5. Processar afiliado (se houver)
      if (data.affiliate) {
        await this.processAffiliateTracking(order.id, data.affiliate);
      }

      // 6. Gerar link de pagamento - passar CPF diretamente do formulário
      const paymentUrl = await this.generatePaymentUrl(order, data.payment, data.customer.cpf_cnpj, data.shipping);

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
   * Se cliente existe mas CPF foi fornecido, atualiza o CPF
   */
  private async findOrCreateCustomer(customerData: CreateCustomerData): Promise<Customer> {
    // Verificar se cliente já existe pelo email
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id, user_id, name, email, phone, cpf_cnpj, birth_date, street, number, complement, neighborhood, city, state, postal_code, source, referral_code, assigned_to, status, notes, created_at, updated_at, deleted_at')
      .eq('email', customerData.email)
      .is('deleted_at', null)
      .single();

    if (existingCustomer) {
      console.log('👤 Cliente existente encontrado:', existingCustomer.id);

      // Se CPF foi fornecido e cliente não tem CPF, atualizar
      if (customerData.cpf_cnpj && !existingCustomer.cpf_cnpj) {
        console.log('📝 Atualizando CPF do cliente existente');
        const { data: updatedCustomer, error: updateError } = await supabase
          .from('customers')
          .update({
            cpf_cnpj: customerData.cpf_cnpj,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingCustomer.id)
          .select()
          .single();

        if (!updateError && updatedCustomer) {
          return updatedCustomer;
        }
      }

      // Retornar cliente com CPF atualizado se foi fornecido
      return {
        ...existingCustomer,
        cpf_cnpj: customerData.cpf_cnpj || existingCustomer.cpf_cnpj
      };
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
   * Task 4.3: Atualizado para buscar rede completa de afiliados
   */
  private async createOrder(customerId: string, data: CheckoutData): Promise<Order> {
    // Buscar rede de afiliados se houver referral code
    let affiliateN1Id = data.affiliate?.affiliate_id;
    let affiliateN2Id = null;
    let affiliateN3Id = null;

    if (data.affiliate?.referral_code) {
      const network = await this.buildAffiliateNetwork(data.affiliate.referral_code);
      affiliateN1Id = network.n1?.id;
      affiliateN2Id = network.n2?.id || null;
      affiliateN3Id = network.n3?.id || null;

      console.log('🌳 Rede de afiliados identificada:', {
        n1: affiliateN1Id,
        n2: affiliateN2Id,
        n3: affiliateN3Id
      });
    }

    const orderData: CreateOrderData = {
      customer_id: customerId,
      customer_name: data.customer.name,
      customer_email: data.customer.email,
      customer_phone: data.customer.phone,
      // Salvar rede completa de afiliados
      affiliate_n1_id: affiliateN1Id,
      affiliate_n2_id: affiliateN2Id,
      affiliate_n3_id: affiliateN3Id,
      referral_code: data.affiliate?.referral_code,
      discount_cents: data.totals.discount_cents,
      shipping_cents: data.totals.shipping_cents,
      subtotal_cents: data.totals.subtotal_cents,
      total_cents: data.totals.total_cents,
      status: 'pending'
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
      // Buscar affiliate_id pelo referral_code
      const { data: affiliateData, error: affiliateError } = await supabase
        .from('affiliates')
        .select('id')
        .eq('referral_code', affiliate.referral_code)
        .eq('status', 'active')
        .is('deleted_at', null)
        .single();

      if (affiliateError || !affiliateData) {
        console.warn('⚠️ Afiliado não encontrado para código:', affiliate.referral_code);
        return;
      }

      // Buscar dados do pedido para calcular comissão
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('customer_id, total_cents')
        .eq('id', orderId)
        .single();

      if (orderError || !order) {
        console.warn('⚠️ Pedido não encontrado:', orderId);
        return;
      }

      // Calcular comissão (15% para N1)
      const commissionPercentage = 15;
      const commissionValueCents = Math.round(order.total_cents * (commissionPercentage / 100));

      // Registrar conversão de referral com affiliate_id obrigatório
      const { error: conversionError } = await supabase
        .from('referral_conversions')
        .insert({
          referral_code: affiliate.referral_code,
          affiliate_id: affiliateData.id, // ✅ CORRIGIDO: Incluir affiliate_id obrigatório
          order_id: orderId,
          order_value_cents: order.total_cents,
          commission_percentage: commissionPercentage,
          commission_value_cents: commissionValueCents,
          customer_id: order.customer_id,
          converted_at: new Date().toISOString(),
          status: 'confirmed'
        });

      if (conversionError) {
        console.warn('⚠️ Erro ao registrar conversão:', conversionError.message);
      } else {
        console.log('🎯 Conversão de afiliado registrada com sucesso:', {
          affiliateId: affiliateData.id,
          orderId: orderId,
          commissionValueCents: commissionValueCents
        });
      }

    } catch (error) {
      console.warn('⚠️ Erro no rastreamento de afiliado:', error);
      // Não falhar o checkout por causa do rastreamento
    }
  }

  /**
   * Valida formato de Wallet ID do Asaas
   * Formato oficial: UUID v4 (ex: cd912fa1-5fa4-4d49-92eb-b5ab4dfba961)
   * Fonte: API Asaas - GET /v3/wallets/
   */
  private isValidWalletId(walletId: string): boolean {
    // Formato UUID v4 (formato oficial do Asaas)
    const uuidFormat = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(walletId);
    return uuidFormat;
  }

  /**
   * Busca rede de afiliados completa (N1, N2, N3) baseado no referral_code
   */
  private async buildAffiliateNetwork(referralCode: string): Promise<{
    n1?: { id: string; walletId: string };
    n2?: { id: string; walletId: string };
    n3?: { id: string; walletId: string };
  }> {
    const network: {
      n1?: { id: string; walletId: string };
      n2?: { id: string; walletId: string };
      n3?: { id: string; walletId: string };
    } = {};

    // Buscar N1 pelo referral_code
    const { data: n1Affiliate } = await supabase
      .from('affiliates')
      .select('id, wallet_id, referred_by')
      .eq('referral_code', referralCode)
      .eq('status', 'active')
      .single();

    if (!n1Affiliate || !n1Affiliate.wallet_id || !this.isValidWalletId(n1Affiliate.wallet_id)) {
      console.log('⚠️ N1 não encontrado ou wallet inválida:', referralCode);
      return network;
    }

    network.n1 = { id: n1Affiliate.id, walletId: n1Affiliate.wallet_id };
    console.log('✅ N1 encontrado:', network.n1.id);

    // Buscar N2 (quem indicou o N1)
    if (n1Affiliate.referred_by) {
      const { data: n2Affiliate } = await supabase
        .from('affiliates')
        .select('id, wallet_id, referred_by')
        .eq('id', n1Affiliate.referred_by)
        .eq('status', 'active')
        .single();

      if (n2Affiliate?.wallet_id && this.isValidWalletId(n2Affiliate.wallet_id)) {
        network.n2 = { id: n2Affiliate.id, walletId: n2Affiliate.wallet_id };
        console.log('✅ N2 encontrado:', network.n2.id);

        // Buscar N3 (quem indicou o N2)
        if (n2Affiliate.referred_by) {
          const { data: n3Affiliate } = await supabase
            .from('affiliates')
            .select('id, wallet_id')
            .eq('id', n2Affiliate.referred_by)
            .eq('status', 'active')
            .single();

          if (n3Affiliate?.wallet_id && this.isValidWalletId(n3Affiliate.wallet_id)) {
            network.n3 = { id: n3Affiliate.id, walletId: n3Affiliate.wallet_id };
            console.log('✅ N3 encontrado:', network.n3.id);
          }
        }
      }
    }

    return network;
  }

  /**
   * Calcula split baseado na rede de afiliados
   * REGRAS:
   * - Total split: SEMPRE 30% (70% fica automático na conta principal via API Key)
   * - Sem afiliado: 15% Renum + 15% JB
   * - Apenas N1: 15% N1 + 7.5% Renum + 7.5% JB
   * - N1+N2: 15% N1 + 3% N2 + 6% Renum + 6% JB
   * - Rede completa: 15% N1 + 3% N2 + 2% N3 + 5% Renum + 5% JB
   */
  private calculateSplit(network: {
    n1?: { id: string; walletId: string };
    n2?: { id: string; walletId: string };
    n3?: { id: string; walletId: string };
  }): { walletId: string; percentualValue: number }[] {
    const WALLET_RENUM = import.meta.env.VITE_ASAAS_WALLET_RENUM;
    const WALLET_JB = import.meta.env.VITE_ASAAS_WALLET_JB;

    // Validar wallets dos gestores
    if (!WALLET_RENUM || !this.isValidWalletId(WALLET_RENUM)) {
      console.error('❌ VITE_ASAAS_WALLET_RENUM inválida ou não configurada');
      throw new Error('Wallet Renum não configurada corretamente');
    }
    if (!WALLET_JB || !this.isValidWalletId(WALLET_JB)) {
      console.error('❌ VITE_ASAAS_WALLET_JB inválida ou não configurada');
      throw new Error('Wallet JB não configurada corretamente');
    }

    const splits: { walletId: string; percentualValue: number }[] = [];

    if (!network.n1) {
      // SEM AFILIADO: 15% cada para gestores = 30%
      console.log('📊 Split: Sem afiliado (15% + 15%)');
      splits.push(
        { walletId: WALLET_RENUM, percentualValue: 15 },
        { walletId: WALLET_JB, percentualValue: 15 }
      );
    } else if (!network.n2) {
      // APENAS N1: 15% N1 + 7.5% Renum + 7.5% JB = 30%
      console.log('📊 Split: Apenas N1 (15% + 7.5% + 7.5%)');
      splits.push(
        { walletId: network.n1.walletId, percentualValue: 15 },
        { walletId: WALLET_RENUM, percentualValue: 7.5 },
        { walletId: WALLET_JB, percentualValue: 7.5 }
      );
    } else if (!network.n3) {
      // N1+N2: 15% N1 + 3% N2 + 6% Renum + 6% JB = 30%
      console.log('📊 Split: N1+N2 (15% + 3% + 6% + 6%)');
      splits.push(
        { walletId: network.n1.walletId, percentualValue: 15 },
        { walletId: network.n2.walletId, percentualValue: 3 },
        { walletId: WALLET_RENUM, percentualValue: 6 },
        { walletId: WALLET_JB, percentualValue: 6 }
      );
    } else {
      // REDE COMPLETA: 15% N1 + 3% N2 + 2% N3 + 5% Renum + 5% JB = 30%
      console.log('📊 Split: Rede completa (15% + 3% + 2% + 5% + 5%)');
      splits.push(
        { walletId: network.n1.walletId, percentualValue: 15 },
        { walletId: network.n2.walletId, percentualValue: 3 },
        { walletId: network.n3.walletId, percentualValue: 2 },
        { walletId: WALLET_RENUM, percentualValue: 5 },
        { walletId: WALLET_JB, percentualValue: 5 }
      );
    }

    // Validação crítica: deve ser exatamente 30%
    const totalSplit = splits.reduce((sum, split) => sum + split.percentualValue, 0);
    if (totalSplit !== 30) {
      console.error(`❌ Erro no cálculo do split: ${totalSplit}% ao invés de 30%`);
      throw new Error(`Split calculation error: total is ${totalSplit}%, expected 30%`);
    }

    console.log('✅ Split calculado corretamente:', splits);
    return splits;
  }

  /**
   * Gera URL de pagamento via backend seguro (API key protegida)
   * ✅ ROTEAMENTO INTELIGENTE: Detecta produtos IA e usa sistema de assinaturas
   */
  private async generatePaymentUrl(
    order: Order,
    payment: CheckoutData['payment'],
    cpfCnpj?: string,
    shippingData?: Omit<CreateShippingAddressData, 'order_id'>
  ): Promise<string> {
    try {
      // Buscar dados do cliente
      const { data: customer } = await supabase
        .from('customers')
        .select('id, user_id, name, email, phone, cpf_cnpj, birth_date, street, number, complement, neighborhood, city, state, postal_code, source, referral_code, assigned_to, status, notes, created_at, updated_at, deleted_at')
        .eq('id', order.customer_id)
        .single();

      if (!customer) {
        throw new Error('Cliente não encontrado');
      }

      // Buscar dados do produto com informações completas
      const { data: orderItems } = await supabase
        .from('order_items')
        .select(`
          *,
          products:product_id (
            id,
            name,
            sku,
            category,
            description
          )
        `)
        .eq('order_id', order.id);

      if (!orderItems || orderItems.length === 0) {
        throw new Error('Itens do pedido não encontrados');
      }

      // ✅ DETECÇÃO INTELIGENTE DE PRODUTO IA
      const hasIAProduct = orderItems.some(item => {
        const product = item.products as any;
        return product && (
          product.category === 'ferramenta_ia' ||
          product.sku === 'COL-707D80' ||
          product.name?.toLowerCase().includes('agente ia')
        );
      });

      console.log('🔍 Detecção de produto:', {
        hasIAProduct,
        orderItems: orderItems.map(item => ({
          sku: (item.products as any)?.sku,
          category: (item.products as any)?.category,
          name: (item.products as any)?.name
        }))
      });

      // ✅ ROTEAMENTO: Se for produto IA, usar sistema de assinaturas
      if (hasIAProduct) {
        console.log('🚀 Produto IA detectado - usando sistema de assinaturas');
        return await this.processSubscriptionPayment(order, payment, customer, orderItems, cpfCnpj, shippingData);
      }

      // ✅ PRODUTOS FÍSICOS: Continuar com sistema tradicional
      console.log('📦 Produto físico detectado - usando sistema tradicional');

      // Buscar endereço de entrega (Pode não existir para produtos digitais)
      const { data: shippingAddress } = await supabase
        .from('shipping_addresses')
        .select('*')
        .eq('order_id', order.id)
        .maybeSingle();

      const firstItem = orderItems[0];

      // Usar CPF passado diretamente do formulário (prioridade) ou do banco
      const finalCpfCnpj = cpfCnpj || customer.cpf_cnpj;

      // Preparar dados do customer para Asaas
      const asaasCustomer = {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        mobilePhone: customer.phone,
        cpfCnpj: finalCpfCnpj,
        postalCode: shippingData?.postal_code?.replace(/\D/g, '') || shippingAddress?.postal_code?.replace(/\D/g, '') || undefined,
        addressNumber: shippingData?.number || shippingAddress?.number || undefined
      };

      // Validar CPF antes de enviar
      if (!asaasCustomer.cpfCnpj) {
        throw new Error('CPF é obrigatório para processamento do pagamento');
      }

      console.log('💰 Processando pagamento via backend seguro:', {
        orderId: order.id,
        orderNumber: order.order_number,
        totalCents: order.total_cents,
        referralCode: order.referral_code,
        hasCreditCard: !!payment.creditCard
      });

      // Chamar backend seguro (API key protegida no servidor)
      // Usar caminho relativo para que a Vercel trate corretamente no mesmo domínio
      const backendUrl = '';
      console.log('📡 DEBUG: backendUrl =', `"${backendUrl}"`);

      // Preparar payload
      const checkoutPayload: Record<string, unknown> = {
        customer: asaasCustomer,
        orderId: order.id,
        amount: order.total_cents / 100,
        description: `Pedido ${order.order_number} - ${firstItem.product_name}`,
        billingType: payment.method.toUpperCase(),
        installments: payment.installments,
        referralCode: order.referral_code,
        orderItems: orderItems.map(item => ({
          product_id: item.product_id,
          product_sku: item.product_sku,
          quantity: item.quantity,
          unit_price_cents: item.unit_price_cents
        }))
      };

      // Adicionar dados do cartão se for pagamento com cartão
      if (payment.method === 'credit_card' && payment.creditCard) {
        checkoutPayload.creditCard = payment.creditCard;
        
        // ✅ CORREÇÃO: Usar dados do payment.creditCardHolderInfo se disponível, senão usar dados do customer
        const holderInfo = payment.creditCardHolderInfo || {};
        
        checkoutPayload.creditCardHolderInfo = {
          name: holderInfo.name || customer.name,
          email: holderInfo.email || customer.email,
          cpfCnpj: holderInfo.cpfCnpj || asaasCustomer.cpfCnpj,
          postalCode: (holderInfo.postalCode || asaasCustomer.postalCode || '30112000').replace(/\D/g, ''),
          addressNumber: holderInfo.addressNumber || asaasCustomer.addressNumber || 'S/N',
          phone: (holderInfo.phone || customer.phone || '').replace(/\D/g, '')
        };
        
        console.log('💳 Dados do portador do cartão:', {
          name: checkoutPayload.creditCardHolderInfo.name,
          email: checkoutPayload.creditCardHolderInfo.email,
          cpfCnpj: checkoutPayload.creditCardHolderInfo.cpfCnpj ? '***' + checkoutPayload.creditCardHolderInfo.cpfCnpj.slice(-3) : 'N/A',
          postalCode: checkoutPayload.creditCardHolderInfo.postalCode,
          phone: checkoutPayload.creditCardHolderInfo.phone ? checkoutPayload.creditCardHolderInfo.phone.slice(0, 2) + '***' : 'N/A'
        });
      }

      const finalApiUrl = `${backendUrl}/api/checkout`;
      console.log('📡 DEBUG: Chamando API em:', finalApiUrl);

      const response = await fetch(finalApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(checkoutPayload)
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Checkout processado com sucesso:', {
          orderId: order.id,
          paymentId: result.paymentId,
          checkoutUrl: result.checkoutUrl,
          status: result.status,
          orderStatus: result.orderStatus
        });

        // Se pagamento com cartão foi confirmado, redirecionar para página de sucesso
        if (payment.method === 'credit_card' && (result.status === 'CONFIRMED' || result.orderStatus === 'paid')) {
          const successParams = new URLSearchParams({
            order_id: order.id,
            payment_id: result.paymentId || ''
          });
          return `${window.location.origin}/pagamento-sucesso?${successParams.toString()}`;
        }

        // Para PIX e outros métodos, usar a página de pagamento do Asaas (invoiceUrl)
        // É mais seguro e profissional - já tem QR Code, copia e cola, etc.
        if (result.checkoutUrl) {
          return result.checkoutUrl;
        }

        // Fallback para página de sucesso se não tiver URL do Asaas
        return `${window.location.origin}/pagamento-sucesso?order_id=${order.id}`;
      } else {
        console.warn('⚠️ Backend retornou erro:', result.error, 'Detalhes:', result.details, 'Debug:', result.debug);

        // Construir mensagem de erro mais detalhada
        let errorMessage = result.error || 'Erro ao processar pagamento';
        if (result.details?.errors) {
          const asaasErrors = result.details.errors.map((e: { description?: string }) => e.description).join(', ');
          errorMessage = `${errorMessage}: ${asaasErrors}`;
        }

        throw new Error(errorMessage);
      }

    } catch (error) {
      console.error('❌ Erro ao gerar pagamento:', error);

      // Fallback: retornar URL de erro
      const baseUrl = window.location.origin;
      const errorParams = new URLSearchParams({
        order_id: order.id,
        error: 'payment_failed',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });

      return `${baseUrl}/pagamento-erro?${errorParams.toString()}`;
    }
  }

  /**
   * ✅ NOVO: Processa pagamento de assinatura usando sistema novo
   */
  private async processSubscriptionPayment(
    order: Order,
    payment: CheckoutData['payment'],
    customer: any,
    orderItems: any[],
    cpfCnpj?: string,
    shippingData?: Omit<CreateShippingAddressData, 'order_id'>
  ): Promise<string> {
    try {
      // Importar serviço de assinaturas dinamicamente
      const { subscriptionFrontendService } = await import('@/services/frontend/subscription.service');

      // Usar CPF passado diretamente do formulário (prioridade) ou do banco
      const finalCpfCnpj = cpfCnpj || customer.cpf_cnpj;

      // Validar CPF antes de processar
      if (!finalCpfCnpj) {
        throw new Error('CPF é obrigatório para assinatura');
      }

      // Preparar dados para o sistema de assinaturas
      const subscriptionData = {
        userId: customer.id,
        planId: orderItems[0].product_id,
        amount: order.total_cents / 100,
        orderItems: orderItems.map(item => ({
          id: item.product_id,
          name: item.product_name,
          quantity: item.quantity,
          value: item.unit_price_cents / 100,
          description: (item.products as any)?.description || item.product_name,
          metadata: {
            hasAI: true,
            aiFeatures: ['chat', 'automation', 'analytics']
          }
        })),
        customerData: {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          cpf: finalCpfCnpj.replace(/\D/g, ''),
          address: {
            zipCode: shippingData?.postal_code?.replace(/\D/g, '') || '30112000',
            street: shippingData?.street || 'Rua Principal',
            number: shippingData?.number || 'S/N',
            complement: shippingData?.complement || '',
            neighborhood: shippingData?.neighborhood || 'Centro',
            city: shippingData?.city || 'Belo Horizonte',
            state: shippingData?.state || 'MG'
          }
        },
        paymentMethod: {
          type: payment.method === 'credit_card' ? 'CREDIT_CARD' as const : 'PIX' as const,
          creditCard: payment.creditCard ? {
            holderName: payment.creditCard.holderName,
            number: payment.creditCard.number,
            expiryMonth: payment.creditCard.expiryMonth,
            expiryYear: payment.creditCard.expiryYear,
            ccv: payment.creditCard.ccv
          } : undefined
        },
        affiliateData: order.referral_code ? {
          referralCode: order.referral_code
        } : undefined
      };

      console.log('🚀 Processando assinatura via sistema novo:', {
        orderId: order.id,
        planId: subscriptionData.planId,
        amount: subscriptionData.amount,
        paymentMethod: subscriptionData.paymentMethod.type,
        hasAffiliate: !!subscriptionData.affiliateData
      });

      // Criar pagamento de assinatura
      const result = await subscriptionFrontendService.createSubscriptionPayment(subscriptionData);

      if (!result.success) {
        throw new Error(result.error || 'Erro ao criar assinatura');
      }

      console.log('✅ Assinatura criada com sucesso:', {
        paymentId: result.data!.paymentId,
        status: result.data!.status,
        correlationId: result.data!.correlationId
      });

      // Para PIX, retornar URL de polling/acompanhamento
      if (subscriptionData.paymentMethod.type === 'PIX') {
        const pollingParams = new URLSearchParams({
          payment_id: result.data!.paymentId,
          correlation_id: result.data!.correlationId,
          type: 'subscription'
        });
        return `${window.location.origin}/pagamento-acompanhamento?${pollingParams.toString()}`;
      }

      // Para cartão de crédito, iniciar polling automático
      if (subscriptionData.paymentMethod.type === 'CREDIT_CARD') {
        console.log('💳 Iniciando polling para pagamento com cartão...');
        
        const pollingResult = await subscriptionFrontendService.pollPaymentStatus(
          result.data!.paymentId,
          (attempt, maxAttempts) => {
            console.log(`🔄 Polling tentativa ${attempt}/${maxAttempts}`);
          }
        );

        if (pollingResult.success && pollingResult.data?.status === 'CONFIRMED') {
          // Pagamento confirmado - redirecionar para sucesso
          const successParams = new URLSearchParams({
            order_id: order.id,
            payment_id: result.data!.paymentId,
            subscription_id: pollingResult.data.subscriptionId || 'created',
            type: 'subscription'
          });
          return `${window.location.origin}/pagamento-sucesso?${successParams.toString()}`;
        } else {
          // Timeout ou falha - redirecionar para acompanhamento
          const pollingParams = new URLSearchParams({
            payment_id: result.data!.paymentId,
            correlation_id: result.data!.correlationId,
            type: 'subscription',
            status: pollingResult.data?.status || 'timeout'
          });
          return `${window.location.origin}/pagamento-acompanhamento?${pollingParams.toString()}`;
        }
      }

      // Fallback
      return `${window.location.origin}/pagamento-sucesso?order_id=${order.id}`;

    } catch (error) {
      console.error('❌ Erro ao processar assinatura:', error);

      // Fallback: retornar URL de erro específica para assinaturas
      const baseUrl = window.location.origin;
      const errorParams = new URLSearchParams({
        order_id: order.id,
        error: 'subscription_failed',
        message: error instanceof Error ? error.message : 'Erro na assinatura',
        type: 'subscription'
      });

      return `${baseUrl}/pagamento-erro?${errorParams.toString()}`;
    }
  }

  /**
   * Salva log de auditoria do split para rastreabilidade (chamado pelo backend)
   * Mantido aqui apenas para compatibilidade, mas o backend faz isso automaticamente
   */
  private async saveSplitAuditLog(
    orderId: string,
    splits: { walletId: string; percentualValue: number }[],
    network: {
      n1?: { id: string; walletId: string };
      n2?: { id: string; walletId: string };
      n3?: { id: string; walletId: string };
    }
  ): Promise<void> {
    // Backend já faz isso automaticamente
    console.log('📝 Audit log será salvo pelo backend:', { orderId });
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