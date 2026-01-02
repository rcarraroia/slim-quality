#!/usr/bin/env python3
"""
Teste das URLs corrigidas
"""

import requests
import json
import time

def test_chat_api():
    """Testa API de chat com URL correta"""
    
    chat_url = "https://api.slimquality.com.br/api/chat"
    session_id = f"site_test_{int(time.time())}"
    
    print(f"🧪 TESTANDO API DE CHAT CORRIGIDA")
    print(f"📍 URL: {chat_url}")
    print("-" * 50)
    
    payload = {
        "message": "Teste com URL correta - gostaria de informações sobre colchões",
        "lead_id": session_id,
        "platform": "site"
    }
    
    try:
        response = requests.post(
            chat_url,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        print(f"📥 Status: {response.status_code}")
        print(f"📄 Response: {response.text[:200]}...")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == "success":
                print("✅ API de chat funcionando com URL correta!")
                return True
        
        print("❌ API ainda não funciona")
        return False
        
    except Exception as e:
        print(f"❌ Erro: {e}")
        return False

def test_webhook():
    """Testa webhook com URL correta"""
    
    webhook_url = "https://api.slimquality.com.br/webhooks/evolution"
    session_id = f"test_{int(time.time())}"
    
    print(f"\n🧪 TESTANDO WEBHOOK CORRIGIDO")
    print(f"📍 URL: {webhook_url}")
    print("-" * 50)
    
    payload = {
        "event": "messages.upsert",
        "instance": "SlimQualit",
        "data": {
            "key": {
                "remoteJid": f"site_{session_id}@s.whatsapp.net",
                "fromMe": False,
                "id": f"SITE_USER_{int(time.time())}"
            },
            "message": {
                "conversation": "Teste com URL correta"
            }
        }
    }
    
    try:
        response = requests.post(
            webhook_url,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        print(f"📥 Status: {response.status_code}")
        print(f"📄 Response: {response.text[:200]}...")
        
        if response.status_code == 200:
            print("✅ Webhook funcionando com URL correta!")
            return True
        
        print("❌ Webhook ainda não funciona")
        return False
        
    except Exception as e:
        print(f"❌ Erro: {e}")
        return False

if __name__ == "__main__":
    print("🚀 TESTANDO URLs CORRIGIDAS")
    print("=" * 60)
    
    api_ok = test_chat_api()
    webhook_ok = test_webhook()
    
    print("\n" + "=" * 60)
    print("📊 RESULTADO:")
    print(f"🤖 API Chat: {'✅ OK' if api_ok else '❌ FALHOU'}")
    print(f"🔗 Webhook: {'✅ OK' if webhook_ok else '❌ FALHOU'}")
    
    if api_ok or webhook_ok:
        print("\n✅ CORREÇÃO FUNCIONOU!")
        print("💡 Chat do site deve funcionar agora")
    else:
        print("\n❌ AINDA HÁ PROBLEMAS")
        print("💡 Pode precisar de rebuild no Easypanel")