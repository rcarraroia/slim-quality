"""
FastAPI Application - Versão Mínima para Diagnóstico
"""
import sys
import traceback

print("=== INICIANDO DIAGNÓSTICO ===", flush=True)
print(f"Python version: {sys.version}", flush=True)
print(f"Python path: {sys.path}", flush=True)

try:
    print("1. Importando FastAPI...", flush=True)
    from fastapi import FastAPI
    print("✅ FastAPI importado", flush=True)
    
    print("2. Criando app...", flush=True)
    app = FastAPI(title="Diagnóstico", version="0.1.0")
    print("✅ App criado", flush=True)
    
    @app.get("/")
    async def root():
        return {"status": "ok", "message": "Diagnóstico funcionando"}
    
    @app.get("/health")
    async def health():
        return {"status": "healthy"}
    
    print("✅ Rotas criadas", flush=True)
    print("=== DIAGNÓSTICO CONCLUÍDO COM SUCESSO ===", flush=True)
    
except Exception as e:
    print(f"❌ ERRO NO DIAGNÓSTICO: {e}", flush=True)
    print(f"❌ TRACEBACK: {traceback.format_exc()}", flush=True)
    sys.exit(1)