// Script para validar e corrigir sincronização
// Task 2.2: Validar e corrigir dados antes do sync

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vtynmmtuvxreiwcxxlma.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function validateAndFix() {
  console.log('🔍 Validando estrutura de dados...\n');

  // 1. Buscar todos os afiliados
  console.log('📊 Buscando afiliados...');
  const { data: affiliates, error: affiliatesError } = await supabase
    .from('affiliates')
    .select('id, name, email, referral_code, referred_by');

  if (affiliatesError) {
    console.error('❌ Erro ao buscar afiliados:', affiliatesError);
    return;
  }

  console.log(`✅ Encontrados ${affiliates.length} afiliados\n`);

  // 2. Buscar registros na affiliate_network
  console.log('📊 Buscando registros em affiliate_network...');
  const { data: network, error: networkError } = await supabase
    .from('affiliate_network')
    .select('*');

  if (networkError) {
    console.error('❌ Erro ao buscar network:', networkError);
    return;
  }

  console.log(`✅ Encontrados ${network.length} registros em affiliate_network\n`);

  // 3. Identificar afiliados que estão em affiliates mas não em affiliate_network
  const networkAffiliateIds = new Set(network.map(n => n.affiliate_id));
  const missingInNetwork = affiliates.filter(a => !networkAffiliateIds.has(a.id));

  if (missingInNetwork.length > 0) {
    console.log('⚠️ Afiliados faltando em affiliate_network:');
    missingInNetwork.forEach(a => {
      console.log(`  - ${a.name} (${a.referral_code}) - ID: ${a.id}`);
    });
    console.log('');

    // 4. Inserir afiliados faltantes na affiliate_network
    console.log('🔧 Inserindo afiliados faltantes em affiliate_network...');
    for (const affiliate of missingInNetwork) {
      const newRecord = {
        affiliate_id: affiliate.id,
        parent_id: affiliate.referred_by || null,
        parent_affiliate_id: affiliate.referred_by || null,
        level: affiliate.referred_by ? 2 : 1, // Se tem parent, é nível 2, senão é raiz (nível 1)
        path: affiliate.referred_by ? `/${affiliate.referred_by}/${affiliate.id}` : `/${affiliate.id}`
      };

      const { error: insertError } = await supabase
        .from('affiliate_network')
        .insert(newRecord);

      if (insertError) {
        console.error(`❌ Erro ao inserir ${affiliate.name}:`, insertError);
      } else {
        console.log(`✅ ${affiliate.name} inserido com sucesso`);
      }
    }
    console.log('');
  } else {
    console.log('✅ Todos os afiliados já estão em affiliate_network\n');
  }

  // 5. Agora tentar sincronizar parent_id
  console.log('🔧 Sincronizando parent_id com parent_affiliate_id...');
  const { data: toSync, error: toSyncError } = await supabase
    .from('affiliate_network')
    .select('*')
    .not('parent_affiliate_id', 'is', null)
    .is('parent_id', null);

  if (toSyncError) {
    console.error('❌ Erro ao buscar registros para sync:', toSyncError);
    return;
  }

  if (toSync.length === 0) {
    console.log('✅ Nenhum registro precisa de sincronização\n');
  } else {
    console.log(`📊 ${toSync.length} registros precisam de sincronização`);
    
    for (const record of toSync) {
      const { error: updateError } = await supabase
        .from('affiliate_network')
        .update({ parent_id: record.parent_affiliate_id })
        .eq('id', record.id);

      if (updateError) {
        console.error(`❌ Erro ao sincronizar registro ${record.id}:`, updateError);
      } else {
        console.log(`✅ Registro ${record.id} sincronizado`);
      }
    }
    console.log('');
  }

  // 6. Validação final
  console.log('📊 Validação final...');
  const { data: finalCheck, error: finalError } = await supabase
    .from('affiliate_network')
    .select('id, affiliate_id, parent_id, parent_affiliate_id');

  if (finalError) {
    console.error('❌ Erro na validação final:', finalError);
    return;
  }

  const sincronizados = finalCheck.filter(r => 
    (r.parent_id === r.parent_affiliate_id) || 
    (r.parent_id === null && r.parent_affiliate_id === null)
  ).length;

  const inconsistentes = finalCheck.filter(r => 
    r.parent_id !== r.parent_affiliate_id && 
    !(r.parent_id === null && r.parent_affiliate_id === null)
  ).length;

  console.log(`✅ Sincronizados: ${sincronizados}/${finalCheck.length}`);
  console.log(`❌ Inconsistentes: ${inconsistentes}/${finalCheck.length}`);

  if (inconsistentes === 0) {
    console.log('\n🎉 SUCESSO! Todos os registros estão sincronizados!');
  } else {
    console.log('\n⚠️ Ainda há inconsistências. Verifique os logs acima.');
  }
}

validateAndFix().catch(console.error);
