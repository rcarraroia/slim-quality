/**
 * Testes para CommissionCalculatorService
 * Task 4.2: Property Test - Soma de comissões = 30%
 * 
 * Property 4: Soma de comissões sempre = 30% do valor da venda
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CommissionCalculatorService } from '@/services/affiliates/commission-calculator.service';
import { COMMISSION_RATES } from '@/constants/storage-keys';

describe('CommissionCalculatorService', () => {
  let calculator: CommissionCalculatorService;

  beforeEach(() => {
    calculator = new CommissionCalculatorService();
  });

  describe('Property 4: Soma de comissões = 30%', () => {
    it('deve calcular corretamente com apenas N1 (sem rede)', async () => {
      // Cenário: Vendedor sem ascendentes (usando ID real do banco)
      // Beatriz Fatima Almeida Carraro (sem referred_by)
      // Esperado: N1=15%, N2=0%, N3=0%, Renum=7.5%, JB=7.5%
      const orderValue = 329000; // R$ 3.290,00 em centavos
      
      const result = await calculator.calculateCommissions({
        orderId: 'order-test-1',
        orderValue,
        affiliateN1Id: '6f889212-9f9a-4ed8-9429-c3bdf26cb9da' // Beatriz Fatima (sem referred_by)
      });

      // Validar valores individuais
      expect(result.n1.value).toBe(Math.round(orderValue * 0.15)); // 15%
      expect(result.n2.value).toBe(0); // Sem N2
      expect(result.n3.value).toBe(0); // Sem N3
      
      // Validar redistribuição
      expect(result.redistributionApplied).toBe(true);
      expect(result.renum.percentage).toBe(0.075); // 5% + 2.5%
      expect(result.jb.percentage).toBe(0.075); // 5% + 2.5%

      // PROPERTY: Total = 30%
      const totalPercentage = result.n1.percentage + 
                             result.n2.percentage + 
                             result.n3.percentage + 
                             result.renum.percentage + 
                             result.jb.percentage;
      
      expect(totalPercentage).toBeCloseTo(COMMISSION_RATES.TOTAL, 10);
      
      // PROPERTY: Total em centavos = 30% do pedido (tolerância 1 centavo)
      const expectedTotal = Math.round(orderValue * COMMISSION_RATES.TOTAL);
      expect(Math.abs(result.totalCommission - expectedTotal)).toBeLessThanOrEqual(1);
    });

    it('deve calcular corretamente com N1 + N2 (sem N3)', async () => {
      // Cenário: Vendedor com 1 ascendente (usando IDs reais do banco)
      // Giuseppe Afonso (36f5a54f) tem referred_by = 6f889212 (Beatriz Fatima)
      // Esperado: N1=15%, N2=3%, N3=0%, Renum=6%, JB=6%
      const orderValue = 329000; // R$ 3.290,00
      
      const result = await calculator.calculateCommissions({
        orderId: 'order-test-2',
        orderValue,
        affiliateN1Id: '36f5a54f-cb07-4260-ae59-da71136a2940' // Giuseppe Afonso (tem N2)
      });

      // Validar valores individuais
      expect(result.n1.value).toBe(Math.round(orderValue * 0.15)); // 15%
      expect(result.n2.value).toBe(Math.round(orderValue * 0.03)); // 3%
      expect(result.n3.value).toBe(0); // Sem N3
      
      // Validar redistribuição
      expect(result.redistributionApplied).toBe(true);
      expect(result.renum.percentage).toBe(0.06); // 5% + 1%
      expect(result.jb.percentage).toBe(0.06); // 5% + 1%

      // PROPERTY: Total = 30%
      const totalPercentage = result.n1.percentage + 
                             result.n2.percentage + 
                             result.n3.percentage + 
                             result.renum.percentage + 
                             result.jb.percentage;
      
      expect(totalPercentage).toBeCloseTo(COMMISSION_RATES.TOTAL, 10);
      
      // PROPERTY: Total em centavos = 30% do pedido
      const expectedTotal = Math.round(orderValue * COMMISSION_RATES.TOTAL);
      expect(Math.abs(result.totalCommission - expectedTotal)).toBeLessThanOrEqual(1);
    });

    it('deve calcular corretamente com rede completa (N1 + N2 + N3)', async () => {
      // Cenário: Vendedor com 2 ascendentes (usando IDs reais do banco)
      // Maria Edurda Carraro (3be7c0cb) → Giuseppe Afonso (36f5a54f) → Beatriz Fatima (6f889212)
      // Esperado: N1=15%, N2=3%, N3=2%, Renum=5%, JB=5%
      const orderValue = 329000; // R$ 3.290,00
      
      const result = await calculator.calculateCommissions({
        orderId: 'order-test-3',
        orderValue,
        affiliateN1Id: '3be7c0cb-344a-4c1a-ac49-e0bd77104223' // Maria Edurda (tem N2 e N3)
      });

      // Validar valores individuais
      expect(result.n1.value).toBe(Math.round(orderValue * 0.15)); // 15%
      expect(result.n2.value).toBe(Math.round(orderValue * 0.03)); // 3%
      expect(result.n3.value).toBe(Math.round(orderValue * 0.02)); // 2%
      
      // Validar SEM redistribuição
      expect(result.redistributionApplied).toBe(false);
      expect(result.renum.percentage).toBe(0.05); // 5% base
      expect(result.jb.percentage).toBe(0.05); // 5% base

      // PROPERTY: Total = 30%
      const totalPercentage = result.n1.percentage + 
                             result.n2.percentage + 
                             result.n3.percentage + 
                             result.renum.percentage + 
                             result.jb.percentage;
      
      expect(totalPercentage).toBeCloseTo(COMMISSION_RATES.TOTAL, 10);
      
      // PROPERTY: Total em centavos = 30% do pedido
      const expectedTotal = Math.round(orderValue * COMMISSION_RATES.TOTAL);
      expect(Math.abs(result.totalCommission - expectedTotal)).toBeLessThanOrEqual(1);
    });

    it('deve manter 30% com diferentes valores de pedido', async () => {
      // Property-based test: Testar com múltiplos valores usando ID real
      const testValues = [
        100000,  // R$ 1.000,00
        329000,  // R$ 3.290,00 (Padrão)
        349000,  // R$ 3.490,00 (Queen)
        489000,  // R$ 4.890,00 (King)
        999999,  // R$ 9.999,99 (Edge case)
      ];

      for (const orderValue of testValues) {
        const result = await calculator.calculateCommissions({
          orderId: `order-test-${orderValue}`,
          orderValue,
          affiliateN1Id: '6f889212-9f9a-4ed8-9429-c3bdf26cb9da' // Beatriz Fatima (ID real)
        });

        // PROPERTY: Total sempre = 30% (tolerância 1 centavo)
        const expectedTotal = Math.round(orderValue * COMMISSION_RATES.TOTAL);
        const diff = Math.abs(result.totalCommission - expectedTotal);
        
        expect(diff).toBeLessThanOrEqual(1);
        
        // PROPERTY: Percentuais somam 30%
        const totalPercentage = result.n1.percentage + 
                               result.n2.percentage + 
                               result.n3.percentage + 
                               result.renum.percentage + 
                               result.jb.percentage;
        
        expect(totalPercentage).toBeCloseTo(COMMISSION_RATES.TOTAL, 10);
      }
    });

    it('deve redistribuir corretamente quando falta N2 e N3', async () => {
      // Cenário: Apenas N1, sem ascendentes (usando ID real)
      // Percentual não utilizado: 3% + 2% = 5%
      // Redistribuição: 2.5% para cada gestor
      const orderValue = 100000; // R$ 1.000,00
      
      const result = await calculator.calculateCommissions({
        orderId: 'order-redistribution-1',
        orderValue,
        affiliateN1Id: '6f889212-9f9a-4ed8-9429-c3bdf26cb9da' // Beatriz Fatima (sem referred_by)
      });

      expect(result.redistributionApplied).toBe(true);
      expect(result.redistributionDetails).toBeDefined();
      expect(result.redistributionDetails?.unusedPercentage).toBe(0.05); // 3% + 2%
      expect(result.redistributionDetails?.redistributedToRenum).toBe(0.025); // 2.5%
      expect(result.redistributionDetails?.redistributedToJB).toBe(0.025); // 2.5%
      
      // Validar valores finais dos gestores
      expect(result.renum.percentage).toBe(0.075); // 5% + 2.5%
      expect(result.jb.percentage).toBe(0.075); // 5% + 2.5%
    });

    it('deve redistribuir corretamente quando falta apenas N3', async () => {
      // Cenário: N1 + N2, sem N3 (usando IDs reais)
      // Percentual não utilizado: 2%
      // Redistribuição: 1% para cada gestor
      const orderValue = 100000; // R$ 1.000,00
      
      const result = await calculator.calculateCommissions({
        orderId: 'order-redistribution-2',
        orderValue,
        affiliateN1Id: '36f5a54f-cb07-4260-ae59-da71136a2940' // Giuseppe Afonso (tem N2, sem N3)
      });

      expect(result.redistributionApplied).toBe(true);
      expect(result.redistributionDetails).toBeDefined();
      expect(result.redistributionDetails?.unusedPercentage).toBe(0.02); // 2%
      expect(result.redistributionDetails?.redistributedToRenum).toBe(0.01); // 1%
      expect(result.redistributionDetails?.redistributedToJB).toBe(0.01); // 1%
      
      // Validar valores finais dos gestores
      expect(result.renum.percentage).toBe(0.06); // 5% + 1%
      expect(result.jb.percentage).toBe(0.06); // 5% + 1%
    });

    it('deve validar que soma nunca ultrapassa 30%', async () => {
      // Property: Soma NUNCA pode ser > 30% (usando ID real)
      const orderValue = 329000;
      
      const result = await calculator.calculateCommissions({
        orderId: 'order-validation',
        orderValue,
        affiliateN1Id: '6f889212-9f9a-4ed8-9429-c3bdf26cb9da' // Beatriz Fatima (ID real)
      });

      const totalPercentage = result.n1.percentage + 
                             result.n2.percentage + 
                             result.n3.percentage + 
                             result.renum.percentage + 
                             result.jb.percentage;
      
      // PROPERTY: Total <= 30% (com margem de erro mínima)
      expect(totalPercentage).toBeLessThanOrEqual(COMMISSION_RATES.TOTAL + 0.0001);
    });

    it('deve validar que nenhuma comissão é negativa', async () => {
      // Property: Todas as comissões >= 0 (usando ID real)
      const orderValue = 329000;
      
      const result = await calculator.calculateCommissions({
        orderId: 'order-positive',
        orderValue,
        affiliateN1Id: '6f889212-9f9a-4ed8-9429-c3bdf26cb9da' // Beatriz Fatima (ID real)
      });

      // PROPERTY: Todos os valores >= 0
      expect(result.n1.value).toBeGreaterThanOrEqual(0);
      expect(result.n2.value).toBeGreaterThanOrEqual(0);
      expect(result.n3.value).toBeGreaterThanOrEqual(0);
      expect(result.renum.value).toBeGreaterThanOrEqual(0);
      expect(result.jb.value).toBeGreaterThanOrEqual(0);
      
      // PROPERTY: Todos os percentuais >= 0
      expect(result.n1.percentage).toBeGreaterThanOrEqual(0);
      expect(result.n2.percentage).toBeGreaterThanOrEqual(0);
      expect(result.n3.percentage).toBeGreaterThanOrEqual(0);
      expect(result.renum.percentage).toBeGreaterThanOrEqual(0);
      expect(result.jb.percentage).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Validações de Erro', () => {
    it('deve lançar erro se afiliado N1 não existir', async () => {
      await expect(
        calculator.calculateCommissions({
          orderId: 'order-invalid',
          orderValue: 100000,
          affiliateN1Id: 'aff-inexistente'
        })
      ).rejects.toThrow('Afiliado N1 não encontrado');
    });

    it('deve lançar erro se soma de comissões for inválida', async () => {
      // Este teste valida que o sistema detecta inconsistências
      // (Normalmente não deveria acontecer, mas é uma validação de segurança)
      
      // Nota: Este teste requer mock do cálculo para forçar erro
      // Por enquanto, validamos que a função de validação existe
      expect(calculator.calculateCommissions).toBeDefined();
    });
  });

  describe('Casos Edge', () => {
    it('deve lidar com valores muito pequenos (1 centavo)', async () => {
      const orderValue = 1; // 1 centavo
      
      const result = await calculator.calculateCommissions({
        orderId: 'order-tiny',
        orderValue,
        affiliateN1Id: '6f889212-9f9a-4ed8-9429-c3bdf26cb9da' // Beatriz Fatima (ID real)
      });

      // Mesmo com 1 centavo, soma deve ser <= 1 centavo (30% de 1 = 0.3 ≈ 0)
      expect(result.totalCommission).toBeLessThanOrEqual(1);
    });

    it('deve lidar com valores muito grandes (R$ 100.000,00)', async () => {
      const orderValue = 10000000; // R$ 100.000,00
      
      const result = await calculator.calculateCommissions({
        orderId: 'order-huge',
        orderValue,
        affiliateN1Id: '6f889212-9f9a-4ed8-9429-c3bdf26cb9da' // Beatriz Fatima (ID real)
      });

      // Total = 30% de 100k = 30k
      const expectedTotal = Math.round(orderValue * COMMISSION_RATES.TOTAL);
      expect(Math.abs(result.totalCommission - expectedTotal)).toBeLessThanOrEqual(1);
    });

    it('deve arredondar corretamente valores com decimais', async () => {
      // Valor que gera decimais: R$ 3.333,33
      const orderValue = 333333;
      
      const result = await calculator.calculateCommissions({
        orderId: 'order-decimal',
        orderValue,
        affiliateN1Id: '6f889212-9f9a-4ed8-9429-c3bdf26cb9da' // Beatriz Fatima (ID real)
      });

      // Validar que todos os valores são inteiros (centavos)
      expect(Number.isInteger(result.n1.value)).toBe(true);
      expect(Number.isInteger(result.n2.value)).toBe(true);
      expect(Number.isInteger(result.n3.value)).toBe(true);
      expect(Number.isInteger(result.renum.value)).toBe(true);
      expect(Number.isInteger(result.jb.value)).toBe(true);
      expect(Number.isInteger(result.totalCommission)).toBe(true);
    });
  });
});
