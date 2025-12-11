/**
 * Testes de Autenticação - Login
 * Conforme SOLICITACAO_TESTES_AUTOMATIZADOS.md
 */

import { describe, it, expect } from 'vitest';
import { supabase } from '@/config/supabase';

describe('Autenticação - Login', () => {
  it('Deve fazer login com credenciais válidas', async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'rcarrarocoach@gmail.com',
      password: 'Renum@2025' // Nota: Senha precisa ser fornecida pelo solicitante
    });
    
    expect(error).toBeNull();
    expect(data.user).toBeDefined();
    expect(data.session).toBeDefined();
    
    console.log('✅ Login bem-sucedido:', data.user?.email);
  });

  it('Deve rejeitar login com credenciais inválidas', async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'invalido@teste.com',
      password: 'senha_errada'
    });
    
    expect(error).toBeDefined();
    expect(data.user).toBeNull();
    
    console.log('✅ Login rejeitado conforme esperado:', error?.message);
  });
});
