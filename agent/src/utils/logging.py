"""
Configuração de logging estruturado para produção
"""
import json
import logging
import structlog
import sys
from datetime import datetime, timezone
from typing import Any, Dict
from pathlib import Path

from ..config import get_settings


def sanitize_sensitive_data(data: Any) -> Any:
    """
    Remove dados sensíveis dos logs.
    
    Args:
        data: Dados a serem sanitizados
        
    Returns:
        Dados sanitizados
    """
    if isinstance(data, dict):
        sanitized = {}
        sensitive_keys = {
            'password', 'token', 'key', 'secret', 'api_key', 
            'claude_api_key', 'supabase_service_key', 'webhook_secret'
        }
        
        for key, value in data.items():
            key_lower = key.lower()
            if any(sensitive in key_lower for sensitive in sensitive_keys):
                sanitized[key] = "***REDACTED***"
            else:
                sanitized[key] = sanitize_sensitive_data(value)
        return sanitized
    elif isinstance(data, list):
        return [sanitize_sensitive_data(item) for item in data]
    elif isinstance(data, str):
        # Sanitizar possíveis tokens em strings
        if len(data) > 20 and any(prefix in data for prefix in ['sk-', 'eyJ', 'Bearer ']):
            return "***REDACTED***"
        return data
    else:
        return data


def add_request_id(logger, method_name, event_dict):
    """
    Adiciona request_id único aos logs.
    """
    import uuid
    
    # Gerar request_id único se não existir
    if 'request_id' not in event_dict:
        event_dict['request_id'] = str(uuid.uuid4())[:8]
    
    return event_dict


def add_timestamp(logger, method_name, event_dict):
    """
    Adiciona timestamp ISO 8601 aos logs.
    """
    event_dict['timestamp'] = datetime.now(timezone.utc).isoformat()
    return event_dict


def add_service_info(logger, method_name, event_dict):
    """
    Adiciona informações do serviço aos logs.
    """
    event_dict['service'] = 'slim-agent'
    event_dict['version'] = '1.0.0'
    
    settings = get_settings()
    event_dict['environment'] = settings.environment
    
    return event_dict


def sanitize_event_dict(logger, method_name, event_dict):
    """
    Sanitiza dados sensíveis do event_dict.
    """
    return sanitize_sensitive_data(event_dict)


class JSONFormatter(logging.Formatter):
    """
    Formatter para logs em JSON estruturado.
    """
    
    def format(self, record):
        """
        Formata log record como JSON.
        """
        log_data = {
            'timestamp': datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'service': 'slim-agent',
            'version': '1.0.0'
        }
        
        # Adicionar informações extras se disponíveis
        if hasattr(record, 'request_id'):
            log_data['request_id'] = record.request_id
            
        if hasattr(record, 'user_id'):
            log_data['user_id'] = record.user_id
            
        if hasattr(record, 'extra_data'):
            log_data.update(record.extra_data)
            
        # Adicionar exception info se presente
        if record.exc_info:
            log_data['exception'] = self.formatException(record.exc_info)
            
        # Sanitizar dados sensíveis
        log_data = sanitize_sensitive_data(log_data)
        
        return json.dumps(log_data, ensure_ascii=False)


def setup_logging():
    """
    Configura logging estruturado para produção.
    """
    settings = get_settings()
    
    # Configurar structlog
    structlog.configure(
        processors=[
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            add_timestamp,
            add_request_id,
            add_service_info,
            sanitize_event_dict,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )
    
    # Configurar handler para stdout
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JSONFormatter())
    
    # Configurar root logger
    root_logger = logging.getLogger()
    root_logger.handlers.clear()
    root_logger.addHandler(handler)
    
    # Definir nível de log baseado no ambiente
    if settings.environment == 'production':
        log_level = logging.INFO
    elif settings.environment == 'development':
        log_level = logging.DEBUG
    else:
        log_level = logging.WARNING
        
    root_logger.setLevel(log_level)
    
    # Configurar loggers específicos
    logging.getLogger('uvicorn').setLevel(logging.INFO)
    logging.getLogger('uvicorn.access').setLevel(logging.INFO)
    logging.getLogger('fastapi').setLevel(logging.INFO)
    
    # Reduzir verbosidade de bibliotecas externas
    logging.getLogger('httpx').setLevel(logging.WARNING)
    logging.getLogger('httpcore').setLevel(logging.WARNING)
    logging.getLogger('urllib3').setLevel(logging.WARNING)
    
    return structlog.get_logger()


def get_logger(name: str = None):
    """
    Obtém logger estruturado.
    
    Args:
        name: Nome do logger (opcional)
        
    Returns:
        Logger estruturado
    """
    return structlog.get_logger(name)


class LogContext:
    """
    Context manager para adicionar contexto aos logs.
    """
    
    def __init__(self, **context):
        self.context = context
        self.logger = structlog.get_logger()
        
    def __enter__(self):
        self.logger = self.logger.bind(**self.context)
        return self.logger
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        pass


def log_request_start(request_id: str, method: str, path: str, user_id: str = None):
    """
    Log de início de request.
    """
    logger = get_logger("request")
    
    context = {
        'request_id': request_id,
        'method': method,
        'path': path,
        'event': 'request_start'
    }
    
    if user_id:
        context['user_id'] = user_id
        
    logger.info("Request started", **context)


def log_request_end(request_id: str, status_code: int, duration_ms: int):
    """
    Log de fim de request.
    """
    logger = get_logger("request")
    
    logger.info(
        "Request completed",
        request_id=request_id,
        status_code=status_code,
        duration_ms=duration_ms,
        event='request_end'
    )


def log_error(error: Exception, context: Dict[str, Any] = None):
    """
    Log estruturado de erro.
    """
    logger = get_logger("error")
    
    error_context = {
        'error_type': type(error).__name__,
        'error_message': str(error),
        'event': 'error'
    }
    
    if context:
        error_context.update(context)
        
    logger.error("Error occurred", **error_context, exc_info=True)


def log_performance(operation: str, duration_ms: int, context: Dict[str, Any] = None):
    """
    Log de performance.
    """
    logger = get_logger("performance")
    
    perf_context = {
        'operation': operation,
        'duration_ms': duration_ms,
        'event': 'performance'
    }
    
    if context:
        perf_context.update(context)
        
    # Log como warning se operação demorou muito
    if duration_ms > 5000:  # 5 segundos
        logger.warning("Slow operation detected", **perf_context)
    else:
        logger.info("Operation completed", **perf_context)


def log_webhook_received(webhook_type: str, source: str, request_id: str):
    """
    Log de webhook recebido.
    """
    logger = get_logger("webhook")
    
    logger.info(
        "Webhook received",
        webhook_type=webhook_type,
        source=source,
        request_id=request_id,
        event='webhook_received'
    )


def log_webhook_processed(webhook_type: str, success: bool, duration_ms: int, request_id: str):
    """
    Log de webhook processado.
    """
    logger = get_logger("webhook")
    
    if success:
        logger.info(
            "Webhook processed successfully",
            webhook_type=webhook_type,
            duration_ms=duration_ms,
            request_id=request_id,
            event='webhook_processed'
        )
    else:
        logger.error(
            "Webhook processing failed",
            webhook_type=webhook_type,
            duration_ms=duration_ms,
            request_id=request_id,
            event='webhook_failed'
        )


# Configurar logging na importação
setup_logging()