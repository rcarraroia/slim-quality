#!/usr/bin/env python3
"""
Testes de carga para produção - Stress testing
"""
import asyncio
import json
import time
import statistics
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional

import httpx
import structlog

logger = structlog.get_logger(__name__)


class LoadTestRunner:
    """Runner para testes de carga em produção."""
    
    def __init__(self, base_url: str = "https://api.slimquality.com.br"):
        self.base_url = base_url
        self.results = []
        self.start_time = time.time()
    
    async def single_request(self, session: httpx.AsyncClient, endpoint: str) -> Dict[str, Any]:
        """Executa uma única requisição."""
        start_time = time.time()
        
        try:
            response = await session.get(f"{self.base_url}{endpoint}")
            duration = (time.time() - start_time) * 1000
            
            return {
                "success": True,
                "status_code": response.status_code,
                "duration_ms": duration,
                "response_size": len(response.content)
            }
        except Exception as e:
            duration = (time.time() - start_time) * 1000
            return {
                "success": False,
                "status_code": 0,
                "duration_ms": duration,
                "error": str(e)
            }
    
    async def load_test_endpoint(self, endpoint: str, concurrent_users: int, 
                               requests_per_user: int, description: str) -> Dict[str, Any]:
        """
        Executa teste de carga em um endpoint específico.
        
        Args:
            endpoint: Endpoint a ser testado
            concurrent_users: Número de usuários simultâneos
            requests_per_user: Requisições por usuário
            description: Descrição do teste
        """
        test_start = time.time()
        
        logger.info(f"🚀 Iniciando teste de carga: {description}")
        logger.info(f"   Endpoint: {endpoint}")
        logger.info(f"   Usuários simultâneos: {concurrent_users}")
        logger.info(f"   Requisições por usuário: {requests_per_user}")
        
        total_requests = concurrent_users * requests_per_user
        all_results = []
        
        try:
            # Criar sessões HTTP para cada usuário
            async with httpx.AsyncClient(
                timeout=httpx.Timeout(30.0),
                limits=httpx.Limits(max_connections=concurrent_users * 2)
            ) as client:
                
                async def user_session():
                    """Simula um usuário fazendo múltiplas requisições."""
                    user_results = []
                    for _ in range(requests_per_user):
                        result = await self.single_request(client, endpoint)
                        user_results.append(result)
                        # Pequeno delay entre requisições do mesmo usuário
                        await asyncio.sleep(0.1)
                    return user_results
                
                # Executar todos os usuários simultaneamente
                user_tasks = [user_session() for _ in range(concurrent_users)]
                user_results_list = await asyncio.gather(*user_tasks)
                
                # Flatten results
                for user_results in user_results_list:
                    all_results.extend(user_results)
            
            # Calcular estatísticas
            successful_requests = [r for r in all_results if r["success"]]
            failed_requests = [r for r in all_results if not r["success"]]
            
            success_count = len(successful_requests)
            failure_count = len(failed_requests)
            success_rate = (success_count / total_requests) * 100 if total_requests > 0 else 0
            
            # Estatísticas de tempo de resposta
            response_times = [r["duration_ms"] for r in successful_requests]
            
            if response_times:
                avg_response = statistics.mean(response_times)
                median_response = statistics.median(response_times)
                p95_response = statistics.quantiles(response_times, n=20)[18] if len(response_times) >= 20 else max(response_times)
                p99_response = statistics.quantiles(response_times, n=100)[98] if len(response_times) >= 100 else max(response_times)
                min_response = min(response_times)
                max_response = max(response_times)
            else:
                avg_response = median_response = p95_response = p99_response = min_response = max_response = 0
            
            # Throughput (requisições por segundo)
            total_duration = time.time() - test_start
            throughput = total_requests / total_duration if total_duration > 0 else 0
            
            # Status codes
            status_codes = {}
            for result in all_results:
                code = result.get("status_code", 0)
                status_codes[code] = status_codes.get(code, 0) + 1
            
            # Avaliar se o teste passou
            test_passed = (
                success_rate >= 95 and  # 95% de sucesso
                avg_response < 2000 and  # Média < 2s
                p95_response < 5000  # P95 < 5s
            )
            
            result = {
                "test": description,
                "endpoint": endpoint,
                "success": test_passed,
                "duration_seconds": round(total_duration, 2),
                "concurrent_users": concurrent_users,
                "requests_per_user": requests_per_user,
                "total_requests": total_requests,
                "successful_requests": success_count,
                "failed_requests": failure_count,
                "success_rate": round(success_rate, 2),
                "throughput_rps": round(throughput, 2),
                "response_times": {
                    "avg_ms": round(avg_response, 2),
                    "median_ms": round(median_response, 2),
                    "p95_ms": round(p95_response, 2),
                    "p99_ms": round(p99_response, 2),
                    "min_ms": round(min_response, 2),
                    "max_ms": round(max_response, 2)
                },
                "status_codes": status_codes,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            if test_passed:
                logger.info(f"✅ {description} - {success_rate:.1f}% sucesso, {avg_response:.0f}ms médio, {throughput:.1f} RPS")
            else:
                logger.warning(f"⚠️ {description} - {success_rate:.1f}% sucesso, {avg_response:.0f}ms médio, {throughput:.1f} RPS")
            
            self.results.append(result)
            return result
            
        except Exception as e:
            total_duration = time.time() - test_start
            
            result = {
                "test": description,
                "endpoint": endpoint,
                "success": False,
                "duration_seconds": round(total_duration, 2),
                "error": str(e),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            logger.error(f"❌ Exceção no teste de carga {description}: {e}")
            self.results.append(result)
            return result
    
    async def memory_leak_test(self) -> Dict[str, Any]:
        """Testa vazamentos de memória com requisições prolongadas."""
        test_start = time.time()
        
        logger.info("🧠 Iniciando teste de vazamento de memória...")
        
        try:
            # Fazer muitas requisições sequenciais para detectar vazamentos
            num_requests = 100
            results = []
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                for i in range(num_requests):
                    result = await self.single_request(client, "/health")
                    results.append(result)
                    
                    # Log progresso a cada 25 requisições
                    if (i + 1) % 25 == 0:
                        logger.info(f"   Progresso: {i + 1}/{num_requests} requisições")
                    
                    # Pequeno delay
                    await asyncio.sleep(0.05)
            
            # Analisar tendências de tempo de resposta
            successful_results = [r for r in results if r["success"]]
            response_times = [r["duration_ms"] for r in successful_results]
            
            if len(response_times) >= 50:
                # Comparar primeira metade com segunda metade
                first_half = response_times[:len(response_times)//2]
                second_half = response_times[len(response_times)//2:]
                
                avg_first = statistics.mean(first_half)
                avg_second = statistics.mean(second_half)
                
                # Se segunda metade é significativamente mais lenta, pode indicar vazamento
                degradation_percent = ((avg_second - avg_first) / avg_first) * 100 if avg_first > 0 else 0
                
                # Considerar problemático se degradação > 50%
                memory_leak_detected = degradation_percent > 50
            else:
                avg_first = avg_second = degradation_percent = 0
                memory_leak_detected = False
            
            success_rate = (len(successful_results) / num_requests) * 100
            total_duration = time.time() - test_start
            
            result = {
                "test": "Teste de Vazamento de Memória",
                "success": not memory_leak_detected and success_rate >= 95,
                "duration_seconds": round(total_duration, 2),
                "total_requests": num_requests,
                "successful_requests": len(successful_results),
                "success_rate": round(success_rate, 2),
                "avg_response_first_half_ms": round(avg_first, 2),
                "avg_response_second_half_ms": round(avg_second, 2),
                "performance_degradation_percent": round(degradation_percent, 2),
                "memory_leak_detected": memory_leak_detected,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            if result["success"]:
                logger.info(f"✅ Teste de memória OK - {degradation_percent:.1f}% degradação")
            else:
                logger.warning(f"⚠️ Possível vazamento de memória - {degradation_percent:.1f}% degradação")
            
            self.results.append(result)
            return result
            
        except Exception as e:
            total_duration = time.time() - test_start
            
            result = {
                "test": "Teste de Vazamento de Memória",
                "success": False,
                "duration_seconds": round(total_duration, 2),
                "error": str(e),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            logger.error(f"❌ Exceção no teste de memória: {e}")
            self.results.append(result)
            return result
    
    async def run_all_load_tests(self) -> Dict[str, Any]:
        """Executa todos os testes de carga."""
        logger.info("⚡ Iniciando testes de carga de produção...")
        
        # Testes de carga progressivos
        tests = [
            # Teste leve
            self.load_test_endpoint(
                "/health", 5, 10, 
                "Teste Leve - 5 usuários, 10 req/usuário"
            ),
            
            # Teste moderado
            self.load_test_endpoint(
                "/health", 20, 5,
                "Teste Moderado - 20 usuários, 5 req/usuário"
            ),
            
            # Teste de pico
            self.load_test_endpoint(
                "/health", 50, 2,
                "Teste de Pico - 50 usuários, 2 req/usuário"
            ),
            
            # Teste de webhook
            self.load_test_endpoint(
                "/webhooks/metrics", 10, 5,
                "Teste Webhook Metrics - 10 usuários, 5 req/usuário"
            ),
            
            # Teste de vazamento de memória
            self.memory_leak_test()
        ]
        
        # Executar testes sequencialmente (não simultâneos para não sobrecarregar)
        for test in tests:
            await test
            # Pausa entre testes para recuperação
            await asyncio.sleep(2)
        
        # Calcular estatísticas gerais
        total_tests = len(self.results)
        successful_tests = len([r for r in self.results if r.get("success", False)])
        failed_tests = total_tests - successful_tests
        success_rate = (successful_tests / total_tests) * 100 if total_tests > 0 else 0
        
        total_duration = time.time() - self.start_time
        
        summary = {
            "load_tests_summary": {
                "total_tests": total_tests,
                "successful_tests": successful_tests,
                "failed_tests": failed_tests,
                "success_rate": round(success_rate, 1),
                "total_duration_seconds": round(total_duration, 2),
                "timestamp": datetime.now(timezone.utc).isoformat()
            },
            "test_results": self.results
        }
        
        # Log do resumo
        if success_rate >= 80:
            logger.info(
                f"✅ Testes de carga concluídos - {success_rate:.1f}% sucesso ({successful_tests}/{total_tests})"
            )
        else:
            logger.error(
                f"❌ Testes de carga falharam - {success_rate:.1f}% sucesso ({successful_tests}/{total_tests})"
            )
        
        return summary


async def main():
    """Função principal para executar testes de carga."""
    import sys
    
    # URL base (pode ser passada como argumento)
    base_url = sys.argv[1] if len(sys.argv) > 1 else "https://api.slimquality.com.br"
    
    print(f"⚡ Executando testes de carga em: {base_url}")
    print("=" * 50)
    print("⚠️  ATENÇÃO: Testes de carga podem impactar o sistema temporariamente")
    print("")
    
    runner = LoadTestRunner(base_url)
    summary = await runner.run_all_load_tests()
    
    # Imprimir resumo
    print("\n📊 RESUMO DOS TESTES DE CARGA")
    print("=" * 35)
    
    stats = summary["load_tests_summary"]
    print(f"Total de testes: {stats['total_tests']}")
    print(f"Sucessos: {stats['successful_tests']}")
    print(f"Falhas: {stats['failed_tests']}")
    print(f"Taxa de sucesso: {stats['success_rate']}%")
    print(f"Duração total: {stats['total_duration_seconds']}s")
    
    # Salvar resultados
    with open("load_tests_results.json", "w") as f:
        json.dump(summary, f, indent=2)
    
    print(f"\n📄 Resultados salvos em: load_tests_results.json")
    
    # Exit code baseado no sucesso
    if stats["success_rate"] >= 80:
        print("✅ Testes de carga PASSARAM!")
        sys.exit(0)
    else:
        print("❌ Testes de carga FALHARAM!")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())