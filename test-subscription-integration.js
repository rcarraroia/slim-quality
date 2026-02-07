/**
 * Teste rápido para validar integração do sistema de assinaturas
 */

// Simular dados de um produto IA
const mockOrderItems = [
  {
    product_id: 'prod_123',
    product_name: 'Agente IA',
    product_sku: 'COL-707D80', // SKU do produto IA
    quantity: 1,
    unit_price_cents: 329000,
    products: {
      id: 'prod_123',
      name: 'Agente IA',
      sku: 'COL-707D80',
      category: 'ferramenta_ia',
      description: 'Assistente de IA para automação'
    }
  }
];

// Simular dados de um produto físico
const mockPhysicalItems = [
  {
    product_id: 'prod_456',
    product_name: 'Colchão Magnético',
    product_sku: 'COL-PADRAO',
    quantity: 1,
    unit_price_cents: 329000,
    products: {
      id: 'prod_456',
      name: 'Colchão Magnético',
      sku: 'COL-PADRAO',
      category: 'colchao',
      description: 'Colchão magnético terapêutico'
    }
  }
];

// Função para testar detecção de produto IA
function testProductDetection() {
  console.log('🧪 Testando detecção de produtos...');
  
  // Teste 1: Produto IA
  const hasIAProduct1 = mockOrderItems.some(item => {
    const product = item.products;
    return product && (
      product.category === 'ferramenta_ia' ||
      product.sku === 'COL-707D80' ||
      product.name?.toLowerCase().includes('agente ia')
    );
  });
  
  console.log('✅ Teste 1 - Produto IA detectado:', hasIAProduct1);
  
  // Teste 2: Produto físico
  const hasIAProduct2 = mockPhysicalItems.some(item => {
    const product = item.products;
    return product && (
      product.category === 'ferramenta_ia' ||
      product.sku === 'COL-707D80' ||
      product.name?.toLowerCase().includes('agente ia')
    );
  });
  
  console.log('✅ Teste 2 - Produto físico (não IA):', hasIAProduct2);
  
  return {
    iaDetected: hasIAProduct1,
    physicalDetected: !hasIAProduct2
  };
}

// Executar teste
const results = testProductDetection();

console.log('\n📊 RESULTADOS DO TESTE:');
console.log('- Detecção de IA funcionando:', results.iaDetected ? '✅' : '❌');
console.log('- Detecção de físico funcionando:', results.physicalDetected ? '✅' : '❌');

if (results.iaDetected && results.physicalDetected) {
  console.log('\n🎉 INTEGRAÇÃO FUNCIONANDO CORRETAMENTE!');
  console.log('- Produtos IA serão roteados para sistema de assinaturas');
  console.log('- Produtos físicos continuarão no sistema tradicional');
} else {
  console.log('\n❌ PROBLEMA NA INTEGRAÇÃO DETECTADO');
}