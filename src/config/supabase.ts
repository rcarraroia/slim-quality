/**
 * Supabase Configuration
 * Sprint 3: Sistema de Vendas
 * 
 * Compatível com frontend (Vite) e backend (Node.js)
 * Atualizado: 04/01/2026 - Forçar rebuild após correções SQL
 */

import { createClient } from '@supabase/supabase-js';

// Detectar ambiente: Vite (import.meta.env) ou Node.js (process.env)
const isVite = typeof import.meta !== 'undefined' && import.meta.env;

const supabaseUrl = isVite 
  ? import.meta.env.VITE_SUPABASE_URL 
  : process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';

const supabaseKey = isVite 
  ? import.meta.env.VITE_SUPABASE_ANON_KEY 
  : process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase URL e ANON_KEY não configurados. Algumas funcionalidades podem não funcionar.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
