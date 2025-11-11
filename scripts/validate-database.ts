/**
 * Validate Database Script
 * Sprint 3: Sistema de Vendas
 * 
 * Script para validar estrutura do banco de dados
 * 
 * Uso:
 * npm run validate:db
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ SUPABASE_URL e SUPABASE_SERVICE_KEY são obrigatórios');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ValidationResult {
  category: string;
  item: string;
  status: 'ok' | 'error' | 'warning';
  message?: string;
}

const results: ValidationResult[] = [];

async function validateTables() {
  console.log('📋 Validando tabelas...\n');

  const expectedTables = [
    'orders',
    'order_items',
    'order_status_history',
    'payments',
    'shipping_addresses',
    'asaas_transactions',
    'asaas_splits',
    'asaas_webhook_logs',
  ];

  for (const table of expectedTables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        results.push({
          category: 'Tabelas',
          item: table,
          status: 'error',
          message: error.message,
        });
      } else {
        results.push({
          category: 'Tabelas',
          item: table,
          status: 'ok',
        });
      }
    } catch (err) {
      results.push({
        category: 'Tabelas',
        item: table,
        status: 'error',
        message: (err as Error).message,
      });
    }
  }
}

async function validateEnums() {
  console.log('🔤 Validando enums...\n');

  const expectedEnums = [
    'order_status',
    'payment_method',
    'payment_status',
    'split_status',
  ];

  // Nota: Validação de enums requer query SQL direta
  results.push({
    category: 'Enums',
    item: 'Validação manual necessária',
    status: 'warning',
    message: 'Execute: SELECT typname FROM pg_type WHERE typtype = \'e\'',
  });
}

async function validateFunctions() {
  console.log('⚙️  Validando funções...\n');

  const expectedFunctions = [
    'generate_order_number',
    'trigger_generate_order_number',
    'update_updated_at_column',
  ];

  // Nota: Validação de funções requer query SQL direta
  results.push({
    category: 'Funções',
    item: 'Validação manual necessária',
    status: 'warning',
    message: 'Execute: SELECT proname FROM pg_proc WHERE proname LIKE \'%order%\'',
  });
}

async function validateRLS() {
  console.log('🔒 Validando RLS...\n');

  // Tentar inserir dados sem autenticação (deve falhar)
  const { error } = await supabase
    .from('orders')
    .select('*')
    .limit(1);

  if (error && error.message.includes('RLS')) {
    results.push({
      category: 'RLS',
      item: 'Políticas ativas',
      status: 'ok',
      message: 'RLS está ativo e funcionando',
    });
  } else {
    results.push({
      category: 'RLS',
      item: 'Políticas ativas',
      status: 'warning',
      message: 'Não foi possível validar RLS automaticamente',
    });
  }
}

function printResults() {
  console.log('\n📊 RESULTADOS DA VALIDAÇÃO\n');
  console.log('='.repeat(80));

  const categories = [...new Set(results.map(r => r.category))];

  for (const category of categories) {
    console.log(`\n${category}:`);
    const categoryResults = results.filter(r => r.category === category);

    for (const result of categoryResults) {
      const icon = result.status === 'ok' ? '✅' : result.status === 'error' ? '❌' : '⚠️';
      console.log(`  ${icon} ${result.item}`);
      if (result.message) {
        console.log(`     ${result.message}`);
      }
    }
  }

  console.log('\n' + '='.repeat(80));

  const okCount = results.filter(r => r.status === 'ok').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const warningCount = results.filter(r => r.status === 'warning').length;

  console.log(`\n✅ OK: ${okCount} | ❌ Erros: ${errorCount} | ⚠️  Avisos: ${warningCount}\n`);

  if (errorCount > 0) {
    console.log('❌ Validação falhou! Corrija os erros acima.\n');
    process.exit(1);
  } else if (warningCount > 0) {
    console.log('⚠️  Validação concluída com avisos. Revise manualmente.\n');
  } else {
    console.log('🎉 Validação concluída com sucesso!\n');
  }
}

async function validate() {
  console.log('🔍 Iniciando validação do banco de dados...\n');

  await validateTables();
  await validateEnums();
  await validateFunctions();
  await validateRLS();

  printResults();
}

// Executar
validate()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro ao validar banco:', error);
    process.exit(1);
  });
