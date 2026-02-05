/**
 * Supabase Configuration
 * Sprint 3: Sistema de Vendas
 * 
 * Compatível com frontend (Vite) e backend (Node.js)
 * Atualizado: 04/02/2026 - Configuração para testes com banco real
 */

import { createClient } from '@supabase/supabase-js';

// Detectar ambiente: Vite (import.meta.env) ou Node.js (process.env)
const isVite = typeof import.meta !== 'undefined' && import.meta.env;
const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';

const supabaseUrl = isVite 
  ? import.meta.env.VITE_SUPABASE_URL 
  : process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';

// Para testes, usar Service Role Key para contornar RLS
// Para produção, usar Anon Key normal
const supabaseKey = isTest 
  ? process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  : isVite 
    ? import.meta.env.VITE_SUPABASE_ANON_KEY 
    : process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase URL e KEY não configurados. Algumas funcionalidades podem não funcionar.');
  console.warn('URL:', supabaseUrl ? 'OK' : 'MISSING');
  console.warn('KEY:', supabaseKey ? 'OK' : 'MISSING');
  console.warn('Environment:', { isVite, isTest });
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Exportar URL para uso em Edge Functions
export { supabaseUrl };
