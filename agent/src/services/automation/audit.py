"""
Sistema de Auditoria para Automações

Implementa trilha de auditoria completa, sanitização de dados e retenção.
"""

import structlog
import hashlib
from typing import Dict, Any, List, Optional, Union
from datetime import datetime, timedelta
from enum import Enum
import json

from ..supabase_client import get_supabase_client

logger = structlog.get_logger(__name__)


# ============================================
# TIPOS DE EVENTOS DE AUDITORIA
# ============================================

class AuditEventType(str, Enum):
    # Eventos de regras
    RULE_CREATED = "rule_created"
    RULE_UPDATED = "rule_updated"
    RULE_DELETED = "rule_deleted"
    RULE_STATUS_CHANGED = "rule_status_changed"
    
    # Eventos de execução
    RULE_EXECUTED = "rule_executed"
    ACTION_EXECUTED = "action_executed"
    EXECUTION_FAILED = "execution_failed"
    
    # Eventos de sistema
    SYSTEM_STARTED = "system_started"
    SYSTEM_STOPPED = "system_stopped"
    CACHE_CLEARED = "cache_cleared"
    
    # Eventos de segurança
    UNAUTHORIZED_ACCESS = "unauthorized_access"
    DATA_EXPORT = "data_export"
    CONFIGURATION_CHANGED = "configuration_changed"


class AuditLevel(str, Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    SECURITY = "security"


# ============================================
# MODELO DE EVENTO DE AUDITORIA
# ============================================

class AuditEvent:
    """Representa um evento de auditoria"""
    
    def __init__(
        self,
        event_type: AuditEventType,
        level: AuditLevel,
        user_id: Optional[str],
        resource_type: str,
        resource_id: Optional[str],
        description: str,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ):
        self.id = self._generate_id()
        self.event_type = event_type
        self.level = level
        self.user_id = user_id
        self.resource_type = resource_type
        self.resource_id = resource_id
        self.description = description
        self.details = self._sanitize_details(details or {})
        self.ip_address = ip_address
        self.user_agent = user_agent
        self.timestamp = datetime.now()
        self.checksum = self._calculate_checksum()
    
    def _generate_id(self) -> str:
        """Gera ID único para o evento"""
        timestamp = datetime.now().isoformat()
        return hashlib.sha256(f"{timestamp}_{id(self)}".encode()).hexdigest()[:16]
    
    def _sanitize_details(self, details: Dict[str, Any]) -> Dict[str, Any]:
        """Sanitiza dados sensíveis dos detalhes"""
        sanitized = {}
        
        for key, value in details.items():
            # Campos sensíveis que devem ser mascarados
            sensitive_fields = [
                'password', 'token', 'key', 'secret', 'credential',
                'api_key', 'access_token', 'refresh_token'
            ]
            
            if any(sensitive in key.lower() for sensitive in sensitive_fields):
                sanitized[key] = self._mask_sensitive_data(str(value))
            elif isinstance(value, dict):
                sanitized[key] = self._sanitize_details(value)
            elif isinstance(value, list):
                sanitized[key] = [
                    self._sanitize_details(item) if isinstance(item, dict) else item
                    for item in value
                ]
            else:
                sanitized[key] = value
        
        return sanitized
    
    def _mask_sensitive_data(self, value: str) -> str:
        """Mascara dados sensíveis"""
        if len(value) <= 4:
            return "***"
        return f"{value[:2]}***{value[-2:]}"
    
    def _calculate_checksum(self) -> str:
        """Calcula checksum para integridade do evento"""
        data = {
            "event_type": self.event_type,
            "user_id": self.user_id,
            "resource_type": self.resource_type,
            "resource_id": self.resource_id,
            "description": self.description,
            "timestamp": self.timestamp.isoformat()
        }
        
        data_str = json.dumps(data, sort_keys=True)
        return hashlib.sha256(data_str.encode()).hexdigest()
    
    def to_dict(self) -> Dict[str, Any]:
        """Converte evento para dicionário"""
        return {
            "id": self.id,
            "event_type": self.event_type,
            "level": self.level,
            "user_id": self.user_id,
            "resource_type": self.resource_type,
            "resource_id": self.resource_id,
            "description": self.description,
            "details": self.details,
            "ip_address": self.ip_address,
            "user_agent": self.user_agent,
            "timestamp": self.timestamp.isoformat(),
            "checksum": self.checksum
        }


# ============================================
# SERVIÇO DE AUDITORIA
# ============================================

class AuditService:
    """Serviço principal de auditoria"""
    
    def __init__(self):
        self.client = get_supabase_client()
        self._local_buffer: List[AuditEvent] = []
        self._buffer_size = 100
        logger.info("AuditService inicializado")
    
    async def log_event(
        self,
        event_type: AuditEventType,
        level: AuditLevel,
        user_id: Optional[str],
        resource_type: str,
        resource_id: Optional[str],
        description: str,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> AuditEvent:
        """Registra evento de auditoria"""
        
        event = AuditEvent(
            event_type=event_type,
            level=level,
            user_id=user_id,
            resource_type=resource_type,
            resource_id=resource_id,
            description=description,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        # Log estruturado
        logger.log(
            level.upper(),
            f"AUDIT: {description}",
            event_id=event.id,
            event_type=event_type,
            user_id=user_id,
            resource_type=resource_type,
            resource_id=resource_id
        )
        
        # Adicionar ao buffer local
        self._local_buffer.append(event)
        
        # Flush se buffer estiver cheio
        if len(self._local_buffer) >= self._buffer_size:
            await self._flush_buffer()
        
        # Tentar salvar no banco (não bloquear se falhar)
        try:
            await self._save_to_database(event)
        except Exception as e:
            logger.error(f"Erro ao salvar evento de auditoria no banco: {e}")
        
        return event
    
    async def _save_to_database(self, event: AuditEvent):
        """Salva evento no banco de dados"""
        try:
            # Inserir na tabela audit_events
            response = self.client.table("audit_events").insert(event.to_dict()).execute()
            
            if response.data:
                logger.debug(f"Evento de auditoria salvo: {event.id}")
            else:
                logger.warning(f"Falha ao salvar evento de auditoria: {event.id}")
                
        except Exception as e:
            logger.error(f"Erro ao inserir evento de auditoria: {e}")
            raise
    
    async def _flush_buffer(self):
        """Flush do buffer local para o banco"""
        if not self._local_buffer:
            return
        
        try:
            # Inserir todos os eventos do buffer
            events_data = [event.to_dict() for event in self._local_buffer]
            
            response = self.client.table("audit_events").insert(events_data).execute()
            
            if response.data:
                logger.info(f"Buffer de auditoria flushed: {len(self._local_buffer)} eventos")
                self._local_buffer.clear()
            else:
                logger.warning("Falha ao fazer flush do buffer de auditoria")
                
        except Exception as e:
            logger.error(f"Erro ao fazer flush do buffer: {e}")
    
    async def get_events(
        self,
        user_id: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        event_type: Optional[AuditEventType] = None,
        level: Optional[AuditLevel] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Busca eventos de auditoria com filtros"""
        
        try:
            query = self.client.table("audit_events").select("*")
            
            # Aplicar filtros
            if user_id:
                query = query.eq("user_id", user_id)
            
            if resource_type:
                query = query.eq("resource_type", resource_type)
            
            if resource_id:
                query = query.eq("resource_id", resource_id)
            
            if event_type:
                query = query.eq("event_type", event_type)
            
            if level:
                query = query.eq("level", level)
            
            if start_date:
                query = query.gte("timestamp", start_date.isoformat())
            
            if end_date:
                query = query.lte("timestamp", end_date.isoformat())
            
            # Paginação e ordenação
            query = query.order("timestamp", desc=True)
            query = query.range(offset, offset + limit - 1)
            
            response = query.execute()
            
            return response.data or []
            
        except Exception as e:
            logger.error(f"Erro ao buscar eventos de auditoria: {e}")
            return []
    
    async def get_audit_stats(
        self,
        user_id: Optional[str] = None,
        days: int = 30
    ) -> Dict[str, Any]:
        """Obtém estatísticas de auditoria"""
        
        try:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days)
            
            # Buscar eventos do período
            events = await self.get_events(
                user_id=user_id,
                start_date=start_date,
                end_date=end_date,
                limit=10000  # Limite alto para estatísticas
            )
            
            # Calcular estatísticas
            stats = {
                "total_events": len(events),
                "period_days": days,
                "events_by_type": {},
                "events_by_level": {},
                "events_by_day": {},
                "top_resources": {},
                "top_users": {}
            }
            
            # Agrupar por tipo
            for event in events:
                event_type = event.get("event_type", "unknown")
                stats["events_by_type"][event_type] = stats["events_by_type"].get(event_type, 0) + 1
                
                # Por nível
                level = event.get("level", "unknown")
                stats["events_by_level"][level] = stats["events_by_level"].get(level, 0) + 1
                
                # Por dia
                timestamp = event.get("timestamp", "")
                if timestamp:
                    day = timestamp[:10]  # YYYY-MM-DD
                    stats["events_by_day"][day] = stats["events_by_day"].get(day, 0) + 1
                
                # Por recurso
                resource = f"{event.get('resource_type', 'unknown')}:{event.get('resource_id', 'unknown')}"
                stats["top_resources"][resource] = stats["top_resources"].get(resource, 0) + 1
                
                # Por usuário
                user = event.get("user_id", "anonymous")
                stats["top_users"][user] = stats["top_users"].get(user, 0) + 1
            
            # Ordenar tops
            stats["top_resources"] = dict(sorted(
                stats["top_resources"].items(), 
                key=lambda x: x[1], 
                reverse=True
            )[:10])
            
            stats["top_users"] = dict(sorted(
                stats["top_users"].items(), 
                key=lambda x: x[1], 
                reverse=True
            )[:10])
            
            return stats
            
        except Exception as e:
            logger.error(f"Erro ao obter estatísticas de auditoria: {e}")
            return {"error": str(e)}
    
    async def cleanup_old_events(self, retention_days: int = 365):
        """Remove eventos antigos baseado na política de retenção"""
        
        try:
            cutoff_date = datetime.now() - timedelta(days=retention_days)
            
            # Deletar eventos antigos
            response = self.client.table("audit_events").delete().lt(
                "timestamp", cutoff_date.isoformat()
            ).execute()
            
            deleted_count = len(response.data) if response.data else 0
            
            logger.info(f"Limpeza de auditoria: {deleted_count} eventos removidos (> {retention_days} dias)")
            
            return deleted_count
            
        except Exception as e:
            logger.error(f"Erro na limpeza de eventos de auditoria: {e}")
            return 0
    
    async def verify_integrity(self, event_ids: List[str]) -> Dict[str, bool]:
        """Verifica integridade de eventos de auditoria"""
        
        results = {}
        
        try:
            # Buscar eventos
            response = self.client.table("audit_events").select("*").in_(
                "id", event_ids
            ).execute()
            
            events = response.data or []
            
            for event_data in events:
                event_id = event_data["id"]
                
                # Recalcular checksum
                data = {
                    "event_type": event_data["event_type"],
                    "user_id": event_data["user_id"],
                    "resource_type": event_data["resource_type"],
                    "resource_id": event_data["resource_id"],
                    "description": event_data["description"],
                    "timestamp": event_data["timestamp"]
                }
                
                data_str = json.dumps(data, sort_keys=True)
                calculated_checksum = hashlib.sha256(data_str.encode()).hexdigest()
                
                # Comparar com checksum armazenado
                stored_checksum = event_data.get("checksum", "")
                results[event_id] = calculated_checksum == stored_checksum
                
                if not results[event_id]:
                    logger.warning(f"Integridade comprometida no evento {event_id}")
            
            return results
            
        except Exception as e:
            logger.error(f"Erro ao verificar integridade: {e}")
            return {event_id: False for event_id in event_ids}


# ============================================
# DECORADORES DE AUDITORIA
# ============================================

def audit_operation(
    event_type: AuditEventType,
    resource_type: str,
    description: str,
    level: AuditLevel = AuditLevel.INFO
):
    """
    Decorator para auditar operações automaticamente
    
    Args:
        event_type: Tipo do evento de auditoria
        resource_type: Tipo do recurso sendo operado
        description: Descrição da operação
        level: Nível do evento
    """
    def decorator(func):
        async def wrapper(*args, **kwargs):
            audit_service = get_audit_service()
            
            # Tentar extrair user_id e resource_id dos argumentos
            user_id = kwargs.get('user_id') or (args[1] if len(args) > 1 else None)
            resource_id = kwargs.get('rule_id') or kwargs.get('id')
            
            try:
                result = await func(*args, **kwargs)
                
                # Log de sucesso
                await audit_service.log_event(
                    event_type=event_type,
                    level=level,
                    user_id=user_id,
                    resource_type=resource_type,
                    resource_id=resource_id,
                    description=f"{description} - SUCCESS",
                    details={"function": func.__name__, "success": True}
                )
                
                return result
                
            except Exception as e:
                # Log de erro
                await audit_service.log_event(
                    event_type=AuditEventType.EXECUTION_FAILED,
                    level=AuditLevel.ERROR,
                    user_id=user_id,
                    resource_type=resource_type,
                    resource_id=resource_id,
                    description=f"{description} - FAILED: {str(e)}",
                    details={"function": func.__name__, "error": str(e), "success": False}
                )
                
                raise
        
        return wrapper
    return decorator


# ============================================
# SINGLETON E FUNÇÕES HELPER
# ============================================

# Singleton instance
_audit_service: Optional[AuditService] = None


def get_audit_service() -> AuditService:
    """Obtém instância singleton do AuditService"""
    global _audit_service
    if _audit_service is None:
        _audit_service = AuditService()
    return _audit_service


# ============================================
# FUNÇÕES DE CONVENIÊNCIA
# ============================================

async def audit_rule_created(user_id: str, rule_id: str, rule_name: str):
    """Audita criação de regra"""
    audit_service = get_audit_service()
    await audit_service.log_event(
        event_type=AuditEventType.RULE_CREATED,
        level=AuditLevel.INFO,
        user_id=user_id,
        resource_type="automation_rule",
        resource_id=rule_id,
        description=f"Regra '{rule_name}' criada"
    )


async def audit_rule_executed(rule_id: str, execution_status: str, duration_ms: int):
    """Audita execução de regra"""
    audit_service = get_audit_service()
    await audit_service.log_event(
        event_type=AuditEventType.RULE_EXECUTED,
        level=AuditLevel.INFO if execution_status == "success" else AuditLevel.WARNING,
        user_id=None,
        resource_type="automation_rule",
        resource_id=rule_id,
        description=f"Regra executada - Status: {execution_status}",
        details={"execution_status": execution_status, "duration_ms": duration_ms}
    )