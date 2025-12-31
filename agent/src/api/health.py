"""
Health check endpoint - Robusto para produção
"""
import asyncio
import structlog
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from typing import Dict, Any

from ..config import get_settings
from ..services.supabase_client import get_supabase_client
from ..services.claude_client import get_claude_client

logger = structlog.get_logger(__name__)
router = APIRouter()

# Timeout global para health checks
HEALTH_CHECK_TIMEOUT = 10.0


async def check_sicc() -> Dict[str, Any]:
    """
    Verifica se SICC está carregado e funcionando.
    
    Returns:
        Dict com status e informações do SICC
    """
    try:
        from ..services.sicc.sicc_service import SICCService
        
        sicc = SICCService()
        
        # Verificar se SICC está inicializado
        if not hasattr(sicc, 'memory_service') or sicc.memory_service is None:
            return {
                "status": "down",
                "error": "SICC not initialized"
            }
        
        # Verificar se memórias estão carregadas
        memory_count = len(sicc.memory_service.memories) if hasattr(sicc.memory_service, 'memories') else 0
        
        return {
            "status": "up",
            "memory_count": memory_count,
            "initialized": True
        }
        
    except Exception as e:
        logger.error(f"check_sicc: Erro ao verificar SICC: {e}")
        return {
            "status": "down",
            "error": str(e)
        }


async def check_redis() -> Dict[str, Any]:
    """
    Verifica conexão com Redis.
    
    Returns:
        Dict com status e informações da conexão
    """
    try:
        import redis.asyncio as redis
        
        settings = get_settings()
        client = redis.from_url(settings.redis_url)
        
        # Ping com timeout
        await asyncio.wait_for(client.ping(), timeout=3.0)
        
        # Obter informações básicas
        info = await client.info('server')
        await client.close()
        
        return {
            "status": "up",
            "version": info.get('redis_version', 'unknown'),
            "uptime": info.get('uptime_in_seconds', 0)
        }
        
    except asyncio.TimeoutError:
        logger.error("check_redis: Timeout ao conectar")
        return {
            "status": "down",
            "error": "Connection timeout"
        }
    except Exception as e:
        logger.error(f"check_redis: Erro ao conectar: {e}")
        return {
            "status": "down",
            "error": str(e)
        }


async def check_supabase() -> Dict[str, Any]:
    """
    Verifica conexão com Supabase.
    
    Returns:
        Dict com status e informações da conexão
    """
    try:
        client = get_supabase_client()
        
        # Tentar query simples com timeout
        response = await asyncio.wait_for(
            asyncio.to_thread(
                lambda: client.table("products").select("id").limit(1).execute()
            ),
            timeout=3.0
        )
        
        return {
            "status": "up",
            "table_count": len(response.data) if response.data else 0,
            "connected": True
        }
        
    except asyncio.TimeoutError:
        logger.error("check_supabase: Timeout ao conectar")
        return {
            "status": "down",
            "error": "Connection timeout"
        }
    except Exception as e:
        logger.error(f"check_supabase: Erro ao conectar: {e}")
        return {
            "status": "down",
            "error": str(e)
        }


async def check_claude() -> Dict[str, Any]:
    """
    Verifica conexão com Claude API.
    
    Returns:
        Dict com status e informações da conexão
    """
    try:
        from langchain_core.messages import HumanMessage
        
        llm = get_claude_client()
        
        # Invocar com mensagem simples e timeout
        response = await asyncio.wait_for(
            llm.ainvoke([HumanMessage(content="ping")]),
            timeout=5.0
        )
        
        return {
            "status": "up",
            "model": getattr(llm, 'model_name', 'claude-3-sonnet'),
            "response_received": bool(response.content)
        }
        
    except asyncio.TimeoutError:
        logger.error("check_claude: Timeout ao conectar")
        return {
            "status": "down",
            "error": "API timeout"
        }
    except Exception as e:
        logger.error(f"check_claude: Erro ao conectar: {e}")
        return {
            "status": "down",
            "error": str(e)
        }


@router.get("/health")
async def health_check() -> Dict[str, Any]:
    """
    Health check endpoint robusto para produção.
    
    Verifica:
    - Redis conectado e funcionando
    - Supabase acessível e respondendo
    - Claude API respondendo
    - SICC carregado e inicializado
    
    Returns:
        Status detalhado com timestamp e informações de cada serviço
        
    Raises:
        HTTPException 503: Se algum serviço crítico falhar
    """
    start_time = datetime.now(timezone.utc)
    logger.info("health_check: Iniciando verificação de serviços")
    
    try:
        # Executar todos os checks em paralelo com timeout global
        checks_tasks = {
            "redis": check_redis(),
            "supabase": check_supabase(), 
            "claude": check_claude(),
            "sicc": check_sicc()
        }
        
        # Aguardar todos os checks com timeout
        checks_results = await asyncio.wait_for(
            asyncio.gather(*[
                checks_tasks["redis"],
                checks_tasks["supabase"],
                checks_tasks["claude"],
                checks_tasks["sicc"]
            ]),
            timeout=HEALTH_CHECK_TIMEOUT
        )
        
        # Organizar resultados
        services = {
            "redis": checks_results[0],
            "supabase": checks_results[1],
            "claude": checks_results[2],
            "sicc": checks_results[3]
        }
        
        # Verificar se serviços críticos estão OK
        critical_services = ["redis", "supabase"]
        critical_ok = all(
            services[service]["status"] == "up" 
            for service in critical_services
        )
        
        # Calcular tempo de resposta
        end_time = datetime.now(timezone.utc)
        response_time_ms = int((end_time - start_time).total_seconds() * 1000)
        
        # Determinar status geral
        overall_status = "healthy" if critical_ok else "degraded"
        
        response_data = {
            "status": overall_status,
            "timestamp": end_time.isoformat(),
            "response_time_ms": response_time_ms,
            "services": services,
            "version": "1.0.0",
            "environment": get_settings().environment
        }
        
        if critical_ok:
            logger.info(f"health_check: Serviços OK em {response_time_ms}ms")
            return response_data
        else:
            logger.warning(f"health_check: Serviços críticos falharam: {services}")
            raise HTTPException(
                status_code=503,
                detail=response_data
            )
            
    except asyncio.TimeoutError:
        logger.error(f"health_check: Timeout após {HEALTH_CHECK_TIMEOUT}s")
        raise HTTPException(
            status_code=503,
            detail={
                "status": "timeout",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "error": f"Health check timeout after {HEALTH_CHECK_TIMEOUT}s"
            }
        )
    except Exception as e:
        logger.error(f"health_check: Erro inesperado: {e}")
        raise HTTPException(
            status_code=503,
            detail={
                "status": "error",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "error": str(e)
            }
        )
