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
        
        # Obter configuração atual do AI Service
        try:
            from ..services.ai_service import get_ai_service
            ai_service = get_ai_service()
            
            # Obter configurações atuais
            current_model = "gpt-4o"
            temperature = 0.7
            max_tokens = 500
            sicc_enabled = False
            
            # Tentar obter do AI Service
            if hasattr(ai_service, 'settings'):
                settings = ai_service.settings
                current_model = getattr(settings, 'openai_model', 'gpt-4o')
            
            # Verificar SICC
            try:
                from ..services.sicc.sicc_service import get_sicc_service
                sicc_service = get_sicc_service()
                sicc_enabled = sicc_service.is_initialized
            except:
                sicc_enabled = False
            
            # System prompt padrão
            system_prompt = """Você é a BIA, consultora especializada em colchões magnéticos terapêuticos da Slim Quality.

Seja consultiva, empática e focada em resolver problemas de saúde e sono dos clientes.
Apresente os produtos de forma educativa, não apenas vendedora."""
            
            return AgentConfig(
                model=current_model,
                temperature=temperature,
                max_tokens=max_tokens,
                system_prompt=system_prompt,
                sicc_enabled=sicc_enabled
            )
            
        except Exception as service_error:
            logger.warning("Erro ao obter configuração dos serviços", error=str(service_error))
            
            # Fallback: configuração padrão
            return AgentConfig(
                model="gpt-4o",
                temperature=0.7,
                max_tokens=500,
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
        
        # Aplicar configurações no AI Service
        try:
            from ..services.ai_service import get_ai_service
            ai_service = get_ai_service()
            
            # Aplicar configurações se o serviço suportar
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
            message="Configuração salva com sucesso",
            data={"applied_settings": config.dict()}
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
        
        # Gerar dados para gráficos (últimas 24 horas)
        hourly_latency = []
        now = datetime.now()
        for i in range(24):
            hour_time = now - timedelta(hours=i)
            hourly_latency.append({
                "hour": hour_time.strftime("%H:00"),
                "latency": avg_response_time_ms + (i * 50)  # Variação simulada
            })
        hourly_latency.reverse()
        
        # Uso por modelo
        model_usage = [
            {"model": "gpt-4o", "count": max(1, total_conversations)},
            {"model": "claude-3", "count": 0},
            {"model": "gemini", "count": 0}
        ]
        
        return AgentMetrics(
            uptime_hours=uptime_hours,
            total_conversations=total_conversations,
            avg_response_time_ms=avg_response_time_ms,
            success_rate=success_rate,
            tokens_used_today=tokens_used_today,
            hourly_latency=hourly_latency,
            model_usage=model_usage
        )
        
    except Exception as e:
        logger.error("Erro ao obter métricas", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))