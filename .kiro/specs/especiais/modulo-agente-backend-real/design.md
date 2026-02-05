# DESIGN - Integração Dashboard Agente

## ⚠️ ATENÇÃO - RESPOSTAS SEMPRE EM PORTUGUES-BR

## 📋 RESUMO EXECUTIVO

**Arquitetura:** API REST + Frontend React  
**Padrão:** Backend-as-a-Service com FastAPI  
**Integrações:** SICC, MCP Gateway, Supabase, OpenAI  

---

## 1. ARQUITETURA GERAL

### Componentes Principais:
```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React/Vite)                   │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐  │
│  │ AgenteIA    │ AgenteMcp   │ AgenteSicc  │ AgenteMetr. │  │
│  │ AgenteConf. │ AgenteApren.│             │             │  │
│  └─────────────┴─────────────┴─────────────┴─────────────┘  │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP/REST
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                 API GATEWAY (FastAPI)                      │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐  │
│  │ agent.py    │ mcp.py      │ sicc.py     │ main.py     │  │
│  │ (6 routes)  │ (2 routes)  │ (7 routes)  │ (router)    │  │
│  └─────────────┴─────────────┴─────────────┴─────────────┘  │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    SERVICES LAYER                          │
│  ┌─────────────┬──────────────┬──────────────┬───────────┐  │
│  │ SICC        │ AI Service   │ Metrics      │ Supabase  │  │
│  │ Service     │              │ Service      │ Client    │  │
│  └─────────────┴──────────────┴──────────────┴───────────┘  │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                 EXTERNAL INTEGRATIONS                      │
│  ┌─────────────┬──────────────┬──────────────┬───────────┐  │
│  │ Evolution   │ OpenAI API   │ Redis Cache  │ Supabase  │  │
│  │ API         │              │ (opcional)   │ Database  │  │
│  └─────────────┴──────────────┴──────────────┴───────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Fluxo de Dados:
```
1. Frontend → API Gateway → Service Layer → External APIs
2. External APIs → Service Layer → API Gateway → Frontend
3. Cache Layer (Redis) intercepta quando disponível
4. Database (Supabase) persiste configurações e métricas
```

---

## 2. ESTRUTURA DE ENDPOINTS

### 2.1. Agent Endpoints (agent.py)

#### GET /api/agent/status
**Descrição:** Status atual do agente  
**Request:** Nenhum parâmetro  
**Response:**
```json
{
  "status": "success",
  "data": {
    "online": true,
    "model": "gpt-4o",
    "uptime_seconds": 86400,
    "sicc_active": true,
    "last_activity": "2026-01-03T10:30:00Z",
    "version": "1.0.0"
  }
}
```

#### GET /api/agent/conversations
**Descrição:** Conversas recentes processadas  
**Request:** Nenhum parâmetro  
**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "conv_123",
      "messages": [{"count": 5}],
      "updated_at": "2026-01-03T10:30:00Z",
      "customer_id": "user_456"
    }
  ]
}
```

#### GET /api/agent/config
**Descrição:** Configuração atual do agente  
**Request:** Nenhum parâmetro  
**Response:**
```json
{
  "status": "success",
  "data": {
    "model": "gpt-4o",
    "temperature": 0.7,
    "max_tokens": 1000,
    "system_prompt": "Você é a BIA...",
    "response_time_limit": 30
  }
}
```

#### POST /api/agent/config
**Descrição:** Salvar configuração do agente  
**Request:**
```json
{
  "model": "gpt-4o",
  "temperature": 0.8,
  "max_tokens": 1500,
  "system_prompt": "Você é a BIA...",
  "response_time_limit": 45
}
```
**Response:**
```json
{
  "status": "success",
  "message": "Configuração salva com sucesso"
}
```

#### POST /api/agent/test-prompt
**Descrição:** Testar prompt com configuração atual  
**Request:**
```json
{
  "prompt": "Olá, como você está?",
  "max_tokens": 300,
  "temperature": 0.7
}
```
**Response:**
```json
{
  "status": "success",
  "data": {
    "response": "Olá! Estou bem, obrigada por perguntar...",
    "tokens_used": 45,
    "model": "gpt-4o"
  }
}
```

#### GET /api/agent/metrics
**Descrição:** Métricas de performance do agente  
**Request:** Nenhum parâmetro  
**Response:**
```json
{
  "status": "success",
  "data": {
    "uptime_percentage": 99.5,
    "average_latency": 1.2,
    "accuracy_rate": 85.0,
    "tokens_consumed": 150000,
    "responses_generated": 1250,
    "hourly_latency": [1.1, 1.3, 1.0, 1.4],
    "model_usage": {"gpt-4o": 80, "gpt-3.5": 20},
    "question_types": {"produto": 40, "suporte": 35, "vendas": 25}
  }
}
```

### 2.2. MCP Endpoints (mcp.py)

#### GET /api/mcp/status
**Descrição:** Status das integrações MCP  
**Request:** Nenhum parâmetro  
**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "evolution",
      "name": "Evolution API",
      "type": "WhatsApp",
      "status": "connected",
      "last_check": "2026-01-03T10:30:00Z",
      "url": "https://evolution.api.com",
      "health": true
    },
    {
      "id": "supabase",
      "name": "Supabase",
      "type": "Database",
      "status": "connected",
      "last_check": "2026-01-03T10:30:00Z",
      "health": true
    }
  ]
}
```

#### POST /api/mcp/test/{integration_id}
**Descrição:** Testar integração específica  
**Request:** integration_id no path  
**Response:**
```json
{
  "status": "success",
  "data": {
    "integration_id": "evolution",
    "test_result": "success",
    "response_time": 250,
    "details": "Connection successful"
  }
}
```

### 2.3. SICC Endpoints (sicc.py)

#### GET /api/sicc/config
**Descrição:** Configuração atual do SICC  
**Request:** Nenhum parâmetro  
**Response:**
```json
{
  "status": "success",
  "data": {
    "sicc_active": true,
    "threshold_auto_approval": 75,
    "embedding_model": "gte-small",
    "memory_quota": 500,
    "auto_learning": true
  }
}
```

#### POST /api/sicc/config
**Descrição:** Salvar configuração do SICC  
**Request:**
```json
{
  "sicc_active": true,
  "threshold_auto_approval": 80,
  "embedding_model": "gte-small",
  "memory_quota": 600
}
```
**Response:**
```json
{
  "status": "success",
  "message": "Configuração SICC salva com sucesso"
}
```

#### GET /api/sicc/metrics
**Descrição:** Métricas do sistema SICC  
**Request:** Nenhum parâmetro  
**Response:**
```json
{
  "status": "success",
  "data": {
    "total_memories": 245,
    "quota_maxima": 500,
    "ultimo_aprendizado": "2026-01-03T09:15:00Z",
    "taxa_auto_aprovacao": 78.5,
    "memorias_esta_semana": 12,
    "precisao_media": 92.3
  }
}
```

#### GET /api/sicc/alerts
**Descrição:** Alertas ativos do sistema  
**Request:** Nenhum parâmetro  
**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "alert_001",
      "type": "quota",
      "message": "Quota de memória em 90%",
      "severity": "warning",
      "created_at": "2026-01-03T10:00:00Z"
    }
  ]
}
```

#### GET /api/sicc/learnings
**Descrição:** Lista de aprendizados  
**Request:** ?status=all|pending|approved|rejected  
**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "learning_001",
      "pattern": "Pergunta sobre colchão magnético",
      "response": "O colchão magnético possui...",
      "status": "pending",
      "confidence": 85.5,
      "created_at": "2026-01-03T09:30:00Z"
    }
  ]
}
```

#### POST /api/sicc/learnings/{learning_id}/approve
**Descrição:** Aprovar aprendizado  
**Request:** learning_id no path  
**Response:**
```json
{
  "status": "success",
  "message": "Aprendizado aprovado com sucesso",
  "data": {
    "id": "learning_001",
    "status": "approved"
  }
}
```

#### POST /api/sicc/learnings/{learning_id}/reject
**Descrição:** Rejeitar aprendizado  
**Request:** learning_id no path  
**Response:**
```json
{
  "status": "success",
  "message": "Aprendizado rejeitado",
  "data": {
    "id": "learning_001",
    "status": "rejected"
  }
}
```

#### PUT /api/sicc/learnings/{learning_id}
**Descrição:** Editar resposta de aprendizado  
**Request:**
```json
{
  "response_text": "Nova resposta editada..."
}
```
**Response:**
```json
{
  "status": "success",
  "message": "Resposta atualizada com sucesso",
  "data": {
    "id": "learning_001",
    "response": "Nova resposta editada..."
  }
}
```

---

## 3. MODELOS DE DADOS

### 3.1. Schemas Pydantic (Backend)

```python
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class AgentConfigSchema(BaseModel):
    model: str = Field(..., description="Modelo LLM a usar")
    temperature: float = Field(..., ge=0.0, le=2.0, description="Temperatura do modelo")
    max_tokens: int = Field(..., ge=1, le=4000, description="Máximo de tokens")
    system_prompt: str = Field(..., min_length=1, description="Prompt do sistema")
    response_time_limit: int = Field(..., ge=5, le=300, description="Limite de tempo em segundos")

class TestPromptSchema(BaseModel):
    prompt: str = Field(..., min_length=1, description="Prompt para testar")
    max_tokens: Optional[int] = Field(300, ge=1, le=1000, description="Tokens para o teste")
    temperature: Optional[float] = Field(0.7, ge=0.0, le=2.0, description="Temperatura para o teste")

class SICCConfigSchema(BaseModel):
    sicc_active: bool = Field(..., description="SICC ativo ou inativo")
    threshold_auto_approval: int = Field(..., ge=0, le=100, description="Threshold de auto-aprovação")
    embedding_model: str = Field(..., description="Modelo de embedding")
    memory_quota: int = Field(..., ge=100, le=1000, description="Quota de memória")

class LearningUpdateSchema(BaseModel):
    response_text: str = Field(..., min_length=1, description="Nova resposta do aprendizado")

class AgentStatus(BaseModel):
    online: bool
    model: str
    uptime_seconds: int
    sicc_active: bool
    last_activity: Optional[datetime]
    version: str

class MCPIntegration(BaseModel):
    id: str
    name: str
    type: str
    status: str
    last_check: datetime
    url: Optional[str]
    health: bool

class SICCMetrics(BaseModel):
    total_memories: int
    quota_maxima: int
    ultimo_aprendizado: Optional[datetime]
    taxa_auto_aprovacao: float
    memorias_esta_semana: int
    precisao_media: float

class Learning(BaseModel):
    id: str
    pattern: str
    response: str
    status: str
    confidence: float
    created_at: datetime
```

### 3.2. Interfaces TypeScript (Frontend)

```typescript
// Agent Types
interface AgentStatus {
  online: boolean;
  model: string;
  uptime_seconds: number;
  sicc_active: boolean;
  last_activity?: string;
  version: string;
}

interface AgentConfig {
  model: string;
  temperature: number;
  max_tokens: number;
  system_prompt: string;
  response_time_limit: number;
}

interface TestPromptRequest {
  prompt: string;
  max_tokens?: number;
  temperature?: number;
}

interface TestPromptResponse {
  response: string;
  tokens_used: number;
  model: string;
}

// MCP Types
interface MCPIntegration {
  id: string;
  name: string;
  type: string;
  status: 'connected' | 'disconnected';
  last_check: string;
  url?: string;
  health: boolean;
}

// SICC Types
interface SICCConfig {
  sicc_active: boolean;
  threshold_auto_approval: number;
  embedding_model: string;
  memory_quota: number;
  auto_learning?: boolean;
}

interface SICCMetrics {
  total_memories: number;
  quota_maxima: number;
  ultimo_aprendizado?: string;
  taxa_auto_aprovacao: number;
  memorias_esta_semana: number;
  precisao_media: number;
}

interface Learning {
  id: string;
  pattern: string;
  response: string;
  status: 'pending' | 'approved' | 'rejected';
  confidence: number;
  created_at: string;
}

interface Alert {
  id: string;
  type: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  created_at: string;
}

// API Response Types
interface APIResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
}

// Metrics Types
interface AgentMetrics {
  uptime_percentage: number;
  average_latency: number;
  accuracy_rate: number;
  tokens_consumed: number;
  responses_generated: number;
  hourly_latency: number[];
  model_usage: Record<string, number>;
  question_types: Record<string, number>;
}
```

---

## 4. FLUXO DE DADOS DETALHADO

### 4.1. Fluxo de Carregamento de Página

```
1. Usuário acessa página do dashboard
   ↓
2. React component monta (useEffect)
   ↓
3. Frontend faz chamada HTTP para API
   ↓
4. FastAPI router recebe request
   ↓
5. Router chama service apropriado
   ↓
6. Service consulta dados (banco/cache/API externa)
   ↓
7. Service retorna dados para router
   ↓
8. Router formata response e retorna
   ↓
9. Frontend recebe dados e atualiza estado
   ↓
10. React re-renderiza com dados reais
```

### 4.2. Fluxo de Salvamento de Configuração

```
1. Usuário preenche formulário
   ↓
2. Frontend valida dados localmente
   ↓
3. Frontend envia POST para API
   ↓
4. FastAPI valida com Pydantic schema
   ↓
5. Service processa e salva dados
   ↓
6. Service aplica configuração no sistema
   ↓
7. Service retorna confirmação
   ↓
8. Frontend exibe feedback de sucesso
   ↓
9. Frontend atualiza estado local
```

### 4.3. Fluxo de Teste de Integração

```
1. Usuário clica "Testar" integração
   ↓
2. Frontend envia POST /api/mcp/test/{id}
   ↓
3. Service faz chamada para API externa
   ↓
4. Service mede tempo de resposta
   ↓
5. Service retorna resultado do teste
   ↓
6. Frontend exibe resultado (sucesso/erro)
   ↓
7. Frontend atualiza status da integração
```

---

## 5. ESTRATÉGIA DE ERROR HANDLING

### 5.1. Níveis de Error Handling

#### Backend (FastAPI)
```python
# Nível 1: Validação Pydantic
@router.post("/agent/config")
async def save_config(config: AgentConfigSchema):
    # Pydantic valida automaticamente
    
# Nível 2: Business Logic Validation
try:
    if config.temperature < 0 or config.temperature > 2:
        raise ValueError("Temperature inválida")
except ValueError as e:
    return {"status": "error", "message": str(e)}

# Nível 3: External API Errors
try:
    response = await external_api.call()
except httpx.TimeoutException:
    return {"status": "error", "message": "Timeout na API externa"}
except httpx.HTTPStatusError as e:
    return {"status": "error", "message": f"API retornou {e.response.status_code}"}

# Nível 4: Unexpected Errors
except Exception as e:
    logger.error(f"Erro inesperado: {str(e)}")
    return {"status": "error", "message": "Erro interno do servidor"}
```

#### Frontend (React)
```typescript
// Nível 1: Network Errors
const fetchData = async () => {
  try {
    const response = await fetch('/api/agent/status');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    
    // Nível 2: API Response Errors
    if (data.status === 'error') {
      setError(data.message);
      return;
    }
    
    setData(data.data);
  } catch (err) {
    // Nível 3: Unexpected Errors
    setError('Erro ao conectar com servidor');
  }
};

// Nível 4: Component Error Boundaries
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    console.error('Component error:', error, errorInfo);
  }
}
```

### 5.2. Códigos de Erro Padronizados

```typescript
enum ErrorCodes {
  // Validation Errors (400)
  INVALID_CONFIG = 'INVALID_CONFIG',
  MISSING_FIELD = 'MISSING_FIELD',
  
  // Authentication Errors (401)
  UNAUTHORIZED = 'UNAUTHORIZED',
  
  // Not Found Errors (404)
  LEARNING_NOT_FOUND = 'LEARNING_NOT_FOUND',
  
  // External API Errors (502)
  EVOLUTION_API_DOWN = 'EVOLUTION_API_DOWN',
  OPENAI_API_ERROR = 'OPENAI_API_ERROR',
  
  // Internal Errors (500)
  DATABASE_ERROR = 'DATABASE_ERROR',
  SICC_SERVICE_ERROR = 'SICC_SERVICE_ERROR'
}
```

### 5.3. User-Friendly Error Messages

```typescript
const errorMessages = {
  INVALID_CONFIG: 'Configuração inválida. Verifique os valores inseridos.',
  EVOLUTION_API_DOWN: 'WhatsApp API está temporariamente indisponível.',
  DATABASE_ERROR: 'Erro interno. Tente novamente em alguns minutos.',
  TIMEOUT: 'Operação demorou muito para responder. Tente novamente.'
};
```

---

## 6. AUTENTICAÇÃO E AUTORIZAÇÃO

### 6.1. Estratégia de Autenticação

```python
# Middleware de autenticação (assumido como implementado)
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer

security = HTTPBearer()

async def get_current_user(token: str = Depends(security)):
    # Validar JWT token
    # Retornar user info
    pass

# Uso nos endpoints
@router.get("/agent/config")
async def get_config(user = Depends(get_current_user)):
    # Endpoint protegido
    pass
```

### 6.2. Níveis de Autorização

```python
# Roles assumidos
class UserRole(Enum):
    ADMIN = "admin"
    OPERATOR = "operator"
    VIEWER = "viewer"

# Decorador de autorização
def require_role(required_role: UserRole):
    def decorator(func):
        async def wrapper(user = Depends(get_current_user)):
            if user.role != required_role:
                raise HTTPException(403, "Acesso negado")
            return await func(user)
        return wrapper
    return decorator

# Uso
@router.post("/sicc/config")
@require_role(UserRole.ADMIN)
async def save_sicc_config(config: SICCConfigSchema):
    # Apenas admins podem alterar configurações
    pass
```

---

## 7. PERFORMANCE E OTIMIZAÇÃO

### 7.1. Estratégias de Cache

```python
# Cache em memória para dados frequentes
from functools import lru_cache
import asyncio

@lru_cache(maxsize=100)
async def get_agent_status():
    # Cache por 30 segundos
    return await fetch_agent_status()

# Cache Redis para dados compartilhados
import redis
redis_client = redis.Redis()

async def get_mcp_status():
    cached = redis_client.get("mcp_status")
    if cached:
        return json.loads(cached)
    
    status = await fetch_mcp_status()
    redis_client.setex("mcp_status", 30, json.dumps(status))
    return status
```

### 7.2. Otimizações de Database

```python
# Connection pooling
from sqlalchemy.pool import QueuePool

engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=10,
    max_overflow=20
)

# Queries otimizadas
async def get_recent_conversations():
    # Usar índices apropriados
    # Limitar resultados
    # Fazer join eficiente
    query = """
    SELECT c.*, COUNT(m.id) as message_count
    FROM conversations c
    LEFT JOIN messages m ON c.id = m.conversation_id
    WHERE c.updated_at > NOW() - INTERVAL '7 days'
    GROUP BY c.id
    ORDER BY c.updated_at DESC
    LIMIT 10
    """
    return await database.fetch_all(query)
```

### 7.3. Frontend Performance

```typescript
// Lazy loading de componentes
const AgenteMetricas = lazy(() => import('./AgenteMetricas'));

// Memoização de componentes pesados
const ExpensiveChart = memo(({ data }) => {
  return <Chart data={data} />;
});

// Debounce para inputs
const debouncedSearch = useMemo(
  () => debounce((term) => setSearchTerm(term), 300),
  []
);
```

---

## 7. ESTRATÉGIA DE CACHE

### 7.1. Cache de Status MCP (30s)

```python
# Redis Cache Implementation
import redis
import json
from datetime import timedelta

redis_client = redis.Redis(
    host=os.getenv('REDIS_HOST', 'localhost'),
    port=int(os.getenv('REDIS_PORT', 6379)),
    decode_responses=True
)

async def get_mcp_status_cached():
    """Cache MCP status por 30 segundos"""
    cache_key = "mcp:status"
    
    # Tentar buscar do cache
    cached_data = redis_client.get(cache_key)
    if cached_data:
        return json.loads(cached_data)
    
    # Se não existe, buscar dados reais
    fresh_data = await fetch_mcp_status_real()
    
    # Salvar no cache por 30 segundos
    redis_client.setex(
        cache_key, 
        30,  # TTL: 30 segundos
        json.dumps(fresh_data)
    )
    
    return fresh_data
```

### 7.2. Cache de Métricas (60s)

```python
async def get_metrics_cached(metric_type: str):
    """Cache métricas por 60 segundos"""
    cache_key = f"metrics:{metric_type}"
    
    # Verificar cache
    cached_metrics = redis_client.get(cache_key)
    if cached_metrics:
        return json.loads(cached_metrics)
    
    # Calcular métricas frescas
    if metric_type == "agent":
        fresh_metrics = await calculate_agent_metrics()
    elif metric_type == "sicc":
        fresh_metrics = await calculate_sicc_metrics()
    else:
        raise ValueError(f"Tipo de métrica inválido: {metric_type}")
    
    # Cache por 60 segundos
    redis_client.setex(cache_key, 60, json.dumps(fresh_metrics))
    return fresh_metrics
```

### 7.3. Cache em Memória (Fallback)

```python
from functools import lru_cache
import time

# Cache em memória quando Redis não disponível
_memory_cache = {}

def memory_cache_get(key: str, ttl: int):
    """Cache em memória com TTL"""
    if key in _memory_cache:
        data, timestamp = _memory_cache[key]
        if time.time() - timestamp < ttl:
            return data
        else:
            del _memory_cache[key]
    return None

def memory_cache_set(key: str, value: any, ttl: int):
    """Salvar no cache em memória"""
    _memory_cache[key] = (value, time.time())

# Implementação híbrida
async def get_cached_data(key: str, fetch_func, ttl: int = 30):
    """Cache híbrido: Redis primeiro, memória como fallback"""
    try:
        # Tentar Redis primeiro
        cached = redis_client.get(key)
        if cached:
            return json.loads(cached)
    except:
        # Se Redis falhar, usar cache em memória
        cached = memory_cache_get(key, ttl)
        if cached:
            return cached
    
    # Buscar dados frescos
    fresh_data = await fetch_func()
    
    # Salvar em ambos os caches
    try:
        redis_client.setex(key, ttl, json.dumps(fresh_data))
    except:
        memory_cache_set(key, fresh_data, ttl)
    
    return fresh_data
```

### 7.4. Invalidação de Cache

```python
def invalidate_cache(pattern: str):
    """Invalidar cache por padrão"""
    try:
        # Redis: deletar por padrão
        keys = redis_client.keys(pattern)
        if keys:
            redis_client.delete(*keys)
    except:
        # Memória: limpar chaves que fazem match
        keys_to_delete = [k for k in _memory_cache.keys() if pattern in k]
        for key in keys_to_delete:
            del _memory_cache[key]

# Uso após alterações
async def save_agent_config(config):
    # Salvar configuração
    await persist_config(config)
    
    # Invalidar caches relacionados
    invalidate_cache("metrics:agent*")
    invalidate_cache("agent:status")
    
    return {"status": "success"}
```

### 7.5. Configuração de Cache

```python
# Configurações de TTL por tipo de dado
CACHE_TTL = {
    "mcp_status": 30,        # Status MCP: 30s
    "agent_metrics": 60,     # Métricas agente: 60s
    "sicc_metrics": 60,      # Métricas SICC: 60s
    "agent_status": 15,      # Status agente: 15s
    "conversations": 120,    # Conversas: 2min
    "learnings": 300,        # Aprendizados: 5min
}

# Health check do cache
async def cache_health_check():
    """Verificar saúde do sistema de cache"""
    try:
        # Testar Redis
        redis_client.ping()
        return {"redis": "healthy", "memory": "available"}
    except:
        return {"redis": "unavailable", "memory": "available"}
```

---

## 8. MONITORAMENTO E LOGGING

### 8.1. Estrutura de Logs

```python
import structlog

logger = structlog.get_logger()

# Log estruturado
logger.info(
    "Agent config updated",
    user_id=user.id,
    config_changes={"temperature": 0.8},
    timestamp=datetime.now()
)

# Log de performance
logger.info(
    "API call completed",
    endpoint="/api/agent/status",
    response_time_ms=150,
    status_code=200
)
```

### 8.2. Métricas de Sistema

```python
# Prometheus metrics (se disponível)
from prometheus_client import Counter, Histogram

api_calls = Counter('api_calls_total', 'Total API calls', ['endpoint', 'method'])
response_time = Histogram('response_time_seconds', 'Response time')

@response_time.time()
async def get_agent_status():
    api_calls.labels(endpoint='/agent/status', method='GET').inc()
    # ... lógica do endpoint
```

---

**Documento criado:** 03/01/2026  
**Versão:** 1.0  
**Status:** Aprovado para implementação