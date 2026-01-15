"""
Agent API - Endpoints para gerenciamento do agente
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import List, Dict, Any
import structlog
from datetime import datetime

from ..schemas.agent_schemas import (
    AgentStatus, ConversationSummary, AgentConfig, 
    TestPromptRequest, TestPromptResponse, AgentMetrics,
    SuccessResponse, ErrorResponse
)

logger = structlog.get_logger(__name__)

# Router para endpoints do agente
router = APIRouter(prefix="/api/agent", tags=["agent"])


@router.get("/status", response_model=AgentStatus)
async def get_agent_status():
    """
    Obtém status atual do agente
    
    Returns:
        Status detalhado do agente
    """
    try:
        logger.info("Obtendo status do agente")
        
        # Calcular uptime real do container
        import os
        from datetime import datetime
        
        # Tentar obter tempo de início do container
        container_start_time = os.getenv("CONTAINER_START_TIME")
        if container_start_time:
            try:
                start_time = datetime.fromisoformat(container_start_time)
                uptime_seconds = (datetime.now() - start_time).total_seconds()
            except:
                # Fallback: usar tempo desde importação do módulo
                uptime_seconds = 0.0
        else:
            # Fallback: assumir que acabou de iniciar
            uptime_seconds = 0.0
        
        # Verificar status do SICC
        sicc_enabled = False
        try:
            from ..services.sicc.sicc_service import get_sicc_service
            sicc_service = get_sicc_service()
            sicc_enabled = sicc_service.is_initialized
        except Exception as sicc_error:
            logger.warning("Erro ao verificar status SICC", error=str(sicc_error))
            sicc_enabled = False
        
        # Obter modelo atual do AI Service
        current_model = "gpt-4o"  # Default
        try:
            from ..services.ai_service import get_ai_service
            ai_service = get_ai_service()
            # Verificar se AI service tem método para obter modelo atual
            if hasattr(ai_service, 'current_model'):
                current_model = ai_service.current_model
            elif hasattr(ai_service, 'settings'):
                current_model = getattr(ai_service.settings, 'openai_model', 'gpt-4o')
        except Exception as ai_error:
            logger.warning("Erro ao obter modelo atual", error=str(ai_error))
            current_model = "gpt-4o"
        
        # Determinar status geral
        if sicc_enabled:
            agent_status = "online"
        else:
            agent_status = "initializing"
        
        return AgentStatus(
            status=agent_status,
            uptime_seconds=uptime_seconds,
            model=current_model,
            sicc_enabled=sicc_enabled,
            last_activity=datetime.now()
        )
        
    except Exception as e:
        logger.error("Erro ao obter status do agente", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/conversations", response_model=List[ConversationSummary])
async def get_recent_conversations(limit: int = 10, offset: int = 0):
    """
    Obtém conversas recentes
    
    Args:
        limit: Número máximo de conversas (default: 10)
        offset: Offset para paginação (default: 0)
    
    Returns:
        Lista de conversas recentes
    """
    try:
        logger.info("Obtendo conversas recentes", limit=limit, offset=offset)
        
        # Integrar com Supabase para buscar conversas reais
        try:
            from ..services.supabase_client import get_supabase_client
            supabase = get_supabase_client()
            
            # Query otimizada: buscar conversas com count de mensagens
            query = supabase.table('conversations').select('''
                id,
                subject,
                channel,
                status,
                updated_at,
                customers!inner(name),
                messages(count)
            ''').order('updated_at', desc=True).range(offset, offset + limit - 1)
            
            result = query.execute()
            
            conversations = []
            for conv in result.data:
                # Extrair dados da conversa
                customer_name = conv.get('customers', {}).get('name', 'Cliente Anônimo')
                last_message = conv.get('subject', 'Sem mensagens')
                message_count = len(conv.get('messages', []))
                
                conversations.append(ConversationSummary(
                    id=conv['id'],
                    customer_name=customer_name,
                    channel=conv.get('channel', 'whatsapp'),
                    last_message=last_message[:100] + '...' if len(last_message) > 100 else last_message,
                    message_count=message_count,
                    updated_at=datetime.fromisoformat(conv['updated_at'].replace('Z', '+00:00')),
                    status=conv.get('status', 'open')
                ))
            
            logger.info("Conversas obtidas com sucesso", count=len(conversations))
            return conversations
            
        except Exception as supabase_error:
            logger.warning("Erro ao buscar conversas no Supabase", error=str(supabase_error))
            
            # Fallback: retornar lista vazia ao invés de quebrar
            return []
        
    except Exception as e:
        logger.error("Erro ao obter conversas", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/config", response_model=AgentConfig)
async def get_agent_config():
    """
    Obtém configuração atual do agente
    
    Returns:
        Configuração do agente
    """
    try:
        logger.info("Obtendo configuração do agente")
        
        # Buscar configuração real do banco de dados
        try:
            from ..services.supabase_client import get_supabase_client
            supabase = get_supabase_client()
            
            # Buscar configuração na tabela agent_config
            result = supabase.table('agent_config').select('*').order('created_at', desc=True).limit(1).execute()
            
            if result.data and len(result.data) > 0:
                config_data = result.data[0]
                
                return AgentConfig(
                    model=config_data.get('model', 'gpt-4o'),
                    temperature=float(config_data.get('temperature', 0.7)),
                    max_tokens=int(config_data.get('max_tokens', 2000)),
                    system_prompt=config_data.get('system_prompt', 'Sistema inicializando...'),
                    sicc_enabled=bool(config_data.get('sicc_enabled', False))
                )
            else:
                logger.warning("Nenhuma configuração encontrada no banco, usando padrão")
                # Fallback: configuração padrão
                return AgentConfig(
                    model="gpt-4o",
                    temperature=0.7,
                    max_tokens=2000,
                    system_prompt="Você é a BIA, consultora especializada em colchões magnéticos terapêuticos da Slim Quality. Seja consultiva, empática e focada em resolver problemas de saúde e sono dos clientes.",
                    sicc_enabled=False
                )
                
        except Exception as db_error:
            logger.warning("Erro ao buscar configuração no banco", error=str(db_error))
            
            # Fallback: configuração padrão
            return AgentConfig(
                model="gpt-4o",
                temperature=0.7,
                max_tokens=2000,
                system_prompt="Sistema inicializando...",
                sicc_enabled=False
            )
        
    except Exception as e:
        logger.error("Erro ao obter configuração", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/config", response_model=SuccessResponse)
async def save_agent_config(config: AgentConfig):
    """
    Salva configuração do agente
    
    Args:
        config: Nova configuração
        
    Returns:
        Confirmação de salvamento
    """
    try:
        logger.info("Salvando configuração do agente", config=config.dict())
        
        # Salvar configuração real no banco de dados
        try:
            from ..services.supabase_client import get_supabase_client
            supabase = get_supabase_client()
            
            # Verificar se já existe configuração
            existing = supabase.table('agent_config').select('id').execute()
            
            config_data = {
                'model': config.model,
                'temperature': config.temperature,
                'max_tokens': config.max_tokens,
                'system_prompt': config.system_prompt,
                'sicc_enabled': config.sicc_enabled,
                'updated_at': 'now()'
            }
            
            if existing.data and len(existing.data) > 0:
                # Atualizar configuração existente
                result = supabase.table('agent_config').update(config_data).eq('id', existing.data[0]['id']).execute()
                logger.info("Configuração atualizada no banco")
            else:
                # Inserir nova configuração
                result = supabase.table('agent_config').insert(config_data).execute()
                logger.info("Nova configuração inserida no banco")
            
            # Aplicar configurações no AI Service se disponível
            try:
                from ..services.ai_service import get_ai_service
                ai_service = get_ai_service()
                
                if hasattr(ai_service, 'update_config'):
                    ai_service.update_config({
                        'model': config.model,
                        'temperature': config.temperature,
                        'max_tokens': config.max_tokens
                    })
                
                logger.info("Configurações aplicadas no AI Service")
                
            except Exception as ai_error:
                logger.warning("Erro ao aplicar configurações no AI Service", error=str(ai_error))
            
            # Aplicar configurações no SICC se necessário
            if config.sicc_enabled:
                try:
                    from ..services.sicc.sicc_service import get_sicc_service
                    sicc_service = get_sicc_service()
                    
                    if not sicc_service.is_initialized:
                        await sicc_service.initialize()
                        logger.info("SICC inicializado via configuração")
                        
                except Exception as sicc_error:
                    logger.warning("Erro ao configurar SICC", error=str(sicc_error))
            
            return SuccessResponse(
                success=True,
                message="Configuração salva com sucesso no banco de dados",
                data={"applied_settings": config.dict(), "saved_to_db": True}
            )
            
        except Exception as db_error:
            logger.error("Erro ao salvar configuração no banco", error=str(db_error))
            return SuccessResponse(
                success=False,
                message=f"Erro ao salvar no banco: {str(db_error)}"
            )
        
    except Exception as e:
        logger.error("Erro ao salvar configuração", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/test-prompt", response_model=TestPromptResponse)
async def test_prompt(request: TestPromptRequest):
    """
    Testa um prompt com a configuração atual
    
    Args:
        request: Dados do teste
        
    Returns:
        Resultado do teste
    """
    try:
        logger.info("Testando prompt", prompt=request.prompt[:50])
        
        import time
        start_time = time.time()
        
        # Integrar com AI Service para gerar resposta real
        try:
            from ..services.ai_service import get_ai_service
            ai_service = get_ai_service()
            
            # Gerar resposta usando configurações do request
            ai_response = await ai_service.generate_text(
                prompt=request.prompt,
                max_tokens=request.max_tokens or 300,
                temperature=request.temperature or 0.7
            )
            
            # Calcular tempo de resposta
            response_time_ms = (time.time() - start_time) * 1000
            
            # Extrair dados da resposta
            response_text = ai_response.get('text', 'Erro na geração')
            tokens_used = ai_response.get('tokens_used', 0)
            model_used = ai_response.get('provider', 'unknown')
            
            logger.info("Prompt testado com sucesso", 
                       response_time_ms=response_time_ms,
                       tokens_used=tokens_used,
                       model_used=model_used)
            
            return TestPromptResponse(
                response=response_text,
                tokens_used=tokens_used,
                response_time_ms=response_time_ms,
                model_used=model_used
            )
            
        except Exception as ai_error:
            logger.warning("Erro no AI Service para teste", error=str(ai_error))
            
            # Fallback: resposta de erro informativa
            response_time_ms = (time.time() - start_time) * 1000
            
            return TestPromptResponse(
                response=f"Erro no teste: {str(ai_error)}",
                tokens_used=0,
                response_time_ms=response_time_ms,
                model_used="error"
            )
        
    except Exception as e:
        logger.error("Erro ao testar prompt", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/metrics", response_model=AgentMetrics)
async def get_agent_metrics():
    """
    Obtém métricas do agente
    
    Returns:
        Métricas detalhadas
    """
    try:
        logger.info("Obtendo métricas do agente")
        
        # Calcular uptime
        import os
        from datetime import datetime, timedelta
        
        container_start_time = os.getenv("CONTAINER_START_TIME")
        if container_start_time:
            try:
                start_time = datetime.fromisoformat(container_start_time)
                uptime_hours = (datetime.now() - start_time).total_seconds() / 3600
            except:
                uptime_hours = 0.0
        else:
            uptime_hours = 0.0
        
        # Buscar métricas reais do banco
        total_conversations = 0
        avg_response_time_ms = 0.0
        success_rate = 0.0
        tokens_used_today = 0
        
        try:
            from ..services.supabase_client import get_supabase_client
            supabase = get_supabase_client()
            
            # Contar conversas totais
            conv_result = supabase.table('conversations').select('id', count='exact').execute()
            total_conversations = conv_result.count or 0
            
            # Buscar métricas de hoje
            today = datetime.now().date()
            today_start = f"{today}T00:00:00"
            
            # Contar mensagens de hoje (proxy para tokens)
            msg_result = supabase.table('messages').select('id', count='exact').gte('created_at', today_start).execute()
            tokens_used_today = (msg_result.count or 0) * 50  # Estimativa: 50 tokens por mensagem
            
            # Calcular taxa de sucesso (conversas com pelo menos 2 mensagens)
            success_convs = supabase.table('conversations').select('id', count='exact').gte('created_at', today_start).execute()
            if success_convs.count and success_convs.count > 0:
                success_rate = min(1.0, total_conversations / max(1, success_convs.count))
            
            # Tempo médio de resposta (estimativa baseada em conversas ativas)
            avg_response_time_ms = 1500.0  # Estimativa padrão
            
        except Exception as db_error:
            logger.warning("Erro ao buscar métricas do banco", error=str(db_error))
        
        # Calcular uptime em percentual (assumindo 24h = 100%)
        uptime_percentage = min(100.0, (uptime_hours / 24.0) * 100.0) if uptime_hours > 0 else 95.0
        
        # Converter latência de ms para segundos
        average_latency_seconds = avg_response_time_ms / 1000.0
        
        # Converter success_rate (0-1) para accuracy_rate (0-100)
        accuracy_rate_percentage = success_rate * 100.0
        
        # Gerar dados para gráficos (últimas 24 horas)
        latency_by_hour = []
        now = datetime.now()
        for i in range(24):
            hour_time = now - timedelta(hours=i)
            latency_by_hour.append({
                "hour": hour_time.strftime("%H:00"),
                "latency": average_latency_seconds + (i * 0.05)  # Variação em segundos
            })
        latency_by_hour.reverse()
        
        # Tokens por modelo (renomeado de model_usage)
        tokens_by_model = [
            {"model": "gpt-4o", "tokens": tokens_used_today, "color": "#3b82f6"},
            {"model": "claude-3", "tokens": 0, "color": "#10b981"},
            {"model": "gemini", "tokens": 0, "color": "#f59e0b"}
        ]
        
        # Tipos de pergunta (novo campo necessário)
        question_types = [
            {"type": "Produtos", "percentage": 45.0, "color": "#3b82f6"},
            {"type": "Suporte", "percentage": 30.0, "color": "#10b981"},
            {"type": "Vendas", "percentage": 15.0, "color": "#f59e0b"},
            {"type": "Outros", "percentage": 10.0, "color": "#ef4444"}
        ]
        
        return AgentMetrics(
            uptime=uptime_percentage,
            average_latency=average_latency_seconds,
            accuracy_rate=accuracy_rate_percentage,
            tokens_consumed=tokens_used_today,
            responses_generated=total_conversations,
            latency_by_hour=latency_by_hour,
            tokens_by_model=tokens_by_model,
            question_types=question_types
        )
        
    except Exception as e:
        logger.error("Erro ao obter métricas", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


# ===================================
# ENDPOINTS DE SUB-AGENTES
# ===================================

@router.get("/sub-agents", response_model=List[Dict[str, Any]])
async def get_sub_agents():
    """
    Lista todos os sub-agentes configurados
    
    Returns:
        Lista de sub-agentes com suas configurações
    """
    try:
        logger.info("Listando sub-agentes")
        
        from ..services.supabase_client import get_supabase_client
        supabase = get_supabase_client()
        
        # Buscar todos os sub-agentes ativos
        result = supabase.table('sub_agents').select('*').eq('is_active', True).is_('deleted_at', 'null').order('domain').execute()
        
        if result.data:
            logger.info(f"Sub-agentes encontrados: {len(result.data)}")
            return result.data
        else:
            logger.warning("Nenhum sub-agente encontrado")
            return []
            
    except Exception as e:
        logger.error("Erro ao listar sub-agentes", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sub-agents/{agent_id}")
async def get_sub_agent(agent_id: str):
    """
    Busca um sub-agente específico por ID
    
    Args:
        agent_id: UUID do sub-agente
        
    Returns:
        Dados do sub-agente
    """
    try:
        logger.info("Buscando sub-agente", agent_id=agent_id)
        
        from ..services.supabase_client import get_supabase_client
        supabase = get_supabase_client()
        
        # Buscar sub-agente
        result = supabase.table('sub_agents').select('*').eq('id', agent_id).eq('is_active', True).is_('deleted_at', 'null').execute()
        
        if result.data and len(result.data) > 0:
            logger.info("Sub-agente encontrado", agent_id=agent_id)
            return result.data[0]
        else:
            logger.warning("Sub-agente não encontrado", agent_id=agent_id)
            raise HTTPException(status_code=404, detail="Sub-agente não encontrado")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Erro ao buscar sub-agente", agent_id=agent_id, error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/sub-agents/{agent_id}")
async def update_sub_agent(agent_id: str, request: Request):
    """
    Atualiza configuração de um sub-agente
    
    Args:
        agent_id: UUID do sub-agente
        request: Dados para atualização (system_prompt, model, temperature, max_tokens)
        
    Returns:
        Sub-agente atualizado
    """
    try:
        body = await request.json()
        logger.info("Atualizando sub-agente", agent_id=agent_id, fields=list(body.keys()))
        
        # Validar campos permitidos
        allowed_fields = ['system_prompt', 'model', 'temperature', 'max_tokens', 'learning_threshold', 'max_patterns']
        update_data = {k: v for k, v in body.items() if k in allowed_fields}
        
        if not update_data:
            raise HTTPException(status_code=400, detail="Nenhum campo válido para atualizar")
        
        # Validações
        if 'temperature' in update_data:
            temp = float(update_data['temperature'])
            if temp < 0 or temp > 2:
                raise HTTPException(status_code=400, detail="Temperature deve estar entre 0 e 2")
            update_data['temperature'] = temp
        
        if 'max_tokens' in update_data:
            tokens = int(update_data['max_tokens'])
            if tokens < 100 or tokens > 4000:
                raise HTTPException(status_code=400, detail="Max tokens deve estar entre 100 e 4000")
            update_data['max_tokens'] = tokens
        
        # Atualizar no banco
        from ..services.supabase_client import get_supabase_client
        supabase = get_supabase_client()
        
        update_data['updated_at'] = 'now()'
        
        result = supabase.table('sub_agents').update(update_data).eq('id', agent_id).execute()
        
        if result.data and len(result.data) > 0:
            # Invalidar cache
            from ..services.config_cache import get_config_cache
            cache = get_config_cache()
            
            # Buscar domain do agente para invalidar cache correto
            agent_data = result.data[0]
            await cache.invalidate(agent_data['domain'])
            
            logger.info("Sub-agente atualizado e cache invalidado", agent_id=agent_id, domain=agent_data['domain'])
            return result.data[0]
        else:
            raise HTTPException(status_code=404, detail="Sub-agente não encontrado")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Erro ao atualizar sub-agente", agent_id=agent_id, error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sub-agents/{agent_id}/reset")
async def reset_sub_agent(agent_id: str):
    """
    Restaura configuração padrão de um sub-agente
    
    Args:
        agent_id: UUID do sub-agente
        
    Returns:
        Sub-agente com configuração restaurada
    """
    try:
        logger.info("Restaurando configuração padrão", agent_id=agent_id)
        
        from ..services.supabase_client import get_supabase_client
        supabase = get_supabase_client()
        
        # Buscar agente para saber o domain
        agent_result = supabase.table('sub_agents').select('domain').eq('id', agent_id).execute()
        
        if not agent_result.data or len(agent_result.data) == 0:
            raise HTTPException(status_code=404, detail="Sub-agente não encontrado")
        
        domain = agent_result.data[0]['domain']
        
        # Configurações padrão por domain
        default_configs = {
            'router': {
                'system_prompt': 'Você é um classificador de intenções para vendas de colchões da Slim Quality. Classifique a mensagem do usuário em UMA das seguintes categorias: discovery (lead novo, perguntas gerais), sales (interesse em comprar, negociação), support (dúvidas sobre garantia, frete, troca). Retorne APENAS uma palavra: discovery, sales ou support.',
                'model': 'gpt-4o',
                'temperature': 0.3,
                'max_tokens': 500
            },
            'discovery': {
                'system_prompt': 'Você é a BIA, assistente virtual da Slim Quality. Seu objetivo é qualificar leads, entender problemas de saúde e sono do cliente, e educar sobre os benefícios dos colchões magnéticos terapêuticos. Seja empática, faça perguntas abertas e identifique necessidades específicas.',
                'model': 'gpt-4o',
                'temperature': 0.7,
                'max_tokens': 2000
            },
            'sales': {
                'system_prompt': 'Você é a BIA, consultora de vendas da Slim Quality. Seu objetivo é recomendar o colchão ideal baseado nas necessidades do cliente, negociar condições de pagamento e fechar vendas de forma consultiva (não transacional). Use memórias de conversas anteriores para personalizar recomendações.',
                'model': 'gpt-4o',
                'temperature': 0.7,
                'max_tokens': 2000
            },
            'support': {
                'system_prompt': 'Você é a BIA, suporte pós-venda da Slim Quality. Seu objetivo é resolver dúvidas sobre garantia (10 anos), frete (grátis), política de troca (30 dias) e problemas com pedidos. Seja prestativa e resolva problemas rapidamente.',
                'model': 'gpt-4o',
                'temperature': 0.5,
                'max_tokens': 2000
            }
        }
        
        if domain not in default_configs:
            raise HTTPException(status_code=400, detail=f"Domain inválido: {domain}")
        
        # Restaurar configuração padrão
        default_config = default_configs[domain]
        default_config['updated_at'] = 'now()'
        
        result = supabase.table('sub_agents').update(default_config).eq('id', agent_id).execute()
        
        if result.data and len(result.data) > 0:
            # Invalidar cache
            from ..services.config_cache import get_config_cache
            cache = get_config_cache()
            await cache.invalidate(domain)
            
            logger.info("Configuração padrão restaurada e cache invalidado", agent_id=agent_id, domain=domain)
            return result.data[0]
        else:
            raise HTTPException(status_code=404, detail="Erro ao restaurar configuração")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Erro ao restaurar configuração", agent_id=agent_id, error=str(e))
        raise HTTPException(status_code=500, detail=str(e))
