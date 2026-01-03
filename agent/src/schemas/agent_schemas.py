"""
Schemas Pydantic para APIs do Dashboard Agente
"""
from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum


# ============================================
# AGENT SCHEMAS
# ============================================

class AgentStatus(BaseModel):
    """Status do agente"""
    status: str = Field(..., description="Status do agente (online/offline)")
    uptime_seconds: float = Field(..., description="Tempo ativo em segundos")
    model: str = Field(..., description="Modelo LLM atual")
    sicc_enabled: bool = Field(..., description="Se SICC está ativo")
    last_activity: Optional[datetime] = Field(None, description="Última atividade")


class ConversationSummary(BaseModel):
    """Resumo de conversa"""
    id: str = Field(..., description="ID da conversa")
    customer_name: Optional[str] = Field(None, description="Nome do cliente")
    channel: str = Field(..., description="Canal (whatsapp/site)")
    last_message: str = Field(..., description="Última mensagem")
    message_count: int = Field(..., description="Número de mensagens")
    updated_at: datetime = Field(..., description="Última atualização")
    status: str = Field(..., description="Status da conversa")


class AgentConfig(BaseModel):
    """Configuração do agente"""
    model: str = Field("gpt-4o", description="Modelo LLM")
    temperature: float = Field(0.7, ge=0.0, le=2.0, description="Temperatura (0-2)")
    max_tokens: int = Field(500, ge=1, le=4000, description="Máximo de tokens")
    system_prompt: str = Field(..., description="Prompt do sistema")
    sicc_enabled: bool = Field(True, description="Habilitar SICC")


class TestPromptRequest(BaseModel):
    """Request para testar prompt"""
    prompt: str = Field(..., description="Prompt para testar")
    temperature: Optional[float] = Field(0.7, ge=0.0, le=2.0, description="Temperatura")
    max_tokens: Optional[int] = Field(300, ge=1, le=1000, description="Máximo de tokens")


class TestPromptResponse(BaseModel):
    """Response do teste de prompt"""
    response: str = Field(..., description="Resposta gerada")
    tokens_used: int = Field(..., description="Tokens utilizados")
    response_time_ms: float = Field(..., description="Tempo de resposta em ms")
    model_used: str = Field(..., description="Modelo utilizado")


class AgentMetrics(BaseModel):
    """Métricas do agente"""
    uptime: float = Field(..., description="Uptime em percentual (0-100)")
    average_latency: float = Field(..., description="Latência média em segundos")
    accuracy_rate: float = Field(..., description="Taxa de precisão em percentual (0-100)")
    tokens_consumed: int = Field(..., description="Tokens consumidos no período")
    responses_generated: int = Field(..., description="Respostas geradas no período")
    latency_by_hour: List[Dict[str, Union[str, float]]] = Field(..., description="Latência por hora")
    tokens_by_model: List[Dict[str, Union[str, int, str]]] = Field(..., description="Tokens por modelo")
    question_types: List[Dict[str, Union[str, float]]] = Field(..., description="Tipos de pergunta")


# ============================================
# MCP SCHEMAS
# ============================================

class MCPIntegrationStatus(BaseModel):
    """Status de uma integração MCP"""
    id: str = Field(..., description="ID da integração")
    name: str = Field(..., description="Nome da integração")
    status: str = Field(..., description="Status (online/offline/error)")
    last_check: datetime = Field(..., description="Última verificação")
    response_time_ms: Optional[float] = Field(None, description="Tempo de resposta")
    error_message: Optional[str] = Field(None, description="Mensagem de erro")


class MCPStatusResponse(BaseModel):
    """Response do status MCP"""
    integrations: List[MCPIntegrationStatus] = Field(..., description="Lista de integrações")
    total_integrations: int = Field(..., description="Total de integrações")
    online_count: int = Field(..., description="Integrações online")
    last_update: datetime = Field(..., description="Última atualização")


class MCPTestRequest(BaseModel):
    """Request para testar integração MCP"""
    integration_id: str = Field(..., description="ID da integração")


class MCPTestResponse(BaseModel):
    """Response do teste MCP"""
    integration_id: str = Field(..., description="ID da integração")
    success: bool = Field(..., description="Se teste foi bem-sucedido")
    response_time_ms: float = Field(..., description="Tempo de resposta")
    details: Dict[str, Any] = Field(..., description="Detalhes do teste")
    error_message: Optional[str] = Field(None, description="Mensagem de erro")


# ============================================
# SICC SCHEMAS
# ============================================

class SICCConfig(BaseModel):
    """Configuração do SICC"""
    enabled: bool = Field(True, description="SICC habilitado")
    confidence_threshold: float = Field(0.7, ge=0.0, le=1.0, description="Threshold de confiança")
    max_memories: int = Field(100, ge=10, le=1000, description="Máximo de memórias")
    embedding_model: str = Field("sentence-transformers/all-MiniLM-L6-v2", description="Modelo de embedding")
    auto_approval_enabled: bool = Field(True, description="Auto-aprovação habilitada")


class SICCMetrics(BaseModel):
    """Métricas do SICC"""
    total_memories: int = Field(..., description="Total de memórias")
    memories_quota_used: float = Field(..., description="Quota de memórias usada (0-1)")
    auto_approval_rate: float = Field(..., description="Taxa de auto-aprovação (0-1)")
    avg_confidence: float = Field(..., description="Confiança média dos padrões")
    patterns_learned_today: int = Field(..., description="Padrões aprendidos hoje")
    patterns_applied_today: int = Field(..., description="Padrões aplicados hoje")


class SICCAlert(BaseModel):
    """Alerta do SICC"""
    id: str = Field(..., description="ID do alerta")
    type: str = Field(..., description="Tipo do alerta")
    severity: str = Field(..., description="Severidade (low/medium/high)")
    message: str = Field(..., description="Mensagem do alerta")
    created_at: datetime = Field(..., description="Data de criação")
    resolved: bool = Field(False, description="Se foi resolvido")


class SICCLearning(BaseModel):
    """Aprendizado do SICC"""
    id: str = Field(..., description="ID do aprendizado")
    pattern_type: str = Field(..., description="Tipo do padrão")
    description: str = Field(..., description="Descrição do padrão")
    confidence: float = Field(..., description="Confiança (0-1)")
    status: str = Field(..., description="Status (pending/approved/rejected)")
    created_at: datetime = Field(..., description="Data de criação")
    sample_conversation: str = Field(..., description="Conversa de exemplo")
    suggested_response: str = Field(..., description="Resposta sugerida")


class SICCLearningAction(BaseModel):
    """Ação em aprendizado do SICC"""
    action: str = Field(..., description="Ação (approve/reject)")
    reason: Optional[str] = Field(None, description="Motivo da ação")


class SICCLearningUpdate(BaseModel):
    """Atualização de aprendizado do SICC"""
    description: Optional[str] = Field(None, description="Nova descrição")
    suggested_response: Optional[str] = Field(None, description="Nova resposta sugerida")


# ============================================
# RESPONSE SCHEMAS GENÉRICOS
# ============================================

class SuccessResponse(BaseModel):
    """Response de sucesso genérico"""
    success: bool = Field(True, description="Operação bem-sucedida")
    message: str = Field(..., description="Mensagem de sucesso")
    data: Optional[Dict[str, Any]] = Field(None, description="Dados adicionais")


class ErrorResponse(BaseModel):
    """Response de erro genérico"""
    success: bool = Field(False, description="Operação falhou")
    error: str = Field(..., description="Mensagem de erro")
    details: Optional[Dict[str, Any]] = Field(None, description="Detalhes do erro")