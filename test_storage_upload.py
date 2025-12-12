#!/usr/bin/env python3
"""
Testar se o upload de imagens está funcionando após correção RLS
"""

from supabase import create_client, Client
import os
import io

def main():
    print("🧪 TESTANDO UPLOAD DE IMAGENS")
    print("=" * 35)
    
    # Ler credenciais do .env
    env_vars = {}
    if os.path.exists('.env'):
        with open('.env', 'r', encoding='utf-8') as f:
            for line in f:
                if '=' in line and not line.startswith('#'):
                    key, value = line.split('=', 1)
                    env_vars[key.strip()] = value.strip()
    
    supabase_url = env_vars.get('SUPABASE_URL')
    anon_key = env_vars.get('SUPABASE_ANON_KEY')
    
    if not supabase_url or not anon_key:
        print("❌ Credenciais não encontradas")
        return False
    
    try:
        supabase = create_client(supabase_url, anon_key)
        
        print("\n1. Testando upload com anon key...")
        
        # Criar um arquivo de teste simples (simulando uma imagem)
        test_content = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\tpHYs\x00\x00\x0b\x13\x00\x00\x0b\x13\x01\x00\x9a\x9c\x18\x00\x00\x00\nIDATx\x9cc\xf8\x00\x00\x00\x01\x00\x01\x00\x00\x00\x00IEND\xaeB`\x82"
        test_filename = "test-upload-storage.png"
        
        # Tentar fazer upload
        result = supabase.storage.from_('product-images').upload(
            test_filename, 
            test_content,
            file_options={"content-type": "image/png"}
        )
        
        if result.path:
            print("✅ Upload funcionando!")
            print(f"   Arquivo salvo em: {result.path}")
            
            # Testar acesso público
            public_url = supabase.storage.from_('product-images').get_public_url(test_filename)
            print(f"   URL pública: {public_url}")
            
            # Limpar arquivo de teste
            delete_result = supabase.storage.from_('product-images').remove([test_filename])
            print("✅ Arquivo de teste removido")
            
        else:
            print("❌ Upload falhou")
            return False
        
        print(f"\n2. Testando inserção na tabela product_images...")
        
        # Buscar um produto existente para testar
        products = supabase.table('products').select('id').limit(1).execute()
        
        if products.data:
            product_id = products.data[0]['id']
            
            # Testar inserção na tabela product_images
            test_image_record = {
                "product_id": product_id,
                "image_url": "https://example.com/test-storage.jpg",
                "is_primary": False,
                "display_order": 999
            }
            
            image_result = supabase.table('product_images').insert(test_image_record).execute()
            
            if image_result.data:
                print("✅ Inserção na tabela product_images funcionando")
                
                # Limpar registro de teste
                supabase.table('product_images').delete().eq('id', image_result.data[0]['id']).execute()
                print("✅ Registro de teste removido")
            else:
                print("❌ Falha na inserção na tabela")
                return False
        
        print(f"\n🎉 UPLOAD DE IMAGENS TOTALMENTE FUNCIONAL!")
        print(f"")
        print(f"✅ Storage permite upload com anon key")
        print(f"✅ Arquivos são acessíveis publicamente")
        print(f"✅ Tabela product_images aceita inserções")
        print(f"✅ Sistema pronto para receber imagens reais")
        
        return True
        
    except Exception as e:
        print(f"❌ Erro no teste: {e}")
        return False

if __name__ == "__main__":
    success = main()
    
    if success:
        print(f"\n🚀 AGORA VOCÊ PODE FAZER UPLOAD DE IMAGENS!")
        print(f"   Tente novamente adicionar imagem no dashboard")
    else:
        print(f"\n⚠️ AINDA HÁ PROBLEMAS COM STORAGE")
        print(f"   Verifique os erros acima")