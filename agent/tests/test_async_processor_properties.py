"""
Property-based tests para AsyncProcessorService

Valida propriedades universais do sistema de processamento assíncrono:
- Processamento não-bloqueante de tarefas
- Priorização correta na queue
- Retry automático para falhas
- Graceful shutdown sem perda de dados
- Thread safety em operações concorrentes
"""

import pytest
import asyncio
import structlog
from datetime import datetime, timedelta
from typing import List, Dict, Any
from unittest.mock import AsyncMock, MagicMock

from hypothesis import given, strategies as st, settings, assume
from hypothesis.stateful import RuleBasedStateMachine, rule, initialize, teardown, invariant

from agent.src.services.sicc.async_processor_service import (
    AsyncProcessorService,
    TaskType,
    TaskPriority,
    TaskStatus,
    ProcessingTask,
    TaskResult,
    reset_async_processor_service
)

logger = structlog.get_logger(__name__)


# Strategies para geração de dados de teste
task_types = st.sampled_from(list(TaskType))
task_priorities = st.sampled_from(list(TaskPriority))
task_data = st.dictionaries(
    st.text(min_size=1, max_size=20),
    st.one_of(st.text(), st.integers(), st.floats(allow_nan=False, allow_infinity=False)),
    min_size=1,
    max_size=5
)


@pytest.fixture
async def async_processor():
    """Fixture para AsyncProcessorService"""
    reset_async_processor_service()
    service = AsyncProcessorService(max_workers=2, max_queue_size=100)
    await service.start()
    
    yield service
    
    await service.stop(timeout=5.0)
    reset_async_processor_service()


class TestAsyncProcessorProperties:
    """Testes de propriedade para AsyncProcessorService"""
    
    @given(
        task_type=task_types,
        priority=task_priorities,
        data=task_data
    )
    @settings(max_examples=20, deadline=10000)
    async def test_property_21_asynchronous_processing(
        self,
        async_processor: AsyncProcessorService,
        task_type: TaskType,
        priority: TaskPriority,
        data: Dict[str, Any]
    ):
        """
        Property 21: Asynchronous Processing
        
        Valida que:
        1. Tarefas são processadas assincronamente sem bloquear
        2. Submissão de tarefa retorna imediatamente
        3. Processamento acontece em background
        4. Status é atualizado corretamente durante o ciclo de vida
        
        Requirements: 9.4
        """
        # Medir tempo de submissão
        start_time = datetime.now()
        
        # Submeter tarefa
        task_id = await async_processor.submit_task(
            task_type=task_type,
            data=data,
            priority=priority
        )
        
        submission_time = (datetime.now() - start_time).total_seconds()
        
        # Property: Submissão deve ser não-bloqueante (< 100ms)
        assert submission_time < 0.1, f"Submissão levou {submission_time:.3f}s, deve ser < 0.1s"
        
        # Property: Task ID deve ser válido
        assert task_id is not None
        assert isinstance(task_id, str)
        assert len(task_id) > 0
        
        # Aguardar processamento (com timeout)
        max_wait = 5.0
        wait_start = datetime.now()
        
        while (datetime.now() - wait_start).total_seconds() < max_wait:
            status = await async_processor.get_task_status(task_id)
            
            if status and status.get("status") in ["completed", "failed"]:
                break
                
            await asyncio.sleep(0.1)
        
        # Verificar status final
        final_status = await async_processor.get_task_status(task_id)
        
        # Property: Tarefa deve ter sido processada
        assert final_status is not None
        assert final_status["task_id"] == task_id
        assert final_status["status"] in ["completed", "failed"]
        
        # Property: Se completada, deve ter tempo de processamento
        if final_status["status"] == "completed":
            assert final_status.get("processing_time") is not None
            assert final_status["processing_time"] > 0
    
    @given(
        tasks_data=st.lists(
            st.tuples(task_types, task_priorities, task_data),
            min_size=3,
            max_size=10
        )
    )
    @settings(max_examples=10, deadline=15000)
    async def test_property_priority_ordering(
        self,
        async_processor: AsyncProcessorService,
        tasks_data: List[tuple]
    ):
        """
        Property: Priority Ordering
        
        Valida que:
        1. Tarefas de maior prioridade são processadas primeiro
        2. Ordem é mantida dentro da mesma prioridade
        3. Queue respeita priorização
        
        Requirements: 9.4
        """
        # Parar workers temporariamente para controlar ordem
        await async_processor.stop()
        
        # Reiniciar sem workers para acumular tarefas
        async_processor.is_running = True
        async_processor.shutdown_event.clear()
        
        # Submeter tarefas em ordem aleatória
        submitted_tasks = []
        
        for task_type, priority, data in tasks_data:
            task_id = await async_processor.submit_task(
                task_type=task_type,
                data=data,
                priority=priority
            )
            submitted_tasks.append((task_id, priority))
        
        # Iniciar um worker para processar
        worker_task = asyncio.create_task(async_processor._worker_loop("test_worker"))
        
        # Aguardar processamento de algumas tarefas
        await asyncio.sleep(2.0)
        
        # Parar worker
        async_processor.is_running = False
        async_processor.shutdown_event.set()
        
        try:
            await asyncio.wait_for(worker_task, timeout=2.0)
        except asyncio.TimeoutError:
            worker_task.cancel()
        
        # Verificar que tarefas de maior prioridade foram processadas primeiro
        completed_tasks = []
        for task_id, original_priority in submitted_tasks:
            status = await async_processor.get_task_status(task_id)
            if status and status.get("status") == "completed":
                completed_tasks.append((task_id, original_priority, status.get("started_at")))
        
        # Property: Pelo menos algumas tarefas devem ter sido completadas
        assert len(completed_tasks) > 0
        
        # Property: Tarefas completadas devem seguir ordem de prioridade
        if len(completed_tasks) > 1:
            # Ordenar por tempo de início
            completed_tasks.sort(key=lambda x: x[2] if x[2] else "")
            
            # Verificar que prioridades estão em ordem decrescente (maior primeiro)
            for i in range(len(completed_tasks) - 1):
                current_priority = completed_tasks[i][1].value
                next_priority = completed_tasks[i + 1][1].value
                
                # Prioridade maior (valor numérico maior) deve vir primeiro
                assert current_priority >= next_priority, (
                    f"Ordem de prioridade violada: {current_priority} -> {next_priority}"
                )
    
    @given(
        task_type=task_types,
        data=task_data,
        max_retries=st.integers(min_value=1, max_value=5)
    )
    @settings(max_examples=10, deadline=10000)
    async def test_property_retry_mechanism(
        self,
        async_processor: AsyncProcessorService,
        task_type: TaskType,
        data: Dict[str, Any],
        max_retries: int
    ):
        """
        Property: Retry Mechanism
        
        Valida que:
        1. Tarefas falhadas são automaticamente reagendadas
        2. Número máximo de tentativas é respeitado
        3. Tarefa é marcada como failed após esgotar tentativas
        
        Requirements: 9.4
        """
        # Forçar falha modificando o método de execução
        original_execute = async_processor._execute_task
        
        async def failing_execute(task):
            # Sempre falhar para testar retry
            raise Exception("Falha simulada para teste de retry")
        
        async_processor._execute_task = failing_execute
        
        try:
            # Submeter tarefa que vai falhar
            task_id = await async_processor.submit_task(
                task_type=task_type,
                data=data,
                priority=TaskPriority.NORMAL
            )
            
            # Aguardar processamento completo (incluindo retries)
            max_wait = 10.0
            wait_start = datetime.now()
            
            while (datetime.now() - wait_start).total_seconds() < max_wait:
                status = await async_processor.get_task_status(task_id)
                
                if status and status.get("status") == "failed":
                    break
                    
                await asyncio.sleep(0.2)
            
            # Verificar status final
            final_status = await async_processor.get_task_status(task_id)
            
            # Property: Tarefa deve ter falhado após esgotar tentativas
            assert final_status is not None
            assert final_status["status"] == "failed"
            assert final_status.get("error_message") is not None
            
            # Property: Número de tentativas deve ser respeitado
            # Nota: retry_count é incrementado a cada falha, então deve ser >= max_retries padrão (3)
            retry_count = final_status.get("retry_count", 0)
            assert retry_count >= 3, f"Retry count {retry_count} deve ser >= 3"
            
        finally:
            # Restaurar método original
            async_processor._execute_task = original_execute
    
    @given(
        num_tasks=st.integers(min_value=5, max_value=20)
    )
    @settings(max_examples=5, deadline=15000)
    async def test_property_concurrent_processing(
        self,
        async_processor: AsyncProcessorService,
        num_tasks: int
    ):
        """
        Property: Concurrent Processing
        
        Valida que:
        1. Múltiplas tarefas podem ser processadas simultaneamente
        2. Workers operam independentemente
        3. Não há condições de corrida
        4. Thread safety é mantido
        
        Requirements: 9.4
        """
        # Submeter múltiplas tarefas simultaneamente
        task_ids = []
        
        # Usar asyncio.gather para submissão concorrente
        submission_tasks = []
        
        for i in range(num_tasks):
            submission_task = async_processor.submit_task(
                task_type=TaskType.GENERATE_EMBEDDING,
                data={"text": f"Texto de teste {i}", "memory_id": f"mem_{i}"},
                priority=TaskPriority.NORMAL
            )
            submission_tasks.append(submission_task)
        
        # Aguardar todas as submissões
        task_ids = await asyncio.gather(*submission_tasks)
        
        # Property: Todas as submissões devem ter sucesso
        assert len(task_ids) == num_tasks
        assert all(isinstance(task_id, str) for task_id in task_ids)
        assert len(set(task_ids)) == num_tasks  # Todos IDs únicos
        
        # Aguardar processamento de todas as tarefas
        max_wait = 15.0
        wait_start = datetime.now()
        completed_count = 0
        
        while (datetime.now() - wait_start).total_seconds() < max_wait:
            completed_count = 0
            
            for task_id in task_ids:
                status = await async_processor.get_task_status(task_id)
                if status and status.get("status") in ["completed", "failed"]:
                    completed_count += 1
            
            if completed_count == num_tasks:
                break
                
            await asyncio.sleep(0.2)
        
        # Property: Todas as tarefas devem ter sido processadas
        assert completed_count == num_tasks, (
            f"Apenas {completed_count}/{num_tasks} tarefas foram processadas"
        )
        
        # Verificar estatísticas do serviço
        stats = await async_processor.get_service_stats()
        
        # Property: Estatísticas devem refletir processamento
        assert stats["tasks"]["total_processed"] >= num_tasks
        assert stats["service_status"] == "running"
        assert stats["workers"]["total"] > 0
    
    async def test_property_graceful_shutdown(self, async_processor: AsyncProcessorService):
        """
        Property: Graceful Shutdown
        
        Valida que:
        1. Shutdown não perde tarefas em processamento
        2. Workers terminam graciosamente
        3. Estado é limpo adequadamente
        4. Serviço pode ser reiniciado
        
        Requirements: 9.4
        """
        # Submeter algumas tarefas
        task_ids = []
        for i in range(5):
            task_id = await async_processor.submit_task(
                task_type=TaskType.UPDATE_METRICS,
                data={"metric_type": f"test_metric_{i}", "value": i},
                priority=TaskPriority.NORMAL
            )
            task_ids.append(task_id)
        
        # Aguardar início do processamento
        await asyncio.sleep(0.5)
        
        # Verificar que serviço está rodando
        stats_before = await async_processor.get_service_stats()
        assert stats_before["service_status"] == "running"
        assert stats_before["workers"]["total"] > 0
        
        # Fazer shutdown gracioso
        shutdown_start = datetime.now()
        await async_processor.stop(timeout=5.0)
        shutdown_time = (datetime.now() - shutdown_start).total_seconds()
        
        # Property: Shutdown deve ser rápido (< 5s)
        assert shutdown_time < 5.0, f"Shutdown levou {shutdown_time:.3f}s"
        
        # Property: Serviço deve estar parado
        stats_after = await async_processor.get_service_stats()
        assert stats_after["service_status"] == "stopped"
        assert stats_after["workers"]["total"] == 0
        
        # Property: Tarefas processadas devem ser mantidas
        processed_count = 0
        for task_id in task_ids:
            status = await async_processor.get_task_status(task_id)
            if status and status.get("status") == "completed":
                processed_count += 1
        
        # Pelo menos algumas tarefas devem ter sido processadas
        assert processed_count > 0, "Nenhuma tarefa foi processada antes do shutdown"
        
        # Property: Serviço pode ser reiniciado
        await async_processor.start()
        
        stats_restarted = await async_processor.get_service_stats()
        assert stats_restarted["service_status"] == "running"
        assert stats_restarted["workers"]["total"] > 0
        
        # Submeter nova tarefa para verificar funcionamento
        new_task_id = await async_processor.submit_task(
            task_type=TaskType.GENERATE_EMBEDDING,
            data={"text": "Teste após restart"},
            priority=TaskPriority.HIGH
        )
        
        # Aguardar processamento
        await asyncio.sleep(1.0)
        
        new_status = await async_processor.get_task_status(new_task_id)
        assert new_status is not None
        assert new_status.get("status") in ["completed", "processing"]


class AsyncProcessorStateMachine(RuleBasedStateMachine):
    """
    State machine para testes mais complexos do AsyncProcessorService
    
    Simula operações concorrentes e valida invariantes do sistema
    """
    
    def __init__(self):
        super().__init__()
        self.service: Optional[AsyncProcessorService] = None
        self.submitted_tasks: List[str] = []
        self.is_running = False
    
    @initialize()
    async def setup_service(self):
        """Inicializa o serviço"""
        reset_async_processor_service()
        self.service = AsyncProcessorService(max_workers=3, max_queue_size=50)
        await self.service.start()
        self.is_running = True
        self.submitted_tasks = []
    
    @rule(
        task_type=task_types,
        priority=task_priorities,
        data=task_data
    )
    async def submit_task(self, task_type: TaskType, priority: TaskPriority, data: Dict[str, Any]):
        """Submete uma tarefa"""
        assume(self.is_running)
        assume(len(self.submitted_tasks) < 30)  # Limitar para evitar overflow
        
        try:
            task_id = await self.service.submit_task(
                task_type=task_type,
                data=data,
                priority=priority
            )
            self.submitted_tasks.append(task_id)
        except RuntimeError:
            # Queue pode estar cheia, isso é aceitável
            pass
    
    @rule()
    async def check_service_stats(self):
        """Verifica estatísticas do serviço"""
        assume(self.is_running)
        
        stats = await self.service.get_service_stats()
        
        # Invariantes das estatísticas
        assert stats["service_status"] == "running"
        assert stats["workers"]["total"] > 0
        assert stats["queue"]["size"] >= 0
        assert stats["queue"]["size"] <= stats["queue"]["max_size"]
        assert stats["tasks"]["total_processed"] >= 0
        assert stats["tasks"]["total_failed"] >= 0
    
    @rule()
    async def check_task_statuses(self):
        """Verifica status das tarefas submetidas"""
        assume(self.is_running)
        assume(len(self.submitted_tasks) > 0)
        
        # Verificar alguns task IDs aleatórios
        import random
        sample_size = min(5, len(self.submitted_tasks))
        sample_tasks = random.sample(self.submitted_tasks, sample_size)
        
        for task_id in sample_tasks:
            status = await self.service.get_task_status(task_id)
            
            if status:
                # Invariantes do status
                assert status["task_id"] == task_id
                assert status["status"] in ["pending", "processing", "completed", "failed", "unknown"]
                
                if status["status"] == "completed":
                    assert status.get("processing_time") is not None
                    assert status["processing_time"] > 0
    
    @teardown()
    async def cleanup_service(self):
        """Limpa o serviço"""
        if self.service and self.is_running:
            await self.service.stop(timeout=3.0)
        
        reset_async_processor_service()
        self.is_running = False


# Teste da state machine
@settings(max_examples=5, stateful_step_count=20, deadline=30000)
class TestAsyncProcessorStateMachine(AsyncProcessorStateMachine):
    """Executa testes baseados em state machine"""
    pass


if __name__ == "__main__":
    # Executar testes específicos
    pytest.main([__file__, "-v", "--tb=short"])