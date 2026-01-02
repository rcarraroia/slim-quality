#!/usr/bin/env python3
"""
Teste de URLs alternativas do agente
"""

import requests

def test_url(url, endpoint="health"):
    """Testa uma URL específica"""
    full_url = f"{url}/{endpoint}"
    try:
        response = requests.get(full_url, timeout=10)
        print(f"✅ {full_url} - Status: {response.status_code}")
        if response.status_code == 200:
            return True
    except Exception as e:
        print(f"❌ {full_url} - Erro: {str(e)[:50]}...")
    return False

def main():
    print("🔍 TESTANDO URLs DO AGENTE")
    print("=" * 50)
    
    # URLs possíveis
    urls = [
        "https://slimquality-agent.wpjtfd.easypanel.host",
        "https://api.slimquality.com.br", 
        "http://slimquality-agent.wpjtfd.easypanel.host",
        "https://slimquality-evolution-api.wpjtfd.easypanel.host"
    ]
    
    working_urls = []
    
    for url in urls:
        print(f"\n🧪 Testando: {url}")
        if test_url(url, "health"):
            working_urls.append(url)
            # Testar endpoints específicos
            print(f"  📋 Testando /api/chat...")
            test_url(url, "api/chat")
            print(f"  📋 Testando /webhooks/evolution...")
            test_url(url, "webhooks/evolution")
    
    print("\n" + "=" * 50)
    print("📊 RESULTADO:")
    if working_urls:
        print(f"✅ URLs funcionando: {len(working_urls)}")
        for url in working_urls:
            print(f"  - {url}")
    else:
        print("❌ NENHUMA URL FUNCIONANDO")
        print("💡 O agente precisa ser deployado/reiniciado no Easypanel")

if __name__ == "__main__":
    main()