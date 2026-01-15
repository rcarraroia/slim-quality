"""
API REST para Sistema de Automações

Endpoints para gerenciamento de regras de automação, logs e estatísticas.
Formato de resposta otimizado para o frontend React.
"""

import structlog
from fastapi import APIRouter, HTTPException, Query, Path, Depends
from typing import List, Dict, Any, Optional
from datetime import datetime

from ..services.automation import (
    get_automation_service,
    AutomationService,
    AutomationServiceError,
    RuleNotFoundError,
    ValidationError
)
from ..services.automation.schemas import (
    AutomationRuleCreate,
    AutomationRuleUpdate,
    AutomationRulesResponse,
    AutomationStats,
    RuleExecutionLog
)

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/automations", tags=["automations"])


# ============================================
# DEPENDÊNCIAS E UTILITÁRIOS
# ============================================

async def get_current_user_id() -> str:
    """
    Obtém ID do usuário atual (placeholder - implementar autenticação real)
    
    Returns:
        ID do usuário autenticado
    """
    # TODO: Implementar autenticação real
    return "user_123"


def handle_automation_error(e: Exception) -> HTTPException:
    """
    Converte exceções do sistema de automação para HTTPException
    
    Args:
        e: Exceção capturada
        
    Returns:
        HTTPException apropriada
    """
    if isinstance(e, RuleNotFoundError):
        return HTTPException(
            status_code=404,
            detail={"error": "Regra não encontrada", "message": str(e)}
        )
    elif isinstance(e, ValidationError):
        return HTTPException(
            status_code=400,
            detail={"error": "Dados inválidos", "message": str(e)}
        )
    elif isinstance(e, AutomationServiceError):
        return HTTPException(
            status_code=500,
            detail={"error": "Erro interno do sistema", "message": str(e)}
        )
    else:
        logger.error(f"Erro não tratado: {e}")
        return HTTPException(
            status_code=500,
            detail={"error": "Erro interno do servidor", "message": "Tente novamente mais tarde"}
        )


# ============================================
# TASK 4.1: AUTOMATION CONTROLLER (CRUD)
# ============================================

@router.get("/api/automations/rules", response_model=AutomationRulesResponse)
async def get_rules(
    active_only: bool = Query(False, description="Filtrar apenas regras ativas"),
    limit: int = Query(100, ge=1, le=1000, description="Limite de resultados"),
    offset: int = Query(0, ge=0, description="Offset para paginação"),
    user_id: str = Depends(get_current_user_id),
    automation_service: AutomationService = Depends(get_automation_service)
) -> AutomationRulesResponse:
    """
    Lista regras de automação do usuário
    
    Formato de resposta EXATO esperado pelo frontend:
    {
      "rules": [{
        "id": 1,
        "nome": "Boas-vindas Novo Cliente", 
        "status": "ativa",
        "gatilho": "Lead criado",
        "acao": "Enviar mensagem de boas-vindas",
        "disparosMes": 23,
        "taxaAbertura": "87%"
      }]
    }
    """
    logger.info(f"get_rules: Listando regras para usuário {user_id}")
    
    try:
        # Buscar regras do usuário
        rules = await automation_service.get_rules(
            user_id=user_id,
            active_only=active_only,
            limit=limit,
            offset=offset
        )
        
        # Converter para formato do frontend
        response = await automation_service.get_rules_for_frontend(user_id)
        
        logger.info(f"get_rules: {len(response.rules)} regras retornadas")
        return response
        
    except Exception as e:
        logger.error(f"get_rules: Erro ao listar regras: {e}")
        raise handle_automation_error(e)


@router.post("/api/automations/rules")
async def create_rule(
    rule_data: AutomationRuleCreate,
    user_id: str = Depends(get_current_user_id),
    automation_service: AutomationService = Depends(get_automation_service)
) -> Dict[str, Any]:
    """
    Cria nova regra de automação
    
    Args:
        rule_data: Dados da regra a ser criada
        
    Returns:
        Regra criada com ID gerado
    """
    logger.info(f"create_rule: Criando regra '{rule_data.nome}' para usuário {user_id}")
    
    try:
        # Criar regra
        created_rule = await automation_service.create_rule(rule_data, user_id)
        
        logger.info(f"create_rule: Regra criada com ID {created_rule.id}")
        return {
            "success": True,
            "message": "Regra criada com sucesso",
            "rule": {
                "id": created_rule.id,
                "nome": created_rule.nome,
                "status": created_rule.status
            }
        }
        
    except Exception as e:
        logger.error(f"create_rule: Erro ao criar regra: {e}")
        raise handle_automation_error(e)


@router.put("/api/automations/rules/{rule_id}")
async def update_rule(
    rule_id: str = Path(..., description="ID da regra"),
    rule_data: AutomationRuleUpdate = ...,
    user_id: str = Depends(get_current_user_id),
    automation_service: AutomationService = Depends(get_automation_service)
) -> Dict[str, Any]:
    """
    Atualiza regra existente
    
    Args:
        rule_id: ID da regra
        rule_data: Dados para atualização
        
    Returns:
        Regra atualizada
    """
    logger.info(f"update_rule: Atualizando regra {rule_id} para usuário {user_id}")
    
    try:
        # Atualizar regra
        updated_rule = await automation_service.update_rule(rule_id, rule_data, user_id)
        
        logger.info(f"update_rule: Regra {rule_id} atualizada com sucesso")
        return {
            "success": True,
            "message": "Regra atualizada com sucesso",
            "rule": {
                "id": updated_rule.id,
                "nome": updated_rule.nome,
                "status": updated_rule.status
            }
        }
        
    except Exception as e:
        logger.error(f"update_rule: Erro ao atualizar regra {rule_id}: {e}")
        raise handle_automation_error(e)


@router.delete("/api/automations/rules/{rule_id}")
async def delete_rule(
    rule_id: str = Path(..., description="ID da regra"),
    user_id: str = Depends(get_current_user_id),
    automation_service: AutomationService = Depends(get_automation_service)
) -> Dict[str, Any]:
    """
    Remove regra (soft delete)
    
    Args:
        rule_id: ID da regra
        
    Returns:
        Confirmação de remoção
    """
    logger.info(f"delete_rule: Removendo regra {rule_id} para usuário {user_id}")
    
    try:
        # Deletar regra
        success = await automation_service.delete_rule(rule_id, user_id)
        
        if success:
            logger.info(f"delete_rule: Regra {rule_id} removida com sucesso")
            return {
                "success": True,
                "message": "Regra removida com sucesso"
            }
        else:
            raise AutomationServiceError("Falha ao remover regra")
            
    except Exception as e:
        logger.error(f"delete_rule: Erro ao remover regra {rule_id}: {e}")
        raise handle_automation_error(e)


@router.post("/api/automations/rules/{rule_id}/toggle")
async def toggle_rule_status(
    rule_id: str = Path(..., description="ID da regra"),
    user_id: str = Depends(get_current_user_id),
    automation_service: AutomationService = Depends(get_automation_service)
) -> Dict[str, Any]:
    """
    Alterna status ativa/inativa da regra
    
    Args:
        rule_id: ID da regra
        
    Returns:
        Regra com status atualizado
    """
    logger.info(f"toggle_rule_status: Alternando status da regra {rule_id}")
    
    try:
        # Alternar status
        updated_rule = await automation_service.toggle_rule_status(rule_id, user_id)
        
        logger.info(f"toggle_rule_status: Status da regra {rule_id} alterado para {updated_rule.status}")
        return {
            "success": True,
            "message": f"Regra {updated_rule.status}",
            "rule": {
                "id": updated_rule.id,
                "nome": updated_rule.nome,
                "status": updated_rule.status
            }
        }
        
    except Exception as e:
        logger.error(f"toggle_rule_status: Erro ao alternar status da regra {rule_id}: {e}")
        raise handle_automation_error(e)


# ============================================
# TASK 4.2: LOGS CONTROLLER
# ============================================

@router.get("/api/automations/logs")
async def get_execution_logs(
    rule_id: Optional[str] = Query(None, description="Filtrar por ID da regra"),
    status: Optional[str] = Query(None, description="Filtrar por status (success, failed, partial)"),
    limit: int = Query(50, ge=1, le=500, description="Limite de resultados"),
    offset: int = Query(0, ge=0, description="Offset para paginação"),
    user_id: str = Depends(get_current_user_id),
    automation_service: AutomationService = Depends(get_automation_service)
) -> Dict[str, Any]:
    """
    Lista logs de execução de regras
    
    Args:
        rule_id: ID da regra específica (opcional)
        status: Status da execução (opcional)
        limit: Limite de resultados
        offset: Offset para paginação
        
    Returns:
        Lista de logs formatada para o frontend
    """
    logger.info(f"get_execution_logs: Buscando logs para usuário {user_id}")
    
    try:
        # Buscar logs
        logs = await automation_service.get_execution_logs(
            rule_id=rule_id,
            user_id=user_id,
            limit=limit,
            offset=offset
        )
        
        # Filtrar por status se fornecido
        if status:
            logs = [log for log in logs if log.execution_status == status]
        
        # Formatar para frontend
        formatted_logs = []
        for log in logs:
            formatted_logs.append({
                "id": log.id,
                "rule_name": log.rule_name,
                "trigger_type": log.trigger_type,
                "status": log.execution_status,
                "actions_count": log.actions_count,
                "duration_ms": log.duration_ms,
                "executed_at": log.executed_at,
                "error_message": log.error_message
            })
        
        logger.info(f"get_execution_logs: {len(formatted_logs)} logs retornados")
        return {
            "logs": formatted_logs,
            "total": len(formatted_logs),
            "limit": limit,
            "offset": offset
        }
        
    except Exception as e:
        logger.error(f"get_execution_logs: Erro ao buscar logs: {e}")
        raise handle_automation_error(e)


# ============================================
# TASK 4.3: STATS CONTROLLER
# ============================================

@router.get("/api/automations/stats", response_model=AutomationStats)
async def get_automation_stats(
    user_id: str = Depends(get_current_user_id),
    automation_service: AutomationService = Depends(get_automation_service)
) -> AutomationStats:
    """
    Retorna estatísticas de automações
    
    Formato de resposta EXATO esperado pelo frontend:
    {
      "fluxos_ativos": 6,
      "mensagens_enviadas_hoje": 47,
      "taxa_media_abertura": "68%"
    }
    """
    logger.info(f"get_automation_stats: Obtendo estatísticas para usuário {user_id}")
    
    try:
        # Buscar estatísticas
        stats = await automation_service.get_stats(user_id)
        
        logger.info(f"get_automation_stats: Estatísticas obtidas - {stats.fluxos_ativos} fluxos ativos")
        return stats
        
    except Exception as e:
        logger.error(f"get_automation_stats: Erro ao obter estatísticas: {e}")
        raise handle_automation_error(e)


# ============================================
# TASK 4.4: VALIDAÇÃO E TRATAMENTO DE ERROS
# ============================================
# 
# Nota: Exception handlers devem ser registrados no app principal,
# não no router. O tratamento de erros é feito via try/catch
# nos endpoints individuais usando a função handle_automation_error()
#