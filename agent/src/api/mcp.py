"""
MCP API - Endpoints para gerenciamento de integrações MCP
"""
from fastapi import APIRouter, HTTPException, Path
from typing import Dict, Any
import structlog
from datetime import datetime

from ..schemas.agent_schemas import (
    MCPStatusResponse, MCPTestRequest, MCPTestResponse,
    MCPIntegrationStatus, SuccessResponse, ErrorResponse
)

logger = structlog.get_logger(__name__)

# Router para endpoints MCP
router = APIRouter(prefix="/api/mcp", tags=["mcp"])


@router.get("/status", response_model=MCPStatusResponse)
async def get_mcp_status():
    """
    Obtém status de todas as integrações MCP
    
    Returns:
        Status detalhado das integrações
    """
    try:
        logger.info("Obtendo status das integrações MCP")
        
        import asyncio
        import httpx
        import os
        from datetime import datetime
        
        integrations = []
        
        # 1. Verificar Evolution API
        try:
            evolution_url = os.getenv("EVOLUTION_URL", "https://slimquality-evolution-api.wpjtfd.easypanel.host")
            
            async with httpx.AsyncClient(timeout=5.0) as client:
                start_time = datetime.now()
                response = await client.get(f"{evolution_url}/instance/fetchInstances")
                response_time = (datetime.now() - start_time).total_seconds() * 1000
                
                if response.status_code == 200:
                    integrations.append(MCPIntegrationStatus(
                        id="evolution_api",
                        name="Evolution API",
                        status="online",
                        last_check=datetime.now(),
                        response_time_ms=response_time,
                        error_message=None
                    ))
                else:
                    integrations.append(MCPIntegrationStatus(
                        id="evolution_api",
                        name="Evolution API",
                        status="error",
                        last_check=datetime.now(),
                        response_time_ms=response_time,
                        error_message=f"HTTP {response.status_code}"
                    ))
        except Exception as e:
            integrations.append(MCPIntegrationStatus(
                id="evolution_api",
                name="Evolution API",
                status="offline",
                last_check=datetime.now(),
                response_time_ms=None,
                error_message=str(e)
            ))
        
        # 2. Verificar Supabase
        try:
            from ..services.supabase_client import get_supabase_client
            supabase = get_supabase_client()
            
            start_time = datetime.now()
            # Teste simples: buscar 1 registro de qualquer tabela
            result = supabase.table('conversations').select('id').limit(1).execute()
            response_time = (datetime.now() - start_time).total_seconds() * 1000
            
            integrations.append(MCPIntegrationStatus(
                id="supabase",
                name="Supabase Database",
                status="online",
                last_check=datetime.now(),
                response_time_ms=response_time,
                error_message=None
            ))
        except Exception as e:
            integrations.append(MCPIntegrationStatus(
                id="supabase",
                name="Supabase Database",
                status="offline",
                last_check=datetime.now(),
                response_time_ms=None,
                error_message=str(e)
            ))
        
        # 3. Verificar OpenAI API
        try:
            from ..services.ai_service import get_ai_service
            ai_service = get_ai_service()
            
            start_time = datetime.now()
            # Teste simples com o AI Service
            test_response = await ai_service.generate_text(
                prompt="Test",
                max_tokens=1,
                temperature=0.1
            )
            response_time = (datetime.now() - start_time).total_seconds() * 1000
            
            if test_response.get('text'):
                integrations.append(MCPIntegrationStatus(
                    id="openai_api",
                    name="OpenAI API",
                    status="online",
                    last_check=datetime.now(),
                    response_time_ms=response_time,
                    error_message=None
                ))
            else:
                integrations.append(MCPIntegrationStatus(
                    id="openai_api",
                    name="OpenAI API",
                    status="error",
                    last_check=datetime.now(),
                    response_time_ms=response_time,
                    error_message="No response text"
                ))
        except Exception as e:
            integrations.append(MCPIntegrationStatus(
                id="openai_api",
                name="OpenAI API",
                status="offline",
                last_check=datetime.now(),
                response_time_ms=None,
                error_message=str(e)
            ))
        
        # 4. Verificar Redis (opcional)
        try:
            redis_url = os.getenv("REDIS_URL")
            if redis_url and redis_url != "redis://localhost:6379":
                # Só testar se Redis estiver configurado
                import redis.asyncio as redis
                
                start_time = datetime.now()
                redis_client = redis.from_url(redis_url)
                await redis_client.ping()
                response_time = (datetime.now() - start_time).total_seconds() * 1000
                await redis_client.close()
                
                integrations.append(MCPIntegrationStatus(
                    id="redis",
                    name="Redis Cache",
                    status="online",
                    last_check=datetime.now(),
                    response_time_ms=response_time,
                    error_message=None
                ))
            else:
                integrations.append(MCPIntegrationStatus(
                    id="redis",
                    name="Redis Cache",
                    status="offline",
                    last_check=datetime.now(),
                    response_time_ms=None,
                    error_message="Not configured"
                ))
        except Exception as e:
            integrations.append(MCPIntegrationStatus(
                id="redis",
                name="Redis Cache",
                status="offline",
                last_check=datetime.now(),
                response_time_ms=None,
                error_message=str(e)
            ))
        
        # Calcular estatísticas
        total_integrations = len(integrations)
        online_count = len([i for i in integrations if i.status == "online"])
        
        return MCPStatusResponse(
            integrations=integrations,
            total_integrations=total_integrations,
            online_count=online_count,
            last_update=datetime.now()
        )
        
    except Exception as e:
        logger.error("Erro ao obter status MCP", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/test/{integration_id}", response_model=MCPTestResponse)
async def test_mcp_integration(integration_id: str = Path(..., description="ID da integração")):
    """
    Testa uma integração MCP específica
    
    Args:
        integration_id: ID da integração a testar
        
    Returns:
        Resultado do teste
    """
    try:
        logger.info("Testando integração MCP", integration_id=integration_id)
        
        import httpx
        import os
        from datetime import datetime
        
        start_time = datetime.now()
        
        if integration_id == "evolution_api":
            # Teste específico da Evolution API
            try:
                evolution_url = os.getenv("EVOLUTION_URL", "https://slimquality-evolution-api.wpjtfd.easypanel.host")
                
                async with httpx.AsyncClient(timeout=10.0) as client:
                    # Teste mais detalhado: buscar instâncias
                    response = await client.get(f"{evolution_url}/instance/fetchInstances")
                    response_time = (datetime.now() - start_time).total_seconds() * 1000
                    
                    if response.status_code == 200:
                        data = response.json()
                        return MCPTestResponse(
                            integration_id=integration_id,
                            success=True,
                            response_time_ms=response_time,
                            details={
                                "status_code": response.status_code,
                                "instances_count": len(data) if isinstance(data, list) else 1,
                                "response_size": len(response.text)
                            },
                            error_message=None
                        )
                    else:
                        return MCPTestResponse(
                            integration_id=integration_id,
                            success=False,
                            response_time_ms=response_time,
                            details={"status_code": response.status_code},
                            error_message=f"HTTP {response.status_code}: {response.text[:100]}"
                        )
            except Exception as e:
                response_time = (datetime.now() - start_time).total_seconds() * 1000
                return MCPTestResponse(
                    integration_id=integration_id,
                    success=False,
                    response_time_ms=response_time,
                    details={"error_type": type(e).__name__},
                    error_message=str(e)
                )
        
        elif integration_id == "supabase":
            # Teste específico do Supabase
            try:
                from ..services.supabase_client import get_supabase_client
                supabase = get_supabase_client()
                
                # Teste mais detalhado: operações CRUD
                result = supabase.table('conversations').select('id').limit(5).execute()
                response_time = (datetime.now() - start_time).total_seconds() * 1000
                
                return MCPTestResponse(
                    integration_id=integration_id,
                    success=True,
                    response_time_ms=response_time,
                    details={
                        "records_found": len(result.data) if result.data else 0,
                        "query_executed": "SELECT id FROM conversations LIMIT 5"
                    },
                    error_message=None
                )
            except Exception as e:
                response_time = (datetime.now() - start_time).total_seconds() * 1000
                return MCPTestResponse(
                    integration_id=integration_id,
                    success=False,
                    response_time_ms=response_time,
                    details={"error_type": type(e).__name__},
                    error_message=str(e)
                )
        
        elif integration_id == "openai_api":
            # Teste específico da OpenAI API
            try:
                from ..services.ai_service import get_ai_service
                ai_service = get_ai_service()
                
                # Teste com prompt simples
                test_response = await ai_service.generate_text(
                    prompt="Responda apenas: OK",
                    max_tokens=5,
                    temperature=0.1
                )
                response_time = (datetime.now() - start_time).total_seconds() * 1000
                
                if test_response.get('text'):
                    return MCPTestResponse(
                        integration_id=integration_id,
                        success=True,
                        response_time_ms=response_time,
                        details={
                            "response_text": test_response.get('text', ''),
                            "tokens_used": test_response.get('tokens_used', 0),
                            "provider": test_response.get('provider', 'unknown')
                        },
                        error_message=None
                    )
                else:
                    return MCPTestResponse(
                        integration_id=integration_id,
                        success=False,
                        response_time_ms=response_time,
                        details={"response": test_response},
                        error_message="No text in response"
                    )
            except Exception as e:
                response_time = (datetime.now() - start_time).total_seconds() * 1000
                return MCPTestResponse(
                    integration_id=integration_id,
                    success=False,
                    response_time_ms=response_time,
                    details={"error_type": type(e).__name__},
                    error_message=str(e)
                )
        
        elif integration_id == "redis":
            # Teste específico do Redis
            try:
                redis_url = os.getenv("REDIS_URL")
                if not redis_url or redis_url == "redis://localhost:6379":
                    return MCPTestResponse(
                        integration_id=integration_id,
                        success=False,
                        response_time_ms=0.0,
                        details={"configured": False},
                        error_message="Redis not configured"
                    )
                
                import redis.asyncio as redis
                
                redis_client = redis.from_url(redis_url)
                await redis_client.ping()
                
                # Teste de escrita/leitura
                test_key = "mcp_test_key"
                await redis_client.set(test_key, "test_value", ex=60)
                test_value = await redis_client.get(test_key)
                await redis_client.delete(test_key)
                await redis_client.close()
                
                response_time = (datetime.now() - start_time).total_seconds() * 1000
                
                return MCPTestResponse(
                    integration_id=integration_id,
                    success=True,
                    response_time_ms=response_time,
                    details={
                        "ping_success": True,
                        "write_read_success": test_value == b"test_value"
                    },
                    error_message=None
                )
            except Exception as e:
                response_time = (datetime.now() - start_time).total_seconds() * 1000
                return MCPTestResponse(
                    integration_id=integration_id,
                    success=False,
                    response_time_ms=response_time,
                    details={"error_type": type(e).__name__},
                    error_message=str(e)
                )
        
        else:
            # Integração não reconhecida
            return MCPTestResponse(
                integration_id=integration_id,
                success=False,
                response_time_ms=0.0,
                details={"available_integrations": ["evolution_api", "supabase", "openai_api", "redis"]},
                error_message=f"Integration '{integration_id}' not found"
            )
        
    except Exception as e:
        logger.error("Erro ao testar integração MCP", integration_id=integration_id, error=str(e))
        raise HTTPException(status_code=500, detail=str(e))