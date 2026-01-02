"""
MCP Gateway - Custom FastAPI Implementation
Slim Quality - Desenvolvimento Local

Endpoints:
- GET /health - Health check
- GET /tools - Lista tools disponíveis
- POST /execute - Executa tool remoto
"""
import asyncio
import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, List, Any, Optional
import redis
import json
import os
from datetime import datetime, timedelta

# Configuração
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379")
MCP_SERVERS = {
    "evolution": {"url": "http://mcp-evolution:3000", "enabled": True},
    "uazapi": {"url": "http://mcp-uazapi:3000", "enabled": True},
    "google": {"url": "http://mcp-google:3000", "enabled": True},
    "supabase": {"url": "http://mcp-supabase:3000", "enabled": True},
}

# FastAPI app
app = FastAPI(
    title="Slim Quality MCP Gateway",
    description="Gateway para Model Context Protocol servers",
    version="1.0.0"
)

# Redis client
redis_client = None

# Models
class ToolExecuteRequest(BaseModel):
    tool: str
    params: Dict[str, Any]

class HealthResponse(BaseModel):
    status: str
    servers: Dict[str, str]
    redis: str
    timestamp: str

class ToolResponse(BaseModel):
    tools: List[Dict[str, Any]]

@app.on_event("startup")
async def startup():
    """Inicializar conexões"""
    global redis_client
    try:
        redis_client = redis.from_url(REDIS_URL, decode_responses=True)
        redis_client.ping()
        print("✅ Redis conectado")
    except Exception as e:
        print(f"❌ Redis erro: {e}")
        redis_client = None

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check do gateway e servidores MCP"""
    
    # Verificar Redis
    redis_status = "connected" if redis_client else "disconnected"
    
    # Verificar servidores MCP
    servers_status = {}
    
    for name, config in MCP_SERVERS.items():
        if not config["enabled"]:
            servers_status[name] = "disabled"
            continue
            
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                response = await client.get(f"{config['url']}/health")
                servers_status[name] = "online" if response.status_code == 200 else "error"
        except:
            servers_status[name] = "offline"
    
    # Status geral
    overall_status = "healthy" if redis_status == "connected" else "degraded"
    
    return HealthResponse(
        status=overall_status,
        servers=servers_status,
        redis=redis_status,
        timestamp=datetime.utcnow().isoformat()
    )

@app.get("/tools", response_model=ToolResponse)
async def list_tools():
    """Lista todas as tools disponíveis dos servidores MCP"""
    
    print("🔍 Iniciando descoberta de tools...")
    all_tools = []
    
    # Cache key
    cache_key = "mcp:tools:all"
    
    # Tentar cache primeiro
    if redis_client:
        try:
            cached = redis_client.get(cache_key)
            if cached:
                return ToolResponse(tools=json.loads(cached))
        except:
            pass
    
    # Descobrir tools de cada servidor
    for name, config in MCP_SERVERS.items():
        if not config["enabled"]:
            print(f"🔄 Servidor {name} desabilitado")
            continue
            
        print(f"🔄 Tentando descobrir tools do servidor {name} em {config['url']}")
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{config['url']}/tools")
                print(f"📡 Resposta do {name}: status={response.status_code}")
                if response.status_code == 200:
                    server_tools = response.json().get("tools", [])
                    print(f"🔧 Encontradas {len(server_tools)} tools do {name}")
                    
                    # Adicionar metadata do servidor
                    for tool in server_tools:
                        tool["server"] = name
                        tool["server_url"] = config["url"]
                        all_tools.append(tool)
                        
        except Exception as e:
            print(f"❌ Erro ao descobrir tools do {name}: {e}")
            continue
    
    # Cachear resultado por 5 minutos
    if redis_client and all_tools:
        try:
            redis_client.setex(cache_key, 300, json.dumps(all_tools))
        except:
            pass
    
    return ToolResponse(tools=all_tools)

@app.post("/execute")
async def execute_tool(request: ToolExecuteRequest):
    """Executa uma tool em um servidor MCP"""
    
    # Rate limiting
    if redis_client:
        rate_key = f"mcp:rate:{request.tool}"
        try:
            current = redis_client.get(rate_key)
            if current and int(current) >= 10:  # 10 execuções por minuto
                raise HTTPException(status_code=429, detail="Rate limit exceeded")
            
            # Incrementar contador
            redis_client.incr(rate_key)
            redis_client.expire(rate_key, 60)
        except:
            pass
    
    # Encontrar servidor da tool
    server_name = None
    server_url = None
    
    # Buscar no cache de tools
    if redis_client:
        try:
            cached_tools = redis_client.get("mcp:tools:all")
            if cached_tools:
                tools = json.loads(cached_tools)
                for tool in tools:
                    if tool.get("name") == request.tool:
                        server_name = tool.get("server")
                        server_url = tool.get("server_url")
                        break
        except:
            pass
    
    # Se não encontrou no cache, buscar diretamente
    if not server_url:
        for name, config in MCP_SERVERS.items():
            if config["enabled"]:
                try:
                    async with httpx.AsyncClient(timeout=3.0) as client:
                        response = await client.get(f"{config['url']}/tools")
                        if response.status_code == 200:
                            tools = response.json().get("tools", [])
                            for tool in tools:
                                if tool.get("name") == request.tool:
                                    server_name = name
                                    server_url = config["url"]
                                    break
                except:
                    continue
                
                if server_url:
                    break
    
    if not server_url:
        raise HTTPException(status_code=404, detail=f"Tool '{request.tool}' not found")
    
    # Executar tool no servidor
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{server_url}/execute",
                json={
                    "tool": request.tool,
                    "params": request.params
                }
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Server error: {response.text}"
                )
                
    except httpx.TimeoutException:
        raise HTTPException(status_code=408, detail="Tool execution timeout")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Execution error: {str(e)}")

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "Slim Quality MCP Gateway",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "tools": "/tools",
            "execute": "/execute"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)