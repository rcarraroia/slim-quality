/**
 * Script de Seed - Produtos e Tecnologias
 * Sprint 2: Sistema de Produtos
 * 
 * Popula banco com dados iniciais:
 * - 8 tecnologias fixas
 * - 4 produtos fixos (Solteiro, Padrão, Queen, King)
 * - Relacionamentos produto-tecnologia
 * - Estoque inicial
 * 
 * Uso: npx tsx scripts/seed-products.ts
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

// ============================================
// DADOS DE SEED
// ============================================

const technologies = [
  {
    name: 'Sistema Magnético',
    slug: 'sistema-magnetico',
    description: '240 ímãs de 800 Gauss que melhoram a circulação sanguínea e aliviam dores musculares',
    display_order: 1,
  },
  {
    name: 'Infravermelho Longo',
    slug: 'infravermelho-longo',
    description: 'Tecnologia que penetra profundamente nos tecidos, promovendo relaxamento e bem-estar',
    display_order: 2,
  },
  {
    name: 'Energia Bioquântica',
    slug: 'energia-bioquantica',
    description: 'Harmoniza a energia do corpo, promovendo equilíbrio e vitalidade',
    display_order: 3,
  },
  {
    name: 'Vibromassagem',
    slug: 'vibromassagem',
    description: '8 motores para massagem relaxante e alívio de tensões',
    display_order: 4,
  },
  {
    name: 'Densidade Progressiva',
    slug: 'densidade-progressiva',
    description: 'Diferentes densidades para suporte ideal da coluna e conforto personalizado',
    display_order: 5,
  },
  {
    name: 'Cromoterapia',
    slug: 'cromoterapia',
    description: 'Cores terapêuticas integradas para promover bem-estar emocional',
    display_order: 6,
  },
  {
    name: 'Perfilado High-Tech',
    slug: 'perfilado-high-tech',
    description: 'Design ergonômico avançado que se adapta perfeitamente ao corpo',
    display_order: 7,
  },
  {
    name: 'Tratamento Sanitário',
    slug: 'tratamento-sanitario',
    description: 'Proteção contra ácaros, bactérias e fungos para um sono mais saudável',
    display_order: 8,
  },
];

const products = [
  {
    name: 'Colchão Magnético Solteiro',
    slug: 'colchao-magnetico-solteiro',
    description: 'Ideal para uso individual. Combina todas as 8 tecnologias terapêuticas em um colchão compacto e eficiente. Perfeito para quartos menores sem abrir mão do conforto e dos benefícios para a saúde.',
    width_cm: 88,
    length_cm: 188,
    height_cm: 28,
    weight_kg: 25,
    price_cents: 319000, // R$ 3.190,00
    is_featured: false,
    display_order: 1,
  },
  {
    name: 'Colchão Magnético Padrão',
    slug: 'colchao-magnetico-padrao',
    description: 'Nosso modelo mais vendido! Perfeito para casais que buscam qualidade de sono e bem-estar. Com 138cm de largura, oferece espaço confortável e todas as tecnologias terapêuticas para noites revigorantes.',
    width_cm: 138,
    length_cm: 188,
    height_cm: 28,
    weight_kg: 35,
    price_cents: 329000, // R$ 3.290,00
    is_featured: true, // Destaque: Mais vendido
    display_order: 2,
  },
  {
    name: 'Colchão Magnético Queen',
    slug: 'colchao-magnetico-queen',
    description: 'Conforto premium para casais exigentes. Com 158cm de largura e 30cm de altura, proporciona espaço generoso e suporte superior. Ideal para quem busca o máximo em qualidade de sono e terapia.',
    width_cm: 158,
    length_cm: 198,
    height_cm: 30,
    weight_kg: 45,
    price_cents: 349000, // R$ 3.490,00
    is_featured: false,
    display_order: 3,
  },
  {
    name: 'Colchão Magnético King',
    slug: 'colchao-magnetico-king',
    description: 'O máximo em espaço e conforto. Com impressionantes 193cm de largura, oferece liberdade total de movimento e todas as tecnologias terapêuticas. Para quem não aceita menos que o melhor.',
    width_cm: 193,
    length_cm: 203,
    height_cm: 30,
    weight_kg: 55,
    price_cents: 489000, // R$ 4.890,00
    is_featured: false,
    display_order: 4,
  },
];

// ============================================
// FUNÇÕES DE SEED
// ============================================

async function seedTechnologies() {
  console.log('\n📦 Seeding technologies...');

  for (const tech of technologies) {
    // Verificar se já existe
    const { data: existing } = await supabase
      .from('technologies')
      .select('id')
      .eq('slug', tech.slug)
      .single();

    if (existing) {
      console.log(`  ⏭️  Technology "${tech.name}" already exists`);
      continue;
    }

    // Inserir tecnologia
    const { data, error } = await supabase
      .from('technologies')
      .insert(tech)
      .select()
      .single();

    if (error) {
      console.error(`  ❌ Error creating technology "${tech.name}":`, error);
      throw error;
    }

    console.log(`  ✅ Created technology: ${tech.name}`);
  }

  console.log('✅ Technologies seeded successfully!');
}

async function seedProducts() {
  console.log('\n📦 Seeding products...');

  for (const product of products) {
    // Verificar se já existe
    const { data: existing } = await supabase
      .from('products')
      .select('id')
      .eq('slug', product.slug)
      .is('deleted_at', null)
      .single();

    if (existing) {
      console.log(`  ⏭️  Product "${product.name}" already exists`);
      continue;
    }

    // Inserir produto
    const { data, error } = await supabase
      .from('products')
      .insert(product)
      .select()
      .single();

    if (error) {
      console.error(`  ❌ Error creating product "${product.name}":`, error);
      throw error;
    }

    console.log(`  ✅ Created product: ${product.name} (${product.sku})`);
  }

  console.log('✅ Products seeded successfully!');
}

async function seedProductTechnologies() {
  console.log('\n📦 Seeding product-technology relationships...');

  // Buscar todos os produtos
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, name')
    .is('deleted_at', null);

  if (productsError || !products) {
    console.error('❌ Error fetching products:', productsError);
    throw productsError;
  }

  // Buscar todas as tecnologias
  const { data: technologies, error: techError } = await supabase
    .from('technologies')
    .select('id, name')
    .eq('is_active', true);

  if (techError || !technologies) {
    console.error('❌ Error fetching technologies:', techError);
    throw techError;
  }

  console.log(`  Found ${products.length} products and ${technologies.length} technologies`);

  // Associar todas as tecnologias a cada produto
  for (const product of products) {
    for (const tech of technologies) {
      // Verificar se relacionamento já existe
      const { data: existing } = await supabase
        .from('product_technologies')
        .select('id')
        .eq('product_id', product.id)
        .eq('technology_id', tech.id)
        .single();

      if (existing) {
        continue;
      }

      // Criar relacionamento
      const { error } = await supabase
        .from('product_technologies')
        .insert({
          product_id: product.id,
          technology_id: tech.id,
        });

      if (error) {
        console.error(`  ❌ Error linking ${product.name} with ${tech.name}:`, error);
        throw error;
      }
    }

    console.log(`  ✅ Linked ${product.name} with all ${technologies.length} technologies`);
  }

  console.log('✅ Product-technology relationships seeded successfully!');
}

async function seedInventory() {
  console.log('\n📦 Seeding initial inventory...');

  // Buscar todos os produtos
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, name')
    .is('deleted_at', null);

  if (productsError || !products) {
    console.error('❌ Error fetching products:', productsError);
    throw productsError;
  }

  const initialQuantity = 10; // Quantidade inicial padrão

  for (const product of products) {
    // Verificar se já tem estoque
    const { data: existing } = await supabase
      .from('inventory_logs')
      .select('id')
      .eq('product_id', product.id)
      .limit(1)
      .single();

    if (existing) {
      console.log(`  ⏭️  Inventory for "${product.name}" already initialized`);
      continue;
    }

    // Criar registro inicial de estoque
    const { error } = await supabase
      .from('inventory_logs')
      .insert({
        product_id: product.id,
        type: 'entrada',
        quantity: initialQuantity,
        quantity_before: 0,
        quantity_after: initialQuantity,
        notes: 'Estoque inicial (seed)',
      });

    if (error) {
      console.error(`  ❌ Error initializing inventory for "${product.name}":`, error);
      throw error;
    }

    console.log(`  ✅ Initialized inventory for ${product.name}: ${initialQuantity} units`);
  }

  console.log('✅ Inventory seeded successfully!');
}

// ============================================
// EXECUTAR SEED
// ============================================

async function runSeed() {
  console.log('🚀 Starting seed process...\n');
  console.log('📊 Database:', supabaseUrl);

  try {
    await seedTechnologies();
    await seedProducts();
    await seedProductTechnologies();
    await seedInventory();

    console.log('\n✅ Seed completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   - ${technologies.length} technologies`);
    console.log(`   - ${products.length} products`);
    console.log(`   - ${products.length * technologies.length} product-technology relationships`);
    console.log(`   - ${products.length} inventory records`);
  } catch (error) {
    console.error('\n❌ Seed failed:', error);
    process.exit(1);
  }
}

runSeed();
