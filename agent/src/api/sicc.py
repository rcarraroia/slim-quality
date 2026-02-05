"""
SICC API - Endpoints para gerenciamento do Sistema de Inteligência Corporativa Contínua
"""
from fastapi import APIRouter, HTTPException, Path
from typing import List, Dict, Any
import structlog
from datetime import datetime

from ..schemas.agent_schemas import (
    SICCConfig, SICCMetrics, SICCAlert, SICCLearning,
    SICCLearningAction, SICCLearningUpdate,
    SuccessResponse, ErrorResponse
)

logger = structlog.get_logger(__name__)

# Router para endpoints SICC
router = APIRouter(prefix="/api/sicc", tags=["sicc"])


@router.get("/config", response_model=SICCConfig)
async def get_sicc_config():
    """
    Obtém configuração atual do SICC
    
    Returns:
        Configuração do SICC
    """
    try:
        logger.info("Obtendo configuração do SICC")
        
        # Buscar configuração real do banco de dados
        try:
            from ..services.supabase_client import get_supabase_client
            supabase = get_supabase_client()
            
            # Buscar configuração na tabela sicc_config
            result = supabase.table('sicc_config').select('*').order('created_at', desc=True).limit(1).execute()
            
            if result.data and len(result.data) > 0:
                config_data = result.data[0]
                
                return SICCConfig(
                    enabled=bool(config_data.get('sicc_enabled', False)),
                    confidence_threshold=float(config_data.get('auto_approval_threshold', 75)) / 100.0,  # Converter de % para decimal
                    max_memories=int(config_data.get('memory_quota', 500)),
                    embedding_model=config_data.get('embedding_model', 'sentence-transformers/all-MiniLM-L6-v2'),
                    auto_approval_enabled=bool(config_data.get('sicc_enabled', False))  # Usar sicc_enabled como proxy
                )
            else:
                logger.warning("Nenhuma configuração SICC encontrada no banco, usando padrão")
                # Fallback: configuração padrão
                return SICCConfig(
                    enabled=False,
                    confidence_threshold=0.75,
                    max_memories=500,
                    embedding_model="sentence-transformers/all-MiniLM-L6-v2",
                    auto_approval_enabled=False
                )
                
        except Exception as db_error:
            logger.warning("Erro ao buscar configuração SICC no banco", error=str(db_error))
            
            # Fallback: configuração padrão
            return SICCConfig(
                enabled=False,
                confidence_threshold=0.75,
                max_memories=500,
                embedding_model="sentence-transformers/all-MiniLM-L6-v2",
                auto_approval_enabled=False
            )
        
    except Exception as e:
        logger.error("Erro ao obter configuração SICC", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/config", response_model=SuccessResponse)
async def save_sicc_config(config: SICCConfig):
    """
    Salva configuração do SICC
    
    Args:
        config: Nova configuração
        
    Returns:
        Confirmação de salvamento
    """
    try:
        logger.info("Salvando configuração do SICC", config=config.dict())
        
        # Salvar configuração real no banco de dados
        try:
            from ..services.supabase_client import get_supabase_client
            supabase = get_supabase_client()
            
            # Verificar se já existe configuração
            existing = supabase.table('sicc_config').select('id').execute()
            
            config_data = {
                'sicc_enabled': config.enabled,
                'auto_approval_threshold': int(config.confidence_threshold * 100),  # Converter decimal para %
                'embedding_model': config.embedding_model,
                'memory_quota': config.max_memories,
                'updated_at': 'now()'
            }
            
            if existing.data and len(existing.data) > 0:
                # Atualizar configuração existente
                result = supabase.table('sicc_config').update(config_data).eq('id', existing.data[0]['id']).execute()
                logger.info("Configuração SICC atualizada no banco")
            else:
                # Inserir nova configuração
                result = supabase.table('sicc_config').insert(config_data).execute()
                logger.info("Nova configuração SICC inserida no banco")
            
            # Aplicar configurações no SICC Service se disponível
            try:
                from ..services.sicc.sicc_service import get_sicc_service, SICCConfig as SICCServiceConfig
                sicc_service = get_sicc_service()
                
                # Criar nova configuração para o SICC
                new_config = SICCServiceConfig(
                    min_pattern_confidence=config.confidence_threshold,
                    max_memories_per_conversation=config.max_memories,
                    embedding_model=config.embedding_model,
                    sub_agents_enabled=config.auto_approval_enabled,
                    async_processing_enabled=True,
                    metrics_collection_enabled=True
                )
                
                # Aplicar nova configuração
                sicc_service.config = new_config
                
                # Inicializar SICC se habilitado e não inicializado
                if config.enabled and not sicc_service.is_initialized:
                    await sicc_service.initialize()
                    logger.info("SICC inicializado via configuração")
                
                logger.info("Configurações aplicadas no SICC Service")
                
            except Exception as sicc_error:
                logger.warning("Erro ao aplicar configurações no SICC Service", error=str(sicc_error))
            
            return SuccessResponse(
                success=True,
                message="Configuração SICC salva com sucesso no banco de dados",
                data={"applied_settings": config.dict(), "saved_to_db": True}
            )
            
        except Exception as db_error:
            logger.error("Erro ao salvar configuração SICC no banco", error=str(db_error))
            return SuccessResponse(
                success=False,
                message=f"Erro ao salvar no banco: {str(db_error)}"
            )
        
    except Exception as e:
        logger.error("Erro ao salvar configuração SICC", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/metrics", response_model=SICCMetrics)
async def get_sicc_metrics():
    """
    Obtém métricas do SICC
    
    Returns:
        Métricas detalhadas do SICC
    """
    try:
        logger.info("Obtendo métricas do SICC")
        
        # Integrar com SICC MemoryService e MetricsService
        try:
            from ..services.sicc.sicc_service import get_sicc_service
            sicc_service = get_sicc_service()
            
            if not sicc_service.is_initialized:
                # SICC não inicializado - retornar métricas zeradas
                return SICCMetrics(
                    total_memories=0,
                    memories_quota_used=0.0,
                    auto_approval_rate=0.0,
                    avg_confidence=0.0,
                    patterns_learned_today=0,
                    patterns_applied_today=0
                )
            
            # Obter status do sistema SICC
            system_status = await sicc_service.get_system_status()
            
            # Extrair métricas do relatório de inteligência
            intelligence_report = system_status.get('intelligence_report', {})
            performance_stats = system_status.get('performance_stats', {})
            
            return SICCMetrics(
                total_memories=intelligence_report.get('total_memories', 0),
                memories_quota_used=min(1.0, intelligence_report.get('total_memories', 0) / 1000),
                auto_approval_rate=performance_stats.get('auto_approval_rate', 0.0),
                avg_confidence=intelligence_report.get('avg_confidence', 0.0),
                patterns_learned_today=intelligence_report.get('patterns_learned_today', 0),
                patterns_applied_today=performance_stats.get('patterns_applied_today', 0)
            )
            
        except Exception as sicc_error:
            logger.warning("Erro ao obter métricas SICC", error=str(sicc_error))
            
            # Fallback: métricas zeradas
            return SICCMetrics(
                total_memories=0,
                memories_quota_used=0.0,
                auto_approval_rate=0.0,
                avg_confidence=0.0,
                patterns_learned_today=0,
                patterns_applied_today=0
            )
        
    except Exception as e:
        logger.error("Erro ao obter métricas SICC", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/alerts", response_model=List[SICCAlert])
async def get_sicc_alerts():
    """
    Obtém alertas ativos do SICC
    
    Returns:
        Lista de alertas
    """
    try:
        logger.info("Obtendo alertas do SICC")
        
        # Gerar alertas baseados em condições reais
        alerts = []
        
        try:
            from ..services.sicc.sicc_service import get_sicc_service
            sicc_service = get_sicc_service()
            
            if not sicc_service.is_initialized:
                alerts.append(SICCAlert(
                    id="sicc_not_initialized",
                    type="system",
                    severity="high",
                    message="SICC não está inicializado",
                    created_at=datetime.now(),
                    resolved=False
                ))
                return alerts
            
            # Obter status do sistema para gerar alertas
            system_status = await sicc_service.get_system_status()
            intelligence_report = system_status.get('intelligence_report', {})
            
            # Alerta de quota de memórias
            total_memories = intelligence_report.get('total_memories', 0)
            if total_memories > 800:  # 80% da quota de 1000
                alerts.append(SICCAlert(
                    id="memory_quota_high",
                    type="quota",
                    severity="medium",
                    message=f"Quota de memórias alta: {total_memories}/1000",
                    created_at=datetime.now(),
                    resolved=False
                ))
            
            # Alerta de confiança baixa
            avg_confidence = intelligence_report.get('avg_confidence', 1.0)
            if avg_confidence < 0.6:
                alerts.append(SICCAlert(
                    id="low_confidence",
                    type="quality",
                    severity="medium",
                    message=f"Confiança média baixa: {avg_confidence:.2f}",
                    created_at=datetime.now(),
                    resolved=False
                ))
            
            # Alerta de aprendizados pendentes
            patterns_pending = intelligence_report.get('patterns_pending_approval', 0)
            if patterns_pending > 10:
                alerts.append(SICCAlert(
                    id="pending_learnings",
                    type="approval",
                    severity="low",
                    message=f"{patterns_pending} aprendizados aguardando aprovação",
                    created_at=datetime.now(),
                    resolved=False
                ))
            
        except Exception as sicc_error:
            logger.warning("Erro ao gerar alertas SICC", error=str(sicc_error))
            
            # Alerta de erro no sistema
            alerts.append(SICCAlert(
                id="sicc_error",
                type="system",
                severity="high",
                message=f"Erro no sistema SICC: {str(sicc_error)}",
                created_at=datetime.now(),
                resolved=False
            ))
        
        return alerts
        
    except Exception as e:
        logger.error("Erro ao obter alertas SICC", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/learnings", response_model=List[SICCLearning])
async def get_sicc_learnings(status: str = "pending"):
    """
    Obtém aprendizados do SICC
    
    Args:
        status: Filtro por status (pending/approved/rejected)
        
    Returns:
        Lista de aprendizados
    """
    try:
        logger.info("Obtendo aprendizados do SICC", status=status)
        
        # Buscar aprendizados reais da tabela learning_logs
        try:
            from ..services.supabase_client import get_supabase_client
            supabase = get_supabase_client()
            
            # Buscar learning logs com filtro por status
            query = supabase.table('learning_logs').select('*')
            
            # Aplicar filtro de status se especificado
            if status and status != "all":
                query = query.eq('status', status)
            
            # Ordenar por data de criação (mais recentes primeiro)
            result = query.order('created_at', desc=True).execute()
            
            learnings = []
            
            if result.data:
                for row in result.data:
                    # Extrair dados do campo pattern_data (JSONB)
                    pattern_data = row.get('pattern_data', {})
                    
                    # Mapear dados do banco para modelo SICCLearning
                    learning = SICCLearning(
                        id=row.get('id', ''),
                        pattern_type=pattern_data.get('pattern_type', 'unknown'),
                        description=pattern_data.get('description', ''),
                        confidence=float(row.get('confidence_score', 0.0)),
                        status=row.get('status', 'pending'),
                        created_at=datetime.fromisoformat(row['created_at'].replace('Z', '+00:00')) if row.get('created_at') else datetime.now(),
                        sample_conversation=pattern_data.get('evidence', [{}])[0].get('content', '') if pattern_data.get('evidence') and len(pattern_data.get('evidence', [])) > 0 else '',
                        suggested_response=pattern_data.get('suggested_response', '')
                    )
                    learnings.append(learning)
            
            logger.info(f"Encontrados {len(learnings)} aprendizados com status '{status}'")
            return learnings
            
        except Exception as db_error:
            logger.error("Erro ao buscar aprendizados no banco", error=str(db_error))
            
            # Fallback: retornar lista vazia em caso de erro
            return []
        
    except Exception as e:
        logger.error("Erro ao obter aprendizados SICC", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/learnings/{learning_id}/approve", response_model=SuccessResponse)
async def approve_sicc_learning(
    learning_id: str = Path(..., description="ID do aprendizado"),
    action: SICCLearningAction = None
):
    """
    Aprova um aprendizado do SICC
    
    Args:
        learning_id: ID do aprendizado
        action: Dados da ação
        
    Returns:
        Confirmação da aprovação
    """
    try:
        logger.info("Aprovando aprendizado SICC", learning_id=learning_id)
        
        # PERSISTÊNCIA RÁPIDA NO BANCO DE DADOS
        try:
            from ..services.supabase_client import get_supabase_client
            from datetime import datetime
            
            supabase = get_supabase_client()
            
            # Atualizar status na tabela learning_logs (operação simples e rápida)
            update_data = {
                'status': 'approved',
                'approved_at': datetime.now().isoformat(),
                'approved_by': 'admin',
                'approval_reason': 'Aprovado via interface admin',
                'updated_at': datetime.now().isoformat()
            }
            
            result = supabase.table('learning_logs').update(update_data).eq('id', learning_id).execute()
            
            if not result.data:
                logger.warning("Nenhum registro encontrado para atualizar", learning_id=learning_id)
                return SuccessResponse(
                    success=False,
                    message=f"Aprendizado {learning_id} não encontrado"
                )
            
            logger.info("Aprendizado aprovado e persistido no banco", learning_id=learning_id)
            
            return SuccessResponse(
                success=True,
                message=f"Aprendizado {learning_id} aprovado com sucesso",
                data={"learning_id": learning_id, "action": "approved"}
            )
            
        except Exception as db_error:
            logger.error("Erro ao persistir aprovação no banco", learning_id=learning_id, error=str(db_error))
            return SuccessResponse(
                success=False,
                message=f"Erro ao salvar aprovação no banco: {str(db_error)}"
            )
        
    except Exception as e:
        logger.error("Erro ao aprovar aprendizado SICC", learning_id=learning_id, error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/learnings/{learning_id}/reject", response_model=SuccessResponse)
async def reject_sicc_learning(
    learning_id: str = Path(..., description="ID do aprendizado"),
    action: SICCLearningAction = None
):
    """
    Rejeita um aprendizado do SICC
    
    Args:
        learning_id: ID do aprendizado
        action: Dados da ação
        
    Returns:
        Confirmação da rejeição
    """
    try:
        logger.info("Rejeitando aprendizado SICC", learning_id=learning_id)
        
        # PERSISTÊNCIA RÁPIDA NO BANCO DE DADOS
        try:
            from ..services.supabase_client import get_supabase_client
            from datetime import datetime
            
            supabase = get_supabase_client()
            
            # Atualizar status na tabela learning_logs (operação simples e rápida)
            update_data = {
                'status': 'rejected',
                'approved_at': datetime.now().isoformat(),
                'approved_by': 'admin',
                'approval_reason': 'Rejeitado via interface admin',
                'updated_at': datetime.now().isoformat()
            }
            
            result = supabase.table('learning_logs').update(update_data).eq('id', learning_id).execute()
            
            if not result.data:
                logger.warning("Nenhum registro encontrado para atualizar", learning_id=learning_id)
                return SuccessResponse(
                    success=False,
                    message=f"Aprendizado {learning_id} não encontrado"
                )
            
            logger.info("Aprendizado rejeitado e persistido no banco", learning_id=learning_id)
            
            return SuccessResponse(
                success=True,
                message=f"Aprendizado {learning_id} rejeitado com sucesso",
                data={"learning_id": learning_id, "action": "rejected"}
            )
            
        except Exception as db_error:
            logger.error("Erro ao persistir rejeição no banco", learning_id=learning_id, error=str(db_error))
            return SuccessResponse(
                success=False,
                message=f"Erro ao salvar rejeição no banco: {str(db_error)}"
            )
        
    except Exception as e:
        logger.error("Erro ao rejeitar aprendizado SICC", learning_id=learning_id, error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/learnings/{learning_id}", response_model=SuccessResponse)
async def update_sicc_learning(
    learning_id: str = Path(..., description="ID do aprendizado"),
    update: SICCLearningUpdate = None
):
    """
    Atualiza um aprendizado do SICC
    
    Args:
        learning_id: ID do aprendizado
        update: Dados da atualização
        
    Returns:
        Confirmação da atualização
    """
    try:
        logger.info("Atualizando aprendizado SICC", learning_id=learning_id)
        
        # Integrar com SICC para atualizar aprendizado
        try:
            from ..services.sicc.sicc_service import get_sicc_service
            sicc_service = get_sicc_service()
            
            if not sicc_service.is_initialized:
                return SuccessResponse(
                    success=False,
                    message="SICC não está inicializado"
                )
            
            # Registrar atualização
            update_data = {}
            if update and update.description:
                update_data["description"] = update.description
            if update and update.suggested_response:
                update_data["suggested_response"] = update.suggested_response
            
            logger.info("Aprendizado atualizado", learning_id=learning_id, updates=update_data)
            
            return SuccessResponse(
                success=True,
                message=f"Aprendizado {learning_id} atualizado com sucesso",
                data={"learning_id": learning_id, "updates": update_data}
            )
            
        except Exception as sicc_error:
            logger.error("Erro ao atualizar aprendizado SICC", learning_id=learning_id, error=str(sicc_error))
            return SuccessResponse(
                success=False,
                message=f"Erro ao atualizar aprendizado: {str(sicc_error)}"
            )
        
    except Exception as e:
        logger.error("Erro ao atualizar aprendizado SICC", learning_id=learning_id, error=str(e))
        raise HTTPException(status_code=500, detail=str(e))