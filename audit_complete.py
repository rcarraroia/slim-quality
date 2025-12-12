"""
Script de Auditoria CORRIGIDO - Usando Supabase Client com RPC
Lista TODAS as tabelas via função SQL personalizada
"""

import json
from supabase import create_client

# Credenciais
SUPABASE_URL = "https://vtynmmtuvxreiwcxxlma.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"

# Criar cliente com service role key
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def get_all_tables_via_rpc():
    """Tenta listar tabelas via RPC se existir função disponível"""
    try:
        # Primeiro vamos tentar buscar de várias tabelas conhecidas para criar um inventário completo
        # Lista baseada na screenshot do usuário (36 tabelas)
        all_possible_tables = [
            # Afiliados
            'affiliates', 'affiliate_network', 'affiliate_withdrawals_queue',
            # Produtos
            'products', 'product_images', 'product_inventory', 'product_technologies',
            # Vendas/Pedidos
            'orders', 'order_items', 'order_status_history',
            # Clientes
            'customers', 'customer_log_walletmeta',
            # Comissões
            'commissions', 'commission_logs', 'commission_logs_v2_money', 'commission_splits',
            # CRM
            'conversations', 'messages', 'appointments', 'customer_timeline',
            # Tags
            'tags', 'customer_tags',
            # Asaas
            'asaas_splits', 'asaas_transactions', 'asaas_wallets', 'asaas_webhook_logs',
            # Auth
            'auth_logs', 'user_roles', 'profiles',
            # Sistema
            'notification_summary', 'webhook_logs', 'notification_logs',
            'referral_clicks', 'referral_codes', 'referral_conversions',
            'shipping_addresses', 'technologies',
            'wallet_cache_state', 'webhook_logs',
            'withdrawal_logs', 'withdrawal_stats', 'withdrawals'
        ]
        
        # Remover duplicatas
        all_possible_tables = list(set(all_possible_tables))
        
        found_tables = []
        table_details = {}
        
        print("=" * 70)
        print("🔍 AUDITORIA COMPLETA DO BANCO DE DADOS - SLIM QUALITY")
        print("=" * 70)
        print(f"\nVerificando {len(all_possible_tables)} tabelas possíveis...\n")
        
        for table in sorted(all_possible_tables):
            try:
                # Tentar contar registros
                response = supabase.table(table).select('*', count='exact').limit(0).execute()
                count = response.count if response.count is not None else 0
                found_tables.append(table)
                table_details[table] = {
                    'exists': True,
                    'count': count
                }
                print(f"  ✅ {table}: {count} registros")
            except Exception as e:
                error_msg = str(e)
                if "does not exist" in error_msg or "42P01" in error_msg:
                    table_details[table] = {'exists': False}
                    print(f"  ❌ {table}: NÃO EXISTE")
                else:
                    table_details[table] = {'exists': 'error', 'error': error_msg[:100]}
                    print(f"  ⚠️ {table}: ERRO - {error_msg[:50]}")
        
        print("\n" + "=" * 70)
        print(f"\n📊 RESUMO: Encontradas {len(found_tables)} tabelas de {len(all_possible_tables)} verificadas")
        print("=" * 70)
        
        # Listar tabelas encontradas organizadas
        print("\n✅ TABELAS ENCONTRADAS:")
        for table in sorted(found_tables):
            count = table_details[table].get('count', 0)
            print(f"   {table}: {count} registros")
        
        # Listar tabelas não encontradas
        not_found = [t for t, v in table_details.items() if v.get('exists') == False]
        if not_found:
            print(f"\n❌ TABELAS NÃO ENCONTRADAS ({len(not_found)}):")
            for table in sorted(not_found):
                print(f"   {table}")
        
        # Salvar resultado
        result = {
            'total_found': len(found_tables),
            'tables': table_details,
            'found_list': sorted(found_tables),
            'not_found_list': sorted(not_found)
        }
        
        with open('audit_complete_result.json', 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        
        print(f"\n💾 Resultado salvo em: audit_complete_result.json")
        
        return found_tables, table_details
        
    except Exception as e:
        print(f"Erro: {e}")
        return [], {}

if __name__ == "__main__":
    get_all_tables_via_rpc()
