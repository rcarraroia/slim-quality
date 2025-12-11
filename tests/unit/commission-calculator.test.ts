/**
 * Commission Calculator Tests - REFATORADO
 * Sprint 4: Sistema de Afiliados Multinível
 * 
 * Testes para o orquestrador de comissões
 * - Validação de entrada
 * - Orquestração com função SQL
 * - Conversão de resultados
 * - Tratamento de erros
 * 
 * NOTA: Lógica de cálculo agora testada via testes de integração SQL
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CommissionCalculatorService } from '@/services/affiliates/commission-calculator.service';
import { supabase } from '@/config/supabase';

// Mock do Supabase
vi.mock('@/config/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

// Mock do Logger
vi.mock('@/utils/logger', () => ({
  Logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('CommissionCalculatorService - Refatorado', () => {
  let calculator: CommissionCalculatorService;
  let mockSupabase: any;

  beforeEach(() => {
    calculator = new CommissionCalculatorService();
    mockSupabase = supabase as any;
    vi.clearAllMocks();
  });

  describe('calculateCommissions - Orquestração', () => {
    const baseInput = {
      orderId: 'order_123',
      orderValueCents: 329000, // R$ 3.290,00
      affiliateUserId: 'user_affiliate_1',
    };

    it('deve validar entrada e executar função SQL com sucesso', async () => {
      // Mock: validação de entrada bem-sucedida
      mockSupabase.from
        .mockReturnValueOnce({
          select: () => ({
            eq: () => ({
              is: () => ({
                single: () => Promise.resolve({
                  data: {
                    id: 'order_123',
                    total_cents: 329000,
                    status: 'confirmed',
                  },
                }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({
                data: {
                  id: 'split_123',
                  order_id: 'order_123',
                  total_order_value_cents: 329000,
                  factory_percentage: 70.00,
                  factory_value_cents: 230300,
                  n1_affiliate_id: 'aff_n1',
                  n1_percentage: 15.00,
                  n1_value_cents: 49350,
                  n2_affiliate_id: null,
                  n2_percentage: null,
                  n2_value_cents: null,
                  n3_affiliate_id: null,
                  n3_percentage: null,
                  n3_value_cents: null,
                  renum_percentage: 7.50,
                  renum_value_cents: 24675,
                  jb_percentage: 7.50,
                  jb_value_cents: 24675,
                  redistribution_applied: true,
                  redistribution_details: {
                    available_percentage: 5.00,
                    bonus_per_manager: 2.50,
                    reason: 'only_n1',
                  },
                },
              }),
            }),
          }),
        });

      // Mock: função SQL executada com sucesso
      mockSupabase.rpc
        .mockResolvedValueOnce({
          data: 'split_123',
          error: null,
        })
        .mockResolvedValueOnce({ data: 'log_id' });

      const result = await calculator.calculateCommissions(baseInput);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const calculation = result.data!;
      expect(calculation.orderId).toBe('order_123');
      expect(calculation.totalValueCents).toBe(329000);
      expect(calculation.factory.percentage).toBe(70.00);
      expect(calculation.redistributionApplied).toBe(true);

      // Verificar chamada da função SQL
      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'calculate_commission_split',
        { p_order_id: 'order_123' }
      );
    });

    it('deve tratar erro quando pedido não existe', async () => {
      // Mock: pedido não encontrado
      mockSupabase.from.mockReturnValueOnce({
        select: () => ({
          eq: () => ({
            is: () => ({
              single: () => Promise.resolve({
                data: null,
                error: { message: 'Order not found' },
              }),
            }),
          }),
        }),
      });

      const result = await calculator.calculateCommissions(baseInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Pedido não encontrado');
      expect(result.code).toBe('ORDER_NOT_FOUND');
    });

    it('deve tratar erro na função SQL', async () => {
      // Mock: validação OK
      mockSupabase.from
        .mockReturnValueOnce({
          select: () => ({
            eq: () => ({
              is: () => ({
                single: () => Promise.resolve({
                  data: { id: 'order_123', total_cents: 329000, status: 'confirmed' },
                }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: null }),
            }),
          }),
        });

      // Mock: erro na função SQL
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'SQL function error' },
      });

      const result = await calculator.calculateCommissions(baseInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Erro ao calcular comissões no banco');
      expect(result.code).toBe('SQL_CALCULATION_ERROR');
    });

    it('deve converter resultado corretamente', async () => {
      // Mock: validação OK
      mockSupabase.from
        .mockReturnValueOnce({
          select: () => ({
            eq: () => ({
              is: () => ({
                single: () => Promise.resolve({
                  data: { id: 'order_123', total_cents: 329000, status: 'confirmed' },
                }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({
                data: {
                  order_id: 'order_123',
                  total_order_value_cents: 329000,
                  factory_percentage: 70.00,
                  factory_value_cents: 230300,
                  n1_affiliate_id: 'aff_n1',
                  n1_percentage: 15.00,
                  n1_value_cents: 49350,
                  n2_affiliate_id: 'aff_n2',
                  n2_percentage: 3.00,
                  n2_value_cents: 9870,
                  n3_affiliate_id: 'aff_n3',
                  n3_percentage: 2.00,
                  n3_value_cents: 6580,
                  renum_percentage: 5.00,
                  renum_value_cents: 16450,
                  jb_percentage: 5.00,
                  jb_value_cents: 16450,
                  redistribution_applied: false,
                  redistribution_details: null,
                },
              }),
            }),
          }),
        });

      // Mock: função SQL OK
      mockSupabase.rpc
        .mockResolvedValueOnce({ data: 'split_123', error: null })
        .mockResolvedValueOnce({ data: 'log_id' });

      const result = await calculator.calculateCommissions(baseInput);

      expect(result.success).toBe(true);
      const calculation = result.data!;

      // Validar conversão completa
      expect(calculation.n1).toBeDefined();
      expect(calculation.n2).toBeDefined();
      expect(calculation.n3).toBeDefined();
      expect(calculation.n1!.affiliateId).toBe('aff_n1');
      expect(calculation.n2!.affiliateId).toBe('aff_n2');
      expect(calculation.n3!.affiliateId).toBe('aff_n3');
      expect(calculation.redistributionApplied).toBe(false);
      expect(calculation.totalPercentage).toBe(100.00);
    });
  });

  describe('saveCalculationResult - Deprecated', () => {
    it('deve retornar split existente', async () => {
      const mockResult = {
        orderId: 'order_123',
        totalValueCents: 329000,
      } as any;

      // Mock: split encontrado
      mockSupabase.from.mockReturnValueOnce({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({
              data: { id: 'split_123' },
            }),
          }),
        }),
      });

      const result = await calculator.saveCalculationResult(mockResult);

      expect(result.success).toBe(true);
      expect(result.data).toBe('split_123');
    });

    it('deve retornar erro se split não encontrado', async () => {
      const mockResult = {
        orderId: 'order_123',
      } as any;

      // Mock: split não encontrado
      mockSupabase.from.mockReturnValueOnce({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: null }),
          }),
        }),
      });

      const result = await calculator.saveCalculationResult(mockResult);

      expect(result.success).toBe(false);
      expect(result.code).toBe('DEPRECATED_METHOD');
    });
  });
});