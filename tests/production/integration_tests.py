#!/usr/bin/env python3
"""
Testes de integração para produção - Fluxo completo
"""
import asyncio
import json
import time
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional

import httpx
import structlog

logger = structlog.get_logger(__name__)


class IntegrationTestRunner:
    """Runner para testes de integração em produção."""
    
    def __init__(self, base_url: str = "https://api.slimquality.com.br"):
        self.base_url = base_url
        self.client = httpx.AsyncClient(timeout=60.0)
        self.results = []
        self.start_time = time.time()
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.aclose()
    
    async def test_webhook_integration(self) -> Dict[str, Any]:
        """Testa integração completa de webhook."""
        test_start = time.time()
        test_id = str(uuid.uuid4())[:8]
        
        logger.info(f"🔗 Testando integração webhook - ID: {test_id}")
        
        try:
            # 1. Obter métricas iniciais
            initial_response = await self.client.get(f"{self.base_url}/webhooks/metrics")
            initial_metrics = initial_response.json() if initial_response.status_code == 200 else {}
            initial_received = initial_metrics.get("metrics", {}).get("received", 0)
            
            # 2. Enviar webhook simulado
            webhook_payload = {
                "event": "messages.upsert",
                "instance": f"integration-test-{test_id}",
                "data": {
                    "key": {
                        "remoteJid": "5511999999999@s.whatsapp.net",
                        "fromMe": False,
                        "id": f"test_message_{test_id}"
                    },
                    "message": {
                        "conversation": f"Teste de integração {test_id} - {datetime.now().isoformat()}"
                    },
                    "messageTimestamp": int(time.time()),
                    "pushName": "Integration Test"
                },
                "destination": "5511999999999@s.whatsapp.net",
                "date_time": datetime.now(timezone.utc).isoformat()
            }
            
            webhook_response = await self.client.post(
                f"{self.base_url}/webhooks/evolution",
                json=webhook_payload,
                headers={"Content-Type": "application/json"}
            )
            
            webhook_success = webhook_response.status_code == 200
            webhook_data = webhook_response.json() if webhook_success else {}
            
            # 3. Aguardar processamento
            await asyncio.sleep(5)
            
            # 4. Verificar métricas atualizadas
            final_response = await self.client.get(f"{self.base_url}/webhooks/metrics")
            final_metrics = final_response.json() if final_response.status_code == 200 else {}
            final_received = final_metrics.get("metrics", {}).get("received", 0)
            
            # 5. Validar processamento
            metrics_updated = final_received > initial_received
            
            duration = (time.time() - test_start) * 1000
            
            result = {
                "test": "Integração Webhook Completa",
                "test_id": test_id,
                "success": webhook_success and metrics_updated,
                "duration_ms": round(duration, 2),
                "webhook_accepted": webhook_success,
                "webhook_status": webhook_response.status_code,
                "metrics_updated": metrics_updated,
                "initial_received": initial_received,
                "final_received": final_received,
                "webhook_request_id": webhook_data.get("request_id"),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            if result["success"]:
                logger.info(f"✅ Integração webhook OK - ID: {test_id}", **result)
            else:
                logger.error(f"❌ Integração webhook falhou - ID: {test_id}", **result)
            
            self.results.append(result)
            return result
            
        except Exception as e:
            duration = (time.time() - test_start) * 1000
            
            result = {
                "test": "Integração Webhook Completa",
                "test_id": test_id,
                "success": False,
                "duration_ms": round(duration, 2),
                "error": str(e),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            logger.error(f"❌ Exceção na integração webhook: {e}", **result)
            self.results.append(result)
            return result
    
    async def test_health_check_integration(self) -> Dict[str, Any]:
        """Testa integração do health check com todos os serviços."""
        test_start = time.time()
        
        try:
            response = await self.client.get(f"{self.base_url}/health")
            duration = (time.time() - test_start) * 1000
            
            if response.status_code == 200:
                health_data = response.json()
                
                # Verificar estrutura esperada
                required_fields = ["status", "timestamp", "services"]
                has_required_fields = all(field in health_data for field in required_fields)
                
                # Verificar serviços
                services = health_data.get("services", {})
                expected_services = ["redis", "supabase", "claude", "sicc"]
                
                service_status = {}
                for service in expected_services:
                    if service in services:
                        service_info = services[service]
                        service_status[service] = service_info.get("status") == "up"
                    else:
                        service_status[service] = False
                
                # Calcular saúde geral
                healthy_services = sum(service_status.values())
                total_services = len(expected_services)
                health_percentage = (healthy_services / total_services) * 100
                
                overall_healthy = health_percentage >= 75  # 75% dos serviços OK
                
                result = {
                    "test": "Health Check Integração",
                    "success": overall_healthy and has_required_fields,
                    "duration_ms": round(duration, 2),
                    "status_code": response.status_code,
                    "has_required_fields": has_required_fields,
                    "health_percentage": round(health_percentage, 1),
                    "healthy_services": healthy_services,
                    "total_services": total_services,
                    "service_status": service_status,
                    "overall_status": health_data.get("status"),
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
                
                if result["success"]:
                    logger.info(f"✅ Health check integração OK - {health_percentage:.1f}% serviços saudáveis", **result)
                else:
                    logger.warning(f"⚠️ Health check integração parcial - {health_percentage:.1f}% serviços saudáveis", **result)
            else:
                result = {
                    "test": "Health Check Integração",
                    "success": False,
                    "duration_ms": round(duration, 2),
                    "status_code": response.status_code,
                    "error": f"Status code inesperado: {response.status_code}",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
                
                logger.error(f"❌ Health check falhou - Status: {response.status_code}", **result)
            
            self.results.append(result)
            return result
            
        except Exception as e:
            duration = (time.time() - test_start) * 1000
            
            result = {
                "test": "Health Check Integração",
                "success": False,
                "duration_ms": round(duration, 2),
                "error": str(e),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            logger.error(f"❌ Exceção no health check: {e}", **result)
            self.results.append(result)
            return result
    
    async def test_api_endpoints_integration(self) -> Dict[str, Any]:
        """Testa integração de múltiplos endpoints da API."""
        test_start = time.time()
        
        # Endpoints para testar
        endpoints = [
            {"path": "/", "description": "Root endpoint"},
            {"path": "/health", "description": "Health check"},
            {"path": "/docs", "description": "API documentation"},
            {"path": "/openapi.json", "description": "OpenAPI schema"},
            {"path": "/webhooks/metrics", "description": "Webhook metrics"}
        ]
        
        results = []
        
        try:
            for endpoint in endpoints:
                endpoint_start = time.time()
                
                try:
                    response = await self.client.get(f"{self.base_url}{endpoint['path']}")
                    endpoint_duration = (time.time() - endpoint_start) * 1000
                    
                    endpoint_result = {
                        "path": endpoint["path"],
                        "description": endpoint["description"],
                        "status_code": response.status_code,
                        "success": response.status_code == 200,
                        "duration_ms": round(endpoint_duration, 2)
                    }
                    
                    results.append(endpoint_result)
                    
                except Exception as e:
                    endpoint_duration = (time.time() - endpoint_start) * 1000
                    
                    endpoint_result = {
                        "path": endpoint["path"],
                        "description": endpoint["description"],
                        "status_code": 0,
                        "success": False,
                        "duration_ms": round(endpoint_duration, 2),
                        "error": str(e)
                    }
                    
                    results.append(endpoint_result)
            
            # Calcular estatísticas
            total_endpoints = len(results)
            successful_endpoints = len([r for r in results if r["success"]])
            success_rate = (successful_endpoints / total_endpoints) * 100
            avg_duration = sum(r["duration_ms"] for r in results) / total_endpoints
            
            total_duration = (time.time() - test_start) * 1000
            
            result = {
                "test": "API Endpoints Integração",
                "success": success_rate >= 80,  # 80% dos endpoints OK
                "duration_ms": round(total_duration, 2),
                "total_endpoints": total_endpoints,
                "successful_endpoints": successful_endpoints,
                "success_rate": round(success_rate, 1),
                "avg_endpoint_duration_ms": round(avg_duration, 2),
                "endpoint_results": results,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            if result["success"]:
                logger.info(f"✅ API endpoints integração OK - {success_rate:.1f}% sucesso", **result)
            else:
                logger.error(f"❌ API endpoints integração falhou - {success_rate:.1f}% sucesso", **result)
            
            self.results.append(result)
            return result
            
        except Exception as e:
            total_duration = (time.time() - test_start) * 1000
            
            result = {
                "test": "API Endpoints Integração",
                "success": False,
                "duration_ms": round(total_duration, 2),
                "error": str(e),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            logger.error(f"❌ Exceção nos endpoints: {e}", **result)
            self.results.append(result)
            return result
    
    async def test_performance_under_load(self) -> Dict[str, Any]:
        """Testa performance sob carga moderada."""
        test_start = time.time()
        
        try:
            # Fazer múltiplas requisições simultâneas
            concurrent_requests = 10
            
            async def make_request():
                req_start = time.time()
                try:
                    response = await self.client.get(f"{self.base_url}/health")
                    req_duration = (time.time() - req_start) * 1000
                    return {
                        "success": response.status_code == 200,
                        "status_code": response.status_code,
                        "duration_ms": req_duration
                    }
                except Exception as e:
                    req_duration = (time.time() - req_start) * 1000
                    return {
                        "success": False,
                        "status_code": 0,
                        "duration_ms": req_duration,
                        "error": str(e)
                    }
            
            # Executar requisições concorrentes
            tasks = [make_request() for _ in range(concurrent_requests)]
            request_results = await asyncio.gather(*tasks)
            
            # Calcular estatísticas
            successful_requests = len([r for r in request_results if r["success"]])
            success_rate = (successful_requests / concurrent_requests) * 100
            
            durations = [r["duration_ms"] for r in request_results if "duration_ms" in r]
            avg_duration = sum(durations) / len(durations) if durations else 0
            max_duration = max(durations) if durations else 0
            min_duration = min(durations) if durations else 0
            
            total_duration = (time.time() - test_start) * 1000
            
            # Avaliar performance
            performance_ok = success_rate >= 90 and avg_duration < 1000  # 90% sucesso e < 1s
            
            result = {
                "test": "Performance Sob Carga",
                "success": performance_ok,
                "duration_ms": round(total_duration, 2),
                "concurrent_requests": concurrent_requests,
                "successful_requests": successful_requests,
                "success_rate": round(success_rate, 1),
                "avg_response_ms": round(avg_duration, 2),
                "min_response_ms": round(min_duration, 2),
                "max_response_ms": round(max_duration, 2),
                "request_results": request_results,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            if result["success"]:
                logger.info(f"✅ Performance sob carga OK - {success_rate:.1f}% sucesso, {avg_duration:.0f}ms médio", **result)
            else:
                logger.warning(f"⚠️ Performance sob carga degradada - {success_rate:.1f}% sucesso, {avg_duration:.0f}ms médio", **result)
            
            self.results.append(result)
            return result
            
        except Exception as e:
            total_duration = (time.time() - test_start) * 1000
            
            result = {
                "test": "Performance Sob Carga",
                "success": False,
                "duration_ms": round(total_duration, 2),
                "error": str(e),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            logger.error(f"❌ Exceção no teste de carga: {e}", **result)
            self.results.append(result)
            return result
    
    async def run_all_integration_tests(self) -> Dict[str, Any]:
        """Executa todos os testes de integração."""
        logger.info("🔗 Iniciando testes de integração de produção...")
        
        # Lista de testes a executar
        tests = [
            self.test_health_check_integration(),
            self.test_api_endpoints_integration(),
            self.test_webhook_integration(),
            self.test_performance_under_load()
        ]
        
        # Executar todos os testes
        await asyncio.gather(*tests, return_exceptions=True)
        
        # Calcular estatísticas
        total_tests = len(self.results)
        successful_tests = len([r for r in self.results if r.get("success", False)])
        failed_tests = total_tests - successful_tests
        success_rate = (successful_tests / total_tests) * 100 if total_tests > 0 else 0
        
        total_duration = time.time() - self.start_time
        
        summary = {
            "integration_tests_summary": {
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
        if success_rate >= 75:
            logger.info(
                f"✅ Testes de integração concluídos - {success_rate:.1f}% sucesso ({successful_tests}/{total_tests})",
                **summary["integration_tests_summary"]
            )
        else:
            logger.error(
                f"❌ Testes de integração falharam - {success_rate:.1f}% sucesso ({successful_tests}/{total_tests})",
                **summary["integration_tests_summary"]
            )
        
        return summary


async def main():
    """Função principal para executar testes de integração."""
    import sys
    
    # URL base (pode ser passada como argumento)
    base_url = sys.argv[1] if len(sys.argv) > 1 else "https://api.slimquality.com.br"
    
    print(f"🔗 Executando testes de integração em: {base_url}")
    print("=" * 60)
    
    async with IntegrationTestRunner(base_url) as runner:
        summary = await runner.run_all_integration_tests()
        
        # Imprimir resumo
        print("\n📊 RESUMO DOS TESTES DE INTEGRAÇÃO")
        print("=" * 40)
        
        stats = summary["integration_tests_summary"]
        print(f"Total de testes: {stats['total_tests']}")
        print(f"Sucessos: {stats['successful_tests']}")
        print(f"Falhas: {stats['failed_tests']}")
        print(f"Taxa de sucesso: {stats['success_rate']}%")
        print(f"Duração total: {stats['total_duration_seconds']}s")
        
        # Salvar resultados
        with open("integration_tests_results.json", "w") as f:
            json.dump(summary, f, indent=2)
        
        print(f"\n📄 Resultados salvos em: integration_tests_results.json")
        
        # Exit code baseado no sucesso
        if stats["success_rate"] >= 75:
            print("✅ Testes de integração PASSARAM!")
            sys.exit(0)
        else:
            print("❌ Testes de integração FALHARAM!")
            sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())