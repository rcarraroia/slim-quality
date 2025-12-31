"""
Configuração centralizada do sistema SICC

Este módulo centraliza todas as configurações do Sistema de Inteligência 
Corporativa Contínua, permitindo fácil customização por ambiente.
"""

import os
from typing import Dict, Any, Optional
from dataclasses import dataclass, field
from agent.src.services.sicc.sicc_service import SICCConfig


@dataclass
class DatabaseConfig:
    """Configurações de banco de dados"""
    host: str = os.getenv("DB_HOST", "localhost")
    port: int = int(os.getenv("DB_PORT", "5432"))
    database: str = os.getenv("DB_NAME", "sicc_db")
    username: str = os.getenv("DB_USER", "postgres")
    password: str = os.getenv("DB_PASSWORD", "")
    
    # Configurações específicas do pgvector
    vector_dimensions: int = 384  # Para sentence-transformers/all-MiniLM-L6-v2
    max_connections: int = 20
    connection_timeout: int = 30


@dataclass
class EmbeddingConfig:
    """Configurações de embeddings"""
    model_name: str = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
    cache_dir: str = os.getenv("EMBEDDING_CACHE_DIR", "./models")
    batch_size: int = int(os.getenv("EMBEDDING_BATCH_SIZE", "32"))
    max_sequence_length: int = int(os.getenv("EMBEDDING_MAX_LENGTH", "512"))
    
    # Configurações de performance
    use_gpu: bool = os.getenv("EMBEDDING_USE_GPU", "false").lower() == "true"
    normalize_embeddings: bool = True


@dataclass
class LearningConfig:
    """Configurações de aprendizado"""
    # Thresholds de confiança por sub-agente
    confidence_thresholds: Dict[str, float] = field(default_factory=lambda: {
        "general": 0.7,
        "discovery": 0.75,
        "sales": 0.8,
        "support": 0.65
    })
    
    # Configurações de detecção de padrões
    min_pattern_occurrences: int = int(os.getenv("MIN_PATTERN_OCCURRENCES", "3"))
    similarity_threshold: float = float(os.getenv("SIMILARITY_THRESHOLD", "0.85"))
    max_patterns_per_category: int = int(os.getenv("MAX_PATTERNS_PER_CATEGORY", "50"))
    
    # Configurações de aprovação automática
    auto_approval_enabled: bool = os.getenv("AUTO_APPROVAL_ENABLED", "true").lower() == "true"
    require_human_approval_above: float = float(os.getenv("HUMAN_APPROVAL_THRESHOLD", "0.95"))


@dataclass
class PerformanceConfig:
    """Configurações de performance"""
    # Processamento assíncrono
    async_processing_enabled: bool = os.getenv("ASYNC_PROCESSING", "true").lower() == "true"
    max_concurrent_embeddings: int = int(os.getenv("MAX_CONCURRENT_EMBEDDINGS", "5"))
    queue_max_size: int = int(os.getenv("QUEUE_MAX_SIZE", "1000"))
    
    # Cache e memória
    memory_cache_size: int = int(os.getenv("MEMORY_CACHE_SIZE", "10000"))
    pattern_cache_ttl_hours: int = int(os.getenv("PATTERN_CACHE_TTL", "24"))
    
    # Limpeza automática
    auto_cleanup_enabled: bool = os.getenv("AUTO_CLEANUP", "true").lower() == "true"
    cleanup_interval_hours: int = int(os.getenv("CLEANUP_INTERVAL", "24"))
    max_memory_age_days: int = int(os.getenv("MAX_MEMORY_AGE", "90"))


@dataclass
class MonitoringConfig:
    """Configurações de monitoramento"""
    # Métricas
    metrics_enabled: bool = os.getenv("METRICS_ENABLED", "true").lower() == "true"
    metrics_retention_days: int = int(os.getenv("METRICS_RETENTION", "30"))
    
    # Alertas
    alerts_enabled: bool = os.getenv("ALERTS_ENABLED", "true").lower() == "true"
    alert_email: Optional[str] = os.getenv("ALERT_EMAIL")
    
    # Performance thresholds
    max_response_time_seconds: float = float(os.getenv("MAX_RESPONSE_TIME", "2.0"))
    min_success_rate: float = float(os.getenv("MIN_SUCCESS_RATE", "0.85"))
    max_error_rate: float = float(os.getenv("MAX_ERROR_RATE", "0.05"))


@dataclass
class CompleteSICCConfig:
    """Configuração completa do sistema SICC"""
    database: DatabaseConfig = field(default_factory=DatabaseConfig)
    embedding: EmbeddingConfig = field(default_factory=EmbeddingConfig)
    learning: LearningConfig = field(default_factory=LearningConfig)
    performance: PerformanceConfig = field(default_factory=PerformanceConfig)
    monitoring: MonitoringConfig = field(default_factory=MonitoringConfig)
    
    # Configurações gerais
    environment: str = os.getenv("ENVIRONMENT", "development")
    debug_mode: bool = os.getenv("DEBUG", "false").lower() == "true"
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    
    def to_sicc_config(self) -> SICCConfig:
        """
        Converte para SICCConfig usado pelo serviço principal
        
        Returns:
            Instância de SICCConfig
        """
        return SICCConfig(
            # Configurações de aprendizado
            min_pattern_confidence=self.learning.confidence_thresholds.get("general", 0.7),
            max_memories_per_conversation=50,
            embedding_model=self.embedding.model_name,
            
            # Configurações de performance
            async_processing_enabled=self.performance.async_processing_enabled,
            max_concurrent_embeddings=self.performance.max_concurrent_embeddings,
            memory_cleanup_interval_hours=self.performance.cleanup_interval_hours,
            
            # Configurações de sub-agentes
            sub_agents_enabled=True,
            default_sub_agent="general",
            
            # Configurações de métricas
            metrics_collection_enabled=self.monitoring.metrics_enabled,
            performance_monitoring_enabled=self.monitoring.alerts_enabled
        )
    
    def get_database_url(self) -> str:
        """
        Constrói URL de conexão com o banco de dados
        
        Returns:
            URL de conexão PostgreSQL
        """
        return (
            f"postgresql://{self.database.username}:{self.database.password}"
            f"@{self.database.host}:{self.database.port}/{self.database.database}"
        )
    
    def validate_config(self) -> Dict[str, Any]:
        """
        Valida a configuração e retorna problemas encontrados
        
        Returns:
            Dicionário com problemas de validação
        """
        issues = []
        warnings = []
        
        # Validar configurações críticas
        if not self.database.password and self.environment == "production":
            issues.append("Senha do banco de dados não configurada em produção")
        
        if self.embedding.model_name.startswith("sentence-transformers/") and not os.path.exists(self.embedding.cache_dir):
            warnings.append(f"Diretório de cache de embeddings não existe: {self.embedding.cache_dir}")
        
        if self.performance.max_concurrent_embeddings > 10:
            warnings.append("Muitos embeddings concorrentes podem impactar performance")
        
        if self.learning.min_pattern_occurrences < 2:
            warnings.append("Mínimo de ocorrências de padrão muito baixo pode gerar ruído")
        
        # Validar thresholds
        for agent, threshold in self.learning.confidence_thresholds.items():
            if threshold < 0.5 or threshold > 1.0:
                issues.append(f"Threshold de confiança inválido para {agent}: {threshold}")
        
        return {
            "valid": len(issues) == 0,
            "issues": issues,
            "warnings": warnings
        }


def load_config_from_env() -> CompleteSICCConfig:
    """
    Carrega configuração completa das variáveis de ambiente
    
    Returns:
        Configuração completa do SICC
    """
    return CompleteSICCConfig()


def get_config_for_environment(env: str = None) -> CompleteSICCConfig:
    """
    Obtém configuração otimizada para um ambiente específico
    
    Args:
        env: Ambiente ("development", "testing", "production")
        
    Returns:
        Configuração otimizada para o ambiente
    """
    config = load_config_from_env()
    
    if env:
        config.environment = env
    
    # Ajustes por ambiente
    if config.environment == "testing":
        # Configurações para testes
        config.performance.async_processing_enabled = False
        config.monitoring.metrics_enabled = False
        config.learning.auto_approval_enabled = True
        config.database.max_connections = 5
        
    elif config.environment == "production":
        # Configurações para produção
        config.debug_mode = False
        config.log_level = "WARNING"
        config.performance.max_concurrent_embeddings = 10
        config.monitoring.alerts_enabled = True
        
    elif config.environment == "development":
        # Configurações para desenvolvimento
        config.debug_mode = True
        config.log_level = "DEBUG"
        config.learning.min_pattern_occurrences = 2  # Mais sensível para testes
    
    return config


# Instância global de configuração
_global_config: Optional[CompleteSICCConfig] = None


def get_global_config() -> CompleteSICCConfig:
    """
    Obtém configuração global singleton
    
    Returns:
        Configuração global do SICC
    """
    global _global_config
    
    if _global_config is None:
        _global_config = load_config_from_env()
    
    return _global_config


def set_global_config(config: CompleteSICCConfig):
    """
    Define configuração global
    
    Args:
        config: Nova configuração global
    """
    global _global_config
    _global_config = config