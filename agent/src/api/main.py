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
    
    # Configurar CORS para site e localhost
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "https://slimquality.com.br",
            "https://slimquality.vercel.app", 
            "http://localhost:8081",
            "http://localhost:3000",
            "http://localhost:5173"
        ],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
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
            
            event_type = data.get('event', '')
            
            # MENSAGENS RECEBIDAS - CORRIGIR EVENTO
            if event_type == 'messages.upsert' and data.get('data'):
                message_data = data['data']
                
                # Verificar se é mensagem de texto e não é de nós mesmos
                if (message_data.get('message', {}).get('conversation') and 
                    not message_data.get('key', {}).get('fromMe', False)):
                    
                    phone = message_data.get('key', {}).get('remoteJid', '').replace('@s.whatsapp.net', '')
                    message_text = message_data.get('message', {}).get('conversation', '')
                    
                    if phone and message_text:
                        print(f"📱 Mensagem recebida de {phone}: {message_text}", flush=True)
                        # Processar em background
                        background_tasks.add_task(process_and_send, message_text, phone)
                        
                        # Salvar conversa no Supabase para dashboard
                        background_tasks.add_task(save_whatsapp_conversation, phone, message_text, 'customer')
            
            # MENSAGENS ENVIADAS - CORRIGIR EVENTO
            elif event_type == 'send.message' and data.get('data'):
                message_data = data['data']
                phone = message_data.get('key', {}).get('remoteJid', '').replace('@s.whatsapp.net', '')
                message_text = message_data.get('message', {}).get('conversation', '')
                
                if phone and message_text:
                    print(f"📤 Mensagem enviada para {phone}: {message_text}", flush=True)
                    # Salvar mensagem enviada no dashboard
                    background_tasks.add_task(save_whatsapp_conversation, phone, message_text, 'agent')
            
            # STATUS DE CONEXÃO - CORRIGIR EVENTO
            elif event_type == 'connection.update':
                connection_data = data.get('data', {})
                status = connection_data.get('state', 'unknown')
                print(f"🔗 Status de conexão WhatsApp: {status}", flush=True)
                
                # Salvar status no dashboard
                background_tasks.add_task(save_connection_status, status)
            
            # APLICAÇÃO INICIADA - CORRIGIR EVENTO
            elif event_type == 'application.startup':
                print("🚀 Evolution API iniciada!", flush=True)
                background_tasks.add_task(save_connection_status, 'startup')
            
            # QR CODE ATUALIZADO - CORRIGIR EVENTO
            elif event_type == 'qrcode.updated':
                qr_data = data.get('data', {})
                qr_code = qr_data.get('qrcode', '')
                print(f"📱 QR Code atualizado (tamanho: {len(qr_code)} chars)", flush=True)
                
                # Salvar QR code para dashboard (pode ser usado para reconexão)
                background_tasks.add_task(save_qr_code, qr_code)
            
            # CONTATOS ATUALIZADOS - CORRIGIR EVENTO
            elif event_type == 'contacts.upsert':
                contacts_data = data.get('data', [])
                print(f"👥 Contatos atualizados: {len(contacts_data)} contatos", flush=True)
                
                # Processar contatos em background
                background_tasks.add_task(process_contacts_update, contacts_data)
            
            # STATUS DE PRESENÇA - CORRIGIR EVENTO
            elif event_type == 'presence.update':
                presence_data = data.get('data', {})
                phone = presence_data.get('id', '').replace('@s.whatsapp.net', '')
                presence = presence_data.get('presences', {})
                
                if phone and presence:
                    print(f"👤 Presença {phone}: {presence}", flush=True)
                    # Pode ser usado para mostrar "digitando..." no dashboard
                    background_tasks.add_task(save_presence_status, phone, presence)
            
            # MENSAGENS DELETADAS - CORRIGIR EVENTO
            elif event_type == 'messages.delete':
                delete_data = data.get('data', {})
                phone = delete_data.get('key', {}).get('remoteJid', '').replace('@s.whatsapp.net', '')
                message_id = delete_data.get('key', {}).get('id', '')
                
                if phone and message_id:
                    print(f"🗑️ Mensagem deletada: {message_id} de {phone}", flush=True)
                    background_tasks.add_task(handle_message_delete, phone, message_id)
            
            # MENSAGENS ATUALIZADAS - CORRIGIR EVENTO
            elif event_type == 'messages.update':
                update_data = data.get('data', {})
                phone = update_data.get('remoteJid', '').replace('@s.whatsapp.net', '')
                
                if phone:
                    print(f"✏️ Mensagem atualizada de {phone}", flush=True)
                    # Pode ser usado para status de leitura, etc.
            
            return {"status": "received", "event": event_type}
            
        except Exception as e:
            print(f"Erro no webhook: {e}", flush=True)
            return {"status": "error", "message": str(e)}
    
    # Função para salvar conversa do WhatsApp no Supabase
    async def save_whatsapp_conversation(phone: str, message: str, sender_type: str = 'customer'):
        try:
            import os
            from supabase import create_client, Client
            
            # Configurar Supabase
            supabase_url = os.getenv("SUPABASE_URL")
            supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
            
            if not supabase_url or not supabase_key:
                print("Supabase não configurado para salvar conversas", flush=True)
                return
            
            supabase: Client = create_client(supabase_url, supabase_key)
            
            # Buscar ou criar conversa
            conversation_result = supabase.table('conversations').select('*').eq('customer_phone', phone).eq('channel', 'whatsapp').execute()
            
            if conversation_result.data:
                # Conversa existe - atualizar
                conversation_id = conversation_result.data[0]['id']
                supabase.table('conversations').update({
                    'last_message_at': 'now()',
                    'updated_at': 'now()',
                    'status': 'open'
                }).eq('id', conversation_id).execute()
            else:
                # Criar nova conversa
                conversation_result = supabase.table('conversations').insert({
                    'customer_phone': phone,
                    'customer_name': f'Cliente {phone[-4:]}',
                    'channel': 'whatsapp',
                    'status': 'open',
                    'created_at': 'now()',
                    'updated_at': 'now()',
                    'last_message_at': 'now()'
                }).execute()
                
                if conversation_result.data:
                    conversation_id = conversation_result.data[0]['id']
                else:
                    print("Erro ao criar conversa", flush=True)
                    return
            
            # Salvar mensagem
            supabase.table('messages').insert({
                'conversation_id': conversation_id,
                'content': message,
                'sender_type': sender_type,  # 'customer' ou 'agent'
                'created_at': 'now()'
            }).execute()
            
            print(f"✅ Conversa WhatsApp salva: {phone} -> {conversation_id} ({sender_type})", flush=True)
            
        except Exception as e:
            print(f"Erro ao salvar conversa WhatsApp: {e}", flush=True)
    
    # Função para salvar status de conexão
    async def save_connection_status(status: str):
        try:
            import os
            from supabase import create_client, Client
            
            supabase_url = os.getenv("SUPABASE_URL")
            supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
            
            if not supabase_url or not supabase_key:
                return
            
            supabase: Client = create_client(supabase_url, supabase_key)
            
            # Salvar status de conexão (pode ser usado para métricas do agente)
            supabase.table('agent_status').upsert({
                'agent_type': 'whatsapp_evolution',
                'status': status,
                'last_update': 'now()',
                'metadata': {'connection_state': status}
            }).execute()
            
            print(f"✅ Status de conexão salvo: {status}", flush=True)
            
        except Exception as e:
            print(f"Erro ao salvar status de conexão: {e}", flush=True)
            
    # Função para salvar QR code
    async def save_qr_code(qr_code: str):
        try:
            import os
            from supabase import create_client, Client
            
            supabase_url = os.getenv("SUPABASE_URL")
            supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
            
            if not supabase_url or not supabase_key:
                return
            
            supabase: Client = create_client(supabase_url, supabase_key)
            
            # Salvar QR code para reconexão
            supabase.table('agent_status').upsert({
                'agent_type': 'whatsapp_evolution',
                'status': 'qr_code_updated',
                'last_update': 'now()',
                'metadata': {'qr_code': qr_code[:100]}  # Truncar para não sobrecarregar
            }).execute()
            
            print(f"✅ QR Code salvo para dashboard", flush=True)
            
        except Exception as e:
            print(f"Erro ao salvar QR code: {e}", flush=True)
    
    # Função para processar atualizações de contatos
    async def process_contacts_update(contacts_data):
        try:
            import os
            from supabase import create_client, Client
            
            supabase_url = os.getenv("SUPABASE_URL")
            supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
            
            if not supabase_url or not supabase_key:
                return
            
            supabase: Client = create_client(supabase_url, supabase_key)
            
            # Atualizar contadores de contatos
            contact_count = len(contacts_data) if isinstance(contacts_data, list) else 1
            
            supabase.table('agent_status').upsert({
                'agent_type': 'whatsapp_evolution',
                'status': 'contacts_updated',
                'last_update': 'now()',
                'metadata': {'contact_count': contact_count}
            }).execute()
            
            print(f"✅ Contatos processados: {contact_count}", flush=True)
            
        except Exception as e:
            print(f"Erro ao processar contatos: {e}", flush=True)
    
    # Função para salvar status de presença
    async def save_presence_status(phone: str, presence: dict):
        try:
            import os
            from supabase import create_client, Client
            
            supabase_url = os.getenv("SUPABASE_URL")
            supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
            
            if not supabase_url or not supabase_key:
                return
            
            supabase: Client = create_client(supabase_url, supabase_key)
            
            # Atualizar status de presença na conversa
            supabase.table('conversations').update({
                'presence_status': presence,
                'updated_at': 'now()'
            }).eq('customer_phone', phone).eq('channel', 'whatsapp').execute()
            
            print(f"✅ Presença atualizada: {phone} -> {presence}", flush=True)
            
        except Exception as e:
            print(f"Erro ao salvar presença: {e}", flush=True)
    
    # Função para lidar com mensagens deletadas
    async def handle_message_delete(phone: str, message_id: str):
        try:
            import os
            from supabase import create_client, Client
            
            supabase_url = os.getenv("SUPABASE_URL")
            supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
            
            if not supabase_url or not supabase_key:
                return
            
            supabase: Client = create_client(supabase_url, supabase_key)
            
            # Marcar mensagem como deletada (soft delete)
            supabase.table('messages').update({
                'deleted_at': 'now()',
                'updated_at': 'now()'
            }).eq('external_id', message_id).execute()
            
            print(f"✅ Mensagem marcada como deletada: {message_id}", flush=True)
            
        except Exception as e:
            print(f"Erro ao deletar mensagem: {e}", flush=True)
    
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
                
                if response.status_code in [200, 201]:
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
