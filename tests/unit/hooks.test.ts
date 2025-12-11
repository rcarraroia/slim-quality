import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '@/hooks/useDebounce';
import { useCache } from '@/hooks/useCache';

/**
 * TESTES UNITÁRIOS - HOOKS CUSTOMIZADOS
 */

describe('Custom Hooks Tests', () => {
  describe('useDebounce', () => {
    it('deve retornar valor inicial imediatamente', () => {
      const { result } = renderHook(() => useDebounce('test', 500));
      expect(result.current).toBe('test');
    });

    it('deve debounce valor após delay', async () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'initial', delay: 100 } }
      );

      expect(result.current).toBe('initial');

      // Atualizar valor
      rerender({ value: 'updated', delay: 100 });

      // Valor ainda deve ser o inicial
      expect(result.current).toBe('initial');

      // Aguardar delay
      await new Promise(resolve => setTimeout(resolve, 150));

      // Agora deve ter o valor atualizado
      expect(result.current).toBe('updated');
    });
  });

  describe('useCache', () => {
    it('deve inicializar sem dados', () => {
      const { result } = renderHook(() => 
        useCache<string>({ key: 'test-key', ttl: 5000 })
      );

      expect(result.current.data).toBeUndefined();
      expect(result.current.isValid()).toBe(false);
    });

    it('deve armazenar e recuperar dados', () => {
      const { result } = renderHook(() => 
        useCache<string>({ key: 'test-key-2', ttl: 5000 })
      );

      act(() => {
        result.current.set('test data');
      });

      expect(result.current.data).toBe('test data');
      expect(result.current.isValid()).toBe(true);
    });

    it('deve limpar cache', () => {
      const { result } = renderHook(() => 
        useCache<string>({ key: 'test-key-3', ttl: 5000 })
      );

      act(() => {
        result.current.set('test data');
      });

      expect(result.current.data).toBe('test data');

      act(() => {
        result.current.clear();
      });

      expect(result.current.data).toBeUndefined();
    });
  });
});
