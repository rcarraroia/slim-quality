#!/usr/bin/env python3
"""
Script para deletar arquivos antigos de imagens de produtos do Supabase Storage
"""

import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

# Configurar cliente Supabase
url = os.getenv("VITE_SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")  # Usar service key para ter permissão total

if not url or not key:
    print("❌ Erro: Variáveis de ambiente não configuradas")
    print("Configure VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env")
    exit(1)

supabase: Client = create_client(url, key)

# Lista de arquivos para deletar (extraídos do banco)
files_to_delete = [
    "ded30c6b-08ac-490d-8f09-2ea715bf6d75/1765499736935.jpg",
    "f42d75b1-1109-44bb-8959-0517c73df095/1765499750790.jpg",
    "7860a1bb-5dc4-419f-bcf3-f4702523d2d3/1767385503222.jpg",
    "f42d75b1-1109-44bb-8959-0517c73df095/1767901450122.png"
]

print("🧹 Iniciando limpeza de arquivos antigos do storage...")
print(f"📁 Total de arquivos para deletar: {len(files_to_delete)}")
print()

deleted_count = 0
error_count = 0

for file_path in files_to_delete:
    try:
        print(f"🗑️  Deletando: {file_path}")
        result = supabase.storage.from_("product-images").remove([file_path])
        deleted_count += 1
        print(f"   ✅ Deletado com sucesso")
    except Exception as e:
        error_count += 1
        print(f"   ❌ Erro ao deletar: {str(e)}")
    print()

print("=" * 60)
print("📊 RESUMO DA LIMPEZA")
print("=" * 60)
print(f"✅ Arquivos deletados: {deleted_count}")
print(f"❌ Erros: {error_count}")
print(f"📁 Total processado: {len(files_to_delete)}")
print()
print("✨ Limpeza concluída!")
