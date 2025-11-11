/**
 * Script para configurar Supabase Storage
 * Cria bucket product-images e configura políticas de acesso
 * 
 * Uso: npx tsx scripts/setup-storage.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function setupStorage() {
  console.log('🚀 Configurando Supabase Storage...\n');

  try {
    // 1. Criar bucket product-images
    console.log('📦 Criando bucket product-images...');
    
    const { data: existingBucket, error: checkError } = await supabase
      .storage
      .getBucket('product-images');

    if (existingBucket) {
      console.log('✅ Bucket product-images já existe');
    } else {
      const { data: bucket, error: createError } = await supabase
        .storage
        .createBucket('product-images', {
          public: true,
          fileSizeLimit: 5242880, // 5MB
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        });

      if (createError) {
        console.error('❌ Erro ao criar bucket:', createError);
        throw createError;
      }

      console.log('✅ Bucket product-images criado com sucesso');
    }

    // 2. Verificar políticas de acesso
    console.log('\n🔐 Verificando políticas de acesso...');
    
    // As políticas RLS para storage são criadas via SQL
    // Vamos criar uma migration para isso
    console.log('ℹ️  Políticas de storage devem ser criadas via migration SQL');
    console.log('ℹ️  Veja: supabase/migrations/20250124000001_storage_policies.sql');

    console.log('\n✅ Setup de storage concluído com sucesso!');
    console.log('\n📋 Próximos passos:');
    console.log('   1. Aplicar migration de políticas: supabase db push');
    console.log('   2. Testar upload de imagem via API');

  } catch (error) {
    console.error('\n❌ Erro durante setup:', error);
    process.exit(1);
  }
}

setupStorage();
