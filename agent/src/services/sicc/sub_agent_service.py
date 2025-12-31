"""
Sub-Agent Service - Sistema de sub-agentes especializados para SICC

Gerencia sub-agentes especializados (discovery, sales, support) com:
- Configuração de thresholds específicos por domínio
- Associação de padrões aprendidos a sub-agentes apropriados
- Especialização de comportamento baseada no contexto
"""

import structlog
from typing import Dict, List, Optional, Any, Set
from dataclasses import dataclass, field
from enum import Enum
import json

logger = structlog.get_logger(__name__)


class SubAgentType(Enum):
    """Tipos de sub-agentes especializados"""
    DISCOVERY = "discovery"
    SALES = "sales"
    SUPPORT = "support"


@dataclass
class SubAgentConfig:
    """Configuração de um sub-agente especializado"""
    agent_type: SubAgentType
    name: str
    description: str
    confidence_threshold: float
    pattern_categories: Set[str]
    priority: int
    active: bool = True
    
    def to_dict(self) -> Dict[str, Any]:
        """Converte configuração para dicionário"""
        return {
            "agent_type": self.agent_type.value,
            "name": self.name,
            "description": self.description,
            "confidence_threshold": self.confidence_threshold,
            "pattern_categories": list(self.pattern_categories),
            "priority": self.priority,
            "active": self.active
        }


@dataclass
class PatternAssignment:
    """Associação de padrão a sub-agente"""
    pattern_id: str
    pattern_type: str
    assigned_agent: SubAgentType
    confidence_score: float
    assignment_reason: str
    created_at: str


class SubAgentService:
    """
    Serviço para gerenciar sub-agentes especializados
    
    Funcionalidades:
    - Configurar sub-agentes com thresholds específicos
    - Associar padrões aprendidos aos sub-agentes apropriados
    - Especializar comportamento baseado no contexto
    - Gerenciar prioridades entre sub-agentes
    """
    
    def __init__(self):
        """Inicializa o serviço com configurações padrão"""
        self.sub_agents: Dict[SubAgentType, SubAgentConfig] = {}
        self.pattern_assignments: Dict[str, PatternAssignment] = {}
        self._initialize_default_agents()
        
        logger.info("SubAgentService inicializado com configurações padrão")
    
    def _initialize_default_agents(self):
        """Inicializa sub-agentes com configurações padrão"""
        # Discovery Agent - Foco em qualificação e descoberta de necessidades
        discovery_config = SubAgentConfig(
            agent_type=SubAgentType.DISCOVERY,
            name="Discovery Agent",
            description="Especializado em qualificação de leads e descoberta de necessidades",
            confidence_threshold=0.65,  # Threshold mais baixo para capturar mais interações
            pattern_categories={"greeting", "qualification", "needs_discovery", "questions"},
            priority=1  # Alta prioridade para primeiras interações
        )
        
        # Sales Agent - Foco em conversão e fechamento
        sales_config = SubAgentConfig(
            agent_type=SubAgentType.SALES,
            name="Sales Agent", 
            description="Especializado em apresentação de produtos e fechamento de vendas",
            confidence_threshold=0.75,  # Threshold mais alto para precisão em vendas
            pattern_categories={"product_presentation", "objection_handling", "closing", "pricing"},
            priority=2  # Prioridade média
        )
        
        # Support Agent - Foco em suporte e pós-venda
        support_config = SubAgentConfig(
            agent_type=SubAgentType.SUPPORT,
            name="Support Agent",
            description="Especializado em suporte técnico e atendimento pós-venda",
            confidence_threshold=0.70,  # Threshold médio para suporte
            pattern_categories={"support", "technical_help", "post_sale", "complaints"},
            priority=3  # Menor prioridade
        )
        
        self.sub_agents[SubAgentType.DISCOVERY] = discovery_config
        self.sub_agents[SubAgentType.SALES] = sales_config
        self.sub_agents[SubAgentType.SUPPORT] = support_config
        
        logger.info(f"Inicializados {len(self.sub_agents)} sub-agentes padrão")
    
    async def configure_sub_agent(
        self,
        agent_type: SubAgentType,
        config: SubAgentConfig
    ) -> bool:
        """
        Configura ou atualiza um sub-agente
        
        Args:
            agent_type: Tipo do sub-agente
            config: Nova configuração
            
        Returns:
            True se configuração foi aplicada com sucesso
        """
        try:
            # Validar configuração
            if config.confidence_threshold < 0.0 or config.confidence_threshold > 1.0:
                logger.error(f"Threshold inválido para {agent_type.value}: {config.confidence_threshold}")
                return False
            
            if config.priority < 1:
                logger.error(f"Prioridade inválida para {agent_type.value}: {config.priority}")
                return False
            
            # Aplicar configuração
            self.sub_agents[agent_type] = config
            
            logger.info(f"Sub-agente {agent_type.value} configurado com threshold {config.confidence_threshold}")
            return True
            
        except Exception as e:
            logger.error(f"Erro ao configurar sub-agente {agent_type.value}: {e}")
            return False
    
    async def get_specialized_patterns(
        self,
        agent_type: SubAgentType,
        min_confidence: Optional[float] = None
    ) -> List[PatternAssignment]:
        """
        Obtém padrões especializados para um sub-agente
        
        Args:
            agent_type: Tipo do sub-agente
            min_confidence: Confiança mínima (usa threshold do agente se None)
            
        Returns:
            Lista de padrões associados ao sub-agente
        """
        try:
            if agent_type not in self.sub_agents:
                logger.warning(f"Sub-agente {agent_type.value} não configurado")
                return []
            
            agent_config = self.sub_agents[agent_type]
            threshold = min_confidence or agent_config.confidence_threshold
            
            # Filtrar padrões por agente e confiança
            specialized_patterns = []
            for pattern_id, assignment in self.pattern_assignments.items():
                if (assignment.assigned_agent == agent_type and 
                    assignment.confidence_score >= threshold):
                    specialized_patterns.append(assignment)
            
            # Ordenar por confiança (maior primeiro)
            specialized_patterns.sort(key=lambda x: x.confidence_score, reverse=True)
            
            logger.debug(f"Encontrados {len(specialized_patterns)} padrões para {agent_type.value}")
            return specialized_patterns
            
        except Exception as e:
            logger.error(f"Erro ao obter padrões especializados para {agent_type.value}: {e}")
            return []
    
    async def assign_pattern_to_agent(
        self,
        pattern_id: str,
        pattern_type: str,
        confidence_score: float,
        context: Optional[Dict[str, Any]] = None
    ) -> Optional[SubAgentType]:
        """
        Associa um padrão ao sub-agente mais apropriado
        
        Args:
            pattern_id: ID único do padrão
            pattern_type: Tipo/categoria do padrão
            confidence_score: Score de confiança do padrão
            context: Contexto adicional para decisão
            
        Returns:
            Tipo do sub-agente escolhido ou None se não houver match
        """
        try:
            best_agent = None
            best_score = 0.0
            assignment_reason = "no_match"
            
            # Avaliar cada sub-agente ativo
            for agent_type, config in self.sub_agents.items():
                if not config.active:
                    continue
                
                # Verificar se padrão atende threshold mínimo
                if confidence_score < config.confidence_threshold:
                    continue
                
                # Calcular score de compatibilidade
                compatibility_score = self._calculate_compatibility_score(
                    pattern_type, config, context
                )
                
                # Considerar prioridade do agente (menor número = maior prioridade)
                priority_bonus = 1.0 / config.priority
                final_score = compatibility_score + priority_bonus
                
                if final_score > best_score:
                    best_score = final_score
                    best_agent = agent_type
                    assignment_reason = f"compatibility_{compatibility_score:.3f}_priority_{config.priority}"
            
            # Criar assignment se encontrou agente apropriado
            if best_agent:
                assignment = PatternAssignment(
                    pattern_id=pattern_id,
                    pattern_type=pattern_type,
                    assigned_agent=best_agent,
                    confidence_score=confidence_score,
                    assignment_reason=assignment_reason,
                    created_at="now"  # Em implementação real usaria datetime
                )
                
                self.pattern_assignments[pattern_id] = assignment
                
                logger.info(f"Padrão {pattern_id} ({pattern_type}) associado a {best_agent.value} (score: {best_score:.3f})")
                return best_agent
            
            logger.debug(f"Nenhum sub-agente apropriado para padrão {pattern_id} ({pattern_type})")
            return None
            
        except Exception as e:
            logger.error(f"Erro ao associar padrão {pattern_id}: {e}")
            return None
    
    def _calculate_compatibility_score(
        self,
        pattern_type: str,
        agent_config: SubAgentConfig,
        context: Optional[Dict[str, Any]] = None
    ) -> float:
        """
        Calcula score de compatibilidade entre padrão e sub-agente
        
        Args:
            pattern_type: Tipo do padrão
            agent_config: Configuração do sub-agente
            context: Contexto adicional
            
        Returns:
            Score de compatibilidade (0.0 a 1.0)
        """
        base_score = 0.0
        
        # Score baseado em categorias do agente
        if pattern_type in agent_config.pattern_categories:
            base_score += 0.8  # Match direto de categoria
        
        # Score baseado em similaridade de palavras-chave
        pattern_keywords = set(pattern_type.lower().split('_'))
        agent_keywords = set()
        for category in agent_config.pattern_categories:
            agent_keywords.update(category.lower().split('_'))
        
        keyword_overlap = len(pattern_keywords.intersection(agent_keywords))
        if keyword_overlap > 0:
            base_score += 0.2 * (keyword_overlap / len(pattern_keywords))
        
        # Bonus baseado em contexto (se disponível)
        if context:
            intent = context.get("current_intent", "")
            if intent and intent.lower() == agent_config.agent_type.value:
                base_score += 0.3
        
        return min(base_score, 1.0)  # Limitar a 1.0
    
    async def get_agent_statistics(self) -> Dict[str, Any]:
        """
        Obtém estatísticas dos sub-agentes
        
        Returns:
            Dicionário com estatísticas de cada sub-agente
        """
        try:
            stats = {}
            
            for agent_type, config in self.sub_agents.items():
                # Contar padrões associados
                assigned_patterns = [
                    a for a in self.pattern_assignments.values()
                    if a.assigned_agent == agent_type
                ]
                
                # Calcular confiança média
                avg_confidence = 0.0
                if assigned_patterns:
                    avg_confidence = sum(p.confidence_score for p in assigned_patterns) / len(assigned_patterns)
                
                stats[agent_type.value] = {
                    "name": config.name,
                    "active": config.active,
                    "threshold": config.confidence_threshold,
                    "priority": config.priority,
                    "assigned_patterns": len(assigned_patterns),
                    "avg_confidence": round(avg_confidence, 3),
                    "categories": list(config.pattern_categories)
                }
            
            return {
                "total_agents": len(self.sub_agents),
                "active_agents": len([c for c in self.sub_agents.values() if c.active]),
                "total_assignments": len(self.pattern_assignments),
                "agents": stats
            }
            
        except Exception as e:
            logger.error(f"Erro ao obter estatísticas: {e}")
            return {"error": str(e)}
    
    async def export_configuration(self) -> Dict[str, Any]:
        """
        Exporta configuração atual dos sub-agentes
        
        Returns:
            Configuração em formato JSON serializável
        """
        try:
            config_export = {
                "sub_agents": {
                    agent_type.value: config.to_dict()
                    for agent_type, config in self.sub_agents.items()
                },
                "pattern_assignments": {
                    pattern_id: {
                        "pattern_type": assignment.pattern_type,
                        "assigned_agent": assignment.assigned_agent.value,
                        "confidence_score": assignment.confidence_score,
                        "assignment_reason": assignment.assignment_reason,
                        "created_at": assignment.created_at
                    }
                    for pattern_id, assignment in self.pattern_assignments.items()
                }
            }
            
            logger.info("Configuração de sub-agentes exportada")
            return config_export
            
        except Exception as e:
            logger.error(f"Erro ao exportar configuração: {e}")
            return {"error": str(e)}


# Singleton instance
_sub_agent_service_instance: Optional[SubAgentService] = None


def get_sub_agent_service() -> SubAgentService:
    """
    Obtém instância singleton do SubAgentService
    
    Returns:
        Instância do SubAgentService
    """
    global _sub_agent_service_instance
    
    if _sub_agent_service_instance is None:
        _sub_agent_service_instance = SubAgentService()
        logger.info("SubAgentService singleton criado")
    
    return _sub_agent_service_instance


# Função auxiliar para reset (útil para testes)
def reset_sub_agent_service():
    """Reset da instância singleton (usado principalmente em testes)"""
    global _sub_agent_service_instance
    _sub_agent_service_instance = None
    logger.debug("SubAgentService singleton resetado")