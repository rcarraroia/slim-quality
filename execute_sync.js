// Script para executar sincronização de parent_id
// Task 2.2: Executar migration e validar

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vtynmmtuvxreiwcxxlma.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncParentColumns() {
  console.log('🔄 Iniciando sincronização de parent_id...\n');

  // 1. Verificar estado PRÉ-sync
  console.log('📊 Estado PRÉ-sincronização:');
  const { data: preSyncData, error: preSyncError } = await supabase
    .from('affiliate_network')
    .select('id, affiliate_id, parent_id, parent_affiliate_id, level');

  if (preSyncError) {
    console.error('❌ Erro ao buscar dados PRÉ-sync:', preSyncError);
    return;
  }

  console.log(`Total de registros: ${preSyncData.length}`);
  preSyncData.forEach(row => {
    console.log(`  - ID: ${row.id}, parent_id: ${row.parent_id}, parent_affiliate_id: ${row.parent_affiliate_id}`);
  });

  // 2. Executar UPDATE
  console.log('\n🔧 Executando UPDATE...');
  const { data: updateData, error: updateError } = await supabase
    .rpc('exec_sql', {
      query: `UPDATE affiliate_network SET parent_id = parent_affiliate_id WHERE parent_affiliate_id IS NOT NULL AND parent_id IS NULL;`
    });

  if (updateError) {
    console.error('❌ Erro ao executar UPDATE:', updateError);
    console.log('\n⚠️ Tentando abordagem alternativa...');
    
    // Abordagem alternativa: atualizar registro por registro
    for (const row of preSyncData) {
      if (row.parent_affiliate_id && !row.parent_id) {
        const { error: rowUpdateError } = await supabase
          .from('affiliate_network')
          .update({ parent_id: row.parent_affiliate_id })
          .eq('id', row.id);

        if (rowUpdateError) {
          console.error(`❌ Erro ao atualizar registro ${row.id}:`, rowUpdateError);
        } else {
          console.log(`✅ Registro ${row.id} atualizado com sucesso`);
        }
      }
    }
  } else {
    console.log('✅ UPDATE executado com sucesso');
  }

  // 3. Verificar estado PÓS-sync
  console.log('\n📊 Estado PÓS-sincronização:');
  const { data: postSyncData, error: postSyncError } = await supabase
    .from('affiliate_network')
    .select('id, affiliate_id, parent_id, parent_affiliate_id, level');

  if (postSyncError) {
    console.error('❌ Erro ao buscar dados PÓS-sync:', postSyncError);
    return;
  }

  console.log(`Total de registros: ${postSyncData.length}`);
  postSyncData.forEach(row => {
    const status = row.parent_id === row.parent_affiliate_id ? '✅ Sincronizado' : '❌ INCONSISTENTE';
    console.log(`  - ID: ${row.id}, parent_id: ${row.parent_id}, parent_affiliate_id: ${row.parent_affiliate_id} ${status}`);
  });

  // 4. Estatísticas finais
  const sincronizados = postSyncData.filter(r => r.parent_id === r.parent_affiliate_id).length;
  const inconsistentes = postSyncData.filter(r => r.parent_affiliate_id && r.parent_id !== r.parent_affiliate_id).length;

  console.log('\n📈 Estatísticas:');
  console.log(`  ✅ Sincronizados: ${sincronizados}`);
  console.log(`  ❌ Inconsistentes: ${inconsistentes}`);

  if (inconsistentes === 0) {
    console.log('\n🎉 SUCESSO! Todos os registros foram sincronizados!');
  } else {
    console.log('\n⚠️ ATENÇÃO! Ainda há registros inconsistentes!');
  }
}

syncParentColumns().catch(console.error);
