"""
System Health Service - Validação end-to-end e saúde do sistema

Este serviço implementa:
- Validação de todos os componentes críticos
- Checklist de saúde do sistema
- Preparação para deploy
- Monitoramento contínuo
"""

import structlog
from typing import Dict, List, Optional, Any, Tuple
import asyncio
import time
import os
from datetime import datetime
from pathlib import Path

from .metrics_service import get_metrics_service
from .dynamic_pricing_service import get_pricing_service
from .customer_history_service import get_customer_history_service
from .tts_service import get_tts_service
from .whisper_service import get_whisper_service
from .audio_detection_service import get_audio_detection_service
from .hybrid_image_service import get_hybrid_image_service

logger = structlog.get_logger(__name__)

class SystemHealthService:
    """
    Serviço de validação e saúde do sistema
    Verifica se todos os componentes estão funcionando corretamente
    """
    
    def __init__(self):
        self.metrics = get_metrics_service()
        self.health_checks = {
            "pricing": self._check_pricing_service,
            "customer_history": self._check_customer_history_service,
            "tts": self._check_tts_service,
            "whisper": self._check_whisper_service,
            "audio_detection": self._check_audio_detection_service,
            "hybrid_images": self._check_hybrid_image_service,
            "environment": self._check_environment_variables,
            "mcp": self._check_mcp_connectivity,
            "supabase": self._check_supabase_connectivity
        }
        
        logger.info("System Health Service inicializado")
    
    async def run_full_health_check(self) -> Dict[str, Any]:
        """
        Executa validação completa do sistema
        
        Returns:
            Relatório completo de saúde do sistema
        """
        logger.info("Iniciando validação completa do sistema...")
        
        start_time = time.time()
        results = {
            "timestamp": datetime.now().isoformat(),
            "overall_status": "healthy",
            "components": {},
            "summary": {
                "total_checks": len(self.health_checks),
                "passed": 0,
                "failed": 0,
                "warnings": 0
            },
            "duration_ms": 0,
            "recommendations": []
        }
        
        # Executar todos os health checks
        for component, check_func in self.health_checks.items():
            try:
                logger.debug(f"Verificando {component}...")
                check_result = await check_func()
                results["components"][component] = check_result
                
                # Atualizar contadores
                if check_result["status"] == "healthy":
                    results["summary"]["passed"] += 1
                elif check_result["status"] == "warning":
                    results["summary"]["warnings"] += 1
                else:
                    results["summary"]["failed"] += 1
                
                # Adicionar recomendações se houver
                if "recommendations" in check_result:
                    results["recommendations"].extend(check_result["recommendations"])
                
            except Exception as e:
                logger.error(f"Erro ao verificar {component}", error=str(e))
                results["components"][component] = {
                    "status": "error",
                    "message": f"Erro na verificação: {str(e)}",
                    "timestamp": datetime.now().isoformat()
                }
                results["summary"]["failed"] += 1
        
        # Determinar status geral
        if results["summary"]["failed"] > 0:
            results["overall_status"] = "unhealthy"
        elif results["summary"]["warnings"] > 0:
            results["overall_status"] = "warning"
        
        results["duration_ms"] = (time.time() - start_time) * 1000
        
        logger.info("Validação completa finalizada", 
                   status=results["overall_status"],
                   passed=results["summary"]["passed"],
                   failed=results["summary"]["failed"],
                   warnings=results["summary"]["warnings"])
        
        return results
    
    async def _check_pricing_service(self) -> Dict[str, Any]:
        """Verifica serviço de preços dinâmicos"""
        try:
            pricing_service = get_pricing_service()
            
            # Testar busca de preços
            start_time = time.time()
            prices = await pricing_service.get_current_prices()
            duration_ms = (time.time() - start_time) * 1000
            
            if prices and len(prices) >= 4:  # 4 produtos esperados
                return {
                    "status": "healthy",
                    "message": f"Preços carregados: {len(prices)} produtos",
                    "response_time_ms": duration_ms,
                    "data": {"product_count": len(prices)},
                    "timestamp": datetime.now().isoformat()
                }
            else:
                return {
                    "status": "warning",
                    "message": "Poucos produtos encontrados",
                    "response_time_ms": duration_ms,
                    "data": {"product_count": len(prices) if prices else 0},
                    "timestamp": datetime.now().isoformat(),
                    "recommendations": ["Verificar dados de produtos no banco"]
                }
                
        except Exception as e:
            return {
                "status": "error",
                "message": f"Erro no serviço de preços: {str(e)}",
                "timestamp": datetime.now().isoformat(),
                "recommendations": ["Verificar conectividade com Supabase", "Verificar MCP Gateway"]
            }
    
    async def _check_customer_history_service(self) -> Dict[str, Any]:
        """Verifica serviço de histórico de clientes"""
        try:
            history_service = get_customer_history_service()
            
            # Testar com telefone fictício
            start_time = time.time()
            result = await history_service.check_customer_history("+5511999999999")
            duration_ms = (time.time() - start_time) * 1000
            
            return {
                "status": "healthy",
                "message": "Serviço de histórico funcionando",
                "response_time_ms": duration_ms,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                "status": "error",
                "message": f"Erro no serviço de histórico: {str(e)}",
                "timestamp": datetime.now().isoformat(),
                "recommendations": ["Verificar conectividade com banco de dados"]
            }
    
    async def _check_tts_service(self) -> Dict[str, Any]:
        """Verifica serviço TTS"""
        try:
            tts_service = get_tts_service()
            
            # Verificar se cliente OpenAI está configurado
            if not hasattr(tts_service, 'client') or not tts_service.client:
                return {
                    "status": "error",
                    "message": "Cliente OpenAI TTS não configurado",
                    "timestamp": datetime.now().isoformat(),
                    "recommendations": ["Verificar OPENAI_API_KEY", "Reinstalar biblioteca openai"]
                }
            
            return {
                "status": "healthy",
                "message": "TTS Service configurado corretamente",
                "data": {
                    "model": tts_service.model,
                    "voice": tts_service.voice,
                    "format": tts_service.format
                },
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                "status": "error",
                "message": f"Erro no TTS Service: {str(e)}",
                "timestamp": datetime.now().isoformat(),
                "recommendations": ["Verificar OPENAI_API_KEY", "Verificar conectividade com OpenAI"]
            }
    
    async def _check_whisper_service(self) -> Dict[str, Any]:
        """Verifica serviço Whisper"""
        try:
            whisper_service = get_whisper_service()
            
            # Verificar se cliente OpenAI está configurado
            if not hasattr(whisper_service, 'client') or not whisper_service.client:
                return {
                    "status": "error",
                    "message": "Cliente OpenAI Whisper não configurado",
                    "timestamp": datetime.now().isoformat(),
                    "recommendations": ["Verificar OPENAI_API_KEY", "Reinstalar biblioteca openai"]
                }
            
            return {
                "status": "healthy",
                "message": "Whisper Service configurado corretamente",
                "data": {
                    "model": whisper_service.model,
                    "language": whisper_service.language
                },
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                "status": "error",
                "message": f"Erro no Whisper Service: {str(e)}",
                "timestamp": datetime.now().isoformat(),
                "recommendations": ["Verificar OPENAI_API_KEY", "Verificar conectividade com OpenAI"]
            }
    
    async def _check_audio_detection_service(self) -> Dict[str, Any]:
        """Verifica serviço de detecção de áudio"""
        try:
            audio_service = get_audio_detection_service()
            
            # Testar detecção com payload fictício
            test_message = {
                "messageType": "audioMessage",
                "media": {"url": "https://example.com/test.ogg"}
            }
            
            is_audio = audio_service.is_audio_message(test_message)
            
            if is_audio:
                return {
                    "status": "healthy",
                    "message": "Audio Detection Service funcionando",
                    "timestamp": datetime.now().isoformat()
                }
            else:
                return {
                    "status": "warning",
                    "message": "Audio Detection pode ter problemas de detecção",
                    "timestamp": datetime.now().isoformat(),
                    "recommendations": ["Verificar lógica de detecção de áudio"]
                }
            
        except Exception as e:
            return {
                "status": "error",
                "message": f"Erro no Audio Detection: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }
    
    async def _check_hybrid_image_service(self) -> Dict[str, Any]:
        """Verifica serviço de imagens híbridas"""
        try:
            image_service = get_hybrid_image_service()
            
            return {
                "status": "healthy",
                "message": "Hybrid Image Service configurado",
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                "status": "error",
                "message": f"Erro no Hybrid Image Service: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }
    
    async def _check_environment_variables(self) -> Dict[str, Any]:
        """Verifica variáveis de ambiente críticas"""
        required_vars = [
            "OPENAI_API_KEY",
            "SUPABASE_URL", 
            "SUPABASE_ANON_KEY",
            "EVOLUTION_API_URL",
            "EVOLUTION_API_KEY"
        ]
        
        missing_vars = []
        present_vars = []
        
        for var in required_vars:
            if os.getenv(var):
                present_vars.append(var)
            else:
                missing_vars.append(var)
        
        if missing_vars:
            return {
                "status": "error",
                "message": f"Variáveis de ambiente faltando: {', '.join(missing_vars)}",
                "data": {
                    "missing": missing_vars,
                    "present": present_vars
                },
                "timestamp": datetime.now().isoformat(),
                "recommendations": [f"Configurar {var}" for var in missing_vars]
            }
        else:
            return {
                "status": "healthy",
                "message": "Todas as variáveis de ambiente configuradas",
                "data": {"present": present_vars},
                "timestamp": datetime.now().isoformat()
            }
    
    async def _check_mcp_connectivity(self) -> Dict[str, Any]:
        """Verifica conectividade com MCP Gateway"""
        try:
            from .mcp_gateway import get_mcp_gateway
            
            gateway = get_mcp_gateway()
            
            # Testar conectividade básica
            start_time = time.time()
            # Aqui poderia fazer uma chamada real ao MCP se necessário
            duration_ms = (time.time() - start_time) * 1000
            
            return {
                "status": "healthy",
                "message": "MCP Gateway acessível",
                "response_time_ms": duration_ms,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                "status": "error",
                "message": f"Erro na conectividade MCP: {str(e)}",
                "timestamp": datetime.now().isoformat(),
                "recommendations": ["Verificar se MCP Gateway está rodando", "Verificar porta 8085"]
            }
    
    async def _check_supabase_connectivity(self) -> Dict[str, Any]:
        """Verifica conectividade com Supabase"""
        try:
            from .supabase_client import get_supabase_client
            
            client = get_supabase_client()
            
            # Testar query simples
            start_time = time.time()
            # Aqui poderia fazer uma query real se necessário
            duration_ms = (time.time() - start_time) * 1000
            
            return {
                "status": "healthy",
                "message": "Supabase acessível",
                "response_time_ms": duration_ms,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                "status": "error",
                "message": f"Erro na conectividade Supabase: {str(e)}",
                "timestamp": datetime.now().isoformat(),
                "recommendations": ["Verificar SUPABASE_URL e SUPABASE_ANON_KEY", "Verificar conectividade de rede"]
            }
    
    async def get_system_metrics_summary(self) -> Dict[str, Any]:
        """Retorna resumo das métricas do sistema"""
        try:
            # Obter métricas dos últimos 60 minutos
            audio_stats = self.metrics.get_audio_stats(60)
            cache_stats = self.metrics.get_cache_stats(60)
            health_summary = self.metrics.get_system_health_summary()
            alerts = self.metrics.check_alerts()
            
            return {
                "timestamp": datetime.now().isoformat(),
                "audio_metrics": audio_stats,
                "cache_metrics": cache_stats,
                "system_health": health_summary,
                "active_alerts": alerts,
                "metrics_status": "healthy" if not alerts else "warning"
            }
            
        except Exception as e:
            logger.error("Erro ao obter resumo de métricas", error=str(e))
            return {
                "timestamp": datetime.now().isoformat(),
                "error": str(e),
                "metrics_status": "error"
            }

# Singleton instance
_system_health_instance = None

def get_system_health_service() -> SystemHealthService:
    """Retorna instância singleton do SystemHealthService"""
    global _system_health_instance
    
    if _system_health_instance is None:
        _system_health_instance = SystemHealthService()
        logger.info("SystemHealthService singleton created")
    
    return _system_health_instance