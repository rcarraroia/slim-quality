/**
 * Testes para HealthMonitoringService
 * 
 * Task 15.3: Implement health monitoring
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HealthMonitoringService } from '../../src/services/subscriptions/HealthMonitoringService';

// Mock do Supabase
vi.mock('../../src/config/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
        head: vi.fn(() => Promise.resolve({ count: 0, error: null }))
      }))
    }))
  }
}));

// Mock do LoggerService
vi.mock('../../src/services/subscriptions/LoggerService', () => ({
  LoggerService: vi.fn().mockImplementation(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }))
}));

describe('HealthMonitoringService', () => {
  let healthService: HealthMonitoringService;

  beforeEach(() => {
    healthService = new HealthMonitoringService();
    vi.clearAllMocks();
  });

  describe('checkSystemHealth', () => {
    it('deve executar verificação completa de saúde', async () => {
      const result = await healthService.checkSystemHealth();

      expect(result).toHaveProperty('physicalProducts');
      expect(result).toHaveProperty('subscriptions');
      expect(result).toHaveProperty('overall');

      expect(result.physicalProducts.system).toBe('physical_products');
      expect(result.subscriptions.system).toBe('subscriptions');
      expect(['healthy', 'warning', 'critical']).toContain(result.overall);
    });

    it('deve incluir checks detalhados para produtos físicos', async () => {
      const result = await healthService.checkSystemHealth();

      expect(result.physicalProducts.checks.length).toBeGreaterThan(0);
      
      // Verificar se inclui checks essenciais
      const checkNames = result.physicalProducts.checks.map(c => c.name);
      expect(checkNames).toContain('database_connectivity');
      expect(checkNames.some(name => name.includes('table_'))).toBe(true);
    });

    it('deve incluir checks detalhados para assinaturas', async () => {
      const result = await healthService.checkSystemHealth();

      expect(result.subscriptions.checks.length).toBeGreaterThan(0);
      
      // Verificar se inclui checks essenciais
      const checkNames = result.subscriptions.checks.map(c => c.name);
      expect(checkNames).toContain('system_isolation');
      expect(checkNames.some(name => name.includes('table_subscription'))).toBe(true);
    });

    it('deve determinar status geral corretamente', async () => {
      const result = await healthService.checkSystemHealth();

      // Se ambos os sistemas estão saudáveis, geral deve ser saudável
      if (result.physicalProducts.status === 'healthy' && result.subscriptions.status === 'healthy') {
        expect(result.overall).toBe('healthy');
      }

      // Se algum sistema tem warning, geral deve ter pelo menos warning
      if (result.physicalProducts.status === 'warning' || result.subscriptions.status === 'warning') {
        expect(['warning', 'critical']).toContain(result.overall);
      }

      // Se algum sistema é crítico, geral deve ser crítico
      if (result.physicalProducts.status === 'critical' || result.subscriptions.status === 'critical') {
        expect(result.overall).toBe('critical');
      }
    });

    it('deve incluir timestamps e duração', async () => {
      const result = await healthService.checkSystemHealth();

      expect(result.physicalProducts.lastChecked).toBeDefined();
      expect(result.physicalProducts.uptime).toBeGreaterThan(0);
      expect(result.subscriptions.lastChecked).toBeDefined();
      expect(result.subscriptions.uptime).toBeGreaterThan(0);

      // Verificar formato ISO do timestamp
      expect(() => new Date(result.physicalProducts.lastChecked)).not.toThrow();
      expect(() => new Date(result.subscriptions.lastChecked)).not.toThrow();
    });
  });

  describe('generateHealthReport', () => {
    it('deve gerar relatório em formato legível', async () => {
      const healthStatus = await healthService.checkSystemHealth();
      const report = healthService.generateHealthReport(healthStatus);

      expect(report).toContain('RELATÓRIO DE SAÚDE DOS SISTEMAS');
      expect(report).toContain('Sistema de Produtos Físicos');
      expect(report).toContain('Sistema de Assinaturas');
      expect(report).toContain('Status Geral:');
    });

    it('deve incluir detalhes dos checks no relatório', async () => {
      const healthStatus = await healthService.checkSystemHealth();
      const report = healthService.generateHealthReport(healthStatus);

      // Verificar se inclui ícones de status (usando includes ao invés de regex)
      const hasStatusIcons = report.includes('✅') || report.includes('⚠️') || report.includes('❌');
      expect(hasStatusIcons).toBe(true);
      
      // Verificar se inclui informações de duração
      expect(report).toMatch(/\d+ms/);
    });

    it('deve mostrar status em maiúsculas no relatório', async () => {
      const healthStatus = await healthService.checkSystemHealth();
      const report = healthService.generateHealthReport(healthStatus);

      expect(report).toMatch(/Status.*:(.*)(HEALTHY|WARNING|CRITICAL)/);
    });
  });

  describe('Verificações específicas', () => {
    it('deve verificar isolamento entre sistemas', async () => {
      const result = await healthService.checkSystemHealth();
      
      const isolationCheck = result.subscriptions.checks.find(
        check => check.name === 'system_isolation'
      );

      expect(isolationCheck).toBeDefined();
      expect(isolationCheck?.status).toBe('pass');
      expect(isolationCheck?.message.toLowerCase()).toContain('isolamento');
    });

    it('deve verificar conectividade do banco', async () => {
      const result = await healthService.checkSystemHealth();
      
      const connectivityCheck = result.physicalProducts.checks.find(
        check => check.name === 'database_connectivity'
      );

      expect(connectivityCheck).toBeDefined();
      expect(['pass', 'fail']).toContain(connectivityCheck?.status);
    });

    it('deve verificar tabelas críticas', async () => {
      const result = await healthService.checkSystemHealth();
      
      // Verificar se há checks para tabelas críticas
      const tableChecks = result.physicalProducts.checks.filter(
        check => check.name.startsWith('table_')
      );

      expect(tableChecks.length).toBeGreaterThan(0);
      
      // Verificar tabelas específicas
      const orderTableCheck = tableChecks.find(check => check.name === 'table_orders');
      const productTableCheck = tableChecks.find(check => check.name === 'table_products');
      
      expect(orderTableCheck).toBeDefined();
      expect(productTableCheck).toBeDefined();
    });

    it('deve verificar Edge Functions', async () => {
      const result = await healthService.checkSystemHealth();
      
      const edgeFunctionChecks = result.subscriptions.checks.filter(
        check => check.name.startsWith('edge_function_')
      );

      expect(edgeFunctionChecks.length).toBeGreaterThan(0);
      
      // Verificar funções específicas
      const expectedFunctions = [
        'create-payment',
        'poll-payment-status',
        'create-subscription',
        'process-webhook'
      ];

      expectedFunctions.forEach(functionName => {
        const functionCheck = edgeFunctionChecks.find(
          check => check.name === `edge_function_${functionName}`
        );
        expect(functionCheck).toBeDefined();
      });
    });

    it('deve verificar serviços de assinaturas', async () => {
      const result = await healthService.checkSystemHealth();
      
      const serviceChecks = result.subscriptions.checks.filter(
        check => check.name.startsWith('service_')
      );

      expect(serviceChecks.length).toBeGreaterThan(0);
      
      // Verificar serviços específicos
      const expectedServices = [
        'paymentorchestratorservice',
        'pollingservice',
        'webhookhandlerservice',
        'notificationservice'
      ];

      expectedServices.forEach(serviceName => {
        const serviceCheck = serviceChecks.find(
          check => check.name === `service_${serviceName}`
        );
        expect(serviceCheck).toBeDefined();
      });
    });
  });

  describe('Tratamento de erros', () => {
    it('deve lidar com erros de conectividade', async () => {
      // Mock de erro no Supabase
      const { supabase } = await import('../../src/config/supabase');
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ 
            data: null, 
            error: { message: 'Connection failed' } 
          }))
        }))
      }) as any);

      const result = await healthService.checkSystemHealth();
      
      // Sistema deve reportar problemas mas não falhar completamente
      expect(result).toBeDefined();
      expect(result.overall).toBeDefined();
    });

    it('deve incluir informações de erro nos checks', async () => {
      // Mock de erro no Supabase
      const { supabase } = await import('../../src/config/supabase');
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn(() => ({
          limit: vi.fn(() => Promise.reject(new Error('Database error')))
        }))
      }) as any);

      const result = await healthService.checkSystemHealth();
      
      // Deve haver checks com status de falha
      const failedChecks = [
        ...result.physicalProducts.checks,
        ...result.subscriptions.checks
      ].filter(check => check.status === 'fail');

      expect(failedChecks.length).toBeGreaterThan(0);
      
      // Checks com falha devem incluir mensagem de erro
      failedChecks.forEach(check => {
        expect(check.message).toBeDefined();
        expect(check.message.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Performance', () => {
    it('deve completar verificação em tempo razoável', async () => {
      const startTime = Date.now();
      await healthService.checkSystemHealth();
      const duration = Date.now() - startTime;

      // Verificação deve completar em menos de 10 segundos
      expect(duration).toBeLessThan(10000);
    });

    it('deve incluir métricas de duração nos checks', async () => {
      const result = await healthService.checkSystemHealth();
      
      const allChecks = [
        ...result.physicalProducts.checks,
        ...result.subscriptions.checks
      ];

      allChecks.forEach(check => {
        expect(check.duration).toBeGreaterThanOrEqual(0);
        expect(typeof check.duration).toBe('number');
      });
    });
  });

  describe('Metadados', () => {
    it('deve incluir metadados relevantes nos checks', async () => {
      const result = await healthService.checkSystemHealth();
      
      const allChecks = [
        ...result.physicalProducts.checks,
        ...result.subscriptions.checks
      ];

      // Verificar se checks de tabela incluem metadados
      const tableChecks = allChecks.filter(check => check.name.startsWith('table_'));
      tableChecks.forEach(check => {
        expect(check.metadata).toBeDefined();
        expect(check.metadata).toHaveProperty('tableName');
        expect(check.metadata).toHaveProperty('system');
      });

      // Verificar se checks de serviços incluem metadados
      const serviceChecks = allChecks.filter(check => check.name.startsWith('service_'));
      serviceChecks.forEach(check => {
        expect(check.metadata).toBeDefined();
        expect(check.metadata).toHaveProperty('serviceName');
        expect(check.metadata).toHaveProperty('type');
      });
    });
  });
});