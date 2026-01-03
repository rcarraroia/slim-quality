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
    
    # Configurar CORS CORRIGIDO - Permitir todos os domínios temporariamente para debug
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Temporário para debug
        allow_credentials=False,  # Não pode ser True com allow_origins=["*"]
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )
    
    # Importar e registrar novos routers para dashboard
    print("3. Registrando routers do dashboard...", flush=True)
    try:
        from .agent import router as agent_router
        from .mcp import router as mcp_router
        from .sicc import router as sicc_router
        
        app.include_router(agent_router)
        app.include_router(mcp_router)
        app.include_router(sicc_router)
        
        print("✅ Routers do dashboard registrados", flush=True)
    except Exception as router_error:
        print(f"⚠️ Erro ao registrar routers do dashboard: {router_error}", flush=True)
        # Continuar execução mesmo se routers falharem
    
    @app.get("/")
    async def root():
        return {"status": "ok", "message": "Sistema funcionando"}
    
    @app.get("/health")
    async def health():
        return {"status": "healthy", "container": "ok"}
    
    # Endpoint para envio direto de WhatsApp (usado pelo dashboard)
    @app.post("/send-whatsapp")
    async def send_whatsapp_direct(request: Request):
        try:
            body = await request.json()
            phone = body.get("phone", "")
            message = body.get("message", "")
            
            if not phone or not message:
                return {"error": "Phone e message são obrigatórios", "status": "error"}
            
            print(f"📤 Enviando mensagem direta para {phone}: {message}", flush=True)
            
            # Enviar via Evolution API
            success = await send_whatsapp_message(phone, message)
            
            if success:
                return {"status": "success", "message": "Mensagem enviada"}
            else:
                return {"error": "Falha ao enviar mensagem", "status": "error"}
                
        except Exception as e:
            print(f"Erro no send-whatsapp: {e}", flush=True)
            return {"error": str(e), "status": "error"}
    
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
                        print(f"📱 MENSAGEM RECEBIDA de {phone}: {message_text}", flush=True)
                        
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
    
    # Função para salvar conversa do WhatsApp no Supabase - CORRIGIDA
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
            
            # Detectar se é conversa do site ou WhatsApp
            is_site_conversation = phone.startswith('site_')
            channel = 'site' if is_site_conversation else 'whatsapp'
            
            # Para conversas do site, usar sessionId como identificador
            if is_site_conversation:
                session_id = phone.replace('site_', '')
                customer_name = f'Visitante Site {session_id[-8:]}'
                customer_email = f'site_{session_id}@slimquality.temp'
                customer_phone = None
            else:
                session_id = None
                customer_name = f'Cliente WhatsApp {phone[-4:]}'
                customer_email = f'whatsapp_{phone}@slimquality.temp'
                customer_phone = phone
            
            # 1. BUSCAR OU CRIAR CUSTOMER PRIMEIRO
            if is_site_conversation:
                # Para site, buscar por email único
                customer_result = supabase.table('customers').select('id').eq('email', customer_email).execute()
            else:
                # Para WhatsApp, buscar por telefone
                customer_result = supabase.table('customers').select('id').eq('phone', phone).execute()
            
            if customer_result.data:
                # Customer existe
                customer_id = customer_result.data[0]['id']
                print(f"✅ Customer encontrado: {customer_id} para {channel} {phone}", flush=True)
            else:
                # Criar novo customer
                customer_data = {
                    'name': customer_name,
                    'email': customer_email,
                    'phone': customer_phone,
                    'source': channel,
                    'status': 'active'
                }
                
                customer_result = supabase.table('customers').insert(customer_data).execute()
                
                if customer_result.data:
                    customer_id = customer_result.data[0]['id']
                    print(f"✅ Customer criado: {customer_id} para {channel} {phone}", flush=True)
                else:
                    print(f"❌ Erro ao criar customer para {channel} {phone}", flush=True)
                    return
            
            # 2. BUSCAR OU CRIAR CONVERSA USANDO CUSTOMER_ID
            conversation_result = supabase.table('conversations').select('id').eq('customer_id', customer_id).eq('channel', channel).eq('status', 'open').execute()
            
            if conversation_result.data:
                # Conversa ativa existe
                conversation_id = conversation_result.data[0]['id']
                print(f"✅ Conversa ativa encontrada: {conversation_id}", flush=True)
            else:
                # Criar nova conversa usando schema correto
                conversation_data = {
                    'customer_id': customer_id,  # CAMPO CORRETO
                    'channel': channel,  # 'site' ou 'whatsapp'
                    'status': 'open',
                    'subject': f'{channel.title()} {phone[-8:] if not is_site_conversation else session_id[-8:]}',
                    'session_id': session_id  # Para conversas do site
                }
                
                conversation_result = supabase.table('conversations').insert(conversation_data).execute()
                
                if conversation_result.data:
                    conversation_id = conversation_result.data[0]['id']
                    print(f"✅ Conversa criada: {conversation_id} para customer {customer_id} ({channel})", flush=True)
                else:
                    print(f"❌ Erro ao criar conversa para customer {customer_id} ({channel})", flush=True)
                    return
            
            # 3. SALVAR MENSAGEM COM SENDER_ID CORRETO
            message_data = {
                'conversation_id': conversation_id,
                'content': message,
                'sender_type': sender_type,
                'sender_id': customer_id  # Usar customer_id para ambos (customer e agent)
            }
            
            message_result = supabase.table('messages').insert(message_data).execute()
            
            if message_result.data:
                print(f"✅ Mensagem salva: {conversation_id} ({sender_type}) [{channel}] - {message[:50]}...", flush=True)
            else:
                print(f"❌ Erro ao salvar mensagem", flush=True)
            
        except Exception as e:
            print(f"❌ Erro ao salvar conversa {channel}: {e}", flush=True)
            import traceback
            print(f"❌ Traceback: {traceback.format_exc()}", flush=True)
    
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
    
    # Função para processar e enviar resposta - CORRIGIDA
    async def process_and_send(message: str, phone: str):
        try:
            print(f"🤖 PROCESSANDO mensagem de {phone}: {message}", flush=True)
            
            # Processar com SICC
            response = await process_with_sicc(message, phone)
            
            print(f"🧠 SICC respondeu: {response}", flush=True)
            
            # Enviar resposta via Evolution API
            success = await send_whatsapp_message(phone, response)
            
            if success:
                print(f"✅ FLUXO COMPLETO: {phone} -> processado e respondido", flush=True)
            else:
                print(f"❌ FALHA no envio para {phone}", flush=True)
            
        except Exception as e:
            print(f"❌ ERRO CRÍTICO no process_and_send: {e}", flush=True)
            import traceback
            print(f"❌ TRACEBACK: {traceback.format_exc()}", flush=True)
            
            # Tentar enviar mensagem de erro
            try:
                await send_whatsapp_message(phone, "Desculpe, estou com dificuldades técnicas. Pode tentar novamente?")
            except:
                print(f"❌ Falha total para {phone}", flush=True)
    
    # Função para enviar mensagem via Evolution API - CORRIGIDA
    async def send_whatsapp_message(phone: str, message: str):
        try:
            import httpx
            import os
            
            # Usar variáveis de ambiente
            evolution_url = os.getenv("EVOLUTION_URL", "https://slimquality-evolution-api.wpjtfd.easypanel.host")
            evolution_instance = os.getenv("EVOLUTION_INSTANCE", "SlimQualit")
            
            # URL correta para enviar mensagem - CORRIGIDA
            url = f"{evolution_url}/message/sendText/{evolution_instance}"
            
            payload = {
                "number": phone,  # Sem @s.whatsapp.net aqui
                "text": message
            }
            
            # Headers com autenticação - CORRIGIDOS
            headers = {
                "Content-Type": "application/json",
                "apikey": "9A390AED6A45-4610-93B2-245591E39FDE"  # API Key fixa
            }
            
            print(f"🚀 Enviando mensagem para {phone}", flush=True)
            print(f"URL: {url}", flush=True)
            print(f"Payload: {payload}", flush=True)
            
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(url, json=payload, headers=headers)
                
                print(f"📤 Resposta Evolution: {response.status_code}", flush=True)
                print(f"📤 Body: {response.text}", flush=True)
                
                if response.status_code in [200, 201]:
                    print(f"✅ Mensagem enviada com sucesso para {phone}", flush=True)
                    
                    # Salvar mensagem enviada no dashboard
                    await save_whatsapp_conversation(phone, message, 'agent')
                    
                    return True
                else:
                    print(f"❌ Erro ao enviar mensagem: {response.status_code} - {response.text}", flush=True)
                    return False
                
        except Exception as e:
            print(f"❌ ERRO CRÍTICO ao enviar mensagem: {e}", flush=True)
            import traceback
            print(f"❌ TRACEBACK: {traceback.format_exc()}", flush=True)
            return False
    
    print("✅ Rotas OK", flush=True)
    print("=== CONTAINER PRONTO ===", flush=True)
    
except Exception as e:
    print(f"❌ ERRO CRÍTICO: {e}", flush=True)
    import traceback
    print(f"❌ TRACEBACK: {traceback.format_exc()}", flush=True)
    exit(1)
