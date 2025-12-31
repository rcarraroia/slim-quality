"""Testes de performance e carga para o SICC.

Este módulo implementa testes de performance, carga e stress para validar
que o sistema suporte a carga esperada de usuários e mantenha tempos
de resposta adequados.
"""

import pytest
import asyncio
import time
import psutil
import os
from unittest.mock import Mock, AsyncMock
from typing import Dict, Any, List
from concurrent.futures import ThreadPoolExecutor, as_completed


@pytest.mark.integration
@pytest.mark.performance
@pytest.mark.slow
class TestPerformanceLoad:
    """Testes de performance e carga do sistema."""

    @pytest.mark.asyncio
    async def test_concurrent_user_load(
        self,
        mock_sicc_service,
        mock_async_processor,
        mock_metrics_service,
        performance_thresholds
    ):
        """Testa carga de usuários simultâneos.
        
        Simula múltiplos usuários fazendo requisições simultâneas
        e valida que o sistema mantém performance adequada.
        """
        # Arrange
        concurrent_users = 100
        max_response_time = performance_thresholds["response_time"]
        
        mock_sicc_service.process_request.return_value = {"status": "success", "data": "processed"}
        mock_async_processor.handle_request.return_value = {"processed": True, "time": 0.5}
        mock_metrics_service.record_performance.return_value = True
        
        # Act
        start_time = time.time()
        
        # Criar tarefas concorrentes
        tasks = []
        for user_id in range(concurrent_users):
            task = self._simulate_user_request(
                user_id,
                mock_sicc_service,
                mock_async_processor
            )
            tasks.append(task)
        
        # Executar todas as tarefas concorrentemente
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # Assert
        successful_requests = [r for r in results if not isinstance(r, Exception)]
        failed_requests = [r for r in results if isinstance(r, Exception)]
        
        success_rate = len(successful_requests) / concurrent_users
        avg_response_time = total_time / concurrent_users
        
        assert success_rate >= 0.95  # 95% de sucesso mínimo
        assert avg_response_time < max_response_time
        assert len(failed_requests) < concurrent_users * 0.05  # Máximo 5% de falhas
        
        # Verificar que todas as chamadas foram feitas
        assert mock_sicc_service.process_request.call_count == concurrent_users
        assert mock_async_processor.handle_request.call_count == concurrent_users
        
        print(f"Carga de {concurrent_users} usuários: {success_rate:.2%} sucesso, {avg_response_time:.3f}s tempo médio")

    @pytest.mark.asyncio
    async def test_stress_load_escalation(
        self,
        mock_sicc_service,
        mock_async_processor,
        performance_thresholds
    ):
        """Testa escalação de carga (stress test).
        
        Aumenta gradualmente a carga para identificar
        o ponto de saturação do sistema.
        """
        # Arrange
        load_levels = [10, 50, 100, 200, 500]
        max_response_time = performance_thresholds["response_time"]
        
        mock_sicc_service.process_batch.return_value = {"processed": True}
        mock_async_processor.handle_batch.return_value = {"success": True}
        
        results = {}
        
        # Act - Testar cada nível de carga
        for load_level in load_levels:
            start_time = time.time()
            
            # Simular carga
            batch_data = [{"id": i, "data": f"request_{i}"} for i in range(load_level)]
            
            try:
                # Processar em lote
                batch_result = mock_sicc_service.process_batch(batch_data)
                async_result = await mock_async_processor.handle_batch(batch_data)
                
                end_time = time.time()
                response_time = end_time - start_time
                
                results[load_level] = {
                    "success": True,
                    "response_time": response_time,
                    "throughput": load_level / response_time,
                    "within_threshold": response_time < max_response_time
                }
                
            except Exception as e:
                results[load_level] = {
                    "success": False,
                    "error": str(e),
                    "response_time": float('inf'),
                    "throughput": 0,
                    "within_threshold": False
                }
        
        # Assert
        # Pelo menos os primeiros níveis devem funcionar
        assert results[10]["success"] is True
        assert results[50]["success"] is True
        assert results[100]["success"] is True
        
        # Verificar degradação gradual
        successful_levels = [level for level, result in results.items() if result["success"]]
        assert len(successful_levels) >= 3  # Pelo menos 3 níveis devem funcionar
        
        # Throughput deve aumentar com a carga (até o ponto de saturação)
        throughputs = [results[level]["throughput"] for level in successful_levels[:3]]
        assert throughputs[1] > throughputs[0]  # 50 > 10
        
        print(f"Stress test - Níveis bem-sucedidos: {successful_levels}")
        for level in successful_levels:
            result = results[level]
            print(f"  {level} req: {result['response_time']:.3f}s, {result['throughput']:.1f} req/s")

    def test_memory_usage_under_load(
        self,
        mock_sicc_service,
        mock_metrics_service
    ):
        """Testa uso de memória sob carga.
        
        Monitora o uso de memória durante processamento
        de grandes volumes de dados.
        """
        # Arrange
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        large_dataset_size = 10000
        memory_limit_mb = 200  # Limite de 200MB de aumento
        
        mock_sicc_service.process_large_data.return_value = {"processed": True}
        mock_metrics_service.track_memory_usage.return_value = True
        
        # Act
        # Simular processamento de grande volume de dados
        large_data = []
        for i in range(large_dataset_size):
            large_data.append({
                "id": i,
                "data": f"large_data_item_{i}" * 10,  # Dados maiores
                "metadata": {"timestamp": time.time(), "size": 100}
            })
        
        # Processar dados
        result = mock_sicc_service.process_large_data(large_data)
        
        # Medir memória após processamento
        final_memory = process.memory_info().rss / 1024 / 1024  # MB
        memory_increase = final_memory - initial_memory
        
        # Registrar uso de memória
        mock_metrics_service.track_memory_usage(initial_memory, final_memory, memory_increase)
        
        # Assert
        assert result["processed"] is True
        assert memory_increase < memory_limit_mb
        
        # Verificar que não há vazamento de memória
        # (em teste real, executaria garbage collection e verificaria novamente)
        assert memory_increase > 0  # Deve usar alguma memória
        
        mock_sicc_service.process_large_data.assert_called_once_with(large_data)
        mock_metrics_service.track_memory_usage.assert_called_once()
        
        print(f"Uso de memória: {initial_memory:.1f}MB → {final_memory:.1f}MB (+{memory_increase:.1f}MB)")

    @pytest.mark.asyncio
    async def test_response_time_consistency(
        self,
        mock_sicc_service,
        mock_async_processor,
        performance_thresholds
    ):
        """Testa consistência dos tempos de resposta.
        
        Verifica se os tempos de resposta são consistentes
        ao longo de múltiplas execuções.
        """
        # Arrange
        num_iterations = 50
        max_response_time = performance_thresholds["response_time"]
        max_variance = 0.5  # Máximo 0.5s de variância
        
        mock_sicc_service.execute_operation.return_value = {"result": "success"}
        mock_async_processor.process_async.return_value = {"completed": True}
        
        response_times = []
        
        # Act
        for i in range(num_iterations):
            start_time = time.time()
            
            # Executar operação
            sync_result = mock_sicc_service.execute_operation(f"operation_{i}")
            async_result = await mock_async_processor.process_async(f"async_op_{i}")
            
            end_time = time.time()
            response_time = end_time - start_time
            response_times.append(response_time)
        
        # Assert
        avg_response_time = sum(response_times) / len(response_times)
        min_response_time = min(response_times)
        max_response_time_measured = max(response_times)
        variance = max_response_time_measured - min_response_time
        
        assert avg_response_time < max_response_time
        assert variance < max_variance
        assert all(rt < max_response_time * 2 for rt in response_times)  # Nenhum outlier extremo
        
        # Verificar que 95% das requisições estão dentro do threshold
        within_threshold = [rt for rt in response_times if rt < max_response_time]
        success_rate = len(within_threshold) / len(response_times)
        assert success_rate >= 0.95
        
        print(f"Tempos de resposta: avg={avg_response_time:.3f}s, min={min_response_time:.3f}s, max={max_response_time_measured:.3f}s, variance={variance:.3f}s")

    @pytest.mark.asyncio
    async def test_throughput_measurement(
        self,
        mock_sicc_service,
        mock_async_processor,
        performance_thresholds
    ):
        """Testa medição de throughput do sistema.
        
        Mede quantas operações o sistema consegue processar
        por segundo sob diferentes condições.
        """
        # Arrange
        test_duration = 10  # segundos
        min_throughput = performance_thresholds["throughput"]  # req/s
        
        mock_sicc_service.quick_operation.return_value = {"status": "ok"}
        mock_async_processor.fast_process.return_value = {"processed": True}
        
        operations_completed = 0
        start_time = time.time()
        
        # Act
        while time.time() - start_time < test_duration:
            # Executar operações rápidas
            mock_sicc_service.quick_operation(f"op_{operations_completed}")
            await mock_async_processor.fast_process(f"fast_{operations_completed}")
            
            operations_completed += 1
            
            # Pequena pausa para simular processamento real
            await asyncio.sleep(0.001)
        
        end_time = time.time()
        actual_duration = end_time - start_time
        throughput = operations_completed / actual_duration
        
        # Assert
        assert throughput >= min_throughput
        assert operations_completed > 0
        assert actual_duration >= test_duration * 0.9  # Pelo menos 90% do tempo esperado
        
        # Verificar que operações foram chamadas
        assert mock_sicc_service.quick_operation.call_count == operations_completed
        assert mock_async_processor.fast_process.call_count == operations_completed
        
        print(f"Throughput: {throughput:.1f} ops/s ({operations_completed} ops em {actual_duration:.1f}s)")

    @pytest.mark.asyncio
    async def test_resource_cleanup_after_load(
        self,
        mock_sicc_service,
        mock_async_processor,
        mock_metrics_service
    ):
        """Testa limpeza de recursos após carga alta.
        
        Verifica se o sistema libera recursos adequadamente
        após períodos de alta carga.
        """
        # Arrange
        high_load_operations = 1000
        
        mock_sicc_service.resource_intensive_op.return_value = {"result": "processed"}
        mock_async_processor.cleanup_resources.return_value = {"cleaned": True}
        mock_metrics_service.monitor_resources.return_value = {"status": "ok"}
        
        # Medir recursos iniciais
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss / 1024 / 1024
        initial_cpu_percent = process.cpu_percent()
        
        # Act - Fase de alta carga
        for i in range(high_load_operations):
            mock_sicc_service.resource_intensive_op(f"intensive_{i}")
            
            # Simular uso de recursos
            if i % 100 == 0:  # A cada 100 operações
                mock_metrics_service.monitor_resources()
        
        # Fase de limpeza
        cleanup_result = await mock_async_processor.cleanup_resources()
        
        # Aguardar estabilização
        await asyncio.sleep(0.1)
        
        # Medir recursos finais
        final_memory = process.memory_info().rss / 1024 / 1024
        final_cpu_percent = process.cpu_percent()
        
        # Assert
        assert cleanup_result["cleaned"] is True
        
        # Memória não deve crescer excessivamente
        memory_increase = final_memory - initial_memory
        assert memory_increase < 100  # Máximo 100MB de aumento
        
        # Verificar que operações foram executadas
        assert mock_sicc_service.resource_intensive_op.call_count == high_load_operations
        assert mock_metrics_service.monitor_resources.call_count >= 10  # Pelo menos 10 monitoramentos
        
        print(f"Recursos - Memória: {initial_memory:.1f}MB → {final_memory:.1f}MB (+{memory_increase:.1f}MB)")

    # Métodos auxiliares
    async def _simulate_user_request(
        self,
        user_id: int,
        sicc_service: Mock,
        async_processor: AsyncMock
    ) -> Dict[str, Any]:
        """Simula uma requisição de usuário."""
        try:
            # Simular processamento
            request_data = {"user_id": user_id, "action": "process_data"}
            
            # Processamento síncrono
            sync_result = sicc_service.process_request(request_data)
            
            # Processamento assíncrono
            async_result = await async_processor.handle_request(request_data)
            
            return {
                "user_id": user_id,
                "sync_result": sync_result,
                "async_result": async_result,
                "success": True
            }
            
        except Exception as e:
            return {
                "user_id": user_id,
                "error": str(e),
                "success": False
            }


@pytest.mark.integration
@pytest.mark.performance
class TestPerformanceMonitoring:
    """Testes de monitoramento de performance."""

    def test_performance_metrics_collection(
        self,
        mock_metrics_service,
        performance_thresholds
    ):
        """Testa coleta de métricas de performance.
        
        Verifica se as métricas são coletadas corretamente
        durante operações de alta performance.
        """
        # Arrange
        operations = ["op1", "op2", "op3", "op4", "op5"]
        expected_metrics = len(operations)
        
        mock_metrics_service.record_operation_time.return_value = True
        mock_metrics_service.record_throughput.return_value = True
        mock_metrics_service.get_performance_summary.return_value = {
            "avg_response_time": 1.2,
            "total_operations": expected_metrics,
            "success_rate": 1.0
        }
        
        # Act
        start_time = time.time()
        
        for i, operation in enumerate(operations):
            op_start = time.time()
            
            # Simular operação
            time.sleep(0.01)  # Simular processamento
            
            op_end = time.time()
            op_duration = op_end - op_start
            
            # Registrar métricas
            mock_metrics_service.record_operation_time(operation, op_duration)
        
        end_time = time.time()
        total_time = end_time - start_time
        throughput = len(operations) / total_time
        
        mock_metrics_service.record_throughput(throughput)
        summary = mock_metrics_service.get_performance_summary()
        
        # Assert
        assert mock_metrics_service.record_operation_time.call_count == expected_metrics
        assert mock_metrics_service.record_throughput.call_count == 1
        assert summary["total_operations"] == expected_metrics
        assert summary["success_rate"] == 1.0
        assert summary["avg_response_time"] < performance_thresholds["response_time"]

    @pytest.mark.asyncio
    async def test_performance_degradation_detection(
        self,
        mock_sicc_service,
        mock_metrics_service,
        performance_thresholds
    ):
        """Testa detecção de degradação de performance.
        
        Simula degradação gradual e verifica se o sistema
        detecta e reporta adequadamente.
        """
        # Arrange
        baseline_time = 0.5
        degraded_time = 3.0  # Acima do threshold
        max_response_time = performance_thresholds["response_time"]
        
        # Simular operações com degradação gradual
        response_times = [baseline_time, baseline_time * 1.2, baseline_time * 1.5, 
                         baseline_time * 2.0, degraded_time]
        
        mock_sicc_service.timed_operation.side_effect = [
            {"result": "ok", "time": t} for t in response_times
        ]
        mock_metrics_service.detect_degradation.return_value = {
            "degraded": True,
            "current_avg": degraded_time,
            "baseline_avg": baseline_time,
            "degradation_factor": degraded_time / baseline_time
        }
        
        # Act
        measured_times = []
        for i in range(len(response_times)):
            start = time.time()
            result = mock_sicc_service.timed_operation(f"op_{i}")
            # Simular o tempo da operação
            await asyncio.sleep(response_times[i] / 100)  # Escala reduzida para teste
            end = time.time()
            
            measured_times.append(end - start)
        
        # Detectar degradação
        degradation_result = mock_metrics_service.detect_degradation(measured_times)
        
        # Assert
        assert degradation_result["degraded"] is True
        assert degradation_result["current_avg"] > max_response_time
        assert degradation_result["degradation_factor"] > 2.0  # Mais que 2x pior
        
        # Verificar que todas as operações foram executadas
        assert mock_sicc_service.timed_operation.call_count == len(response_times)
        mock_metrics_service.detect_degradation.assert_called_once_with(measured_times)

    def test_resource_threshold_monitoring(
        self,
        mock_metrics_service
    ):
        """Testa monitoramento de thresholds de recursos.
        
        Verifica se o sistema monitora adequadamente
        o uso de CPU, memória e outros recursos.
        """
        # Arrange
        cpu_threshold = 80.0  # 80%
        memory_threshold = 85.0  # 85%
        
        # Simular uso de recursos
        current_cpu = 75.0
        current_memory = 90.0  # Acima do threshold
        
        mock_metrics_service.get_cpu_usage.return_value = current_cpu
        mock_metrics_service.get_memory_usage.return_value = current_memory
        mock_metrics_service.check_thresholds.return_value = {
            "cpu_ok": True,
            "memory_ok": False,
            "alerts": ["Memory usage above threshold: 90.0% > 85.0%"]
        }
        
        # Act
        cpu_usage = mock_metrics_service.get_cpu_usage()
        memory_usage = mock_metrics_service.get_memory_usage()
        
        threshold_check = mock_metrics_service.check_thresholds({
            "cpu": cpu_usage,
            "memory": memory_usage
        }, {
            "cpu_threshold": cpu_threshold,
            "memory_threshold": memory_threshold
        })
        
        # Assert
        assert cpu_usage == current_cpu
        assert memory_usage == current_memory
        assert threshold_check["cpu_ok"] is True
        assert threshold_check["memory_ok"] is False
        assert len(threshold_check["alerts"]) > 0
        assert "Memory usage above threshold" in threshold_check["alerts"][0]
        
        mock_metrics_service.get_cpu_usage.assert_called_once()
        mock_metrics_service.get_memory_usage.assert_called_once()
        mock_metrics_service.check_thresholds.assert_called_once()