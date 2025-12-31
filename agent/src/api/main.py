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
    
    # Endpoint para teste direto da IA
    @app.post("/api/chat")
    async def chat_endpoint(request: Request):
        try:
            body = await request.json()
            message = body.get("message", "")
            lead_id = body.get("lead_id", "test_user")
            
            if not message:
                return {"error": "Mensagem é obrigatória"}
            
            print(f"Chat direto - Mensagem: {message} de {lead_id}", flush=True)
            
            # Processar com SICC
            response = await process_with_sicc(message, lead_id)
            
            return {
                "response": response,
                "lead_id": lead_id,
                "status": "success"
            }
            
        except Exception as e:
            print(f"Erro no chat endpoint: {e}", flush=True)
            return {"error": str(e), "status": "error"}
    
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
            
            # Em caso de falha do SICC, tentar IA direta como emergência
            try:
                from src.services.ai_service import get_ai_service
                ai_service = get_ai_service()
                
                emergency_prompt = f"""Você é a BIA, consultora de colchões magnéticos terapêuticos da Slim Quality.

Responda de forma natural e consultiva à mensagem: "{message}"

Seja empática, educativa e focada em ajudar o cliente com problemas de saúde e sono."""
                
                emergency_response = await ai_service.generate_text(
                    prompt=emergency_prompt,
                    max_tokens=300,
                    temperature=0.7
                )
                
                return emergency_response.get('text', 'Desculpe, estou com dificuldades técnicas. Pode tentar novamente?')
                
            except Exception as emergency_error:
                print(f"Falha total do sistema: {emergency_error}", flush=True)
                return "Desculpe, estou com dificuldades técnicas no momento. Pode tentar novamente em alguns instantes?"
    
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
            
            # URL correta para enviar mensagem
            url = "https://slimquality-evolution-api.wpjtfd.easypanel.host/message/sendText/Slim%20Quality"
            
            payload = {
                "number": f"{phone}@s.whatsapp.net",
                "text": message
            }
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(url, json=payload)
                print(f"Mensagem enviada para {phone}: {response.status_code} - {response.text}", flush=True)
                
                if response.status_code == 200:
                    print(f"✅ Mensagem enviada com sucesso para {phone}", flush=True)
                else:
                    print(f"❌ Erro ao enviar mensagem: {response.status_code} - {response.text}", flush=True)
                
        except Exception as e:
            print(f"Erro ao enviar mensagem: {e}", flush=True)
    
    print("✅ Rotas OK", flush=True)
    print("=== CONTAINER PRONTO ===", flush=True)
    
except Exception as e:
    print(f"❌ ERRO CRÍTICO: {e}", flush=True)
    import traceback
    print(f"❌ TRACEBACK: {traceback.format_exc()}", flush=True)
    exit(1)
