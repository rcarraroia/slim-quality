import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { supabase } from '@/config/database';
import { CustomerService } from '@/services/crm/customer.service';
import { TimelineService } from '@/services/crm/timeline.service';
import { TagService } from '@/services/crm/tag.service';
import { IntegrationService } from '@/services/crm/integration.service';

/**
 * Testes de Integração Cross-System
 * 
 * Valida integração entre:
 * - Sistema de Vendas → CRM
 * - Sistema de Afiliados → CRM
 * - Sincronização de dados
 * - Eventos automáticos
 */

describe('CRM Cross-System Integration Tests', () => {
  let customerService: CustomerService;
  let timelineService: TimelineService;
  let tagService: TagService;
  let integrationService: IntegrationService;
  
  let testCustomerId: string;
  let testOrderId: string;
  let testAffiliateId: string;

  beforeAll(async () => {
    customerService = new CustomerService();
    timelineService = new TimelineService();
    tagService = new TagService();
    integrationService = new IntegrationService();
  });

  beforeEach(async () => {
    // Criar cliente de teste
    const customer = await customerService.create({
      name: 'Cliente Teste Integração',
      email: `integration-test-${Date.now()}@test.com`,
      phone: '+5511999999999',
      source: 'test'
    });
    testCustomerId = customer.id;
  });

  afterAll(async () => {
    // Limpar dados de teste
    await supabase
      .from('crm_customers')
      .delete()
      .like('email', '%@test.com');
  });

  describe('Integração: Sistema de Vendas → CRM', () => {
    it('deve registrar evento na timeline quando pedido é criado', async () => {
      // Simular criação de pedido
      const orderData = {
        customer_id: testCustomerId,
        total: 3290.00,
        status: 'pending',
        items: [
          {
            product_id: 'prod_123',
            quantity: 1,
            price: 3290.00
          }
        ]
      };

      // Processar evento de pedido
      await integrationService.handleOrderCreated(orderData);

      // Verificar timeline
      const timeline = await timelineService.getCustomerTimeline(testCustomerId);
      
      expect(timeline).toHaveLength(1);
      expect(timeline[0]).toMatchObject({
        event_type: 'order_created',
        title: 'Pedido Realizado',
        metadata: expect.objectContaining({
          order_total: 3290.00,
          order_status: 'pending'
        })
      });
    });

    it('deve aplicar tag "Cliente Ativo" quando pedido é pago', async () => {
      // Simular pagamento confirmado
      const paymentData = {
        order_id: 'order_123',
        customer_id: testCustomerId,
        status: 'paid',
        amount: 3290.00,
        payment_method: 'pix'
      };

      await integrationService.handlePaymentConfirmed(paymentData);

      // Verificar tag aplicada
      const customer = await customerService.findById(testCustomerId);
      const hasActiveTag = customer.tags?.some(tag => tag.name === 'Cliente Ativo');
      
      expect(hasActiveTag).toBe(true);
    });

    it('deve calcular LTV após múltiplas compras', async () => {
      // Simular 3 compras
      const purchases = [
        { amount: 3290.00, date: '2025-01-01' },
        { amount: 3490.00, date: '2025-02-01' },
        { amount: 4890.00, date: '2025-03-01' }
      ];

      for (const purchase of purchases) {
        await integrationService.handleOrderCreated({
          customer_id: testCustomerId,
          total: purchase.amount,
          status: 'paid',
          created_at: purchase.date
        });
      }

      // Calcular métricas
      const metrics = await integrationService.calculateCustomerMetrics(testCustomerId);

      expect(metrics.ltv).toBe(11670.00); // Soma das compras
      expect(metrics.total_orders).toBe(3);
      expect(metrics.avg_order_value).toBe(3890.00);
    });

    it('deve sincronizar dados de cliente entre sistemas', async () => {
      // Atualizar dados no sistema de vendas
      const updatedData = {
        customer_id: testCustomerId,
        name: 'Cliente Atualizado',
        phone: '+5511888888888',
        address: {
          street: 'Rua Nova, 123',
          city: 'São Paulo',
          state: 'SP',
          zip_code: '01234-567'
        }
      };

      await integrationService.syncCustomerData(updatedData);

      // Verificar sincronização no CRM
      const customer = await customerService.findById(testCustomerId);
      
      expect(customer.name).toBe('Cliente Atualizado');
      expect(customer.phone).toBe('+5511888888888');
      expect(customer.address).toMatchObject(updatedData.address);
    });

    it('deve registrar evento de cancelamento de pedido', async () => {
      // Simular cancelamento
      const cancellationData = {
        order_id: 'order_123',
        customer_id: testCustomerId,
        reason: 'Cliente desistiu',
        refund_amount: 3290.00
      };

      await integrationService.handleOrderCancelled(cancellationData);

      // Verificar timeline
      const timeline = await timelineService.getCustomerTimeline(testCustomerId);
      const cancellationEvent = timeline.find(e => e.event_type === 'order_cancelled');
      
      expect(cancellationEvent).toBeDefined();
      expect(cancellationEvent?.metadata).toMatchObject({
        reason: 'Cliente desistiu',
        refund_amount: 3290.00
      });
    });

    it('deve aplicar tag "VIP" para clientes com alto LTV', async () => {
      // Simular compras de alto valor
      const highValuePurchases = [
        { amount: 10000.00 },
        { amount: 15000.00 },
        { amount: 20000.00 }
      ];

      for (const purchase of highValuePurchases) {
        await integrationService.handleOrderCreated({
          customer_id: testCustomerId,
          total: purchase.amount,
          status: 'paid'
        });
      }

      // Verificar tag VIP
      const customer = await customerService.findById(testCustomerId);
      const hasVIPTag = customer.tags?.some(tag => tag.name === 'VIP');
      
      expect(hasVIPTag).toBe(true);
    });
  });

  describe('Integração: Sistema de Afiliados → CRM', () => {
    it('deve identificar cliente indicado por afiliado', async () => {
      // Simular cadastro via link de afiliado
      const affiliateData = {
        referral_code: 'ABC123',
        customer_data: {
          name: 'Cliente Indicado',
          email: `referred-${Date.now()}@test.com`,
          phone: '+5511777777777'
        }
      };

      const customer = await integrationService.handleAffiliateReferral(affiliateData);

      expect(customer.referral_code).toBe('ABC123');
      expect(customer.source).toBe('affiliate');
    });

    it('deve aplicar tag "Indicação" automaticamente', async () => {
      // Criar cliente via afiliado
      const customer = await integrationService.handleAffiliateReferral({
        referral_code: 'XYZ789',
        customer_data: {
          name: 'Cliente Indicação',
          email: `referral-${Date.now()}@test.com`,
          phone: '+5511666666666'
        }
      });

      // Verificar tag
      const customerData = await customerService.findById(customer.id);
      const hasReferralTag = customerData.tags?.some(tag => tag.name === 'Indicação');
      
      expect(hasReferralTag).toBe(true);
    });

    it('deve registrar origem na timeline do cliente', async () => {
      // Criar cliente via afiliado
      const customer = await integrationService.handleAffiliateReferral({
        referral_code: 'DEF456',
        customer_data: {
          name: 'Cliente Timeline',
          email: `timeline-${Date.now()}@test.com`,
          phone: '+5511555555555'
        },
        affiliate_name: 'João Afiliado'
      });

      // Verificar timeline
      const timeline = await timelineService.getCustomerTimeline(customer.id);
      const referralEvent = timeline.find(e => e.event_type === 'referral_registered');
      
      expect(referralEvent).toBeDefined();
      expect(referralEvent?.metadata).toMatchObject({
        referral_code: 'DEF456',
        affiliate_name: 'João Afiliado'
      });
    });

    it('deve calcular taxa de conversão por afiliado', async () => {
      const affiliateCode = 'CONV123';
      
      // Simular 10 cliques e 3 conversões
      for (let i = 0; i < 10; i++) {
        await integrationService.trackAffiliateClick({
          referral_code: affiliateCode,
          ip: `192.168.1.${i}`,
          user_agent: 'Test Browser'
        });
      }

      // 3 conversões
      for (let i = 0; i < 3; i++) {
        await integrationService.handleAffiliateReferral({
          referral_code: affiliateCode,
          customer_data: {
            name: `Cliente Conv ${i}`,
            email: `conv-${Date.now()}-${i}@test.com`,
            phone: `+551155555555${i}`
          }
        });
      }

      // Calcular taxa de conversão
      const stats = await integrationService.getAffiliateConversionStats(affiliateCode);
      
      expect(stats.total_clicks).toBe(10);
      expect(stats.total_conversions).toBe(3);
      expect(stats.conversion_rate).toBe(0.30); // 30%
    });

    it('deve atualizar métricas do afiliado quando cliente compra', async () => {
      // Criar cliente via afiliado
      const customer = await integrationService.handleAffiliateReferral({
        referral_code: 'METRICS123',
        customer_data: {
          name: 'Cliente Métricas',
          email: `metrics-${Date.now()}@test.com`,
          phone: '+5511444444444'
        }
      });

      // Simular compra
      await integrationService.handleOrderCreated({
        customer_id: customer.id,
        total: 3290.00,
        status: 'paid'
      });

      // Verificar métricas do afiliado
      const affiliateMetrics = await integrationService.getAffiliateMetrics('METRICS123');
      
      expect(affiliateMetrics.total_sales).toBe(1);
      expect(affiliateMetrics.total_revenue).toBe(3290.00);
      expect(affiliateMetrics.commission_earned).toBeGreaterThan(0);
    });
  });

  describe('Sincronização de Dados Cross-System', () => {
    it('deve manter consistência de dados entre sistemas', async () => {
      // Criar cliente no CRM
      const crmCustomer = await customerService.create({
        name: 'Cliente Sync',
        email: `sync-${Date.now()}@test.com`,
        phone: '+5511333333333'
      });

      // Simular criação no sistema de vendas
      await integrationService.syncToSalesSystem({
        crm_customer_id: crmCustomer.id,
        name: crmCustomer.name,
        email: crmCustomer.email,
        phone: crmCustomer.phone
      });

      // Verificar sincronização
      const salesCustomer = await integrationService.getSalesSystemCustomer(crmCustomer.id);
      
      expect(salesCustomer).toBeDefined();
      expect(salesCustomer.email).toBe(crmCustomer.email);
    });

    it('deve resolver conflitos de dados automaticamente', async () => {
      // Criar cliente com dados diferentes em cada sistema
      const crmData = {
        name: 'Nome CRM',
        email: `conflict-${Date.now()}@test.com`,
        phone: '+5511222222222'
      };

      const salesData = {
        name: 'Nome Vendas',
        email: crmData.email,
        phone: '+5511111111111'
      };

      // Sincronizar com estratégia "CRM wins"
      const resolved = await integrationService.resolveDataConflict(
        crmData,
        salesData,
        'crm_wins'
      );

      expect(resolved.name).toBe('Nome CRM');
      expect(resolved.phone).toBe('+5511222222222');
    });

    it('deve propagar atualizações entre sistemas', async () => {
      // Atualizar cliente no CRM
      await customerService.update(testCustomerId, {
        name: 'Nome Atualizado',
        phone: '+5511000000000'
      });

      // Verificar propagação
      await integrationService.propagateUpdate(testCustomerId);

      const salesCustomer = await integrationService.getSalesSystemCustomer(testCustomerId);
      
      expect(salesCustomer.name).toBe('Nome Atualizado');
      expect(salesCustomer.phone).toBe('+5511000000000');
    });
  });

  describe('Eventos Automáticos Cross-System', () => {
    it('deve disparar evento quando cliente é criado', async () => {
      const events: any[] = [];
      
      // Listener de eventos
      integrationService.on('customer.created', (event) => {
        events.push(event);
      });

      // Criar cliente
      const customer = await customerService.create({
        name: 'Cliente Evento',
        email: `event-${Date.now()}@test.com`,
        phone: '+5511999999999'
      });

      // Verificar evento disparado
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        type: 'customer.created',
        customer_id: customer.id
      });
    });

    it('deve disparar evento quando pedido é criado', async () => {
      const events: any[] = [];
      
      integrationService.on('order.created', (event) => {
        events.push(event);
      });

      await integrationService.handleOrderCreated({
        customer_id: testCustomerId,
        total: 3290.00,
        status: 'pending'
      });

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('order.created');
    });

    it('deve processar eventos em ordem cronológica', async () => {
      const processedEvents: string[] = [];
      
      integrationService.on('*', (event) => {
        processedEvents.push(event.type);
      });

      // Disparar múltiplos eventos
      await integrationService.handleOrderCreated({
        customer_id: testCustomerId,
        total: 3290.00,
        status: 'pending'
      });

      await integrationService.handlePaymentConfirmed({
        order_id: 'order_123',
        customer_id: testCustomerId,
        status: 'paid',
        amount: 3290.00
      });

      await integrationService.handleOrderShipped({
        order_id: 'order_123',
        customer_id: testCustomerId,
        tracking_code: 'BR123456789'
      });

      // Verificar ordem
      expect(processedEvents).toEqual([
        'order.created',
        'payment.confirmed',
        'order.shipped'
      ]);
    });
  });

  describe('Tratamento de Erros em Integrações', () => {
    it('deve fazer retry automático em falhas temporárias', async () => {
      let attempts = 0;
      
      // Simular falha temporária
      integrationService.setSyncHandler(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return { success: true };
      });

      const result = await integrationService.syncWithRetry(testCustomerId);
      
      expect(attempts).toBe(3);
      expect(result.success).toBe(true);
    });

    it('deve registrar falhas permanentes para análise', async () => {
      // Simular falha permanente
      integrationService.setSyncHandler(async () => {
        throw new Error('Permanent failure');
      });

      try {
        await integrationService.syncWithRetry(testCustomerId, { maxRetries: 2 });
      } catch (error) {
        // Esperado
      }

      // Verificar log de falha
      const failures = await integrationService.getFailedSyncs();
      const customerFailure = failures.find(f => f.customer_id === testCustomerId);
      
      expect(customerFailure).toBeDefined();
      expect(customerFailure?.error_message).toContain('Permanent failure');
    });

    it('deve continuar processamento mesmo com falhas parciais', async () => {
      const results = await integrationService.batchSync([
        { customer_id: testCustomerId, action: 'update' },
        { customer_id: 'invalid_id', action: 'update' }, // Vai falhar
        { customer_id: testCustomerId, action: 'sync_tags' }
      ]);

      expect(results.successful).toBe(2);
      expect(results.failed).toBe(1);
      expect(results.total).toBe(3);
    });
  });
});
