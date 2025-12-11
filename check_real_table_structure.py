#!/usr/bin/env python3
"""
Script para verificar a estrutura REAL da tabela products
"""

from supabase import create_client, Client

# Service Role Key para bypass RLS
SUPABASE_URL = "https://vtynmmtuvxreiwcxxlma.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"

def main():
    try:
        supabase: Client = create_client(SUPABASE_URL, SERVICE_KEY)
        
        print("🔍 VERIFICANDO ESTRUTURA REAL DA TABELA PRODUCTS")
        print("=" * 55)
        
        # 1. Inserir um produto com todos os campos possíveis para descobrir a estrutura
        print("\n1. Testando inserção com campos comuns...")
        
        test_fields = {
            # Campos básicos
            "name": "Teste Estrutura",
            "description": "Teste para descobrir campos",
            "price_cents": 100000,
            
            # Dimensões
            "width_cm": 100,
            "length_cm": 200,
            "height_cm": 30,
            
            # Status
            "is_active": True,
            
            # Campos que podem existir
            "sku": "TEST-001",
            "product_type": "mattress",
            "stock_quantity": 10,
            "category": "colchao",
            "brand": "Slim Quality",
            "weight_kg": 25.5,
            "material": "Magnético",
            "warranty_months": 12
        }
        
        # Testar cada campo individualmente
        base_product = {
            "name": "Teste Base",
            "price_cents": 100000,
            "width_cm": 100,
            "length_cm": 200,
            "height_cm": 30,
            "is_active": True
        }
        
        print("   Campos que FUNCIONAM:")
        working_fields = []
        
        # Testar campo base primeiro
        try:
            result = supabase.table('products').insert(base_product).execute()
            base_id = result.data[0]['id']
            working_fields.extend(base_product.keys())
            print(f"   ✅ Campos base: {list(base_product.keys())}")
            
            # Deletar teste
            supabase.table('products').delete().eq('id', base_id).execute()
        except Exception as e:
            print(f"   ❌ Erro nos campos base: {e}")
            return
        
        # Testar campos adicionais um por um
        additional_fields = [
            ("description", "Teste descrição"),
            ("sku", "TEST-001"),
            ("product_type", "mattress"),
            ("stock_quantity", 10),
            ("category", "colchao"),
            ("brand", "Slim Quality"),
            ("weight_kg", 25.5),
            ("material", "Magnético"),
            ("warranty_months", 12),
            ("color", "Branco"),
            ("size", "Casal"),
            ("model", "Premium")
        ]
        
        for field_name, field_value in additional_fields:
            test_product = {**base_product, field_name: field_value}
            try:
                result = supabase.table('products').insert(test_product).execute()
                working_fields.append(field_name)
                print(f"   ✅ {field_name}: {field_value}")
                
                # Deletar teste
                supabase.table('products').delete().eq('id', result.data[0]['id']).execute()
                
            except Exception as e:
                if "Could not find" in str(e) and "column" in str(e):
                    print(f"   ❌ {field_name}: Campo não existe")
                else:
                    print(f"   ⚠️ {field_name}: Outro erro - {e}")
        
        print(f"\n📋 RESUMO - CAMPOS DISPONÍVEIS:")
        for field in working_fields:
            print(f"   ✓ {field}")
        
        # 2. Verificar produtos existentes para ver estrutura real
        print(f"\n2. Verificando produtos existentes...")
        existing = supabase.table('products').select('*').limit(1).execute()
        if existing.data:
            print(f"   📊 Campos encontrados em produto real:")
            for key, value in existing.data[0].items():
                print(f"     {key}: {type(value).__name__} = {value}")
        else:
            print("   ⚠️ Nenhum produto existente encontrado")
            
        # 3. Criar produto completo com campos que funcionam
        print(f"\n3. Criando produto de exemplo com todos os campos disponíveis...")
        
        complete_product = {
            "name": "Slim Quality Teste Completo",
            "price_cents": 329000,
            "width_cm": 138,
            "length_cm": 188,
            "height_cm": 28,
            "is_active": True
        }
        
        # Adicionar campos opcionais que funcionam
        if "description" in working_fields:
            complete_product["description"] = "Colchão magnético terapêutico com 8 tecnologias"
        if "sku" in working_fields:
            complete_product["sku"] = "SQ-CASAL-001"
        if "product_type" in working_fields:
            complete_product["product_type"] = "mattress"
        if "stock_quantity" in working_fields:
            complete_product["stock_quantity"] = 50
        if "category" in working_fields:
            complete_product["category"] = "colchao"
        if "brand" in working_fields:
            complete_product["brand"] = "Slim Quality"
        
        try:
            result = supabase.table('products').insert(complete_product).execute()
            print(f"   ✅ Produto completo criado com ID: {result.data[0]['id']}")
            print(f"   📋 Campos utilizados: {list(complete_product.keys())}")
            
            # Manter este produto como exemplo
            
        except Exception as e:
            print(f"   ❌ Erro ao criar produto completo: {e}")
            
    except Exception as e:
        print(f"❌ Erro geral: {e}")

if __name__ == "__main__":
    main()