"""
SICC - Sistema de Inteligência Corporativa Contínua

Módulo principal que expõe todos os serviços SICC de forma integrada.
"""

from .sicc_service import SICCService, SICCConfig, get_sicc_service, reset_sicc_service
from .memory_service import MemoryService, get_memory_service
from .learning_service import LearningService, get_learning_service
from .behavior_service import BehaviorService, get_behavior_service
from .supervisor_service import SupervisorService, get_supervisor_service
from .metrics_service import MetricsService, MetricType, get_metrics_service
from .async_processor_service import AsyncProcessorService, get_async_processor_service

# Versão do módulo SICC
__version__ = "1.0.0"

# Exportar classes principais
__all__ = [
    # Serviço principal
    "SICCService",
    "SICCConfig", 
    "get_sicc_service",
    "reset_sicc_service",
    
    # Serviços componentes
    "MemoryService",
    "LearningService", 
    "BehaviorService",
    "SupervisorService",
    "MetricsService",
    "AsyncProcessorService",
    
    # Funções de acesso singleton
    "get_memory_service",
    "get_learning_service",
    "get_behavior_service", 
    "get_supervisor_service",
    "get_metrics_service",
    "get_async_processor_service",
    
    # Enums e tipos
    "MetricType",
    
    # Versão
    "__version__"
]


def initialize_sicc_system(config: SICCConfig = None) -> SICCService:
    """
    Inicializa o sistema SICC completo
    
    Args:
        config: Configuração personalizada (opcional)
        
    Returns:
        Instância do SICCService inicializada
        
    Example:
        >>> from agent.src.services.sicc import initialize_sicc_system
        >>> sicc = initialize_sicc_system()
        >>> await sicc.initialize()
    """
    return get_sicc_service(config)


async def quick_start_sicc(config: SICCConfig = None) -> SICCService:
    """
    Inicialização rápida do sistema SICC (inicializa automaticamente)
    
    Args:
        config: Configuração personalizada (opcional)
        
    Returns:
        Instância do SICCService já inicializada
        
    Example:
        >>> from agent.src.services.sicc import quick_start_sicc
        >>> sicc = await quick_start_sicc()
        >>> # Sistema já está pronto para uso
    """
    sicc = get_sicc_service(config)
    await sicc.initialize()
    return sicc