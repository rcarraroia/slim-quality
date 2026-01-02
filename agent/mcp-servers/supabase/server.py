# agent/mcp-servers/supabase/server.py
from fastapi import FastAPI, HTTPException
from supabase import create_client
from pydantic import BaseModel
import os

app = FastAPI(title="MCP Supabase Server")

# Cliente Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Schemas
class ToolRequest(BaseModel):
    tool: str
    parameters: dict

# Registry de tools
TOOLS = {
    "query_database": {
        "description": "Consulta genérica ao banco Supabase",
        "parameters": {
            "table": {"type": "string", "required": True},
            "select": {"type": "string", "default": "*"},
            "filters": {"type": "object", "default": {}},
            "limit": {"type": "integer", "default": 10}
        }
    },
    "insert_lead": {
        "description": "Insere novo lead na tabela leads",
        "parameters": {
            "name": {"type": "string", "required": True},
            "email": {"type": "string"},
            "phone": {"type": "string"},
            "source": {"type": "string", "default": "whatsapp"}
        }
    },
    "update_record": {
        "description": "Atualiza registro em qualquer tabela",
        "parameters": {
            "table": {"type": "string", "required": True},
            "record_id": {"type": "string", "required": True},
            "data": {"type": "object", "required": True}
        }
    },
    "get_products": {
        "description": "Lista produtos (colchões) disponíveis",
        "parameters": {}
    }
}

@app.get("/")
async def root():
    return {
        "name": "MCP Supabase Server",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health():
    try:
        # Teste de conexão Supabase
        supabase.table("products").select("id").limit(1).execute()
        return {"status": "healthy", "supabase": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}

@app.get("/tools")
async def list_tools():
    return {"tools": [
        {"name": name, **details}
        for name, details in TOOLS.items()
    ]}

@app.post("/execute")
async def execute_tool(request: ToolRequest):
    tool_name = request.tool
    params = request.parameters
    
    if tool_name not in TOOLS:
        raise HTTPException(status_code=404, detail=f"Tool {tool_name} not found")
    
    try:
        # Executar tool correspondente
        if tool_name == "query_database":
            return await query_database(**params)
        elif tool_name == "insert_lead":
            return await insert_lead(**params)
        elif tool_name == "update_record":
            return await update_record(**params)
        elif tool_name == "get_products":
            return await get_products()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Tool implementations
async def query_database(table: str, select: str = "*", filters: dict = None, limit: int = 10):
    query = supabase.table(table).select(select)
    
    if filters:
        for key, value in filters.items():
            query = query.eq(key, value)
    
    result = query.limit(limit).execute()
    return {"data": result.data, "count": len(result.data)}

async def insert_lead(name: str, email: str = None, phone: str = None, source: str = "whatsapp"):
    data = {
        "name": name,
        "email": email,
        "phone": phone,
        "source": source,
        "status": "novo"
    }
    
    result = supabase.table("leads").insert(data).execute()
    return {"data": result.data[0] if result.data else None}

async def update_record(table: str, record_id: str, data: dict):
    result = supabase.table(table).update(data).eq("id", record_id).execute()
    return {"data": result.data[0] if result.data else None}

async def get_products():
    result = supabase.table("products").select("*").execute()
    return {"data": result.data, "count": len(result.data)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3000)