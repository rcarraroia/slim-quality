#!/usr/bin/env python3
"""
Teste direto do webhook para conversas do chat do site
"""

import requests
import json
import time
from datetime import datetime

def test_site_chat_webhook():
    """Testa se o webhook aceita conversas do chat do site"""
    
    webhook_url = "https://slimquality-agent.wpjtfd.easypanel.host/webhooks/evolution"
    session_id = f"test_{int(time.time())}"
    
    print(f"🧪 TESTANDO WEBHOOK DO CHAT DO SITE")
    print(f"📍 URL: {webhook_url}")
    print(f"🆔 Session ID: {session_id}")
    print("-" * 50)
    
    # 1. Testar mensagem do usuário
    user_payload = {
        "event": "messages.upsert",
        "instance": "SlimQualit",
        "data": {
            "key": {
                "remoteJid": f"site_{session_id}@s.whatsapp.net",
                "fromMe": False,
                "id": f"SITE_USER_{int(time.time())}"
            },
            "message": {
                "conversation": "Olá, gostaria de saber sobre os colchões"
            }
        }
    }
    
    print("📤 Enviando mensagem do usuário...")
    print(f"📋 Payload: {json.dumps(user_payload, indent=2)}")
    
    try:
        response = requests.post(
            webhook_url,
            json=user_payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        print(f"📥 Status: {response.status_code}")
        print(f"📄 Response: {response.text}")
        
        if response.status_code == 200:
            print("✅ Mensagem do usuário aceita pelo webhook")
        else:
            print("❌ Webhook rejeitou mensagem do usuário")
            return False
            
    except Exception as e:
        print(f"❌ Erro ao enviar mensagem do usuário: {e}")
        return False
    
    # Aguardar um pouco
    time.sleep(2)
    
    # 2. Testar resposta do agente
    agent_payload = {
        "event": "send.message",
        "instance": "SlimQualit",
        "data": {
            "key": {
                "remoteJid": f"site_{session_id}@s.whatsapp.net",
                "fromMe": True,
                "id": f"SITE_AGENT_{int(time.time())}"
            },
            "message": {
                "conversation": "Olá! Posso ajudar você com informações sobre nossos colchões magnéticos."
            }
        }
    }
    
    print("\n📤 Enviando resposta do agente...")
    print(f"📋 Payload: {json.dumps(agent_payload, indent=2)}")
    
    try:
        response = requests.post(
            webhook_url,
            json=agent_payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        print(f"📥 Status: {response.status_code}")
        print(f"📄 Response: {response.text}")
        
        if response.status_code == 200:
            print("✅ Resposta do agente aceita pelo webhook")
            return True
        else:
            print("❌ Webhook rejeitou resposta do agente")
            return False
            
    except Exception as e:
        print(f"❌ Erro ao enviar resposta do agente: {e}")
        return False

def test_direct_chat_api():
    """Testa API de chat direto"""
    
    chat_url = "https://slimquality-agent.wpjtfd.easypanel.host/api/chat"
    session_id = f"site_test_{int(time.time())}"
    
    print(f"\n🧪 TESTANDO API DE CHAT DIRETO")
    print(f"📍 URL: {chat_url}")
    print(f"🆔 Session ID: {session_id}")
    print("-" * 50)
    
    payload = {
        "message": "Teste do chat do site - gostaria de informações sobre colchões",
        "lead_id": session_id,
        "platform": "site"
    }
    
    print("📤 Enviando mensagem...")
    print(f"📋 Payload: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(
            chat_url,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        print(f"📥 Status: {response.status_code}")
        print(f"📄 Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == "success":
                print("✅ API de chat funcionando")
                print(f"🤖 Resposta: {data.get('response', 'N/A')[:100]}...")
                return True
            else:
                print("❌ API retornou erro")
                return False
        else:
            print("❌ API falhou")
            return False
            
    except Exception as e:
        print(f"❌ Erro na API de chat: {e}")
        return False

if __name__ == "__main__":
    print("🚀 INICIANDO TESTES DO CHAT DO SITE")
    print("=" * 60)
    
    # Teste 1: Webhook direto
    webhook_ok = test_site_chat_webhook()
    
    # Teste 2: API de chat
    api_ok = test_direct_chat_api()
    
    print("\n" + "=" * 60)
    print("📊 RESUMO DOS TESTES")
    print(f"🔗 Webhook: {'✅ OK' if webhook_ok else '❌ FALHOU'}")
    print(f"🤖 API Chat: {'✅ OK' if api_ok else '❌ FALHOU'}")
    
    if webhook_ok and api_ok:
        print("\n✅ TODOS OS TESTES PASSARAM")
        print("💡 O problema pode estar no frontend (ChatWidget)")
    elif api_ok and not webhook_ok:
        print("\n⚠️ API funciona mas webhook falha")
        print("💡 Problema na lógica de salvamento do webhook")
    elif webhook_ok and not api_ok:
        print("\n⚠️ Webhook funciona mas API falha")
        print("💡 Problema na API de chat")
    else:
        print("\n❌ AMBOS OS TESTES FALHARAM")
        print("💡 Problema no backend do agente")