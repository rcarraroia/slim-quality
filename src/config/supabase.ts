/**
 * Supabase Configuration
 * Sprint 3: Sistema de Vendas
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não configurados. Algumas funcionalidades podem não funcionar.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
