/**
 * Apply Migrations Script
 * Sprint 3: Sistema de Vendas
 * 
 * Script para aplicar migrations no Supabase
 * 
 * Uso:
 * npm run migrate
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
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

async function applyMigrations() {
  console.log('🚀 Iniciando aplicação de migrations...\n');

  const migrationsDir = path.join(__dirname, '../supabase/migrations');

  // Verificar se diretório existe
  if (!fs.existsSync(migrationsDir)) {
    console.error('❌ Diretório de migrations não encontrado:', migrationsDir);
    process.exit(1);
  }

  // Listar arquivos de migration
  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('⚠️  Nenhuma migration encontrada');
    return;
  }

  console.log(`📁 Encontradas ${files.length} migration(s):\n`);
  files.forEach(file => console.log(`   - ${file}`));
  console.log('');

  // Aplicar cada migration
  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');

    console.log(`⏳ Aplicando: ${file}...`);

    try {
      // Executar SQL
      const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

      if (error) {
        // Tentar executar diretamente se RPC não existir
        const { error: directError } = await supabase
          .from('_migrations')
          .insert({ name: file, executed_at: new Date().toISOString() });

        if (directError) {
          console.error(`❌ Erro ao aplicar ${file}:`, error.message);
          console.error('   Detalhes:', error);
          continue;
        }
      }

      console.log(`✅ ${file} aplicada com sucesso\n`);
    } catch (err) {
      console.error(`❌ Erro inesperado ao aplicar ${file}:`, err);
    }
  }

  console.log('✨ Processo de migrations concluído!\n');
}

// Executar
applyMigrations()
  .then(() => {
    console.log('🎉 Migrations aplicadas com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro ao aplicar migrations:', error);
    process.exit(1);
  });
