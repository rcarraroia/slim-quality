/**
 * Script de Validação de Dados de Teste
 * Task 5.3: Validar Bia e Giuseppe no banco
 */

import { createClient } from '@supabase/supabase-js';

// Configurar Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface ValidationResult {
  category: string;
  check: string;
  status: 'OK' | 'WARNING' | 'ERROR';
  message: string;
  data?: any;
}

const results: ValidationResult[] = [];

async function validateAffiliates() {
  console.log('\n🔍 Validando afiliados de teste...\n');

  // 1. Verificar se Bia e Giuseppe existem
  const { data: affiliates, error } = await supabase
    .from('affiliates')
    .select('id, name, email, status, wallet_id, referred_by, referral_code')
    .or('name.ilike.%Beatriz%,name.ilike.%Giuseppe%')
    .order('name');

  if (error) {
    results.push({
      category: 'Affiliates',
      check: 'Buscar Bia e Giuseppe',
      status: 'ERROR',
      message: `Erro ao buscar: ${error.message}`
    });
    return;
  }

  if (!affiliates || affiliates.length === 0) {
    results.push({
      category: 'Affiliates',
      check: 'Existência',
      status: 'ERROR',
      message: 'Nenhum afiliado de teste encontrado'
    });
    return;
  }

  // Validar cada afiliado
  for (const affiliate of affiliates) {
    // Nome
    results.push({
      category: 'Affiliates',
      check: `${affiliate.name} - Cadastro`,
      status: 'OK',
      message: `ID: ${affiliate.id}`,
      data: affiliate
    });

    // Status
    if (affiliate.status !== 'active') {
      results.push({
        category: 'Affiliates',
        check: `${affiliate.name} - Status`,
        status: 'WARNING',
        message: `Status: ${affiliate.status} (esperado: active)`
      });
    } else {
      results.push({
        category: 'Affiliates',
        check: `${affiliate.name} - Status`,
        status: 'OK',
        message: 'Status: active'
      });
    }

    // Wallet ID
    if (!affiliate.wallet_id) {
      results.push({
        category: 'Affiliates',
        check: `${affiliate.name} - Wallet ID`,
        status: 'ERROR',
        message: 'Wallet ID não configurada'
      });
    } else {
      results.push({
        category: 'Affiliates',
        check: `${affiliate.name} - Wallet ID`,
        status: 'OK',
        message: `Wallet: ${affiliate.wallet_id}`
      });
    }

    // Referral Code
    if (!affiliate.referral_code) {
      results.push({
        category: 'Affiliates',
        check: `${affiliate.name} - Referral Code`,
        status: 'ERROR',
        message: 'Referral code não configurado'
      });
    } else {
      results.push({
        category: 'Affiliates',
        check: `${affiliate.name} - Referral Code`,
        status: 'OK',
        message: `Code: ${affiliate.referral_code}`
      });
    }
  }

  // 2. Validar rede genealógica
  const bia = affiliates.find(a => a.name.includes('Beatriz'));
  const giuseppe = affiliates.find(a => a.name.includes('Giuseppe'));

  if (bia && giuseppe) {
    // Giuseppe deve ter referred_by = Bia
    if (giuseppe.referred_by === bia.id) {
      results.push({
        category: 'Network',
        check: 'Rede Genealógica',
        status: 'OK',
        message: 'Giuseppe → Bia (correto)'
      });
    } else {
      results.push({
        category: 'Network',
        check: 'Rede Genealógica',
        status: 'WARNING',
        message: `Giuseppe.referred_by = ${giuseppe.referred_by} (esperado: ${bia.id})`
      });
    }
  }
}

async function validateAffiliateNetwork() {
  console.log('\n🔍 Validando affiliate_network...\n');

  // Verificar registros na tabela affiliate_network
  const { data: network, error } = await supabase
    .from('affiliate_network')
    .select('affiliate_id, parent_id, level, path')
    .order('level');

  if (error) {
    results.push({
      category: 'Network',
      check: 'Tabela affiliate_network',
      status: 'ERROR',
      message: `Erro ao buscar: ${error.message}`
    });
    return;
  }

  if (!network || network.length === 0) {
    results.push({
      category: 'Network',
      check: 'Tabela affiliate_network',
      status: 'WARNING',
      message: 'Nenhum registro encontrado (VIEW pode estar vazia)'
    });
    return;
  }

  results.push({
    category: 'Network',
    check: 'Tabela affiliate_network',
    status: 'OK',
    message: `${network.length} registros encontrados`,
    data: network
  });

  // Validar níveis
  const levels = [...new Set(network.map(n => n.level))];
  results.push({
    category: 'Network',
    check: 'Níveis da rede',
    status: 'OK',
    message: `Níveis: ${levels.join(', ')}`
  });
}

async function validateSyncronization() {
  console.log('\n🔍 Validando sincronização affiliates ↔ affiliate_network...\n');

  // Buscar todos os afiliados
  const { data: affiliates } = await supabase
    .from('affiliates')
    .select('id, name, referred_by')
    .is('deleted_at', null);

  // Buscar todos os registros da network
  const { data: network } = await supabase
    .from('affiliate_network')
    .select('affiliate_id, parent_id');

  if (!affiliates || !network) {
    results.push({
      category: 'Sync',
      check: 'Sincronização',
      status: 'ERROR',
      message: 'Não foi possível buscar dados'
    });
    return;
  }

  // Verificar se todos os afiliados estão na network
  let missingInNetwork = 0;
  for (const affiliate of affiliates) {
    const inNetwork = network.find(n => n.affiliate_id === affiliate.id);
    if (!inNetwork) {
      missingInNetwork++;
      results.push({
        category: 'Sync',
        check: `Afiliado ${affiliate.name}`,
        status: 'WARNING',
        message: 'Não encontrado em affiliate_network'
      });
    }
  }

  if (missingInNetwork === 0) {
    results.push({
      category: 'Sync',
      check: 'Sincronização completa',
      status: 'OK',
      message: `Todos os ${affiliates.length} afiliados estão na network`
    });
  }

  // Verificar consistência de parent_id vs referred_by
  let inconsistencies = 0;
  for (const affiliate of affiliates) {
    const networkRecord = network.find(n => n.affiliate_id === affiliate.id);
    if (networkRecord) {
      if (networkRecord.parent_id !== affiliate.referred_by) {
        inconsistencies++;
        results.push({
          category: 'Sync',
          check: `Consistência ${affiliate.name}`,
          status: 'ERROR',
          message: `parent_id (${networkRecord.parent_id}) ≠ referred_by (${affiliate.referred_by})`
        });
      }
    }
  }

  if (inconsistencies === 0) {
    results.push({
      category: 'Sync',
      check: 'Consistência parent_id ↔ referred_by',
      status: 'OK',
      message: '100% consistente'
    });
  }
}

async function printResults() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 RELATÓRIO DE VALIDAÇÃO');
  console.log('='.repeat(80) + '\n');

  const categories = [...new Set(results.map(r => r.category))];

  for (const category of categories) {
    console.log(`\n📁 ${category}`);
    console.log('-'.repeat(80));

    const categoryResults = results.filter(r => r.category === category);
    for (const result of categoryResults) {
      const icon = result.status === 'OK' ? '✅' : result.status === 'WARNING' ? '⚠️' : '❌';
      console.log(`${icon} ${result.check}: ${result.message}`);
      if (result.data && process.argv.includes('--verbose')) {
        console.log(`   Dados:`, JSON.stringify(result.data, null, 2));
      }
    }
  }

  // Resumo
  console.log('\n' + '='.repeat(80));
  console.log('📈 RESUMO');
  console.log('='.repeat(80));

  const ok = results.filter(r => r.status === 'OK').length;
  const warning = results.filter(r => r.status === 'WARNING').length;
  const error = results.filter(r => r.status === 'ERROR').length;

  console.log(`✅ OK: ${ok}`);
  console.log(`⚠️  WARNING: ${warning}`);
  console.log(`❌ ERROR: ${error}`);
  console.log(`📊 Total: ${results.length}`);

  if (error > 0) {
    console.log('\n❌ Validação FALHOU - Existem erros críticos');
    process.exit(1);
  } else if (warning > 0) {
    console.log('\n⚠️  Validação PASSOU com avisos');
    process.exit(0);
  } else {
    console.log('\n✅ Validação PASSOU - Tudo OK!');
    process.exit(0);
  }
}

async function main() {
  console.log('🚀 Iniciando validação de dados de teste...');

  await validateAffiliates();
  await validateAffiliateNetwork();
  await validateSyncronization();
  await printResults();
}

main().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
