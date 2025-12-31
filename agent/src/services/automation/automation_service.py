"""
AutomationService - Gerenciamento CRUD de regras de automação

Responsável por todas as operações de banco de dados relacionadas às regras de automação.
Implementa padrões de segurança, validação e logging consistentes.
"""

import structlog
from typing import List, Dict, Any, Optional
from datetime import datetime
import uuid

from ..supabase_client import get_supabase_client
from .schemas import (
    AutomationRule,
    AutomationRuleCreate,
    AutomationRuleUpdate,
    AutomationStats,
    RuleExecutionLog,
    convert_rule_to_frontend,
    convert_stats_to_frontend,
    AutomationRulesResponse
)

logger = structlog.get_logger(__name__)


class AutomationServiceError(Exception):
    """Exceção base para erros do AutomationService"""
    pass


class RuleNotFoundError(AutomationServiceError):
    """Exceção para regra não encontrada"""
    pass


class ValidationError(AutomationServiceError):
    """Exceção para erros de validação"""
    pass


class AutomationService:
    """
    Serviço para gerenciamento de regras de automação
    
    Implementa operações CRUD com:
    - Validação de dados usando Pydantic
    - Segurança via RLS do Supabase
    - Logging estruturado
    - Tratamento de erros consistente
    """
    
    def __init__(self):
        """Inicializa o serviço"""
        self.client = get_supabase_client()
        logger.info("AutomationService inicializado")
    
    async def create_rule(self, rule_data: AutomationRuleCreate, user_id: str) -> AutomationRule:
        """
        Cria nova regra de automação
        
        Args:
            rule_data: Dados da regra a ser criada
            user_id: ID do usuário criador
            
        Returns:
            Regra criada com ID gerado
            
        Raises:
            ValidationError: Se dados são inválidos
            AutomationServiceError: Se falha na criação
        """
        logger.info(f"create_rule: Criando regra '{rule_data.nome}' para usuário {user_id}")
        
        try:
            # Preparar dados para inserção
            insert_data = {
                "nome": rule_data.nome,
                "descricao": rule_data.descricao,
                "status": rule_data.status,
                "gatilho": rule_data.gatilho,
                "gatilho_config": rule_data.gatilho_config,
                "condicoes": [condition.dict() for condition in rule_data.condicoes],
                "acoes": [action.dict() for action in rule_data.acoes],
                "created_by": user_id,
                "disparos_mes": 0,
                "taxa_abertura_percent": 0.0
            }
            
            # Inserir no banco
            response = self.client.table("automation_rules").insert(insert_data).execute()
            
            if not response.data:
                raise AutomationServiceError("Falha ao criar regra - resposta vazia")
            
            created_rule = response.data[0]
            logger.info(f"create_rule: Regra criada com ID {created_rule['id']}")
            
            # Converter para modelo Pydantic
            return self._convert_db_to_model(created_rule)
            
        except Exception as e:
            logger.error(f"create_rule: Erro ao criar regra: {e}")
            if "violates check constraint" in str(e):
                raise ValidationError(f"Dados inválidos: {e}")
            raise AutomationServiceError(f"Erro ao criar regra: {e}")
    
    async def get_rules(
        self, 
        user_id: str, 
        active_only: bool = False,
        limit: int = 100,
        offset: int = 0
    ) -> List[AutomationRule]:
        """
        Lista regras do usuário
        
        Args:
            user_id: ID do usuário
            active_only: Se deve retornar apenas regras ativas
            limit: Limite de resultados
            offset: Offset para paginação
            
        Returns:
            Lista de regras do usuário
        """
        logger.info(f"get_rules: Listando regras para usuário {user_id} (active_only={active_only})")
        
        try:
            # Construir query
            query = self.client.table("automation_rules").select("*")
            
            # Filtros automáticos via RLS (created_by e deleted_at)
            # Adicionar filtro de status se necessário
            if active_only:
                query = query.eq("status", "ativa")
            
            # Paginação
            query = query.range(offset, offset + limit - 1)
            
            # Ordenar por data de atualização
            query = query.order("updated_at", desc=True)
            
            # Executar query
            response = query.execute()
            
            rules = []
            if response.data:
                for rule_data in response.data:
                    rules.append(self._convert_db_to_model(rule_data))
            
            logger.info(f"get_rules: {len(rules)} regras encontradas")
            return rules
            
        except Exception as e:
            logger.error(f"get_rules: Erro ao listar regras: {e}")
            raise AutomationServiceError(f"Erro ao listar regras: {e}")
    
    async def get_rule(self, rule_id: str, user_id: str) -> AutomationRule:
        """
        Busca regra específica
        
        Args:
            rule_id: ID da regra
            user_id: ID do usuário (para validação RLS)
            
        Returns:
            Regra encontrada
            
        Raises:
            RuleNotFoundError: Se regra não existe ou não pertence ao usuário
        """
        logger.info(f"get_rule: Buscando regra {rule_id} para usuário {user_id}")
        
        try:
            response = self.client.table("automation_rules").select("*").eq("id", rule_id).execute()
            
            if not response.data:
                raise RuleNotFoundError(f"Regra {rule_id} não encontrada")
            
            rule_data = response.data[0]
            logger.info(f"get_rule: Regra {rule_id} encontrada")
            
            return self._convert_db_to_model(rule_data)
            
        except RuleNotFoundError:
            raise
        except Exception as e:
            logger.error(f"get_rule: Erro ao buscar regra {rule_id}: {e}")
            raise AutomationServiceError(f"Erro ao buscar regra: {e}")
    
    async def update_rule(
        self, 
        rule_id: str, 
        rule_data: AutomationRuleUpdate, 
        user_id: str
    ) -> AutomationRule:
        """
        Atualiza regra existente
        
        Args:
            rule_id: ID da regra
            rule_data: Dados para atualização
            user_id: ID do usuário (para validação RLS)
            
        Returns:
            Regra atualizada
            
        Raises:
            RuleNotFoundError: Se regra não existe
            ValidationError: Se dados são inválidos
        """
        logger.info(f"update_rule: Atualizando regra {rule_id} para usuário {user_id}")
        
        try:
            # Preparar dados para atualização (apenas campos não-None)
            update_data = {}
            
            if rule_data.nome is not None:
                update_data["nome"] = rule_data.nome
            if rule_data.descricao is not None:
                update_data["descricao"] = rule_data.descricao
            if rule_data.gatilho is not None:
                update_data["gatilho"] = rule_data.gatilho
            if rule_data.gatilho_config is not None:
                update_data["gatilho_config"] = rule_data.gatilho_config
            if rule_data.condicoes is not None:
                update_data["condicoes"] = [condition.dict() for condition in rule_data.condicoes]
            if rule_data.acoes is not None:
                update_data["acoes"] = [action.dict() for action in rule_data.acoes]
            if rule_data.status is not None:
                update_data["status"] = rule_data.status
            
            # Sempre atualizar timestamp
            update_data["updated_at"] = datetime.now().isoformat()
            
            if not update_data:
                raise ValidationError("Nenhum campo para atualizar")
            
            # Executar atualização
            response = self.client.table("automation_rules").update(update_data).eq("id", rule_id).execute()
            
            if not response.data:
                raise RuleNotFoundError(f"Regra {rule_id} não encontrada ou não pertence ao usuário")
            
            updated_rule = response.data[0]
            logger.info(f"update_rule: Regra {rule_id} atualizada com sucesso")
            
            return self._convert_db_to_model(updated_rule)
            
        except (RuleNotFoundError, ValidationError):
            raise
        except Exception as e:
            logger.error(f"update_rule: Erro ao atualizar regra {rule_id}: {e}")
            if "violates check constraint" in str(e):
                raise ValidationError(f"Dados inválidos: {e}")
            raise AutomationServiceError(f"Erro ao atualizar regra: {e}")
    
    async def delete_rule(self, rule_id: str, user_id: str) -> bool:
        """
        Soft delete de regra
        
        Args:
            rule_id: ID da regra
            user_id: ID do usuário (para validação RLS)
            
        Returns:
            True se deletada com sucesso
            
        Raises:
            RuleNotFoundError: Se regra não existe
        """
        logger.info(f"delete_rule: Deletando regra {rule_id} para usuário {user_id}")
        
        try:
            # Soft delete - marcar deleted_at
            update_data = {
                "deleted_at": datetime.now().isoformat(),
                "status": "inativa"  # Garantir que regra deletada não execute
            }
            
            response = self.client.table("automation_rules").update(update_data).eq("id", rule_id).execute()
            
            if not response.data:
                raise RuleNotFoundError(f"Regra {rule_id} não encontrada ou não pertence ao usuário")
            
            logger.info(f"delete_rule: Regra {rule_id} deletada com sucesso")
            return True
            
        except RuleNotFoundError:
            raise
        except Exception as e:
            logger.error(f"delete_rule: Erro ao deletar regra {rule_id}: {e}")
            raise AutomationServiceError(f"Erro ao deletar regra: {e}")
    
    async def toggle_rule_status(self, rule_id: str, user_id: str) -> AutomationRule:
        """
        Alterna status ativa/inativa da regra
        
        Args:
            rule_id: ID da regra
            user_id: ID do usuário (para validação RLS)
            
        Returns:
            Regra com status atualizado
            
        Raises:
            RuleNotFoundError: Se regra não existe
        """
        logger.info(f"toggle_rule_status: Alternando status da regra {rule_id}")
        
        try:
            # Buscar regra atual
            current_rule = await self.get_rule(rule_id, user_id)
            
            # Alternar status
            new_status = "inativa" if current_rule.status == "ativa" else "ativa"
            
            # Atualizar
            update_data = AutomationRuleUpdate(status=new_status)
            updated_rule = await self.update_rule(rule_id, update_data, user_id)
            
            logger.info(f"toggle_rule_status: Status da regra {rule_id} alterado para {new_status}")
            return updated_rule
            
        except Exception as e:
            logger.error(f"toggle_rule_status: Erro ao alternar status da regra {rule_id}: {e}")
            raise
    
    async def get_stats(self, user_id: str) -> AutomationStats:
        """
        Retorna estatísticas de automações do usuário
        
        Args:
            user_id: ID do usuário
            
        Returns:
            Estatísticas formatadas para o frontend
        """
        logger.info(f"get_stats: Obtendo estatísticas para usuário {user_id}")
        
        try:
            # Usar função SQL do banco para eficiência
            response = self.client.rpc("get_automation_stats", {"p_user_id": user_id}).execute()
            
            if response.data and len(response.data) > 0:
                stats_data = response.data[0]
                
                stats = AutomationStats(
                    fluxos_ativos=stats_data.get("fluxos_ativos", 0),
                    mensagens_enviadas_hoje=stats_data.get("mensagens_enviadas_hoje", 0),
                    taxa_media_abertura=stats_data.get("taxa_media_abertura", "0%")
                )
                
                logger.info(f"get_stats: Estatísticas obtidas - {stats.fluxos_ativos} fluxos ativos")
                return stats
            else:
                # Retornar estatísticas zeradas se não há dados
                logger.info("get_stats: Nenhuma estatística encontrada, retornando zeros")
                return AutomationStats(
                    fluxos_ativos=0,
                    mensagens_enviadas_hoje=0,
                    taxa_media_abertura="0%"
                )
                
        except Exception as e:
            logger.error(f"get_stats: Erro ao obter estatísticas: {e}")
            # Em caso de erro, retornar estatísticas zeradas
            return AutomationStats(
                fluxos_ativos=0,
                mensagens_enviadas_hoje=0,
                taxa_media_abertura="0%"
            )
    
    async def get_rules_for_frontend(self, user_id: str) -> AutomationRulesResponse:
        """
        Retorna regras no formato específico esperado pelo frontend
        
        Args:
            user_id: ID do usuário
            
        Returns:
            Resposta formatada para o frontend
        """
        logger.info(f"get_rules_for_frontend: Obtendo regras para frontend (usuário {user_id})")
        
        try:
            # Buscar regras do usuário
            rules = await self.get_rules(user_id, active_only=False)
            
            # Converter para formato do frontend
            frontend_rules = []
            for rule in rules:
                frontend_rule = convert_rule_to_frontend(rule)
                frontend_rules.append(frontend_rule)
            
            response = AutomationRulesResponse(rules=frontend_rules)
            logger.info(f"get_rules_for_frontend: {len(frontend_rules)} regras formatadas")
            
            return response
            
        except Exception as e:
            logger.error(f"get_rules_for_frontend: Erro ao formatar regras: {e}")
            raise AutomationServiceError(f"Erro ao obter regras para frontend: {e}")
    
    async def get_execution_logs(
        self,
        rule_id: Optional[str] = None,
        user_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[RuleExecutionLog]:
        """
        Busca logs de execução de regras
        
        Args:
            rule_id: ID da regra específica (opcional)
            user_id: ID do usuário (para filtrar regras do usuário)
            limit: Limite de resultados
            offset: Offset para paginação
            
        Returns:
            Lista de logs de execução
        """
        logger.info(f"get_execution_logs: Buscando logs (rule_id={rule_id}, user_id={user_id})")
        
        try:
            # Query com JOIN para pegar nome da regra
            query = self.client.table("rule_execution_logs").select("""
                id,
                rule_id,
                trigger_type,
                execution_status,
                actions_count,
                duration_ms,
                executed_at,
                error_message,
                automation_rules!inner(nome)
            """)
            
            # Filtros
            if rule_id:
                query = query.eq("rule_id", rule_id)
            
            # Filtro por usuário via JOIN (RLS cuida da segurança)
            if user_id:
                query = query.eq("automation_rules.created_by", user_id)
            
            # Paginação e ordenação
            query = query.range(offset, offset + limit - 1).order("executed_at", desc=True)
            
            response = query.execute()
            
            logs = []
            if response.data:
                for log_data in response.data:
                    log = RuleExecutionLog(
                        id=log_data["id"],
                        rule_id=log_data["rule_id"],
                        rule_name=log_data["automation_rules"]["nome"],
                        trigger_type=log_data["trigger_type"],
                        execution_status=log_data["execution_status"],
                        actions_count=log_data["actions_count"],
                        duration_ms=log_data["duration_ms"],
                        executed_at=log_data["executed_at"],
                        error_message=log_data.get("error_message")
                    )
                    logs.append(log)
            
            logger.info(f"get_execution_logs: {len(logs)} logs encontrados")
            return logs
            
        except Exception as e:
            logger.error(f"get_execution_logs: Erro ao buscar logs: {e}")
            raise AutomationServiceError(f"Erro ao buscar logs de execução: {e}")
    
    def _convert_db_to_model(self, db_data: Dict[str, Any]) -> AutomationRule:
        """
        Converte dados do banco para modelo Pydantic
        
        Args:
            db_data: Dados do banco de dados
            
        Returns:
            Modelo AutomationRule
        """
        try:
            # Converter campos JSONB de volta para objetos
            condicoes = []
            if db_data.get("condicoes"):
                from .schemas import RuleCondition
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
            logger.error(f"_convert_db_to_model: Erro ao converter dados: {e}")
            raise AutomationServiceError(f"Erro ao converter dados do banco: {e}")


# Singleton instance
_automation_service_instance: Optional[AutomationService] = None


def get_automation_service() -> AutomationService:
    """
    Obtém instância singleton do AutomationService
    
    Returns:
        Instância do AutomationService
    """
    global _automation_service_instance
    
    if _automation_service_instance is None:
        _automation_service_instance = AutomationService()
        logger.info("AutomationService singleton criado")
    
    return _automation_service_instance


# Função auxiliar para reset (útil para testes)
def reset_automation_service():
    """Reset da instância singleton (usado principalmente em testes)"""
    global _automation_service_instance
    _automation_service_instance = None
    logger.debug("AutomationService singleton resetado")