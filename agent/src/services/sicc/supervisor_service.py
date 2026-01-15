"""
Supervisor Service - SICC

Serviço responsável por validar e aprovar aprendizados automaticamente
baseado em thresholds de confiança e detecção de conflitos.
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)

class ApprovalStatus(Enum):
    """Status de aprovação de um aprendizado"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    NEEDS_REVIEW = "needs_review"

@dataclass
class ConflictDetail:
    """Detalhe de um conflito detectado"""
    type: str
    severity: float
    description: str
    existing_pattern_id: str
    overlap_score: float = 0.0

@dataclass
class ConflictAnalysis:
    """Resultado da análise de conflitos"""
    has_conflicts: bool
    conflict_details: List[ConflictDetail]
    severity_score: float
    recommendations: List[str]

class SupervisorService:
    """
    Serviço supervisor que valida e aprova aprendizados automaticamente.
    """
    
    def __init__(self):
        """Inicializa o serviço supervisor"""
        self.default_threshold = 0.7
        self.conflict_severity_threshold = 0.2
        logger.info("SupervisorService inicializado")
    
    async def auto_approve(self, confidence_score: float, threshold: float = None) -> bool:
        """
        Aprova automaticamente baseado em threshold
        
        Args:
            confidence_score: Score de confiança do aprendizado
            threshold: Threshold específico (usa padrão se None)
            
        Returns:
            bool: True se deve ser aprovado
            
        Raises:
            ValueError: Se parâmetros são inválidos
        """
        if threshold is None:
            threshold = self.default_threshold
        
        # Validar parâmetros
        if not 0.0 <= confidence_score <= 1.0:
            raise ValueError(f"Confidence score inválido: {confidence_score}")
        
        if not 0.0 <= threshold <= 1.0:
            raise ValueError(f"Threshold inválido: {threshold}")
        
        # Decisão simples baseada em threshold
        should_approve = confidence_score >= threshold
        
        logger.debug(f"Auto-aprovação: confidence={confidence_score:.3f}, threshold={threshold:.3f}, resultado={should_approve}")
        
        return should_approve
    
    async def validate_pattern_conflicts(
        self, 
        new_pattern: Dict[str, Any], 
        existing_patterns: List[Any]
    ) -> ConflictAnalysis:
        """
        Valida se novo padrão conflita com existentes
        
        Args:
            new_pattern: Dados do novo padrão
            existing_patterns: Lista de padrões existentes
            
        Returns:
            ConflictAnalysis: Análise detalhada de conflitos
        """
        if not new_pattern:
            return ConflictAnalysis(
                has_conflicts=False,
                conflict_details=[],
                severity_score=0.0,
                recommendations=[]
            )
        
        conflicts = []
        max_severity = 0.0
        
        # Simular detecção de conflitos básica
        for existing in existing_patterns:
            if not existing:
                continue
            
            # Verificar similaridade de trigger
            new_trigger = new_pattern.get("trigger", "")
            existing_trigger = getattr(existing, 'trigger', '') or existing.get("trigger", "")
            
            if new_trigger and existing_trigger:
                similarity = self._calculate_similarity(new_trigger, existing_trigger)
                
                if similarity > 0.7:
                    conflict = ConflictDetail(
                        type="trigger_similarity",
                        severity=similarity,
                        description=f"Trigger similar ao padrão existente",
                        existing_pattern_id=getattr(existing, 'id', 'unknown'),
                        overlap_score=similarity
                    )
                    conflicts.append(conflict)
                    max_severity = max(max_severity, similarity)
        
        recommendations = []
        if conflicts:
            recommendations.append("Revisar conflitos detectados")
            if max_severity > 0.8:
                recommendations.append("Conflitos críticos - revisão manual necessária")
        
        return ConflictAnalysis(
            has_conflicts=len(conflicts) > 0,
            conflict_details=conflicts,
            severity_score=max_severity,
            recommendations=recommendations
        )
    
    async def evaluate_learning(
        self,
        pattern_data: Dict[str, Any],
        confidence_threshold: float = 0.7
    ) -> Dict[str, Any]:
        """
        Avalia se um aprendizado deve ser aprovado automaticamente
        
        Args:
            pattern_data: Dados do padrão detectado
            confidence_threshold: Threshold mínimo para aprovação
            
        Returns:
            Dict com resultado da avaliação:
                - approved (bool): Se foi aprovado
                - reason (str): Motivo da decisão
                - confidence (float): Confiança do padrão
                - conflicts (list): Lista de conflitos detectados
        """
        try:
            confidence = pattern_data.get("confidence", 0.0)
            
            # 1. Verificar threshold de confiança
            meets_threshold = await self.auto_approve(confidence, confidence_threshold)
            
            if not meets_threshold:
                logger.info(f"Aprendizado rejeitado: confiança {confidence:.2f} < threshold {confidence_threshold}")
                return {
                    "approved": False,
                    "reason": f"Confiança {confidence:.2f} abaixo do threshold {confidence_threshold}",
                    "confidence": confidence,
                    "conflicts": []
                }
            
            # 2. Verificar conflitos com padrões existentes
            # TODO: Buscar padrões existentes do banco quando integrado
            existing_patterns = []
            
            conflict_analysis = await self.validate_pattern_conflicts(
                new_pattern=pattern_data,
                existing_patterns=existing_patterns
            )
            
            # 3. Decidir baseado em conflitos
            if conflict_analysis.has_conflicts and conflict_analysis.severity_score > 0.8:
                logger.warning(f"Aprendizado rejeitado: conflitos críticos (severity={conflict_analysis.severity_score:.2f})")
                return {
                    "approved": False,
                    "reason": "Conflitos críticos detectados",
                    "confidence": confidence,
                    "conflicts": [
                        {
                            "type": c.type,
                            "severity": c.severity,
                            "description": c.description
                        }
                        for c in conflict_analysis.conflict_details
                    ]
                }
            
            # 4. Aprovar
            logger.info(f"Aprendizado aprovado: confiança {confidence:.2f}, conflitos menores: {len(conflict_analysis.conflict_details)}")
            return {
                "approved": True,
                "reason": "Aprovado automaticamente",
                "confidence": confidence,
                "conflicts": [
                    {
                        "type": c.type,
                        "severity": c.severity,
                        "description": c.description
                    }
                    for c in conflict_analysis.conflict_details
                ] if conflict_analysis.has_conflicts else []
            }
            
        except Exception as e:
            logger.error(f"Erro ao avaliar aprendizado: {e}")
            return {
                "approved": False,
                "reason": f"Erro na avaliação: {str(e)}",
                "confidence": 0.0,
                "conflicts": []
            }
    
    def _calculate_similarity(self, text1: str, text2: str) -> float:
        """Calcula similaridade simples entre textos"""
        if not text1 or not text2:
            return 0.0
        
        words1 = set(text1.lower().split())
        words2 = set(text2.lower().split())
        
        if not words1 or not words2:
            return 0.0
        
        intersection = len(words1.intersection(words2))
        union = len(words1.union(words2))
        
        return intersection / union if union > 0 else 0.0

# Singleton instance
_supervisor_service: Optional[SupervisorService] = None

def get_supervisor_service() -> SupervisorService:
    """Retorna instância singleton do SupervisorService"""
    global _supervisor_service
    if _supervisor_service is None:
        _supervisor_service = SupervisorService()
    return _supervisor_service