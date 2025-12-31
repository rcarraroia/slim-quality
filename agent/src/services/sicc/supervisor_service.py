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