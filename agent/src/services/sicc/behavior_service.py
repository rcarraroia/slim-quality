"""
Behavior Service - SICC

Serviço responsável por aplicar padrões aprendidos em conversas ativas.
Busca padrões aplicáveis, prioriza por confidence score e adapta respostas.

Features:
- Busca de padrões aplicáveis por contexto
- Aplicação de templates de resposta
- Priorização por confidence score
- Adaptação contextual de respostas
- Tracking de uso de padrões
"""

import logging
import asyncio
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
import json
import uuid
import re
from collections import defaultdict

import os
import sys

# Adicionar paths necessários
current_dir = os.path.dirname(os.path.abspath(__file__))
services_dir = os.path.dirname(current_dir)
src_dir = os.path.dirname(services_dir)
sys.path.append(src_dir)
sys.path.append(services_dir)

try:
    from ..supabase_client import get_supabase_client
    from ..ai_service import get_ai_service, AIProvider
except ImportError:
    # Fallback para importação direta quando executado como script
    from ..supabase_client import get_supabase_client
    from ..ai_service import get_ai_service, AIProvider

# Importações locais para evitar circular imports
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from .learning_service import Pattern, LearningService
    from .memory_service import Memory, MemoryService

logger = logging.getLogger(__name__)

@dataclass
class ApplicablePattern:
    """Representa um padrão aplicável a uma mensagem específica"""
    pattern: Any  # Pattern object
    relevance_score: float  # Score de relevância para o contexto atual
    template: Optional[Dict[str, Any]] = None  # Template de resposta associado
    application_context: Optional[Dict[str, Any]] = None  # Contexto de aplicação
    
    def to_dict(self) -> Dict[str, Any]:
        """Converte para dicionário"""
        return {
            "pattern": self.pattern.to_dict() if hasattr(self.pattern, 'to_dict') else str(self.pattern),
            "relevance_score": self.relevance_score,
            "template": self.template,
            "application_context": self.application_context
        }

@dataclass
class ResponseResult:
    """Resultado da aplicação de um padrão"""
    response_text: str
    pattern_applied: ApplicablePattern
    confidence: float
    metadata: Dict[str, Any]
    generated_at: datetime
    
    def to_dict(self) -> Dict[str, Any]:
        """Converte para dicionário"""
        return {
            "response_text": self.response_text,
            "pattern_applied": self.pattern_applied.to_dict(),
            "confidence": self.confidence,
            "metadata": self.metadata,
            "generated_at": self.generated_at.isoformat()
        }

class BehaviorService:
    """
    Serviço de comportamento que aplica padrões aprendidos
    
    Responsabilidades:
    - Buscar padrões aplicáveis ao contexto atual
    - Priorizar padrões por relevância e confidence
    - Aplicar templates de resposta
    - Adaptar respostas ao contexto específico
    - Registrar uso de padrões para métricas
    """
    
    def __init__(self):
        """Inicializa o serviço de comportamento"""
        self.supabase = get_supabase_client()
        self.ai_service = get_ai_service()
        
        # Lazy loading para evitar imports circulares
        self._learning_service = None
        self._memory_service = None
        
        # Configurações
        self.min_relevance_threshold = 0.3  # Mínimo de relevância para considerar padrão
        self.max_patterns_per_search = 10  # Máximo de padrões por busca
        self.template_cache = {}  # Cache de templates
        self.pattern_usage_tracking = True  # Rastrear uso de padrões
        
        logger.info("BehaviorService inicializado")
    
    @property
    def learning_service(self):
        """Lazy loading do LearningService"""
        if self._learning_service is None:
            from .learning_service import get_learning_service
            self._learning_service = get_learning_service()
        return self._learning_service
    
    @property
    def memory_service(self):
        """Lazy loading do MemoryService"""
        if self._memory_service is None:
            from .memory_service import get_memory_service
            self._memory_service = get_memory_service()
        return self._memory_service
    
    async def find_applicable_patterns(self, message: str, context: Dict[str, Any]) -> List[ApplicablePattern]:
        """
        Busca padrões aplicáveis à mensagem atual
        
        Args:
            message: Mensagem do usuário
            context: Contexto da conversa (conversation_id, user_info, etc.)
            
        Returns:
            Lista de padrões aplicáveis ordenados por relevância
            
        Raises:
            ValueError: Se parâmetros inválidos
        """
        if not message or not message.strip():
            raise ValueError("Message não pode estar vazia")
        
        if not context or not isinstance(context, dict):
            raise ValueError("Context deve ser um dicionário válido")
        
        try:
            logger.info(f"Buscando padrões aplicáveis para mensagem: {message[:50]}...")
            
            # 1. Buscar padrões aprovados no banco
            approved_patterns = await self._get_approved_patterns()
            
            if not approved_patterns:
                logger.info("Nenhum padrão aprovado encontrado")
                return []
            
            # 2. Calcular relevância de cada padrão para o contexto atual
            applicable_patterns = []
            
            for pattern in approved_patterns:
                relevance_score = await self._calculate_pattern_relevance(
                    pattern, message, context
                )
                
                if relevance_score >= self.min_relevance_threshold:
                    # 3. Buscar template associado (se houver)
                    template = await self._get_pattern_template(pattern)
                    
                    # 4. Preparar contexto de aplicação
                    application_context = await self._prepare_application_context(
                        pattern, message, context
                    )
                    
                    applicable_pattern = ApplicablePattern(
                        pattern=pattern,
                        relevance_score=relevance_score,
                        template=template,
                        application_context=application_context
                    )
                    
                    applicable_patterns.append(applicable_pattern)
            
            # 5. Priorizar padrões
            prioritized_patterns = await self.prioritize_patterns(applicable_patterns)
            
            logger.info(f"Encontrados {len(prioritized_patterns)} padrões aplicáveis")
            return prioritized_patterns[:self.max_patterns_per_search]
            
        except Exception as e:
            logger.error(f"Erro ao buscar padrões aplicáveis: {e}")
            return []
    
    async def apply_pattern(self, applicable_pattern: ApplicablePattern, context: Dict[str, Any]) -> ResponseResult:
        """
        Aplica padrão e gera resposta personalizada
        
        Args:
            applicable_pattern: Padrão a ser aplicado
            context: Contexto da conversa
            
        Returns:
            Resultado da aplicação com resposta gerada
            
        Raises:
            ValueError: Se parâmetros inválidos
            RuntimeError: Se erro na aplicação
        """
        if not applicable_pattern:
            raise ValueError("ApplicablePattern é obrigatório")
        
        if not context or not isinstance(context, dict):
            raise ValueError("Context deve ser um dicionário válido")
        
        try:
            logger.info(f"Aplicando padrão {applicable_pattern.pattern.id}")
            
            # 1. Verificar se há template disponível
            if applicable_pattern.template:
                # Aplicar template
                response_text = await self._apply_template(
                    applicable_pattern.template,
                    applicable_pattern.application_context or context
                )
            else:
                # Gerar resposta baseada no padrão sem template
                response_text = await self._generate_pattern_response(
                    applicable_pattern.pattern,
                    context
                )
            
            # 2. Adaptar resposta ao contexto específico
            adapted_response = await self.adapt_response(response_text, context)
            
            # 3. Calcular confidence da resposta
            response_confidence = await self._calculate_response_confidence(
                applicable_pattern, adapted_response, context
            )
            
            # 4. Preparar metadata
            metadata = {
                "pattern_id": applicable_pattern.pattern.id,
                "pattern_type": applicable_pattern.pattern.pattern_type,
                "relevance_score": applicable_pattern.relevance_score,
                "template_used": applicable_pattern.template is not None,
                "adaptation_applied": adapted_response != response_text,
                "original_response": response_text if adapted_response != response_text else None
            }
            
            # 5. Criar resultado
            result = ResponseResult(
                response_text=adapted_response,
                pattern_applied=applicable_pattern,
                confidence=response_confidence,
                metadata=metadata,
                generated_at=datetime.utcnow()
            )
            
            # 6. Registrar uso do padrão
            if self.pattern_usage_tracking:
                await self._track_pattern_usage(applicable_pattern, result, context)
            
            logger.info(f"Padrão aplicado com sucesso (confidence: {response_confidence:.2f})")
            return result
            
        except Exception as e:
            logger.error(f"Erro ao aplicar padrão: {e}")
            raise RuntimeError(f"Falha na aplicação do padrão: {e}")
    
    async def prioritize_patterns(self, patterns: List[ApplicablePattern]) -> List[ApplicablePattern]:
        """
        Prioriza padrões por confidence score combinado
        
        Args:
            patterns: Lista de padrões aplicáveis
            
        Returns:
            Lista ordenada por prioridade (maior para menor)
        """
        if not patterns:
            return []
        
        try:
            # Calcular score combinado para cada padrão
            def calculate_combined_score(applicable_pattern: ApplicablePattern) -> float:
                # Pesos para diferentes fatores
                confidence_weight = 0.4
                relevance_weight = 0.3
                frequency_weight = 0.2
                recency_weight = 0.1
                
                pattern = applicable_pattern.pattern
                
                # Normalizar frequência (assumindo máximo de 100)
                normalized_frequency = min(pattern.frequency / 100.0, 1.0)
                
                # Calcular recency score (padrões mais recentes têm score maior)
                days_since_last_seen = (datetime.utcnow() - pattern.last_seen).days
                recency_score = max(0.0, 1.0 - (days_since_last_seen / 30.0))  # Decai em 30 dias
                
                combined_score = (
                    pattern.confidence * confidence_weight +
                    applicable_pattern.relevance_score * relevance_weight +
                    normalized_frequency * frequency_weight +
                    recency_score * recency_weight
                )
                
                return combined_score
            
            # Ordenar por score combinado
            prioritized = sorted(patterns, key=calculate_combined_score, reverse=True)
            
            logger.debug(f"Priorizados {len(prioritized)} padrões")
            return prioritized
            
        except Exception as e:
            logger.error(f"Erro ao priorizar padrões: {e}")
            return patterns  # Retornar lista original em caso de erro
    
    async def adapt_response(self, template: str, context: Dict[str, Any]) -> str:
        """
        Adapta template de resposta ao contexto específico
        
        Args:
            template: Template de resposta
            context: Contexto da conversa
            
        Returns:
            Resposta adaptada ao contexto
        """
        if not template or not template.strip():
            return template
        
        try:
            # 1. Substituir placeholders básicos
            adapted_response = await self._replace_basic_placeholders(template, context)
            
            # 2. Personalizar baseado no contexto do usuário
            personalized_response = await self._personalize_response(adapted_response, context)
            
            # 3. Ajustar tom e estilo se necessário
            final_response = await self._adjust_tone_and_style(personalized_response, context)
            
            logger.debug(f"Resposta adaptada: {len(final_response)} caracteres")
            return final_response
            
        except Exception as e:
            logger.error(f"Erro ao adaptar resposta: {e}")
            return template  # Retornar template original em caso de erro
    
    # Métodos auxiliares privados
    
    async def _get_approved_patterns(self) -> List[Any]:
        """Busca padrões aprovados no banco de dados"""
        try:
            # Importar Pattern dinamicamente
            from .learning_service import Pattern
            
            # Buscar padrões aprovados na tabela behavior_patterns
            result = self.supabase.table("behavior_patterns").select("*").eq(
                "status", "approved"
            ).order("confidence", desc=True).execute()
            
            patterns = []
            if result.data:
                for row in result.data:
                    pattern = Pattern(
                        id=row["id"],
                        pattern_type=row["pattern_type"],
                        trigger=row["trigger_condition"],
                        action=row["response_template"],
                        confidence=row["confidence"],
                        frequency=row.get("usage_count", 1),
                        contexts=row.get("contexts", []),
                        metadata=row.get("metadata", {}),
                        created_at=datetime.fromisoformat(row["created_at"].replace("Z", "+00:00")),
                        last_seen=datetime.fromisoformat(row["updated_at"].replace("Z", "+00:00"))
                    )
                    patterns.append(pattern)
            
            return patterns
            
        except Exception as e:
            logger.error(f"Erro ao buscar padrões aprovados: {e}")
            return []
    
    async def _calculate_pattern_relevance(self, pattern: Any, message: str, context: Dict[str, Any]) -> float:
        """Calcula relevância do padrão para o contexto atual"""
        try:
            relevance_factors = []
            
            # 1. Similaridade textual entre trigger e mensagem
            text_similarity = await self._calculate_text_similarity(pattern.trigger, message)
            relevance_factors.append(text_similarity * 0.4)
            
            # 2. Correspondência de contexto
            context_match = await self._calculate_context_match(pattern, context)
            relevance_factors.append(context_match * 0.3)
            
            # 3. Correspondência de keywords
            keyword_match = await self._calculate_keyword_match(pattern, message)
            relevance_factors.append(keyword_match * 0.2)
            
            # 4. Histórico de sucesso do padrão
            success_rate = await self._get_pattern_success_rate(pattern.id)
            relevance_factors.append(success_rate * 0.1)
            
            # Calcular relevância final
            final_relevance = sum(relevance_factors)
            
            return min(1.0, max(0.0, final_relevance))
            
        except Exception as e:
            logger.error(f"Erro ao calcular relevância do padrão: {e}")
            return 0.0
    
    async def _calculate_text_similarity(self, text1: str, text2: str) -> float:
        """Calcula similaridade entre dois textos"""
        try:
            # Tentar usar MemoryService se disponível
            if hasattr(self.memory_service, '_calculate_text_similarity'):
                similarity = await self.memory_service._calculate_text_similarity(text1, text2)
                return similarity
            else:
                # Fallback: similaridade simples baseada em palavras
                return self._simple_text_similarity(text1, text2)
            
        except Exception as e:
            logger.warning(f"Erro ao calcular similaridade textual: {e}")
            # Fallback: similaridade simples baseada em palavras
            return self._simple_text_similarity(text1, text2)
    
    def _simple_text_similarity(self, text1: str, text2: str) -> float:
        """Calcula similaridade simples baseada em palavras"""
        words1 = set(text1.lower().split())
        words2 = set(text2.lower().split())
        
        if not words1 or not words2:
            return 0.0
        
        intersection = len(words1.intersection(words2))
        union = len(words1.union(words2))
        
        return intersection / union if union > 0 else 0.0
    
    async def _calculate_context_match(self, pattern: Any, context: Dict[str, Any]) -> float:
        """Calcula correspondência de contexto"""
        try:
            match_score = 0.0
            total_factors = 0
            
            # Verificar conversation_id se disponível
            if "conversation_id" in context and pattern.contexts:
                conversation_id = context["conversation_id"]
                if conversation_id in pattern.contexts:
                    match_score += 1.0
                total_factors += 1
            
            # Verificar metadata de contexto
            if "user_type" in context and "user_type" in pattern.metadata:
                if context["user_type"] == pattern.metadata["user_type"]:
                    match_score += 1.0
                total_factors += 1
            
            # Verificar tipo de interação
            if "interaction_type" in context and "interaction_type" in pattern.metadata:
                if context["interaction_type"] == pattern.metadata["interaction_type"]:
                    match_score += 1.0
                total_factors += 1
            
            # Se não há fatores para comparar, assumir match neutro
            if total_factors == 0:
                return 0.5
            
            return match_score / total_factors
            
        except Exception as e:
            logger.error(f"Erro ao calcular match de contexto: {e}")
            return 0.5
    
    async def _calculate_keyword_match(self, pattern: Any, message: str) -> float:
        """Calcula correspondência de keywords"""
        try:
            # Extrair keywords do padrão
            pattern_keywords = set()
            
            # Keywords do trigger
            trigger_words = re.findall(r'\b\w+\b', pattern.trigger.lower())
            pattern_keywords.update(trigger_words)
            
            # Keywords dos metadados
            if "keywords" in pattern.metadata:
                pattern_keywords.update(pattern.metadata["keywords"])
            
            # Keywords da mensagem
            message_words = set(re.findall(r'\b\w+\b', message.lower()))
            
            if not pattern_keywords or not message_words:
                return 0.0
            
            # Calcular Jaccard similarity
            intersection = len(pattern_keywords.intersection(message_words))
            union = len(pattern_keywords.union(message_words))
            
            return intersection / union if union > 0 else 0.0
            
        except Exception as e:
            logger.error(f"Erro ao calcular match de keywords: {e}")
            return 0.0
    
    async def _get_pattern_success_rate(self, pattern_id: str) -> float:
        """Obtém taxa de sucesso do padrão baseada em métricas"""
        try:
            # Buscar métricas de performance do padrão
            result = self.supabase.table("agent_performance_metrics").select(
                "success_rate"
            ).eq("pattern_id", pattern_id).order("created_at", desc=True).limit(1).execute()
            
            if result.data and len(result.data) > 0:
                return result.data[0]["success_rate"]
            
            # Se não há métricas, assumir taxa neutra
            return 0.7
            
        except Exception as e:
            logger.warning(f"Erro ao obter taxa de sucesso do padrão: {e}")
            return 0.7
    
    async def _get_pattern_template(self, pattern: Any) -> Optional[Dict[str, Any]]:
        """Busca template associado ao padrão"""
        try:
            # Verificar cache primeiro
            cache_key = f"template_{pattern.id}"
            if cache_key in self.template_cache:
                return self.template_cache[cache_key]
            
            # Buscar template no banco ou usar action do padrão
            template = None
            
            # Se o action contém estrutura de template
            if pattern.action and isinstance(pattern.action, str):
                try:
                    # Tentar parsear como JSON
                    template_data = json.loads(pattern.action)
                    if isinstance(template_data, dict) and "template_text" in template_data:
                        template = template_data
                except json.JSONDecodeError:
                    # Se não é JSON, usar como template simples
                    template = {
                        "template_text": pattern.action,
                        "placeholders": [],
                        "structure_type": "simple"
                    }
            
            # Cachear resultado
            if template:
                self.template_cache[cache_key] = template
            
            return template
            
        except Exception as e:
            logger.error(f"Erro ao buscar template do padrão: {e}")
            return None
    
    async def _prepare_application_context(self, pattern: Any, message: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Prepara contexto específico para aplicação do padrão"""
        try:
            application_context = {
                "original_message": message,
                "pattern_trigger": pattern.trigger,
                "pattern_type": pattern.pattern_type,
                "conversation_context": context.copy(),
                "timestamp": datetime.utcnow().isoformat()
            }
            
            # Adicionar contexto relevante baseado no tipo de padrão
            if pattern.pattern_type == "response":
                application_context["response_context"] = await self._extract_response_context(message, context)
            elif pattern.pattern_type == "workflow":
                application_context["workflow_context"] = await self._extract_workflow_context(message, context)
            
            return application_context
            
        except Exception as e:
            logger.error(f"Erro ao preparar contexto de aplicação: {e}")
            return {"original_message": message, "error": str(e)}
    
    async def _extract_response_context(self, message: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Extrai contexto específico para respostas"""
        return {
            "message_length": len(message),
            "question_detected": "?" in message,
            "urgency_detected": any(word in message.lower() for word in ["urgente", "rápido", "agora"]),
            "sentiment": "neutral"  # Placeholder para análise de sentimento
        }
    
    async def _extract_workflow_context(self, message: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Extrai contexto específico para workflows"""
        return {
            "step_detected": any(word in message.lower() for word in ["primeiro", "segundo", "próximo", "depois"]),
            "completion_detected": any(word in message.lower() for word in ["pronto", "finalizado", "concluído"]),
            "help_requested": any(word in message.lower() for word in ["ajuda", "como", "não sei"])
        }
    
    async def _apply_template(self, template: Dict[str, Any], context: Dict[str, Any]) -> str:
        """Aplica template de resposta"""
        try:
            template_text = template.get("template_text", "")
            placeholders = template.get("placeholders", [])
            
            # Substituir placeholders
            result_text = template_text
            
            for placeholder in placeholders:
                placeholder_value = await self._resolve_placeholder(placeholder, context)
                result_text = result_text.replace(f"{{{placeholder}}}", placeholder_value)
            
            return result_text
            
        except Exception as e:
            logger.error(f"Erro ao aplicar template: {e}")
            return template.get("template_text", "Erro na aplicação do template")
    
    async def _resolve_placeholder(self, placeholder: str, context: Dict[str, Any]) -> str:
        """Resolve valor de um placeholder"""
        try:
            # Mapeamento de placeholders comuns
            placeholder_map = {
                "user_name": context.get("user_name", "usuário"),
                "greeting": self._get_contextual_greeting(context),
                "closing": self._get_contextual_closing(context),
                "content": context.get("original_message", ""),
                "timestamp": datetime.now().strftime("%H:%M"),
                "date": datetime.now().strftime("%d/%m/%Y")
            }
            
            return placeholder_map.get(placeholder, f"[{placeholder}]")
            
        except Exception as e:
            logger.error(f"Erro ao resolver placeholder {placeholder}: {e}")
            return f"[{placeholder}]"
    
    def _get_contextual_greeting(self, context: Dict[str, Any]) -> str:
        """Obtém saudação contextual"""
        hour = datetime.now().hour
        
        if 5 <= hour < 12:
            return "Bom dia"
        elif 12 <= hour < 18:
            return "Boa tarde"
        else:
            return "Boa noite"
    
    def _get_contextual_closing(self, context: Dict[str, Any]) -> str:
        """Obtém fechamento contextual"""
        return "Posso ajudar com mais alguma coisa?"
    
    async def _generate_pattern_response(self, pattern: Any, context: Dict[str, Any]) -> str:
        """Gera resposta baseada no padrão sem template específico"""
        try:
            # Usar IA para gerar resposta baseada no padrão
            prompt = f"""
            Baseado no seguinte padrão comportamental, gere uma resposta apropriada:
            
            Tipo: {pattern.pattern_type}
            Trigger: {pattern.trigger}
            Ação: {pattern.action}
            
            Contexto da conversa:
            Mensagem: {context.get('original_message', '')}
            
            Gere uma resposta natural e útil que siga o padrão identificado.
            """
            
            ai_response = await self.ai_service.generate_text(
                prompt=prompt,
                max_tokens=200,
                temperature=0.7
            )
            
            return ai_response['text'].strip()
            
        except Exception as e:
            logger.error(f"Erro ao gerar resposta do padrão: {e}")
            return f"Baseado no padrão {pattern.pattern_type}: {pattern.action}"
    
    async def _calculate_response_confidence(self, applicable_pattern: ApplicablePattern, response: str, context: Dict[str, Any]) -> float:
        """Calcula confidence da resposta gerada"""
        try:
            confidence_factors = []
            
            # 1. Confidence do padrão original
            confidence_factors.append(applicable_pattern.pattern.confidence * 0.4)
            
            # 2. Relevância do padrão
            confidence_factors.append(applicable_pattern.relevance_score * 0.3)
            
            # 3. Qualidade da resposta (comprimento, estrutura)
            response_quality = min(1.0, len(response) / 100.0)  # Normalizar por 100 chars
            confidence_factors.append(response_quality * 0.2)
            
            # 4. Disponibilidade de template
            template_factor = 0.9 if applicable_pattern.template else 0.7
            confidence_factors.append(template_factor * 0.1)
            
            return sum(confidence_factors)
            
        except Exception as e:
            logger.error(f"Erro ao calcular confidence da resposta: {e}")
            return 0.5
    
    async def _replace_basic_placeholders(self, text: str, context: Dict[str, Any]) -> str:
        """Substitui placeholders básicos no texto"""
        try:
            # Placeholders básicos
            replacements = {
                "{user_name}": context.get("user_name", "usuário"),
                "{time}": datetime.now().strftime("%H:%M"),
                "{date}": datetime.now().strftime("%d/%m/%Y"),
                "{greeting}": self._get_contextual_greeting(context),
                "{closing}": self._get_contextual_closing(context)
            }
            
            result = text
            for placeholder, value in replacements.items():
                result = result.replace(placeholder, value)
            
            return result
            
        except Exception as e:
            logger.error(f"Erro ao substituir placeholders básicos: {e}")
            return text
    
    async def _personalize_response(self, response: str, context: Dict[str, Any]) -> str:
        """Personaliza resposta baseada no contexto do usuário"""
        try:
            # Personalização simples baseada no contexto
            personalized = response
            
            # Ajustar formalidade baseado no contexto
            if context.get("formal_context", False):
                personalized = personalized.replace("você", "o senhor/a senhora")
            
            # Adicionar informações específicas se disponíveis
            if "user_preferences" in context:
                preferences = context["user_preferences"]
                # Aplicar preferências específicas
                pass
            
            return personalized
            
        except Exception as e:
            logger.error(f"Erro ao personalizar resposta: {e}")
            return response
    
    async def _adjust_tone_and_style(self, response: str, context: Dict[str, Any]) -> str:
        """Ajusta tom e estilo da resposta"""
        try:
            # Ajustes básicos de tom
            adjusted = response
            
            # Tornar mais amigável se contexto informal
            if context.get("informal_context", True):
                adjusted = adjusted.replace("Prezado", "Olá")
                adjusted = adjusted.replace("Cordialmente", "Abraços")
            
            return adjusted
            
        except Exception as e:
            logger.error(f"Erro ao ajustar tom e estilo: {e}")
            return response
    
    async def _track_pattern_usage(self, applicable_pattern: ApplicablePattern, result: ResponseResult, context: Dict[str, Any]):
        """Registra uso do padrão para métricas"""
        try:
            usage_data = {
                "pattern_id": applicable_pattern.pattern.id,
                "conversation_id": context.get("conversation_id"),
                "relevance_score": applicable_pattern.relevance_score,
                "response_confidence": result.confidence,
                "template_used": applicable_pattern.template is not None,
                "context_type": context.get("interaction_type", "unknown"),
                "used_at": datetime.utcnow().isoformat(),
                "metadata": {
                    "pattern_type": applicable_pattern.pattern.pattern_type,
                    "response_length": len(result.response_text),
                    "adaptation_applied": result.metadata.get("adaptation_applied", False)
                }
            }
            
            # Salvar no banco (tabela de métricas ou logs)
            # Por enquanto, apenas log
            logger.info(f"Padrão usado: {applicable_pattern.pattern.id} (relevância: {applicable_pattern.relevance_score:.2f})")
            
        except Exception as e:
            logger.error(f"Erro ao rastrear uso do padrão: {e}")


# Instância singleton
_behavior_service: Optional[BehaviorService] = None

def get_behavior_service() -> BehaviorService:
    """Retorna instância singleton do BehaviorService"""
    global _behavior_service
    if _behavior_service is None:
        _behavior_service = BehaviorService()
    return _behavior_service