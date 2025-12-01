/**
 * Supabase Mock
 * Mock realista do cliente Supabase para testes
 */

import { vi } from 'vitest';

// Estado do mock (pode ser manipulado nos testes)
export const mockSupabaseState = {
  affiliates: [] as any[],
  profiles: [] as any[],
  affiliateNetwork: [] as any[],
  shouldFail: false,
  errorMessage: '',
};

// Reset state
export const resetMockState = () => {
  mockSupabaseState.affiliates = [];
  mockSupabaseState.profiles = [];
  mockSupabaseState.affiliateNetwork = [];
  mockSupabaseState.shouldFail = false;
  mockSupabaseState.errorMessage = '';
};

// Helper para criar query builder mock
const createQueryBuilder = (table: string) => {
  const builder: any = {
    select: vi.fn((columns?: string) => {
      builder._select = columns || '*';
      return builder;
    }),
    insert: vi.fn((data: any) => {
      builder._insert = data;
      return builder;
    }),
    update: vi.fn((data: any) => {
      builder._update = data;
      return builder;
    }),
    delete: vi.fn(() => {
      builder._delete = true;
      return builder;
    }),
    eq: vi.fn((column: string, value: any) => {
      builder._filters = builder._filters || [];
      builder._filters.push({ type: 'eq', column, value });
      return builder;
    }),
    neq: vi.fn((column: string, value: any) => {
      builder._filters = builder._filters || [];
      builder._filters.push({ type: 'neq', column, value });
      return builder;
    }),
    is: vi.fn((column: string, value: any) => {
      builder._filters = builder._filters || [];
      builder._filters.push({ type: 'is', column, value });
      return builder;
    }),
    in: vi.fn((column: string, values: any[]) => {
      builder._filters = builder._filters || [];
      builder._filters.push({ type: 'in', column, values });
      return builder;
    }),
    single: vi.fn(() => {
      if (mockSupabaseState.shouldFail) {
        return Promise.resolve({
          data: null,
          error: { message: mockSupabaseState.errorMessage || 'Database error' },
        });
      }

      const data = mockSupabaseState[table as keyof typeof mockSupabaseState];
      if (!Array.isArray(data)) {
        return Promise.resolve({ data: null, error: null });
      }

      // Aplicar filtros
      let filtered = [...data];
      if (builder._filters) {
        for (const filter of builder._filters) {
          if (filter.type === 'eq') {
            filtered = filtered.filter((item) => item[filter.column] === filter.value);
          } else if (filter.type === 'neq') {
            filtered = filtered.filter((item) => item[filter.column] !== filter.value);
          } else if (filter.type === 'is') {
            filtered = filtered.filter((item) => item[filter.column] === filter.value);
          } else if (filter.type === 'in') {
            filtered = filtered.filter((item) => filter.values.includes(item[filter.column]));
          }
        }
      }

      const result = filtered.length > 0 ? filtered[0] : null;
      return Promise.resolve({ data: result, error: null });
    }),
    maybeSingle: vi.fn(() => {
      return builder.single();
    }),
  };

  // Executar insert/update/delete
  builder.then = (resolve: any) => {
    if (mockSupabaseState.shouldFail) {
      resolve({
        data: null,
        error: { message: mockSupabaseState.errorMessage || 'Database error' },
      });
      return;
    }

    if (builder._insert) {
      const newData = Array.isArray(builder._insert) ? builder._insert : [builder._insert];
      const dataArray = mockSupabaseState[table as keyof typeof mockSupabaseState];
      if (Array.isArray(dataArray)) {
        dataArray.push(...newData);
      }
      resolve({ data: newData, error: null });
    } else if (builder._update) {
      resolve({ data: builder._update, error: null });
    } else if (builder._delete) {
      resolve({ data: null, error: null });
    } else {
      resolve({ data: null, error: null });
    }
  };

  return builder;
};

// Mock do cliente Supabase
export const mockSupabase = {
  from: vi.fn((table: string) => createQueryBuilder(table)),
  rpc: vi.fn((fn: string, params: any) => {
    if (mockSupabaseState.shouldFail) {
      return Promise.resolve({
        data: null,
        error: { message: mockSupabaseState.errorMessage || 'RPC error' },
      });
    }
    return Promise.resolve({ data: true, error: null });
  }),
};
