"""
RulesExecutor - Avaliação e execução de regras de automação

Responsável por avaliar condições e executar regras durante conversas.
Integra com ActionExecutor para executar ações específicas.
"""

import structlog
from typing import List, Dict, Any, Optional
from datetime import datetime
import time
import asyncio

from ..supabase_client import get_supabase_client
from .schemas import (
    AutomationRule,
    RuleCondition,
    RuleExecution,
    ActionResult,
    ExecutionStatus,
    ConditionOperator,
    TriggerType,
    AutomationContext
)

logger = structlog.get_logger(__name__)


class RulesExecutorError(Exception):
    """Exceção base para erros do RulesExecutor"""
    pass


class ConditionEvaluationError(RulesExecutorError):
    """Exceção para erros na avaliação de condições"""
    pass


class RulesExecutor:
    """
    Executor de regras de automação
    
    Responsável por:
    - Buscar regras ativas para um tipo de gatilho
    - Avaliar condições das regras
    - Executar regras que atendem às condições
    - Registrar logs de execução
    """
    
    def __init__(self):
        """Inicializa o executor"""
        self.client = get_supabase_client()
        logger.info("RulesExecutor inicializado")
    
    async def evaluate_rules(
        self, 
        trigger_type: str, 
        context: Dict[str, Any],
        user_id: Optional[str] = None
    ) -> List[RuleExecution]:
        """
        Avalia todas as regras ativas para um tipo de gatilho
        
        Args:
            trigger_type: Tipo de gatilho (conversation_started, etc.)
            context: Contexto com dados para avaliação
            user_id: ID do usuário (opcional, para filtrar regras)
            
        Returns:
            Lista de execuções de regras
        """
        logger.info(f"evaluate_rules: Avaliando regras para gatilho '{trigger_type}'")
        start_time = time.time()
        
        try:
            # Buscar regras ativas para o gatilho
            active_rules = await self._get_active_rules(trigger_type, user_id)
            logger.info(f"evaluate_rules: {len(active_rules)} regras ativas encontradas")
            
            if not active_rules:
                return []
            
            # Executar regras em paralelo para performance
            tasks = []
            for rule in active_rules:
                task = self.execute_rule(rule, context)
                tasks.append(task)
            
            # Aguardar todas as execuções
            executions = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Filtrar exceções e manter apenas execuções válidas
            valid_executions = []
            for i, execution in enumerate(executions):
                if isinstance(execution, Exception):
                    logger.error(f"evaluate_rules: Erro na execução da regra {active_rules[i].id}: {execution}")
                else:
                    valid_executions.append(execution)
            
            # Calcular tempo total
            duration_ms = int((time.time() - start_time) * 1000)
            logger.info(f"evaluate_rules: {len(valid_executions)} regras executadas em {duration_ms}ms")
            
            return valid_executions
            
        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            logger.error(f"evaluate_rules: Erro geral na avaliação: {e} (tempo: {duration_ms}ms)")
            raise RulesExecutorError(f"Erro na avaliação de regras: {e}")
    
    async def execute_rule(self, rule: AutomationRule, context: Dict[str, Any]) -> RuleExecution:
        """
        Executa uma regra específica
        
        Args:
            rule: Regra a ser executada
            context: Contexto com dados para avaliação
            
        Returns:
            Resultado da execução da regra
        """
        logger.info(f"execute_rule: Executando regra '{rule.nome}' (ID: {rule.id})")
        start_time = time.time()
        
        try:
            # Avaliar condições da regra
            conditions_met = True
            conditions_result = {}
            
            if rule.condicoes:
                conditions_met = await self.evaluate_conditions(rule.condicoes, context)
                conditions_result = {
                    "total_conditions": len(rule.condicoes),
                    "conditions_met": conditions_met,
                    "evaluated_at": datetime.now().isoformat()
                }
                logger.info(f"execute_rule: Condições da regra {rule.id} - atendidas: {conditions_met}")
            
            # Se condições não foram atendidas, não executar ações
            if not conditions_met:
                duration_ms = int((time.time() - start_time) * 1000)
                execution = RuleExecution(
                    rule_id=rule.id,
                    trigger_type=rule.gatilho,
                    trigger_data=context,
                    conditions_met=False,
                    conditions_result=conditions_result,
                    actions_executed=[],
                    execution_status=ExecutionStatus.SUCCESS,
                    duration_ms=duration_ms,
                    executed_at=datetime.now()
                )
                
                # Registrar log mesmo quando condições não são atendidas
                await self.log_execution(rule.id, execution)
                return execution
            
            # Executar ações da regra
            from .action_executor import get_action_executor
            action_executor = get_action_executor()
            
            actions_executed = await action_executor.execute_actions(rule.acoes, context)
            
            # Determinar status geral da execução
            execution_status = self._determine_execution_status(actions_executed)
            
            # Calcular duração total
            duration_ms = int((time.time() - start_time) * 1000)
            
            # Criar resultado da execução
            execution = RuleExecution(
                rule_id=rule.id,
                trigger_type=rule.gatilho,
                trigger_data=context,
                conditions_met=True,
                conditions_result=conditions_result,
                actions_executed=actions_executed,
                execution_status=execution_status,
                duration_ms=duration_ms,
                executed_at=datetime.now()
            )
            
            # Registrar log de execução
            await self.log_execution(rule.id, execution)
            
            logger.info(f"execute_rule: Regra {rule.id} executada - status: {execution_status}")
            return execution
            
        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            logger.error(f"execute_rule: Erro na execução da regra {rule.id}: {e}")
            
            # Criar execução com erro
            execution = RuleExecution(
                rule_id=rule.id,
                trigger_type=rule.gatilho,
                trigger_data=context,
                conditions_met=False,
                conditions_result={},
                actions_executed=[],
                execution_status=ExecutionStatus.FAILED,
                error_message=str(e),
                duration_ms=duration_ms,
                executed_at=datetime.now()
            )
            
            # Registrar log de erro
            await self.log_execution(rule.id, execution)
            return execution
    
    async def evaluate_conditions(
        self, 
        conditions: List[RuleCondition], 
        context: Dict[str, Any]
    ) -> bool:
        """
        Avalia condições de uma regra
        
        Args:
            conditions: Lista de condições a avaliar
            context: Contexto com dados para avaliação
            
        Returns:
            True se todas as condições são atendidas, False caso contrário
        """
        if not conditions:
            return True
        
        logger.debug(f"evaluate_conditions: Avaliando {len(conditions)} condições")
        
        try:
            # Avaliar cada condição
            results = []
            for i, condition in enumerate(conditions):
                result = await self._evaluate_single_condition(condition, context)
                results.append(result)
                
                logger.debug(f"evaluate_conditions: Condição {i+1} - {condition.field} {condition.operator} {condition.value} = {result}")
            
            # Aplicar lógica AND/OR
            final_result = self._apply_logic_operators(conditions, results)
            
            logger.debug(f"evaluate_conditions: Resultado final: {final_result}")
            return final_result
            
        except Exception as e:
            logger.error(f"evaluate_conditions: Erro na avaliação: {e}")
            raise ConditionEvaluationError(f"Erro na avaliação de condições: {e}")
    
    async def log_execution(self, rule_id: str, execution: RuleExecution) -> None:
        """
        Registra log de execução de regra
        
        Args:
            rule_id: ID da regra executada
            execution: Resultado da execução
        """
        logger.debug(f"log_execution: Registrando log para regra {rule_id}")
        
        try:
            # Preparar dados do log
            log_data = {
                "rule_id": rule_id,
                "trigger_type": execution.trigger_type,
                "trigger_data": execution.trigger_data,
                "conditions_met": execution.conditions_met,
                "conditions_result": execution.conditions_result,
                "actions_executed": [action.dict() for action in execution.actions_executed],
                "execution_status": execution.execution_status,
                "error_message": execution.error_message,
                "duration_ms": execution.duration_ms,
                "executed_at": execution.executed_at.isoformat(),
                "actions_count": len(execution.actions_executed)
            }
            
            # Inserir no banco
            response = self.client.table("rule_execution_logs").insert(log_data).execute()
            
            if response.data:
                logger.debug(f"log_execution: Log registrado com ID {response.data[0]['id']}")
            else:
                logger.warning("log_execution: Resposta vazia ao inserir log")
                
        except Exception as e:
            logger.error(f"log_execution: Erro ao registrar log: {e}")
            # Não propagar erro de log para não afetar execução principal
    
    async def _get_active_rules(
        self, 
        trigger_type: str, 
        user_id: Optional[str] = None
    ) -> List[AutomationRule]:
        """
        Busca regras ativas para um tipo de gatilho
        
        Args:
            trigger_type: Tipo de gatilho
            user_id: ID do usuário (opcional)
            
        Returns:
            Lista de regras ativas
        """
        try:
            # Query otimizada com índices
            query = self.client.table("automation_rules").select("*").eq("status", "ativa").eq("gatilho", trigger_type).is_("deleted_at", "null")
            
            # Filtrar por usuário se fornecido
            if user_id:
                query = query.eq("created_by", user_id)
            
            # Ordenar por data de atualização para priorizar regras mais recentes
            query = query.order("updated_at", desc=True)
            
            response = query.execute()
            
            if not response.data:
                return []
            
            # Converter dados do banco para modelos
            rules = []
            for rule_data in response.data:
                try:
                    rule = self._convert_db_to_rule(rule_data)
                    rules.append(rule)
                except Exception as e:
                    logger.error(f"_get_active_rules: Erro ao converter regra {rule_data.get('id')}: {e}")
                    continue
            
            return rules
            
        except Exception as e:
            logger.error(f"_get_active_rules: Erro ao buscar regras: {e}")
            return []
    
    async def _evaluate_single_condition(
        self, 
        condition: RuleCondition, 
        context: Dict[str, Any]
    ) -> bool:
        """
        Avalia uma única condição
        
        Args:
            condition: Condição a avaliar
            context: Contexto com dados
            
        Returns:
            True se condição é atendida, False caso contrário
        """
        try:
            # Extrair valor do contexto usando notação de ponto
            field_value = self._extract_field_value(condition.field, context)
            
            # Aplicar operador
            if condition.operator == ConditionOperator.EQUALS:
                return field_value == condition.value
            
            elif condition.operator == ConditionOperator.CONTAINS:
                if isinstance(field_value, str) and isinstance(condition.value, str):
                    return condition.value.lower() in field_value.lower()
                return False
            
            elif condition.operator == ConditionOperator.GREATER_THAN:
                try:
                    return float(field_value) > float(condition.value)
                except (ValueError, TypeError):
                    return False
            
            elif condition.operator == ConditionOperator.LESS_THAN:
                try:
                    return float(field_value) < float(condition.value)
                except (ValueError, TypeError):
                    return False
            
            elif condition.operator == ConditionOperator.IN_LIST:
                if isinstance(condition.value, list):
                    return field_value in condition.value
                return False
            
            elif condition.operator == ConditionOperator.NOT_EMPTY:
                return field_value is not None and field_value != "" and field_value != []
            
            else:
                logger.warning(f"_evaluate_single_condition: Operador não suportado: {condition.operator}")
                return False
                
        except Exception as e:
            logger.error(f"_evaluate_single_condition: Erro na avaliação: {e}")
            return False
    
    def _extract_field_value(self, field_path: str, context: Dict[str, Any]) -> Any:
        """
        Extrai valor de um campo usando notação de ponto
        
        Args:
            field_path: Caminho do campo (ex: "customer.name")
            context: Contexto com dados
            
        Returns:
            Valor do campo ou None se não encontrado
        """
        try:
            parts = field_path.split(".")
            value = context
            
            for part in parts:
                if isinstance(value, dict) and part in value:
                    value = value[part]
                else:
                    return None
            
            return value
            
        except Exception as e:
            logger.error(f"_extract_field_value: Erro ao extrair campo '{field_path}': {e}")
            return None
    
    def _apply_logic_operators(
        self, 
        conditions: List[RuleCondition], 
        results: List[bool]
    ) -> bool:
        """
        Aplica operadores lógicos AND/OR entre condições
        
        Args:
            conditions: Lista de condições
            results: Lista de resultados das condições
            
        Returns:
            Resultado final da avaliação lógica
        """
        if not results:
            return True
        
        if len(results) == 1:
            return results[0]
        
        # Aplicar lógica sequencial
        final_result = results[0]
        
        for i in range(1, len(results)):
            logic_operator = conditions[i-1].logic or "AND"
            
            if logic_operator == "AND":
                final_result = final_result and results[i]
            elif logic_operator == "OR":
                final_result = final_result or results[i]
            else:
                logger.warning(f"_apply_logic_operators: Operador lógico não suportado: {logic_operator}")
                # Default para AND
                final_result = final_result and results[i]
        
        return final_result
    
    def _determine_execution_status(self, actions_executed: List[ActionResult]) -> ExecutionStatus:
        """
        Determina status geral da execução baseado nos resultados das ações
        
        Args:
            actions_executed: Lista de resultados das ações
            
        Returns:
            Status geral da execução
        """
        if not actions_executed:
            return ExecutionStatus.SUCCESS
        
        success_count = sum(1 for action in actions_executed if action.status == "success")
        total_count = len(actions_executed)
        
        if success_count == total_count:
            return ExecutionStatus.SUCCESS
        elif success_count == 0:
            return ExecutionStatus.FAILED
        else:
            return ExecutionStatus.PARTIAL
    
    def _convert_db_to_rule(self, db_data: Dict[str, Any]) -> AutomationRule:
        """
        Converte dados do banco para modelo AutomationRule
        
        Args:
            db_data: Dados do banco de dados
            
        Returns:
            Modelo AutomationRule
        """
        try:
            # Converter campos JSONB de volta para objetos
            condicoes = []
            if db_data.get("condicoes"):
                for condition_data in db_data["condicoes"]:
                    condicoes.append(RuleCondition(**condition_data))
            
            acoes = []
            if db_data.get("acoes"):
                from .schemas import RuleAction
                for action_data in db_data["acoes"]:
                    acoes.append(RuleAction(**action_data))
            
            # Criar modelo
            return AutomationRule(
                id=db_data["id"],
                nome=db_data["nome"],
                descricao=db_data.get("descricao"),
                status=db_data["status"],
                gatilho=db_data["gatilho"],
                gatilho_config=db_data.get("gatilho_config", {}),
                condicoes=condicoes,
                acoes=acoes,
                created_by=db_data["created_by"],
                created_at=db_data["created_at"],
                updated_at=db_data["updated_at"],
                deleted_at=db_data.get("deleted_at"),
                disparos_mes=db_data.get("disparos_mes", 0),
                taxa_abertura_percent=db_data.get("taxa_abertura_percent", 0.0)
            )
            
        except Exception as e:
            logger.error(f"_convert_db_to_rule: Erro ao converter dados: {e}")
            raise RulesExecutorError(f"Erro ao converter dados do banco: {e}")


# Singleton instance
_rules_executor_instance: Optional[RulesExecutor] = None


def get_rules_executor() -> RulesExecutor:
    """
    Obtém instância singleton do RulesExecutor
    
    Returns:
        Instância do RulesExecutor
    """
    global _rules_executor_instance
    
    if _rules_executor_instance is None:
        _rules_executor_instance = RulesExecutor()
        logger.info("RulesExecutor singleton criado")
    
    return _rules_executor_instance


# Função auxiliar para reset (útil para testes)
def reset_rules_executor():
    """Reset da instância singleton (usado principalmente em testes)"""
    global _rules_executor_instance
    _rules_executor_instance = None
    logger.debug("RulesExecutor singleton resetado")