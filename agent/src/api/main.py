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
    
    # Endpoint de teste para verificar se webhooks chegam
    @app.post("/test/webhook")
    async def test_webhook(request: Request):
        try:
            body = await request.body()
            print(f"=== WEBHOOK TESTE RECEBIDO ===", flush=True)
            print(f"Body: {body.decode('utf-8')}", flush=True)
            print(f"Headers: {dict(request.headers)}", flush=True)
            print(f"=== FIM WEBHOOK TESTE ===", flush=True)
            return {"status": "received", "message": "Webhook teste OK"}
        except Exception as e:
            print(f"Erro no webhook teste: {e}", flush=True)
            return {"error": str(e)}
    
    # Função para processar mensagem com SICC
    async def process_with_sicc(message: str, phone: str):
        try:
            print(f"Processando mensagem: {message} de {phone}", flush=True)
            
            # Verificar variáveis de ambiente críticas
            import os
            openai_key = os.getenv("OPENAI_API_KEY")
            supabase_url = os.getenv("SUPABASE_URL")
            
            print(f"OpenAI Key presente: {'Sim' if openai_key else 'Não'}", flush=True)
            print(f"Supabase URL: {supabase_url[:50] if supabase_url else 'Não configurada'}", flush=True)
            
            # Importar SICC
            print("Importando SICC...", flush=True)
            from src.services.sicc.sicc_service import SICCService
            print("SICC importado com sucesso", flush=True)
            
            sicc = SICCService()
            print("SICC instanciado", flush=True)
            
            # Processar mensagem
            print("Chamando process_message...", flush=True)
            response = await sicc.process_message(
                message=message,
                user_id=phone,
                context={"platform": "whatsapp"}
            )
            print(f"SICC processou: {response}", flush=True)
            
            return response.get('response', 'Desculpe, não consegui processar sua mensagem.')
            
        except Exception as e:
            print(f"Erro no SICC: {e}", flush=True)
            import traceback
            print(f"Traceback: {traceback.format_exc()}", flush=True)
            
            # Em caso de falha do SICC, tentar IA direta como emergência
            try:
                print("Tentando IA direta de emergência...", flush=True)
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
                
                print(f"IA de emergência respondeu: {emergency_response}", flush=True)
                return emergency_response.get('text', 'Desculpe, estou com dificuldades técnicas. Pode tentar novamente?')
                
            except Exception as emergency_error:
                print(f"Falha total do sistema: {emergency_error}", flush=True)
                import traceback
                print(f"Emergency Traceback: {traceback.format_exc()}", flush=True)
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
            import os
            
            # Usar variáveis de ambiente
            evolution_url = os.getenv("EVOLUTION_URL", "https://slimquality-evolution-api.wpjtfd.easypanel.host")
            evolution_instance = os.getenv("EVOLUTION_INSTANCE", "SlimQualit")
            
            # URL correta para enviar mensagem
            url = f"{evolution_url}/message/sendText/{evolution_instance.replace(' ', '%20')}"
            
            payload = {
                "number": f"{phone}@s.whatsapp.net",
                "text": message
            }
            
            # Headers com autenticação
            headers = {
                "Content-Type": "application/json"
            }
            
            # Adicionar API Key se disponível (do webhook recebido)
            api_key = os.getenv("EVOLUTION_API_KEY", "9A390AED6A45-4610-93B2-245591E39FDE")
            if api_key:
                headers["apikey"] = api_key
            
            print(f"Enviando para URL: {url}", flush=True)
            print(f"Headers: {headers}", flush=True)
            print(f"Payload: {payload}", flush=True)
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(url, json=payload, headers=headers)
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
