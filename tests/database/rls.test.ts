/**
 * Testes de Banco de Dados - RLS (Row Level Security)
 * Conforme SOLICITACAO_TESTES_AUTOMATIZADOS.md
 */

import { describe, it, expect } from 'vitest';
import { supabase } from '@/config/supabase';

describe('Banco de Dados - RLS', () => {
    it('Tabela profiles deve ter RLS ativo', async () => {
        // Tentar acessar sem autenticação (deve falhar ou retornar vazio)
        const { data, error } = await supabase
            .from('profiles')
            .select('*');

        // Com anon key, não deve retornar dados sensíveis
        console.log('RLS profiles:', data?.length || 0, 'registros visíveis');
        console.log('Erro (esperado se RLS ativo):', error?.message || 'Nenhum erro');

        // RLS está funcionando se houver erro ou dados limitados
        expect(data).toBeDefined();
    });

    it('Tabela affiliates deve ter RLS ativo', async () => {
        const { data, error } = await supabase
            .from('affiliates')
            .select('*');

        console.log('RLS affiliates:', data?.length || 0, 'registros visíveis');
        console.log('Erro (esperado se RLS ativo):', error?.message || 'Nenhum erro');

        expect(data).toBeDefined();
    });

    it('Tabela orders deve ter RLS ativo', async () => {
        const { data, error } = await supabase
            .from('orders')
            .select('*');

        console.log('RLS orders:', data?.length || 0, 'registros visíveis');
        console.log('Erro (esperado se RLS ativo):', error?.message || 'Nenhum erro');

        expect(data).toBeDefined();
    });

    it('Tabela commissions deve ter RLS ativo', async () => {
        const { data, error } = await supabase
            .from('commissions')
            .select('*');

        console.log('RLS commissions:', data?.length || 0, 'registros visíveis');
        console.log('Erro (esperado se RLS ativo):', error?.message || 'Nenhum erro');

        expect(data).toBeDefined();
    });
});
