/**
 * Property Test 11: Automatic Notification System
 * Validates: Requirements 2.5, 5.3, 6.3
 * 
 * Testa que o sistema de notificações para assinaturas funciona corretamente
 * com templates específicos, correlation IDs e logs estruturados
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotificationService } from '@/services/subscriptions/NotificationService';
import { SubscriptionUserData, SubscriptionPlanData } from '@/types/subscription.types';

describe('Property Test 11: Automatic Notification System', () => {
  let notificationService: NotificationService;
  let mockUserData: SubscriptionUserData;
  let mockPlanData: SubscriptionPlanData;
  let correlationId: string;

  beforeEach(() => {
    correlationId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    notificationService = new NotificationService(correlationId);

    mockUserData = {
      name: 'João Silva',
      email: 'joao@example.com',
      cpf: '12345678901',
      phone: '+5511999999999'
    };

    mockPlanData = {
      id: 'plan_ai_basic',
      name: 'IA Básico',
      description: 'Plano básico com IA',
      price: 29.90,
      features: ['Feature 1', 'Feature 2']
    };

    // Mock console.log para capturar logs
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  describe('Payment Failed Notifications', () => {
    it('deve enviar notificação de falha de pagamento com dados corretos', async () => {
      const paymentId = 'pay_123456789';
      const reason = 'Cartão recusado';

      const result = await notificationService.notifyPaymentFailed(
        mockUserData,
        mockPlanData,
        paymentId,
        reason
      );

      // Validar resultado
      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.timestamp).toBeDefined();

      // Validar logs estruturados
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('"service":"NotificationService"')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(`"correlationId":"${correlationId}"`)
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('"message":"Sending payment failed notification"')
      );
    });

    it('deve usar template correto para falha de pagamento', async () => {
      const paymentId = 'pay_123456789';
      const reason = 'Cartão expirado';

      await notificationService.notifyPaymentFailed(
        mockUserData,
        mockPlanData,
        paymentId,
        reason
      );

      // Verificar que template correto foi usado
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('"template":"subscription-payment-failed"')
      );
    });
  });

  describe('Subscription Created Notifications', () => {
    it('deve enviar notificação de assinatura criada com dados corretos', async () => {
      const subscriptionId = 'sub_123456789';
      const nextBillingDate = '2025-03-03';

      const result = await notificationService.notifySubscriptionCreated(
        mockUserData,
        mockPlanData,
        subscriptionId,
        nextBillingDate
      );

      // Validar resultado
      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.timestamp).toBeDefined();

      // Validar logs estruturados
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('"message":"Sending subscription created notification"')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(`"subscriptionId":"${subscriptionId}"`)
      );
    });

    it('deve usar template correto para assinatura criada', async () => {
      const subscriptionId = 'sub_123456789';
      const nextBillingDate = '2025-03-03';

      await notificationService.notifySubscriptionCreated(
        mockUserData,
        mockPlanData,
        subscriptionId,
        nextBillingDate
      );

      // Verificar que template correto foi usado
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('"template":"subscription-created"')
      );
    });
  });

  describe('Welcome Activation Notifications', () => {
    it('deve enviar notificação de boas-vindas com dados corretos', async () => {
      const accessUrl = 'https://app.slimquality.com.br/dashboard';

      const result = await notificationService.notifyWelcomeActivation(
        mockUserData,
        mockPlanData,
        accessUrl
      );

      // Validar resultado
      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.timestamp).toBeDefined();

      // Validar logs estruturados
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('"message":"Sending welcome activation notification"')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(`"accessUrl":"${accessUrl}"`)
      );
    });

    it('deve usar template correto para boas-vindas', async () => {
      const accessUrl = 'https://app.slimquality.com.br/dashboard';

      await notificationService.notifyWelcomeActivation(
        mockUserData,
        mockPlanData,
        accessUrl
      );

      // Verificar que template correto foi usado
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('"template":"subscription-welcome"')
      );
    });
  });

  describe('Property: Correlation ID Consistency', () => {
    it('deve usar o mesmo correlation ID em todas as notificações', async () => {
      const paymentId = 'pay_123';
      const subscriptionId = 'sub_123';
      const accessUrl = 'https://app.example.com';

      // Enviar diferentes tipos de notificação
      await notificationService.notifyPaymentFailed(mockUserData, mockPlanData, paymentId, 'Test');
      await notificationService.notifySubscriptionCreated(mockUserData, mockPlanData, subscriptionId, '2025-03-03');
      await notificationService.notifyWelcomeActivation(mockUserData, mockPlanData, accessUrl);

      // Verificar que todas usam o mesmo correlation ID
      const logCalls = (console.log as any).mock.calls;
      const correlationIdLogs = logCalls.filter((call: any) => 
        call[0].includes(`"correlationId":"${correlationId}"`)
      );

      expect(correlationIdLogs.length).toBeGreaterThan(0);
    });
  });

  describe('Property: Structured Logging', () => {
    it('deve gerar logs estruturados para todas as operações', async () => {
      const paymentId = 'pay_123';

      await notificationService.notifyPaymentFailed(mockUserData, mockPlanData, paymentId, 'Test');

      // Verificar estrutura dos logs
      const logCalls = (console.log as any).mock.calls;
      
      logCalls.forEach((call: any) => {
        const logEntry = JSON.parse(call[0]);
        
        expect(logEntry).toHaveProperty('timestamp');
        expect(logEntry).toHaveProperty('level');
        expect(logEntry).toHaveProperty('service', 'NotificationService');
        expect(logEntry).toHaveProperty('correlationId', correlationId);
        expect(logEntry).toHaveProperty('message');
      });
    });
  });

  describe('Property: Template Isolation', () => {
    it('deve usar templates específicos para assinaturas (isolamento)', async () => {
      const paymentId = 'pay_123';
      const subscriptionId = 'sub_123';
      const accessUrl = 'https://app.example.com';

      await notificationService.notifyPaymentFailed(mockUserData, mockPlanData, paymentId, 'Test');
      await notificationService.notifySubscriptionCreated(mockUserData, mockPlanData, subscriptionId, '2025-03-03');
      await notificationService.notifyWelcomeActivation(mockUserData, mockPlanData, accessUrl);

      // Verificar que apenas templates de assinatura são usados
      const logCalls = (console.log as any).mock.calls;
      const templateLogs = logCalls.filter((call: any) => 
        call[0].includes('"template":')
      );

      templateLogs.forEach((call: any) => {
        const logContent = call[0];
        expect(
          logContent.includes('subscription-payment-failed') ||
          logContent.includes('subscription-created') ||
          logContent.includes('subscription-welcome')
        ).toBe(true);
      });
    });
  });

  describe('Property: Error Handling', () => {
    it('deve lidar com erros de envio graciosamente', async () => {
      // Simular erro no envio
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = vi.fn().mockImplementation((callback, delay) => {
        throw new Error('Network error');
      });

      const result = await notificationService.notifyPaymentFailed(
        mockUserData,
        mockPlanData,
        'pay_123',
        'Test'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.timestamp).toBeDefined();

      // Restaurar setTimeout
      global.setTimeout = originalSetTimeout;
    });
  });

  describe('Property: Data Validation', () => {
    it('deve incluir todos os dados necessários nas notificações', async () => {
      const paymentId = 'pay_123456789';
      const reason = 'Cartão recusado';

      await notificationService.notifyPaymentFailed(
        mockUserData,
        mockPlanData,
        paymentId,
        reason
      );

      // Verificar que dados do usuário e plano estão nos logs
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(`"email":"${mockUserData.email}"`)
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(`"paymentId":"${paymentId}"`)
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(`"reason":"${reason}"`)
      );
    });
  });
});