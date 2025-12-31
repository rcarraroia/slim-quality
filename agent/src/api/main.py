"""
FastAPI Application - Entry point com SICC
"""
print("=== CONTAINER INICIANDO ===", flush=True)

try:
    print("1. Importando FastAPI...", flush=True)
    from fastapi import FastAPI, Request, BackgroundTasks
    from fastapi.middleware.cors import CORSMiddleware
    import json
    print("✅ FastAPI OK", flush=True)
    
    print("2. Criando app...", flush=True)
    app = FastAPI(title="Slim Quality Agent", version="0.1.0")
    print("✅ App OK", flush=True)
    
    # Configurar CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    @app.get("/")
    async def root():
        return {"status": "ok", "message": "Sistema funcionando"}
    
    @app.get("/health")
    async def health():
        return {"status": "healthy", "container": "ok"}
    
    # Função para processar mensagem com SICC
    async def process_with_sicc(message: str, phone: str):
        try:
            print(f"Processando mensagem: {message} de {phone}", flush=True)
            
            # Importar SICC
            from src.services.sicc.sicc_service import SICCService
            sicc = SICCService()
            
            # Processar mensagem
            response = await sicc.process_message(
                message=message,
                user_id=phone,
                context={"platform": "whatsapp"}
            )
            
            return response.get('response', 'Desculpe, não consegui processar sua mensagem.')
            
        except Exception as e:
            print(f"Erro no SICC: {e}", flush=True)
            # Resposta de fallback
            if "colch" in message.lower():
                return "Nossos colchões magnéticos são ideais para melhorar seu sono e saúde! Temos modelos Solteiro (R$ 3.190), Padrão (R$ 3.290), Queen (R$ 3.490) e King (R$ 4.890). Qual modelo te interessa?"
            else:
                return "Olá! Sou a Bia, sua consultora de colchões magnéticos. Como posso te ajudar hoje?"
    
    # Webhook Evolution API
    @app.post("/webhooks/evolution")
    async def webhook_evolution(request: Request, background_tasks: BackgroundTasks):
        try:
            body = await request.body()
            data = json.loads(body.decode('utf-8'))
            
            print(f"Webhook recebido: {data}", flush=True)
            
            # Extrair dados da mensagem
            if data.get('event') == 'messages.upsert' and data.get('data'):
                message_data = data['data']
                
                # Verificar se é mensagem de texto
                if message_data.get('message', {}).get('conversation'):
                    phone = message_data.get('key', {}).get('remoteJid', '').replace('@s.whatsapp.net', '')
                    message_text = message_data.get('message', {}).get('conversation', '')
                    
                    if phone and message_text:
                        # Processar em background
                        background_tasks.add_task(process_and_send, message_text, phone)
            
            return {"status": "received"}
            
        except Exception as e:
            print(f"Erro no webhook: {e}", flush=True)
            return {"status": "error", "message": str(e)}
    
    # Função para processar e enviar resposta
    async def process_and_send(message: str, phone: str):
        try:
            # Processar com SICC
            response = await process_with_sicc(message, phone)
            
            # Enviar resposta via Evolution API
            await send_whatsapp_message(phone, response)
            
        except Exception as e:
            print(f"Erro ao processar e enviar: {e}", flush=True)
    
    # Função para enviar mensagem via Evolution API
    async def send_whatsapp_message(phone: str, message: str):
        try:
            import httpx
            
            url = "https://slimquality-evolution-api.wpjtfd.easypanel.host/message/sendText/Slim Quality"
            
            payload = {
                "number": f"{phone}@s.whatsapp.net",
                "text": message
            }
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(url, json=payload)
                print(f"Mensagem enviada para {phone}: {response.status_code}", flush=True)
                
        except Exception as e:
            print(f"Erro ao enviar mensagem: {e}", flush=True)
    
    print("✅ Rotas OK", flush=True)
    print("=== CONTAINER PRONTO ===", flush=True)
    
except Exception as e:
    print(f"❌ ERRO CRÍTICO: {e}", flush=True)
    import traceback
    print(f"❌ TRACEBACK: {traceback.format_exc()}", flush=True)
    exit(1)
