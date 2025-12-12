#!/usr/bin/env python3
"""
Análise completa do sistema de clientes e pedidos
Verificação do banco real + estruturas existentes
"""
from supabase import create_client, Client
import uuid
import json

SUPABASE_URL = "https://vtynmmtuvxreiwcxxlma.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"

def analyze_customers_orders_tables():
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print("🔍 ANÁLISE COMPLETA: CLIENTES E PEDIDOS")
    print("=" * 70)
    
    # Tabelas relacionadas a clientes e pedidos
    tables_to_analyze = [
        'customers',
        'orders',
        'order_items',
        'payments',
        'shipping_addresses',
        'products',  # Para verificar integração
        'conversations',  # CRM
        'appointments'   # CRM
    ]
    
    analysis_results = {}
    
    for table_name in tables_to_analyze:
        print(f"\n📋 ANALISANDO TABELA: {table_name}")
        print("-" * 50)
        
        try:
            # 1. Verificar se tabela existe e contar registros
            count_result = supabase.table(table_name).select('*', count='exact').execute()
            record_count = count_result.count or 0
            
            print(f"✅ Tabela existe - {record_count} registros")
            
            # 2. Descobrir estrutura inserindo dados de teste
            test_data = get_test_data_for_table(table_name)
            
            if test_data:
                try:
                    insert_result = supabase.table(table_name).insert(test_data).execute()
                    if insert_result.data:
                        record_id = insert_result.data[0]['id']
                        
                        # Mostrar estrutura
                        print("📄 Colunas encontradas:")
                        columns = list(insert_result.data[0].keys())
                        for col in sorted(columns):
                            print(f"   - {col}")
                        
                        # Limpar dados de teste
                        supabase.table(table_name).delete().eq('id', record_id).execute()
                        
                        analysis_results[table_name] = {
                            'exists': True,
                            'count': record_count,
                            'columns': columns,
                            'status': 'functional'
                        }
                        
                except Exception as insert_error:
                    print(f"❌ Erro na inserção: {insert_error}")
                    analysis_results[table_name] = {
                        'exists': True,
                        'count': record_count,
                        'columns': [],
                        'status': 'structure_issues',
                        'error': str(insert_error)
                    }
            else:
                analysis_results[table_name] = {
                    'exists': True,
                    'count': record_count,
                    'columns': [],
                    'status': 'no_test_data'
                }
                
        except Exception as e:
            print(f"❌ Tabela não existe ou erro: {e}")
            analysis_results[table_name] = {
                'exists': False,
                'error': str(e),
                'status': 'missing'
            }
    
    return analysis_results

def get_test_data_for_table(table_name):
    """Gerar dados de teste para cada tabela"""
    
    if table_name == 'customers':
        return {
            'name': 'Cliente Teste',
            'email': 'cliente.teste@email.com',
            'phone': '11999999999',
            'document': '12345678901',
            'birth_date': '1990-01-01',
            'address': 'Rua Teste, 123',
            'city': 'São Paulo',
            'state': 'SP',
            'zip_code': '01234-567'
        }
    
    elif table_name == 'orders':
        return {
            'customer_id': str(uuid.uuid4()),  # Será erro de FK, mas descobriremos estrutura
            'customer_name': 'Cliente Teste',
            'customer_email': 'cliente@email.com',
            'customer_phone': '11999999999',
            'total_cents': 329000,  # R$ 3.290,00
            'status': 'pending',
            'payment_method': 'pix',
            'affiliate_id': None,
            'referral_code': None
        }
    
    elif table_name == 'order_items':
        return {
            'order_id': str(uuid.uuid4()),
            'product_id': str(uuid.uuid4()),
            'product_name': 'Colchão Slim Quality Padrão',
            'quantity': 1,
            'unit_price_cents': 329000,
            'total_price_cents': 329000
        }
    
    elif table_name == 'payments':
        return {
            'order_id': str(uuid.uuid4()),
            'payment_method': 'pix',
            'amount_cents': 329000,
            'status': 'pending',
            'external_id': 'pay_test_123',
            'provider': 'asaas'
        }
    
    elif table_name == 'shipping_addresses':
        return {
            'order_id': str(uuid.uuid4()),
            'recipient_name': 'Cliente Teste',
            'street': 'Rua Teste, 123',
            'city': 'São Paulo',
            'state': 'SP',
            'zip_code': '01234-567',
            'phone': '11999999999'
        }
    
    elif table_name == 'conversations':
        return {
            'customer_id': str(uuid.uuid4()),
            'title': 'Conversa Teste',
            'status': 'open',
            'priority': 'medium',
            'assigned_to': None
        }
    
    elif table_name == 'appointments':
        return {
            'customer_id': str(uuid.uuid4()),
            'title': 'Agendamento Teste',
            'description': 'Consulta sobre colchão',
            'scheduled_at': '2025-12-15T10:00:00Z',
            'status': 'scheduled',
            'type': 'consultation'
        }
    
    elif table_name == 'products':
        # Não vamos inserir em products, só verificar estrutura
        return None
    
    return None

def analyze_frontend_integration():
    """Analisar integração frontend existente"""
    print(f"\n🎯 ANÁLISE DA INTEGRAÇÃO FRONTEND")
    print("=" * 70)
    
    # Arquivos relacionados a clientes e pedidos para verificar
    frontend_files = [
        'src/pages/dashboard/Clientes.tsx',
        'src/pages/dashboard/Pedidos.tsx', 
        'src/services/frontend/customer.service.ts',
        'src/services/frontend/order.service.ts',
        'src/components/checkout/AffiliateAwareCheckout.tsx',
        'src/pages/produtos/ProdutoDetalhe.tsx'
    ]
    
    print("📁 Arquivos frontend a verificar:")
    for file_path in frontend_files:
        print(f"   - {file_path}")
    
    return frontend_files

def generate_implementation_plan(analysis_results):
    """Gerar plano de implementação baseado na análise"""
    print(f"\n📋 PLANO DE IMPLEMENTAÇÃO")
    print("=" * 70)
    
    # Categorizar tabelas por status
    functional_tables = []
    missing_tables = []
    problematic_tables = []
    
    for table, result in analysis_results.items():
        if result['status'] == 'functional':
            functional_tables.append(table)
        elif result['status'] == 'missing':
            missing_tables.append(table)
        else:
            problematic_tables.append(table)
    
    print(f"✅ TABELAS FUNCIONAIS ({len(functional_tables)}):")
    for table in functional_tables:
        count = analysis_results[table]['count']
        print(f"   - {table} ({count} registros)")
    
    print(f"\n❌ TABELAS FALTANDO ({len(missing_tables)}):")
    for table in missing_tables:
        print(f"   - {table}")
    
    print(f"\n⚠️  TABELAS COM PROBLEMAS ({len(problematic_tables)}):")
    for table in problematic_tables:
        error = analysis_results[table].get('error', 'Erro desconhecido')
        print(f"   - {table}: {error[:60]}...")
    
    # Gerar recomendações
    print(f"\n🎯 RECOMENDAÇÕES:")
    
    if 'customers' in functional_tables and 'orders' in functional_tables:
        print("✅ Sistema básico de clientes e pedidos está funcional")
        print("   → Pode implementar botão 'Comprar Agora'")
        print("   → Pode integrar AffiliateAwareCheckout")
    
    if 'products' in functional_tables:
        print("✅ Sistema de produtos funcional")
        print("   → Integração com pedidos possível")
    
    if missing_tables:
        print("⚠️  Tabelas faltando impedem funcionalidade completa")
        print("   → Criar migrations para tabelas faltantes")
    
    if problematic_tables:
        print("⚠️  Problemas de estrutura identificados")
        print("   → Ajustar dados de teste ou estruturas")

def main():
    print("🚀 INICIANDO ANÁLISE COMPLETA")
    print("Verificando banco real + estruturas frontend")
    print("=" * 70)
    
    # 1. Analisar tabelas do banco
    analysis_results = analyze_customers_orders_tables()
    
    # 2. Analisar integração frontend
    frontend_files = analyze_frontend_integration()
    
    # 3. Gerar plano de implementação
    generate_implementation_plan(analysis_results)
    
    # 4. Salvar resultados
    print(f"\n💾 SALVANDO RESULTADOS DA ANÁLISE...")
    
    results_summary = {
        'database_analysis': analysis_results,
        'frontend_files': frontend_files,
        'timestamp': '2025-12-12T16:30:00Z',
        'status': 'completed'
    }
    
    with open('customers_orders_analysis.json', 'w', encoding='utf-8') as f:
        json.dump(results_summary, f, indent=2, ensure_ascii=False)
    
    print("✅ Análise salva em: customers_orders_analysis.json")
    
    return analysis_results

if __name__ == "__main__":
    results = main()
    
    # Resumo executivo
    functional_count = sum(1 for r in results.values() if r.get('status') == 'functional')
    total_count = len(results)
    
    print(f"\n📊 RESUMO EXECUTIVO:")
    print(f"Tabelas analisadas: {total_count}")
    print(f"Tabelas funcionais: {functional_count}")
    print(f"Taxa de funcionalidade: {functional_count/total_count*100:.1f}%")
    
    if functional_count >= 4:  # customers, orders, products + 1
        print(f"\n🎉 SISTEMA PRONTO PARA IMPLEMENTAR 'COMPRAR AGORA'!")
    else:
        print(f"\n⚠️  Sistema precisa de ajustes antes da implementação")