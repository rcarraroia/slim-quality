"""
Supervisor Approve Node - Validação automática de aprendizados via Supervisor Service
"""
import structlog
from typing import List, Dict, Any, Optional

from ..state import AgentState
from ...services.sicc.supervisor_service import get_supervisor_service

logger = structlog.get_logger(__name__)


async def supervisor_approve_node(state: AgentState) -> AgentState:
    """
    Valida e aprova/rejeita aprendizados automaticamente usando Supervisor Service.
    
    Utiliza o Supervisor Service para:
    1. Avaliar aprendizados baseado em thresholds de confiança
    2. Validar conflitos entre padrões novos e existentes
    3. Aprovar automaticamente aprendizados que atendem critérios
    4. Registrar decisões de aprovação para auditoria
    
    Args:
        state: Estado atual da conversação
        
    Returns:
        Estado atualizado com decisões de aprovação em state["context"]["sicc_supervision"]
    """
    logger.info("supervisor_approve_node: Iniciando validação de aprendizados")
    
    try:
        # Obter Supervisor Service
        supervisor_service = get_supervisor_service()
        
        # Verificar se há dados de aprendizado para validar
        learning_context = state.get("context", {}).get("sicc_learning", {})
        
        if not learning_context.get("analysis_performed", False):
            logger.info("supervisor_approve_node: Nenhuma análise de aprendizado para validar")
            return _add_supervision_context(state, {
                "validation_performed": False,
                "reason": "no_learning_analysis",
                "approvals": [],
                "rejections": [],
                "total_evaluated": 0
            })
        
        # Obter padrões detectados para validação
        patterns_summary = learning_context.get("patterns_summary", [])
        
        if not patterns_summary:
            logger.info("supervisor_approve_node: Nenhum padrão para validar")
            return _add_supervision_context(state, {
                "validation_performed": True,
                "reason": "no_patterns_detected",
                "approvals": [],
                "rejections": [],
                "total_evaluated": 0
            })
        
        logger.info(f"supervisor_approve_node: Validando {len(patterns_summary)} padrões detectados")
        
        # Processar cada padrão detectado
        approvals = []
        rejections = []
        
        for i, pattern_summary in enumerate(patterns_summary):
            pattern_id = f"pattern_{i}_{state.get('lead_id', 'unknown')}"
            confidence_score = pattern_summary.get("confidence", 0.0)
            pattern_type = pattern_summary.get("type", "unknown")
            
            # 1. Validação por threshold de confiança
            threshold_result = await supervisor_service.auto_approve(
                confidence_score=confidence_score,
                threshold=0.7  # Threshold padrão de 70%
            )
            
            if not threshold_result:
                rejections.append({
                    "pattern_id": pattern_id,
                    "reason": "below_confidence_threshold",
                    "confidence": confidence_score,
                    "threshold": 0.7,
                    "pattern_type": pattern_type
                })
                logger.debug(f"supervisor_approve_node: Padrão {pattern_id} rejeitado por baixa confiança ({confidence_score:.3f})")
                continue
            
            # 2. Validação de conflitos (simulada - em implementação real buscaria padrões existentes)
            new_pattern_data = {
                "id": pattern_id,
                "type": pattern_type,
                "confidence": confidence_score,
                "trigger": f"trigger_for_{pattern_type}",
                "action": f"action_for_{pattern_type}",
                "contexts": [pattern_type]
            }
            
            # Para esta implementação, simular padrões existentes vazios
            # Em implementação completa, buscaria do banco de dados
            existing_patterns = []
            
            conflict_analysis = await supervisor_service.validate_pattern_conflicts(
                new_pattern=new_pattern_data,
                existing_patterns=existing_patterns
            )
            
            if conflict_analysis.has_conflicts and conflict_analysis.severity_score > 0.5:
                rejections.append({
                    "pattern_id": pattern_id,
                    "reason": "pattern_conflicts",
                    "confidence": confidence_score,
                    "conflicts": len(conflict_analysis.conflict_details),
                    "severity": conflict_analysis.severity_score,
                    "pattern_type": pattern_type
                })
                logger.debug(f"supervisor_approve_node: Padrão {pattern_id} rejeitado por conflitos (severity: {conflict_analysis.severity_score:.3f})")
                continue
            
            # 3. Aprovação automática
            approvals.append({
                "pattern_id": pattern_id,
                "confidence": confidence_score,
                "pattern_type": pattern_type,
                "approved_at": "now",
                "approval_reason": "automatic_threshold_and_no_conflicts",
                "conflicts_checked": len(existing_patterns)
            })
            
            logger.debug(f"supervisor_approve_node: Padrão {pattern_id} aprovado automaticamente (confidence: {confidence_score:.3f})")
        
        # Preparar contexto de supervisão
        supervision_context = {
            "validation_performed": True,
            "total_evaluated": len(patterns_summary),
            "approvals": approvals,
            "rejections": rejections,
            "approval_rate": len(approvals) / len(patterns_summary) if patterns_summary else 0,
            "auto_approved": len(approvals),
            "auto_rejected": len(rejections),
            "validation_summary": {
                "threshold_rejections": len([r for r in rejections if r["reason"] == "below_confidence_threshold"]),
                "conflict_rejections": len([r for r in rejections if r["reason"] == "pattern_conflicts"]),
                "successful_approvals": len(approvals)
            }
        }
        
        logger.info(f"supervisor_approve_node: Validação concluída - {len(approvals)} aprovados, {len(rejections)} rejeitados")
        
        return _add_supervision_context(state, supervision_context)
        
    except Exception as e:
        logger.error(f"supervisor_approve_node: Erro na validação de aprendizados: {e}")
        
        # Em caso de erro, continuar sem bloquear o fluxo
        error_context = {
            "validation_performed": False,
            "error": str(e),
            "approvals": [],
            "rejections": [],
            "total_evaluated": 0
        }
        
        return _add_supervision_context(state, error_context)


def _add_supervision_context(state: AgentState, supervision_data: Dict[str, Any]) -> AgentState:
    """
    Adiciona contexto de supervisão ao estado.
    
    Args:
        state: Estado atual
        supervision_data: Dados de supervisão para adicionar
        
    Returns:
        Estado atualizado
    """
    updated_context = state.get("context", {})
    updated_context["sicc_supervision"] = supervision_data
    
    return {
        **state,
        "context": updated_context
    }


async def sicc_batch_approve_patterns(patterns: List[Dict[str, Any]], threshold: float = 0.7) -> Dict[str, Any]:
    """
    Função auxiliar para aprovação em lote de padrões.
    
    Útil para processamento assíncrono de múltiplos padrões detectados.
    
    Args:
        patterns: Lista de padrões para validar
        threshold: Threshold de confiança para aprovação
        
    Returns:
        Resultado da aprovação em lote
    """
    try:
        logger.info(f"sicc_batch_approve_patterns: Processando {len(patterns)} padrões em lote")
        
        supervisor_service = get_supervisor_service()
        
        batch_results = {
            "total_processed": len(patterns),
            "approved": [],
            "rejected": [],
            "errors": []
        }
        
        for pattern in patterns:
            try:
                confidence = pattern.get("confidence", 0.0)
                
                # Validação por threshold
                if await supervisor_service.auto_approve(confidence, threshold):
                    batch_results["approved"].append({
                        "pattern_id": pattern.get("id", "unknown"),
                        "confidence": confidence
                    })
                else:
                    batch_results["rejected"].append({
                        "pattern_id": pattern.get("id", "unknown"),
                        "confidence": confidence,
                        "reason": "below_threshold"
                    })
                    
            except Exception as e:
                batch_results["errors"].append({
                    "pattern_id": pattern.get("id", "unknown"),
                    "error": str(e)
                })
        
        logger.info(f"sicc_batch_approve_patterns: {len(batch_results['approved'])} aprovados, {len(batch_results['rejected'])} rejeitados")
        
        return batch_results
        
    except Exception as e:
        logger.error(f"sicc_batch_approve_patterns: Erro no processamento em lote: {e}")
        return {
            "total_processed": len(patterns),
            "approved": [],
            "rejected": [],
            "errors": [{"error": str(e)}]
        }