/**
 * Testes de Sincronização Automática - affiliate_network_view
 * Task 2.6: Testar sincronização automática (OBRIGATÓRIO)
 * Property 9: Sincronização Automática
 * 
 * Valida que a VIEW materializada é atualizada automaticamente
 * quando affiliates.referred_by é modificado
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://vtynmmtuvxreiwcxxlma.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

// IDs de teste para limpeza
const testAffiliateIds: string[] = [];

describe('Property 9: Sincronização Automática da VIEW', () => {
  
  afterAll(async () => {
    // Limpar dados de teste
    if (testAffiliateIds.length > 0) {
      await supabase
        .from('affiliates')
        .delete()
        .in('id', testAffiliateIds);
    }
  });

  it('deve inserir afiliado na VIEW quando criado em affiliates', async () => {
    // Arrange: Criar afiliado de teste sem indicador (raiz)
    const testAffiliate = {
      name: 'Teste Sync Insert',
      email: `test-sync-insert-${Date.now()}@example.com`,
      referral_code: `TST${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      referred_by: null
    };

    // Act: Inserir afiliado
    const { data: newAffiliate, error: insertError } = await supabase
      .from('affiliates')
      .insert(testAffiliate)
      .select()
      .single();

    expect(insertError).toBeNull();
    expect(newAffiliate).toBeDefined();
    testAffiliateIds.push(newAffiliate!.id);

    // Aguardar trigger processar (pode levar alguns ms)
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Assert: Verificar se apareceu na VIEW
    const { data: viewRecord, error: viewError } = await supabase
      .from('affiliate_network_view')
      .select('*')
      .eq('affiliate_id', newAffiliate!.id)
      .single();

    expect(viewError).toBeNull();
    expect(viewRecord).toBeDefined();
    expect(viewRecord!.affiliate_id).toBe(newAffiliate!.id);
    expect(viewRecord!.parent_id).toBeNull(); // Raiz não tem parent
    expect(viewRecord!.level).toBe(1); // Raiz é nível 1
  });

  it('deve atualizar VIEW quando referred_by é modificado', async () => {
    // Arrange: Criar dois afiliados (pai e filho)
    const parentAffiliate = {
      name: 'Teste Sync Parent',
      email: `test-sync-parent-${Date.now()}@example.com`,
      referral_code: `PAR${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      referred_by: null
    };

    const { data: parent, error: parentError } = await supabase
      .from('affiliates')
      .insert(parentAffiliate)
      .select()
      .single();

    expect(parentError).toBeNull();
    testAffiliateIds.push(parent!.id);

    const childAffiliate = {
      name: 'Teste Sync Child',
      email: `test-sync-child-${Date.now()}@example.com`,
      referral_code: `CHI${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      referred_by: null // Inicialmente sem parent
    };

    const { data: child, error: childError } = await supabase
      .from('affiliates')
      .insert(childAffiliate)
      .select()
      .single();

    expect(childError).toBeNull();
    testAffiliateIds.push(child!.id);

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Act: Atualizar referred_by do filho para apontar para o pai
    const { error: updateError } = await supabase
      .from('affiliates')
      .update({ referred_by: parent!.id })
      .eq('id', child!.id);

    expect(updateError).toBeNull();

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Assert: Verificar se VIEW foi atualizada
    const { data: updatedView, error: viewError } = await supabase
      .from('affiliate_network_view')
      .select('*')
      .eq('affiliate_id', child!.id)
      .single();

    expect(viewError).toBeNull();
    expect(updatedView).toBeDefined();
    expect(updatedView!.parent_id).toBe(parent!.id); // Agora tem parent
    expect(updatedView!.level).toBe(2); // Filho é nível 2
  });

  it('deve remover da VIEW quando afiliado é deletado', async () => {
    // Arrange: Criar afiliado de teste
    const testAffiliate = {
      name: 'Teste Sync Delete',
      email: `test-sync-delete-${Date.now()}@example.com`,
      referral_code: `DEL${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      referred_by: null
    };

    const { data: newAffiliate, error: insertError } = await supabase
      .from('affiliates')
      .insert(testAffiliate)
      .select()
      .single();

    expect(insertError).toBeNull();
    const affiliateId = newAffiliate!.id;

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verificar que está na VIEW
    const { data: beforeDelete } = await supabase
      .from('affiliate_network_view')
      .select('*')
      .eq('affiliate_id', affiliateId)
      .single();

    expect(beforeDelete).toBeDefined();

    // Act: Deletar afiliado
    const { error: deleteError } = await supabase
      .from('affiliates')
      .delete()
      .eq('id', affiliateId);

    expect(deleteError).toBeNull();

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Assert: Verificar que foi removido da VIEW
    const { data: afterDelete, error: viewError } = await supabase
      .from('affiliate_network_view')
      .select('*')
      .eq('affiliate_id', affiliateId)
      .single();

    // Deve retornar erro PGRST116 (não encontrado)
    expect(viewError).toBeDefined();
    expect(afterDelete).toBeNull();
  });

  it('deve construir hierarquia correta com 3 níveis', async () => {
    // Arrange: Criar hierarquia N1 -> N2 -> N3
    const n1 = {
      name: 'Teste N1',
      email: `test-n1-${Date.now()}@example.com`,
      referral_code: `N1${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      referred_by: null
    };

    const { data: level1, error: n1Error } = await supabase
      .from('affiliates')
      .insert(n1)
      .select()
      .single();

    expect(n1Error).toBeNull();
    testAffiliateIds.push(level1!.id);

    const n2 = {
      name: 'Teste N2',
      email: `test-n2-${Date.now()}@example.com`,
      referral_code: `N2${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      referred_by: level1!.id
    };

    const { data: level2, error: n2Error } = await supabase
      .from('affiliates')
      .insert(n2)
      .select()
      .single();

    expect(n2Error).toBeNull();
    testAffiliateIds.push(level2!.id);

    const n3 = {
      name: 'Teste N3',
      email: `test-n3-${Date.now()}@example.com`,
      referral_code: `N3${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      referred_by: level2!.id
    };

    const { data: level3, error: n3Error } = await supabase
      .from('affiliates')
      .insert(n3)
      .select()
      .single();

    expect(n3Error).toBeNull();
    testAffiliateIds.push(level3!.id);

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Assert: Verificar hierarquia na VIEW
    const { data: viewRecords, error: viewError } = await supabase
      .from('affiliate_network_view')
      .select('*')
      .in('affiliate_id', [level1!.id, level2!.id, level3!.id])
      .order('level', { ascending: true });

    expect(viewError).toBeNull();
    expect(viewRecords).toHaveLength(3);

    // Validar N1
    const n1View = viewRecords!.find(r => r.affiliate_id === level1!.id);
    expect(n1View!.level).toBe(1);
    expect(n1View!.parent_id).toBeNull();

    // Validar N2
    const n2View = viewRecords!.find(r => r.affiliate_id === level2!.id);
    expect(n2View!.level).toBe(2);
    expect(n2View!.parent_id).toBe(level1!.id);

    // Validar N3
    const n3View = viewRecords!.find(r => r.affiliate_id === level3!.id);
    expect(n3View!.level).toBe(3);
    expect(n3View!.parent_id).toBe(level2!.id);
  });
});
