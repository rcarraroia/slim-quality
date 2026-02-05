/**
 * Setup global para testes - SIMPLIFICADO
 */

import { vi } from 'vitest';

// Configurar variáveis de ambiente básicas
process.env.NODE_ENV = 'test';
process.env.VITEST = 'true';

// URLs fixas para evitar problemas de carregamento
process.env.VITE_SUPABASE_URL = 'https://vtynmmtuvxreiwcxxlma.supabase.co';
process.env.SUPABASE_URL = 'https://vtynmmtuvxreiwcxxlma.supabase.co';

// Mock básico do fetch
global.fetch = vi.fn();

// Silenciar logs desnecessários
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
};
