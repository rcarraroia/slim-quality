#!/usr/bin/env python3
"""
Smoke tests para produção - Validação básica do sistema
"""
import asyncio
import json
import time
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional

import httpx
import structlog

# Configurar logging
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer()
    ]
)

logger = structlog.get_logger(__name__)


class SmokeTestRunner:
    """Runner para smoke tests em produção."""
    
    def __init__(self, base_url: str = "https://api.slimquality.com.br"):
        self.base_url = base_url
        self.client = httpx.AsyncClient(timeout=30.0)
        self.results = []
        self.start_time = time.time()
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.aclose()
    
    async def test_endpoint(self, path: str, method: str = "GET", 
                          expected_status: int = 200, 
                          payload: Optional[Dict] = None,
                          description: str = "") -> Dict[str, Any]:
        """
        Testa um endpoint específico.
        
        Args:
            path: Caminho do endpoint
            method: Método HTTP
            expected_status: Status esperado
            payload: Payload para POST/PUT
            description: Descrição do teste
            
        Returns:
            Resultado do teste
        """
        test_start = time.time()
        url = f"{self.base_url}{path}"
        
        try:
            if method.upper() == "GET":
                response = await self.client.get(url)
            elif method.upper() == "POST":
                response = await self.client.post(url, json=payload)
            elif method.upper() == "PUT":
                response = await self.client.put(url, json=payload)
            else:
                raise ValueError(f"Método não suportado: {method}")
            
            duration = (time.time() - test_start) * 1000  # ms
            
            result = {
                "test": description or f"{method} {path}",
                "url": url,
                "method": method,
                "expected_status": expected_status,
                "actual_status": response.status_code,
                "duration_ms": round(duration, 2),
                "success": response.status_code == expected_status,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            # Adicionar dados da resposta se for JSON pequeno
            try:
                if response.headers.get("content-type", "").startswith("application/json"):
                    response_data = response.json()
                    if len(str(response_data)) < 1000:  # Apenas respostas pequenas
                        result["response_data"] = response_data
            except:
                pass
            
            # Log do resultado
            if result["success"]:
                logger.info(
                    f"✅ {result['test']} - {response.status_code} ({duration:.0f}ms)",
                    **result
                )
            else:
                logger.error(
                    f"❌ {result['test']} - {response.status_code} (esperado {expected_status})",
                    **result
                )
            
            self.results.append(result)
            return result
            
        except Exception as e:
            duration = (time.time() - test_start) * 1000
            
            result = {
                "test": description or f"{method} {path}",
                "url": url,
                "method": method,
                "expected_status": expected_status,
                "actual_status": 0,
                "duration_ms": round(duration, 2),
                "success": False,
                "error": str(e),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            logger.error(f"❌ {result['test']} - EXCEPTION: {e}", **result)
            self.results.append(result)
            return result
    
    async def test_health_check(self) -> Dict[str, Any]:
        """Testa health check básico."""
        return await self.test_endpoint(
            "/health",
            description="Health Check Básico"
        )
    
    async def test_api_documentation(self) -> Dict[str, Any]:
        """Testa documentação da API."""
        return await self.test_endpoint(
            "/docs",
            description="Documentação API (Swagger)"
        )
    
    async def test_openapi_schema(self) -> Dict[str, Any]:
        """Testa schema OpenAPI."""
        return await self.test_endpoint(
            "/openapi.json",
            description="Schema OpenAPI"
        )
    
    async def test_webhook_metrics(self) -> Dict[str, Any]:
        """Testa métricas de webhook."""
        return await self.test_endpoint(
            "/webhooks/metrics",
            description="Métricas de Webhook"
        )
    
    async def test_webhook_endpoint(self) -> Dict[str, Any]:
        """Testa endpoint de webhook (deve rejeitar payload vazio)."""
        return await self.test_endpoint(
            "/webhooks/evolution",
            method="POST",
            expected_status=400,  # Deve rejeitar payload vazio
            description="Webhook Endpoint (validação)"
        )
    
    async def test_ssl_certificate(self) -> Dict[str, Any]:
        """Testa certificado SSL."""
        test_start = time.time()
        
        try:
            # Fazer requisição HTTPS
            response = await self.client.get(f"{self.base_url}/health")
            duration = (time.time() - test_start) * 1000
            
            result = {
                "test": "Certificado SSL",
                "url": self.base_url,
                "success": response.status_code == 200,
                "duration_ms": round(duration, 2),
                "ssl_valid": True,  # Se chegou aqui, SSL está OK
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            logger.info("✅ Certificado SSL válido", **result)
            self.results.append(result)
            return result
            
        except Exception as e:
            duration = (time.time() - test_start) * 1000
            
            result = {
                "test": "Certificado SSL",
                "url": self.base_url,
                "success": False,
                "duration_ms": round(duration, 2),
                "ssl_valid": False,
                "error": str(e),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            logger.error(f"❌ Certificado SSL inválido: {e}", **result)
            self.results.append(result)
            return result
    
    async def test_response_times(self) -> Dict[str, Any]:
        """Testa tempos de resposta."""
        test_start = time.time()
        
        # Fazer múltiplas requisições
        times = []
        for i in range(5):
            req_start = time.time()
            try:
                response = await self.client.get(f"{self.base_url}/health")
                req_time = (time.time() - req_start) * 1000
                times.append(req_time)
            except:
                times.append(9999)  # Timeout/erro
        
        duration = (time.time() - test_start) * 1000
        avg_time = sum(times) / len(times)
        max_time = max(times)
        min_time = min(times)
        
        # Avaliar performance
        performance_ok = avg_time < 500  # < 500ms é aceitável
        
        result = {
            "test": "Tempos de Resposta",
            "success": performance_ok,
            "duration_ms": round(duration, 2),
            "avg_response_ms": round(avg_time, 2),
            "min_response_ms": round(min_time, 2),
            "max_response_ms": round(max_time, 2),
            "samples": len(times),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        if performance_ok:
            logger.info(f"✅ Performance OK - Média: {avg_time:.0f}ms", **result)
        else:
            logger.warning(f"⚠️ Performance lenta - Média: {avg_time:.0f}ms", **result)
        
        self.results.append(result)
        return result
    
    async def run_all_smoke_tests(self) -> Dict[str, Any]:
        """Executa todos os smoke tests."""
        logger.info("🚀 Iniciando smoke tests de produção...")
        
        # Lista de testes a executar
        tests = [
            self.test_health_check(),
            self.test_ssl_certificate(),
            self.test_api_documentation(),
            self.test_openapi_schema(),
            self.test_webhook_metrics(),
            self.test_webhook_endpoint(),
            self.test_response_times()
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
            "smoke_tests_summary": {
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
        if success_rate >= 90:
            logger.info(
                f"✅ Smoke tests concluídos - {success_rate:.1f}% sucesso ({successful_tests}/{total_tests})",
                **summary["smoke_tests_summary"]
            )
        else:
            logger.error(
                f"❌ Smoke tests falharam - {success_rate:.1f}% sucesso ({successful_tests}/{total_tests})",
                **summary["smoke_tests_summary"]
            )
        
        return summary


async def main():
    """Função principal para executar smoke tests."""
    import sys
    
    # URL base (pode ser passada como argumento)
    base_url = sys.argv[1] if len(sys.argv) > 1 else "https://api.slimquality.com.br"
    
    print(f"🧪 Executando smoke tests em: {base_url}")
    print("=" * 50)
    
    async with SmokeTestRunner(base_url) as runner:
        summary = await runner.run_all_smoke_tests()
        
        # Imprimir resumo
        print("\n📊 RESUMO DOS SMOKE TESTS")
        print("=" * 30)
        
        stats = summary["smoke_tests_summary"]
        print(f"Total de testes: {stats['total_tests']}")
        print(f"Sucessos: {stats['successful_tests']}")
        print(f"Falhas: {stats['failed_tests']}")
        print(f"Taxa de sucesso: {stats['success_rate']}%")
        print(f"Duração total: {stats['total_duration_seconds']}s")
        
        # Salvar resultados
        with open("smoke_tests_results.json", "w") as f:
            json.dump(summary, f, indent=2)
        
        print(f"\n📄 Resultados salvos em: smoke_tests_results.json")
        
        # Exit code baseado no sucesso
        if stats["success_rate"] >= 90:
            print("✅ Smoke tests PASSARAM!")
            sys.exit(0)
        else:
            print("❌ Smoke tests FALHARAM!")
            sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())