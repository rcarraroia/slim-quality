#!/usr/bin/env python3
"""
Script para desabilitar RLS manualmente via psycopg2
"""

import psycopg2
import os

def main():
    print("🔧 DESABILITANDO RLS MANUALMENTE")
    print("=" * 35)
    
    # Informações de conexão do Supabase
    # Você precisa pegar a senha no dashboard: Settings > Database
    host = "db.vtynmmtuvxreiwcxxlma.supabase.co"
    port = "5432"
    database = "postgres"
    user = "postgres"
    
    # ATENÇÃO: Você precisa pegar a senha no dashboard do Supabase
    password = input("Digite a senha do PostgreSQL (do dashboard Supabase): ")
    
    try:
        # Conectar ao PostgreSQL
        conn = psycopg2.connect(
            host=host,
            port=port,
            database=database,
            user=user,
            password=password
        )
        
        cursor = conn.cursor()
        
        print("\n✅ Conectado ao PostgreSQL!")
        
        # Desabilitar RLS na tabela products
        print("\n🔧 Desabilitando RLS na tabela products...")
        cursor.execute("ALTER TABLE products DISABLE ROW LEVEL SECURITY;")
        conn.commit()
        print("✅ RLS desabilitado!")
        
        # Verificar se funcionou
        print("\n🧪 Testando inserção...")
        test_product = {
            'name': 'Teste RLS Desabilitado',
            'sku': 'TEST-RLS-001',
            'price_cents': 100000,
            'width_cm': 100,
            'length_cm': 200,
            'height_cm': 30,
            'is_active': True,
            'is_featured': False,
            'display_order': 0
        }
        
        cursor.execute("""
            INSERT INTO products (name, sku, price_cents, width_cm, length_cm, height_cm, is_active, is_featured, display_order)
            VALUES (%(name)s, %(sku)s, %(price_cents)s, %(width_cm)s, %(length_cm)s, %(height_cm)s, %(is_active)s, %(is_featured)s, %(display_order)s)
            RETURNING id;
        """, test_product)
        
        product_id = cursor.fetchone()[0]
        conn.commit()
        
        print(f"✅ Produto de teste criado com ID: {product_id}")
        
        # Deletar produto de teste
        cursor.execute("DELETE FROM products WHERE id = %s;", (product_id,))
        conn.commit()
        print("✅ Produto de teste removido")
        
        cursor.close()
        conn.close()
        
        print("\n🎉 RLS desabilitado com sucesso!")
        print("   Agora o frontend deve conseguir inserir produtos.")
        
    except psycopg2.Error as e:
        print(f"❌ Erro PostgreSQL: {e}")
    except Exception as e:
        print(f"❌ Erro geral: {e}")

if __name__ == "__main__":
    main()