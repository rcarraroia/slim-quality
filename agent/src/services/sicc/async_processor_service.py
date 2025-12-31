"""
Async Processor Service - Sistema de processamento assíncrono para SICC

Processa tarefas em background sem bloquear conversas:
- Queue para processamento não-bloqueante de embeddings
- Workers assíncronos para análise de padrões
- Processamento paralelo de múltiplas tarefas
- Monitoramento de performance e saúde dos workers
"""

import structlog
import asyncio
from typing import Dict, List, Optional, Any, Callable, Union
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from concurrent.futures import ThreadPoolExecutor
import threading
import queue
import uuid

logger = structlog.get_logger(__name__)


class TaskType(Enum):
    """Tipos de tarefas assíncronas"""
    GENERATE_EMBEDDING = "generate_embedding"
    ANALYZE_PATTERNS = "analyze_patterns"
    UPDATE_METRICS = "update_metrics"
    CLEANUP_MEMORIES = "cleanup_memories"
    VALIDATE_PATTERNS = "validate_patterns"


class TaskPriority(Enum):
    """Prioridades de processamento"""
    LOW = 1
    NORMAL = 2
    HIGH = 3
    CRITICAL = 4


class TaskStatus(Enum):
    """Status de processamento da tarefa"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class ProcessingTask:
    """Tarefa para processamento assíncrono"""
    task_id: str
    task_type: TaskType
    priority: TaskPriority
    data: Dict[str, Any]
    callback: Optional[Callable] = None
    created_at: datetime = field(default_factory=datetime.now)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    status: TaskStatus = TaskStatus.PENDING
    error_message: Optional[str] = None
    retry_count: int = 0
    max_retries: int = 3
    
    def __lt__(self, other):
        """Comparação para ordenação por prioridade"""
        return self.priority.value > other.priority.value  # Maior prioridade primeiro
    
    def to_dict(self) -> Dict[str, Any]:
        """Converte tarefa para dicionário"""
        return {
            "task_id": self.task_id,
            "task_type": self.task_type.value,
            "priority": self.priority.value,
            "status": self.status.value,
            "created_at": self.created_at.isoformat(),
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "error_message": self.error_message,
            "retry_count": self.retry_count,
            "processing_time": self._calculate_processing_time()
        }
    
    def _calculate_processing_time(self) -> Optional[float]:
        """Calcula tempo de processamento em segundos"""
        if self.started_at and self.completed_at:
            return (self.completed_at - self.started_at).total_seconds()
        return None


@dataclass
class TaskResult:
    """Resultado do processamento de uma tarefa"""
    task_id: str
    success: bool
    result_data: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    processing_time: Optional[float] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Converte resultado para dicionário"""
        return {
            "task_id": self.task_id,
            "success": self.success,
            "result_data": self.result_data,
            "error_message": self.error_message,
            "processing_time": self.processing_time
        }


class AsyncProcessorService:
    """
    Serviço para processamento assíncrono de tarefas SICC
    
    Funcionalidades:
    - Queue de prioridade para tarefas assíncronas
    - Pool de workers para processamento paralelo
    - Monitoramento de performance e saúde
    - Retry automático para tarefas falhadas
    - Graceful shutdown com cleanup
    """
    
    def __init__(self, max_workers: int = 4, max_queue_size: int = 1000):
        """
        Inicializa o serviço de processamento assíncrono
        
        Args:
            max_workers: Número máximo de workers
            max_queue_size: Tamanho máximo da queue
        """
        self.max_workers = max_workers
        self.max_queue_size = max_queue_size
        
        # Queue de prioridade para tarefas
        self.task_queue = asyncio.PriorityQueue(maxsize=max_queue_size)
        
        # Controle de workers
        self.workers: List[asyncio.Task] = []
        self.worker_stats: Dict[str, Dict[str, Any]] = {}
        self.is_running = False
        self.shutdown_event = asyncio.Event()
        
        # Histórico de tarefas
        self.completed_tasks: Dict[str, ProcessingTask] = {}
        self.failed_tasks: Dict[str, ProcessingTask] = {}
        
        # Métricas
        self.total_tasks_processed = 0
        self.total_tasks_failed = 0
        self.avg_processing_time = 0.0
        
        # Lock para thread safety
        self._lock = asyncio.Lock()
        
        logger.info(f"AsyncProcessorService inicializado com {max_workers} workers, queue máxima {max_queue_size}")
    
    async def start(self):
        """Inicia o serviço e os workers"""
        if self.is_running:
            logger.warning("AsyncProcessorService já está rodando")
            return
        
        self.is_running = True
        self.shutdown_event.clear()
        
        # Iniciar workers
        for i in range(self.max_workers):
            worker_id = f"worker_{i}"
            worker_task = asyncio.create_task(self._worker_loop(worker_id))
            self.workers.append(worker_task)
            
            self.worker_stats[worker_id] = {
                "tasks_processed": 0,
                "tasks_failed": 0,
                "last_activity": datetime.now(),
                "status": "idle"
            }
        
        logger.info(f"AsyncProcessorService iniciado com {len(self.workers)} workers")
    
    async def stop(self, timeout: float = 30.0):
        """
        Para o serviço graciosamente
        
        Args:
            timeout: Timeout em segundos para shutdown
        """
        if not self.is_running:
            logger.warning("AsyncProcessorService já está parado")
            return
        
        logger.info("Iniciando shutdown do AsyncProcessorService...")
        
        # Sinalizar shutdown
        self.is_running = False
        self.shutdown_event.set()
        
        # Aguardar workers terminarem
        try:
            await asyncio.wait_for(
                asyncio.gather(*self.workers, return_exceptions=True),
                timeout=timeout
            )
            logger.info("Todos os workers terminaram graciosamente")
        except asyncio.TimeoutError:
            logger.warning(f"Timeout no shutdown após {timeout}s, cancelando workers")
            for worker in self.workers:
                worker.cancel()
        
        # Limpar workers
        self.workers.clear()
        self.worker_stats.clear()
        
        logger.info("AsyncProcessorService parado")
    
    async def submit_task(
        self,
        task_type: TaskType,
        data: Dict[str, Any],
        priority: TaskPriority = TaskPriority.NORMAL,
        callback: Optional[Callable] = None
    ) -> str:
        """
        Submete uma tarefa para processamento assíncrono
        
        Args:
            task_type: Tipo da tarefa
            data: Dados para processamento
            priority: Prioridade da tarefa
            callback: Callback opcional para resultado
            
        Returns:
            ID da tarefa submetida
        """
        if not self.is_running:
            raise RuntimeError("AsyncProcessorService não está rodando")
        
        # Criar tarefa
        task = ProcessingTask(
            task_id=str(uuid.uuid4()),
            task_type=task_type,
            priority=priority,
            data=data,
            callback=callback
        )
        
        try:
            # Adicionar à queue (sem bloquear)
            self.task_queue.put_nowait((priority.value, task))
            
            logger.debug(f"Tarefa {task.task_id} ({task_type.value}) submetida com prioridade {priority.value}")
            return task.task_id
            
        except asyncio.QueueFull:
            logger.error(f"Queue cheia, não foi possível submeter tarefa {task_type.value}")
            raise RuntimeError("Queue de processamento está cheia")
    
    async def get_task_status(self, task_id: str) -> Optional[Dict[str, Any]]:
        """
        Obtém status de uma tarefa
        
        Args:
            task_id: ID da tarefa
            
        Returns:
            Status da tarefa ou None se não encontrada
        """
        # Verificar tarefas completadas
        if task_id in self.completed_tasks:
            return self.completed_tasks[task_id].to_dict()
        
        # Verificar tarefas falhadas
        if task_id in self.failed_tasks:
            return self.failed_tasks[task_id].to_dict()
        
        # Verificar queue (tarefa pendente)
        # Nota: asyncio.PriorityQueue não permite iteração direta
        # Em implementação real, manteria um índice separado
        return {"task_id": task_id, "status": "unknown"}
    
    async def _worker_loop(self, worker_id: str):
        """
        Loop principal de um worker
        
        Args:
            worker_id: ID único do worker
        """
        logger.info(f"Worker {worker_id} iniciado")
        
        while self.is_running and not self.shutdown_event.is_set():
            try:
                # Aguardar tarefa com timeout
                try:
                    priority, task = await asyncio.wait_for(
                        self.task_queue.get(),
                        timeout=1.0  # Timeout para verificar shutdown
                    )
                except asyncio.TimeoutError:
                    continue  # Verificar shutdown e continuar
                
                # Atualizar stats do worker
                self.worker_stats[worker_id]["status"] = "processing"
                self.worker_stats[worker_id]["last_activity"] = datetime.now()
                
                # Processar tarefa
                await self._process_task(worker_id, task)
                
                # Marcar tarefa como concluída na queue
                self.task_queue.task_done()
                
                # Atualizar stats
                self.worker_stats[worker_id]["status"] = "idle"
                
            except Exception as e:
                logger.error(f"Erro no worker {worker_id}: {e}")
                self.worker_stats[worker_id]["status"] = "error"
                
                # Aguardar um pouco antes de continuar
                await asyncio.sleep(1.0)
        
        logger.info(f"Worker {worker_id} terminado")
    
    async def _process_task(self, worker_id: str, task: ProcessingTask):
        """
        Processa uma tarefa específica
        
        Args:
            worker_id: ID do worker processando
            task: Tarefa a ser processada
        """
        task.status = TaskStatus.PROCESSING
        task.started_at = datetime.now()
        
        logger.debug(f"Worker {worker_id} processando tarefa {task.task_id} ({task.task_type.value})")
        
        try:
            # Processar baseado no tipo
            result_data = await self._execute_task(task)
            
            # Tarefa completada com sucesso
            task.status = TaskStatus.COMPLETED
            task.completed_at = datetime.now()
            
            # Armazenar resultado
            async with self._lock:
                self.completed_tasks[task.task_id] = task
                self.total_tasks_processed += 1
                self.worker_stats[worker_id]["tasks_processed"] += 1
                
                # Atualizar tempo médio de processamento
                processing_time = task._calculate_processing_time()
                if processing_time:
                    self.avg_processing_time = (
                        (self.avg_processing_time * (self.total_tasks_processed - 1) + processing_time) /
                        self.total_tasks_processed
                    )
            
            # Executar callback se fornecido
            if task.callback:
                try:
                    if asyncio.iscoroutinefunction(task.callback):
                        await task.callback(TaskResult(
                            task_id=task.task_id,
                            success=True,
                            result_data=result_data,
                            processing_time=processing_time
                        ))
                    else:
                        task.callback(TaskResult(
                            task_id=task.task_id,
                            success=True,
                            result_data=result_data,
                            processing_time=processing_time
                        ))
                except Exception as e:
                    logger.error(f"Erro no callback da tarefa {task.task_id}: {e}")
            
            logger.debug(f"Tarefa {task.task_id} completada em {processing_time:.3f}s")
            
        except Exception as e:
            # Tarefa falhou
            task.status = TaskStatus.FAILED
            task.completed_at = datetime.now()
            task.error_message = str(e)
            task.retry_count += 1
            
            logger.error(f"Falha na tarefa {task.task_id}: {e}")
            
            # Verificar se deve tentar novamente
            if task.retry_count < task.max_retries:
                logger.info(f"Reagendando tarefa {task.task_id} (tentativa {task.retry_count + 1}/{task.max_retries})")
                
                # Resetar status e reagendar
                task.status = TaskStatus.PENDING
                task.started_at = None
                task.completed_at = None
                
                # Adicionar de volta à queue com prioridade menor
                retry_priority = TaskPriority.LOW
                await self.task_queue.put((retry_priority.value, task))
            else:
                # Máximo de tentativas atingido
                async with self._lock:
                    self.failed_tasks[task.task_id] = task
                    self.total_tasks_failed += 1
                    self.worker_stats[worker_id]["tasks_failed"] += 1
                
                # Executar callback de erro se fornecido
                if task.callback:
                    try:
                        if asyncio.iscoroutinefunction(task.callback):
                            await task.callback(TaskResult(
                                task_id=task.task_id,
                                success=False,
                                error_message=task.error_message
                            ))
                        else:
                            task.callback(TaskResult(
                                task_id=task.task_id,
                                success=False,
                                error_message=task.error_message
                            ))
                    except Exception as callback_error:
                        logger.error(f"Erro no callback de erro da tarefa {task.task_id}: {callback_error}")
    
    async def _execute_task(self, task: ProcessingTask) -> Dict[str, Any]:
        """
        Executa a lógica específica de uma tarefa
        
        Args:
            task: Tarefa a ser executada
            
        Returns:
            Dados do resultado
        """
        if task.task_type == TaskType.GENERATE_EMBEDDING:
            return await self._generate_embedding_task(task.data)
        
        elif task.task_type == TaskType.ANALYZE_PATTERNS:
            return await self._analyze_patterns_task(task.data)
        
        elif task.task_type == TaskType.UPDATE_METRICS:
            return await self._update_metrics_task(task.data)
        
        elif task.task_type == TaskType.CLEANUP_MEMORIES:
            return await self._cleanup_memories_task(task.data)
        
        elif task.task_type == TaskType.VALIDATE_PATTERNS:
            return await self._validate_patterns_task(task.data)
        
        else:
            raise ValueError(f"Tipo de tarefa não suportado: {task.task_type}")
    
    async def _generate_embedding_task(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Processa tarefa de geração de embedding
        
        Args:
            data: Dados da tarefa (text, memory_id, etc.)
            
        Returns:
            Resultado da geração
        """
        # Simular processamento de embedding (em implementação real, usaria MemoryService)
        text = data.get("text", "")
        memory_id = data.get("memory_id")
        
        # Simular tempo de processamento
        await asyncio.sleep(0.1)  # 100ms para simular embedding
        
        # Simular embedding (em implementação real, geraria embedding real)
        fake_embedding = [0.1] * 384  # Simular embedding de 384 dimensões
        
        return {
            "memory_id": memory_id,
            "text": text,
            "embedding": fake_embedding,
            "embedding_model": "gte-small",
            "processing_time": 0.1
        }
    
    async def _analyze_patterns_task(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Processa tarefa de análise de padrões
        
        Args:
            data: Dados da conversa para análise
            
        Returns:
            Padrões detectados
        """
        conversation_data = data.get("conversation_data", {})
        
        # Simular análise de padrões
        await asyncio.sleep(0.2)  # 200ms para simular análise
        
        # Simular padrões detectados
        patterns = [
            {"type": "greeting", "confidence": 0.8},
            {"type": "question", "confidence": 0.7}
        ]
        
        return {
            "conversation_id": conversation_data.get("conversation_id"),
            "patterns_detected": patterns,
            "analysis_time": 0.2
        }
    
    async def _update_metrics_task(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Processa tarefa de atualização de métricas
        
        Args:
            data: Dados da métrica
            
        Returns:
            Resultado da atualização
        """
        metric_type = data.get("metric_type")
        value = data.get("value")
        
        # Simular atualização de métricas
        await asyncio.sleep(0.05)  # 50ms para simular atualização
        
        return {
            "metric_type": metric_type,
            "value": value,
            "updated_at": datetime.now().isoformat()
        }
    
    async def _cleanup_memories_task(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Processa tarefa de limpeza de memórias
        
        Args:
            data: Critérios de limpeza
            
        Returns:
            Resultado da limpeza
        """
        max_age_days = data.get("max_age_days", 30)
        
        # Simular limpeza
        await asyncio.sleep(0.3)  # 300ms para simular limpeza
        
        return {
            "memories_cleaned": 15,  # Simular 15 memórias limpas
            "max_age_days": max_age_days,
            "cleanup_time": 0.3
        }
    
    async def _validate_patterns_task(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Processa tarefa de validação de padrões
        
        Args:
            data: Padrões para validar
            
        Returns:
            Resultado da validação
        """
        patterns = data.get("patterns", [])
        
        # Simular validação
        await asyncio.sleep(0.15)  # 150ms para simular validação
        
        validated_patterns = []
        for pattern in patterns:
            validated_patterns.append({
                **pattern,
                "validated": True,
                "validation_score": 0.85
            })
        
        return {
            "patterns_validated": len(validated_patterns),
            "validated_patterns": validated_patterns,
            "validation_time": 0.15
        }
    
    async def get_service_stats(self) -> Dict[str, Any]:
        """
        Obtém estatísticas do serviço
        
        Returns:
            Estatísticas completas
        """
        async with self._lock:
            return {
                "service_status": "running" if self.is_running else "stopped",
                "workers": {
                    "total": len(self.workers),
                    "active": len([w for w in self.worker_stats.values() if w["status"] == "processing"]),
                    "idle": len([w for w in self.worker_stats.values() if w["status"] == "idle"]),
                    "stats": self.worker_stats
                },
                "queue": {
                    "size": self.task_queue.qsize(),
                    "max_size": self.max_queue_size
                },
                "tasks": {
                    "total_processed": self.total_tasks_processed,
                    "total_failed": self.total_tasks_failed,
                    "success_rate": (
                        self.total_tasks_processed / (self.total_tasks_processed + self.total_tasks_failed)
                        if (self.total_tasks_processed + self.total_tasks_failed) > 0 else 0.0
                    ),
                    "avg_processing_time": round(self.avg_processing_time, 3),
                    "completed_tasks": len(self.completed_tasks),
                    "failed_tasks": len(self.failed_tasks)
                }
            }


# Singleton instance
_async_processor_service_instance: Optional[AsyncProcessorService] = None


def get_async_processor_service() -> AsyncProcessorService:
    """
    Obtém instância singleton do AsyncProcessorService
    
    Returns:
        Instância do AsyncProcessorService
    """
    global _async_processor_service_instance
    
    if _async_processor_service_instance is None:
        _async_processor_service_instance = AsyncProcessorService()
        logger.info("AsyncProcessorService singleton criado")
    
    return _async_processor_service_instance


# Função auxiliar para reset (útil para testes)
def reset_async_processor_service():
    """Reset da instância singleton (usado principalmente em testes)"""
    global _async_processor_service_instance
    _async_processor_service_instance = None
    logger.debug("AsyncProcessorService singleton resetado")