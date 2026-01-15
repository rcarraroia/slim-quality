"""
Learning Service - SICC

Serviço responsável por identificar padrões comportamentais em conversas
e gerar aprendizados para aprovação do supervisor.

Features:
- Análise de padrões em conversas
- Detecção de comportamentos recorrentes
- Geração de regras de aprendizado
- Cálculo de confidence scores
- Integração com MemoryService
"""

import logging
import asyncio
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
import json
import uuid
from collections import defaultdict, Counter
import re

import os
import sys

# Adicionar paths necessários
current_dir = os.path.dirname(os.path.abspath(__file__))
services_dir = os.path.dirname(current_dir)
src_dir = os.path.dirname(services_dir)
sys.path.append(src_dir)
sys.path.append(services_dir)

from ..supabase_client import get_supabase_client
from ..ai_service import get_ai_service, AIProvider

# Importação local para evitar circular imports
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from .memory_service import Memory, MemoryService

logger = logging.getLogger(__name__)

@dataclass
class Pattern:
    """Representa um padrão comportamental identificado"""
    id: str
    pattern_type: str  # 'response', 'workflow', 'preference', 'error_handling'
    trigger: str  # Condição que ativa o padrão
    action: str  # Ação a ser tomada
    confidence: float  # Score de confiança (0.0 a 1.0)
    frequency: int  # Quantas vezes foi observado
    contexts: List[str]  # Contextos onde foi observado
    metadata: Dict[str, Any]
    created_at: datetime
    last_seen: datetime
    
    def to_dict(self) -> Dict[str, Any]:
        """Converte para dicionário"""
        return {
            "id": self.id,
            "pattern_type": self.pattern_type,
            "trigger": self.trigger,
            "action": self.action,
            "confidence": self.confidence,
            "frequency": self.frequency,
            "contexts": self.contexts,
            "metadata": self.metadata,
            "created_at": self.created_at.isoformat(),
            "last_seen": self.last_seen.isoformat()
        }

@dataclass
class LearningLog:
    """Representa um aprendizado pendente de aprovação"""
    id: str
    pattern_id: str
    learning_type: str  # 'new_pattern', 'pattern_update', 'pattern_merge'
    description: str
    confidence_score: float
    evidence: List[Dict[str, Any]]  # Evidências que suportam o aprendizado
    proposed_changes: Dict[str, Any]  # Mudanças propostas
    status: str  # 'pending', 'approved', 'rejected'
    created_at: datetime
    reviewed_at: Optional[datetime] = None
    reviewer_notes: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Converte para dicionário"""
        return {
            "id": self.id,
            "pattern_id": self.pattern_id,
            "learning_type": self.learning_type,
            "description": self.description,
            "confidence_score": self.confidence_score,
            "evidence": self.evidence,
            "proposed_changes": self.proposed_changes,
            "status": self.status,
            "created_at": self.created_at.isoformat(),
            "reviewed_at": self.reviewed_at.isoformat() if self.reviewed_at else None,
            "reviewer_notes": self.reviewer_notes
        }

class LearningService:
    """
    Serviço de aprendizado que identifica padrões comportamentais
    
    Responsabilidades:
    - Analisar conversas para identificar padrões
    - Calcular confidence scores
    - Gerar logs de aprendizado
    - Detectar mudanças comportamentais
    - Sugerir otimizações
    """
    
    def __init__(self):
        """Inicializa o serviço de aprendizado"""
        self.supabase = get_supabase_client()
        self.ai_service = get_ai_service()
        
        # Lazy loading para evitar imports circulares
        self._memory_service = None
        
        # Configurações
        self.min_pattern_frequency = 3  # Mínimo de ocorrências para considerar padrão
        self.min_confidence_threshold = 0.7  # Mínimo de confiança para aprovação automática
        self.analysis_window_days = 30  # Janela de análise em dias
        self.max_patterns_per_analysis = 50  # Máximo de padrões por análise
        
        logger.info("LearningService inicializado")
    
    @property
    def memory_service(self):
        """Lazy loading do MemoryService"""
        if self._memory_service is None:
            from .memory_service import get_memory_service
            self._memory_service = get_memory_service()
        return self._memory_service
    
    async def analyze_conversation_patterns(self, conversation_id: str, limit_days: int = 7) -> List[Pattern]:
        """
        Analisa padrões em uma conversa específica
        
        Args:
            conversation_id: ID da conversa
            limit_days: Dias para análise (padrão: 7)
            
        Returns:
            Lista de padrões identificados
            
        Raises:
            ValueError: Se conversation_id inválido
        """
        if not conversation_id or not conversation_id.strip():
            raise ValueError("conversation_id não pode estar vazio")
        
        try:
            logger.info(f"Analisando padrões da conversa {conversation_id} (últimos {limit_days} dias)")
            
            # Buscar memórias da conversa
            memories = await self._get_conversation_memories(conversation_id, limit_days)
            
            if len(memories) < self.min_pattern_frequency:
                logger.info(f"Conversa {conversation_id} tem poucas memórias ({len(memories)}) para análise de padrões")
                return []
            
            # Analisar diferentes tipos de padrões
            patterns = []
            
            # 1. Padrões de resposta
            response_patterns = await self._analyze_response_patterns(memories)
            patterns.extend(response_patterns)
            
            # 2. Padrões de workflow
            workflow_patterns = await self._analyze_workflow_patterns(memories)
            patterns.extend(workflow_patterns)
            
            # 3. Padrões de preferência
            preference_patterns = await self._analyze_preference_patterns(memories)
            patterns.extend(preference_patterns)
            
            # 4. Padrões de tratamento de erro
            error_patterns = await self._analyze_error_patterns(memories)
            patterns.extend(error_patterns)
            
            # Filtrar e ranquear padrões
            valid_patterns = self._filter_and_rank_patterns(patterns)
            
            logger.info(f"Identificados {len(valid_patterns)} padrões válidos na conversa {conversation_id}")
            return valid_patterns
            
        except Exception as e:
            logger.error(f"Erro na análise de padrões da conversa {conversation_id}: {e}")
            return []
    
    async def analyze_global_patterns(self, limit_days: int = 30) -> List[Pattern]:
        """
        Analisa padrões globais em todas as conversas
        
        Args:
            limit_days: Dias para análise (padrão: 30)
            
        Returns:
            Lista de padrões globais identificados
        """
        try:
            logger.info(f"Analisando padrões globais (últimos {limit_days} dias)")
            
            # Buscar memórias de múltiplas conversas
            memories = await self._get_global_memories(limit_days)
            
            if len(memories) < self.min_pattern_frequency * 2:
                logger.info(f"Poucas memórias globais ({len(memories)}) para análise de padrões")
                return []
            
            # Agrupar memórias por conversa
            conversations = self._group_memories_by_conversation(memories)
            
            # Analisar padrões cross-conversation
            patterns = []
            
            # 1. Padrões de comportamento comum
            common_patterns = await self._analyze_common_behaviors(conversations)
            patterns.extend(common_patterns)
            
            # 2. Padrões de evolução temporal
            temporal_patterns = await self._analyze_temporal_patterns(memories)
            patterns.extend(temporal_patterns)
            
            # 3. Padrões de contexto
            context_patterns = await self._analyze_context_patterns(conversations)
            patterns.extend(context_patterns)
            
            # Filtrar e ranquear
            valid_patterns = self._filter_and_rank_patterns(patterns)
            
            logger.info(f"Identificados {len(valid_patterns)} padrões globais válidos")
            return valid_patterns
            
        except Exception as e:
            logger.error(f"Erro na análise de padrões globais: {e}")
            return []
    
    async def generate_learning_log(self, pattern: Pattern, evidence: List[Any]) -> Optional[LearningLog]:
        """
        Gera log de aprendizado baseado em um padrão identificado
        
        Args:
            pattern: Padrão identificado
            evidence: Memórias que evidenciam o padrão
            
        Returns:
            LearningLog criado ou None se inválido
        """
        try:
            # Validar entrada
            if not pattern or not evidence:
                logger.warning("Padrão ou evidências inválidas para gerar learning log")
                return None
            
            # Determinar tipo de aprendizado
            learning_type = await self._determine_learning_type(pattern)
            
            # Gerar descrição usando IA
            description = await self._generate_pattern_description(pattern, evidence)
            
            # Calcular confidence score
            confidence_score = await self._calculate_learning_confidence(pattern, evidence)
            
            # Preparar evidências
            evidence_data = [
                {
                    "memory_id": memory.id,
                    "content": memory.content[:200],  # Truncar para economizar espaço
                    "relevance_score": memory.relevance_score,
                    "created_at": memory.created_at.isoformat()
                }
                for memory in evidence[:10]  # Máximo 10 evidências
            ]
            
            # Preparar mudanças propostas
            proposed_changes = await self._generate_proposed_changes(pattern)
            
            # Criar learning log
            learning_log = LearningLog(
                id=str(uuid.uuid4()),
                pattern_id=pattern.id,
                learning_type=learning_type,
                description=description,
                confidence_score=confidence_score,
                evidence=evidence_data,
                proposed_changes=proposed_changes,
                status="pending",
                created_at=datetime.utcnow()
            )
            
            # Salvar no banco
            await self._save_learning_log(learning_log)
            
            logger.info(f"Learning log criado: {learning_log.id} (confidence: {confidence_score:.2f})")
            return learning_log
            
        except Exception as e:
            logger.error(f"Erro ao gerar learning log: {e}")
            return None
    
    # Métodos auxiliares privados
    
    async def _get_conversation_memories(self, conversation_id: str, days: int) -> List[Any]:
        """Busca memórias de uma conversa específica"""
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        try:
            logger.info(f"Buscando mensagens da conversa {conversation_id} (últimos {days} dias)")
            
            # Buscar mensagens da tabela messages (ao invés de memory_chunks)
            result = self.supabase.table("messages").select("*").eq(
                "conversation_id", conversation_id
            ).gte("created_at", cutoff_date.isoformat()).order(
                "created_at", desc=True
            ).execute()
            
            memories = []
            if result.data:
                for row in result.data:
                    # Adaptar estrutura de Message para Memory
                    # Criar objeto compatível com a interface esperada
                    class MessageAsMemory:
                        def __init__(self, message_data):
                            self.id = message_data["id"]
                            self.conversation_id = message_data["conversation_id"]
                            self.content = message_data["content"]
                            self.embedding = []  # Messages não têm embedding
                            self.metadata = message_data.get("metadata", {})
                            # Adicionar informações do sender na metadata
                            self.metadata.update({
                                "sender_type": message_data.get("sender_type", "unknown"),
                                "sender_id": message_data.get("sender_id"),
                                "message_type": message_data.get("message_type", "text")
                            })
                            self.relevance_score = 1.0  # Score padrão para messages
                            self.created_at = datetime.fromisoformat(
                                message_data["created_at"].replace("Z", "+00:00")
                            ) if message_data.get("created_at") else datetime.utcnow()
                    
                    memory = MessageAsMemory(row)
                    memories.append(memory)
            
            logger.info(f"Encontradas {len(memories)} mensagens para análise")
            return memories
            
        except Exception as e:
            logger.error(f"Erro ao buscar mensagens da conversa: {e}")
            return []
    
    async def _get_global_memories(self, days: int) -> List[Any]:
        """Busca memórias globais de múltiplas conversas"""
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        try:
            logger.info(f"Buscando mensagens globais (últimos {days} dias)")
            
            # Buscar mensagens da tabela messages (ao invés de memory_chunks)
            result = self.supabase.table("messages").select("*").gte(
                "created_at", cutoff_date.isoformat()
            ).order("created_at", desc=True).limit(1000).execute()  # Limitar para performance
            
            memories = []
            if result.data:
                for row in result.data:
                    # Usar mesma classe MessageAsMemory
                    class MessageAsMemory:
                        def __init__(self, message_data):
                            self.id = message_data["id"]
                            self.conversation_id = message_data["conversation_id"]
                            self.content = message_data["content"]
                            self.embedding = []  # Messages não têm embedding
                            self.metadata = message_data.get("metadata", {})
                            # Adicionar informações do sender na metadata
                            self.metadata.update({
                                "sender_type": message_data.get("sender_type", "unknown"),
                                "sender_id": message_data.get("sender_id"),
                                "message_type": message_data.get("message_type", "text")
                            })
                            self.relevance_score = 1.0  # Score padrão para messages
                            self.created_at = datetime.fromisoformat(
                                message_data["created_at"].replace("Z", "+00:00")
                            ) if message_data.get("created_at") else datetime.utcnow()
                    
                    memory = MessageAsMemory(row)
                    memories.append(memory)
            
            logger.info(f"Encontradas {len(memories)} mensagens globais para análise")
            return memories
            
        except Exception as e:
            logger.error(f"Erro ao buscar mensagens globais: {e}")
            return []
    
    def _group_memories_by_conversation(self, memories: List[Any]) -> Dict[str, List[Any]]:
        """Agrupa memórias por conversa"""
        conversations = defaultdict(list)
        for memory in memories:
            conversations[memory.conversation_id].append(memory)
        return dict(conversations)
    
    async def _analyze_response_patterns(self, memories: List[Any]) -> List[Pattern]:
        """Analisa padrões de resposta"""
        patterns = []
        
        try:
            # Agrupar por tipo de resposta
            response_types = defaultdict(list)
            
            for memory in memories:
                # Extrair tipo de resposta do conteúdo
                response_type = self._extract_response_type(memory.content)
                if response_type:
                    response_types[response_type].append(memory)
            
            # Identificar padrões frequentes
            for response_type, type_memories in response_types.items():
                if len(type_memories) >= self.min_pattern_frequency:
                    # Calcular confiança baseada na frequência
                    confidence = min(0.9, len(type_memories) / 10.0)
                    
                    pattern = Pattern(
                        id=str(uuid.uuid4()),
                        pattern_type="response",
                        trigger=f"Situação que requer {response_type}",
                        action=f"Responder com padrão {response_type}",
                        confidence=confidence,
                        frequency=len(type_memories),
                        contexts=[memory.conversation_id for memory in type_memories],
                        metadata={
                            "response_type": response_type,
                            "examples": [m.content[:100] for m in type_memories[:3]]
                        },
                        created_at=datetime.utcnow(),
                        last_seen=max(m.created_at for m in type_memories)
                    )
                    patterns.append(pattern)
            
        except Exception as e:
            logger.error(f"Erro na análise de padrões de resposta: {e}")
        
        return patterns
    
    def _filter_and_rank_patterns(self, patterns: List[Pattern]) -> List[Pattern]:
        """Filtra e ranqueia padrões por relevância"""
        # Filtrar por confiança mínima
        valid_patterns = [p for p in patterns if p.confidence >= 0.3]
        
        # Ranquear por score combinado (confiança + frequência)
        def calculate_score(pattern: Pattern) -> float:
            confidence_weight = 0.7
            frequency_weight = 0.3
            
            # Normalizar frequência (assumindo máximo de 100)
            normalized_frequency = min(pattern.frequency / 100.0, 1.0)
            
            return (pattern.confidence * confidence_weight + 
                   normalized_frequency * frequency_weight)
        
        valid_patterns.sort(key=calculate_score, reverse=True)
        
        # Limitar ao máximo configurado
        return valid_patterns[:self.max_patterns_per_analysis]
    
    def _extract_response_type(self, content: str) -> Optional[str]:
        """Extrai tipo de resposta do conteúdo"""
        content_lower = content.lower()
        
        # Padrões de resposta comuns
        if any(word in content_lower for word in ['pergunta', 'questão', 'dúvida']):
            return 'question_response'
        elif any(word in content_lower for word in ['explicação', 'explicar', 'como']):
            return 'explanation'
        elif any(word in content_lower for word in ['problema', 'erro', 'falha']):
            return 'problem_solving'
        elif any(word in content_lower for word in ['sugestão', 'recomendação', 'sugiro']):
            return 'suggestion'
        elif any(word in content_lower for word in ['confirmação', 'confirmar', 'ok']):
            return 'confirmation'
        else:
            return 'general_response'
    
    async def extract_response_template(self, pattern: Pattern, evidence_memories: List[Any]) -> Optional[Dict[str, Any]]:
        """
        Extrai template de resposta baseado em um padrão identificado
        
        Args:
            pattern: Padrão para extrair template
            evidence_memories: Memórias que evidenciam o padrão
            
        Returns:
            Template de resposta com condições de aplicação ou None se inválido
            
        Raises:
            ValueError: Se parâmetros inválidos
        """
        if not pattern or not evidence_memories:
            raise ValueError("Pattern e evidence_memories são obrigatórios")
        
        try:
            logger.info(f"Extraindo template de resposta para padrão {pattern.id}")
            
            # 1. Analisar conteúdo das memórias para identificar padrões textuais
            response_contents = [memory.content for memory in evidence_memories]
            
            # 2. Identificar elementos comuns nas respostas
            common_elements = await self._identify_common_response_elements(response_contents)
            
            # 3. Extrair estrutura do template
            template_structure = await self._extract_template_structure(response_contents, common_elements)
            
            # 4. Definir condições de aplicação
            application_conditions = await self._define_application_conditions(pattern, evidence_memories)
            
            # 5. Calcular confidence do template
            template_confidence = await self._calculate_template_confidence(template_structure, evidence_memories)
            
            # 6. Gerar template final
            response_template = {
                "id": str(uuid.uuid4()),
                "pattern_id": pattern.id,
                "template_type": pattern.pattern_type,
                "structure": template_structure,
                "conditions": application_conditions,
                "confidence": template_confidence,
                "usage_count": len(evidence_memories),
                "examples": [content[:150] + "..." if len(content) > 150 else content 
                           for content in response_contents[:3]],
                "metadata": {
                    "created_from_pattern": pattern.id,
                    "evidence_count": len(evidence_memories),
                    "pattern_frequency": pattern.frequency,
                    "extraction_method": "ai_assisted"
                },
                "created_at": datetime.utcnow().isoformat(),
                "last_updated": datetime.utcnow().isoformat()
            }
            
            # 7. Validar template antes de retornar
            if await self._validate_response_template(response_template):
                logger.info(f"Template extraído com sucesso: confidence {template_confidence:.2f}")
                return response_template
            else:
                logger.warning(f"Template inválido para padrão {pattern.id}")
                return None
                
        except Exception as e:
            logger.error(f"Erro ao extrair template de resposta: {e}")
            return None
    
    async def _identify_common_response_elements(self, response_contents: List[str]) -> Dict[str, Any]:
        """
        Identifica elementos comuns nas respostas
        
        Args:
            response_contents: Lista de conteúdos de resposta
            
        Returns:
            Dicionário com elementos comuns identificados
        """
        try:
            # 1. Análise de palavras-chave frequentes
            all_words = []
            for content in response_contents:
                # Limpar e tokenizar
                words = re.findall(r'\b\w+\b', content.lower())
                all_words.extend(words)
            
            # Contar frequência de palavras
            word_freq = Counter(all_words)
            common_words = [word for word, freq in word_freq.most_common(10) 
                          if freq >= len(response_contents) * 0.3]  # Aparecem em 30%+ das respostas
            
            # 2. Análise de frases comuns
            common_phrases = await self._extract_common_phrases(response_contents)
            
            # 3. Análise de estrutura (saudações, despedidas, etc.)
            structural_elements = await self._analyze_response_structure(response_contents)
            
            # 4. Análise de tom e estilo
            tone_analysis = await self._analyze_response_tone(response_contents)
            
            return {
                "common_words": common_words,
                "common_phrases": common_phrases,
                "structural_elements": structural_elements,
                "tone_analysis": tone_analysis,
                "response_count": len(response_contents)
            }
            
        except Exception as e:
            logger.error(f"Erro ao identificar elementos comuns: {e}")
            return {}
    
    async def _extract_common_phrases(self, response_contents: List[str]) -> List[str]:
        """Extrai frases comuns entre as respostas"""
        try:
            # Buscar frases de 2-5 palavras que aparecem em múltiplas respostas
            phrase_counts = defaultdict(int)
            
            for content in response_contents:
                words = content.lower().split()
                
                # Gerar n-gramas de 2 a 5 palavras
                for n in range(2, 6):
                    for i in range(len(words) - n + 1):
                        phrase = ' '.join(words[i:i+n])
                        # Filtrar frases muito comuns ou irrelevantes
                        if not self._is_irrelevant_phrase(phrase):
                            phrase_counts[phrase] += 1
            
            # Retornar frases que aparecem em pelo menos 2 respostas
            common_phrases = [phrase for phrase, count in phrase_counts.items() 
                            if count >= min(2, len(response_contents) * 0.4)]
            
            return sorted(common_phrases, key=lambda x: phrase_counts[x], reverse=True)[:10]
            
        except Exception as e:
            logger.error(f"Erro ao extrair frases comuns: {e}")
            return []
    
    def _is_irrelevant_phrase(self, phrase: str) -> bool:
        """Verifica se uma frase é irrelevante para templates"""
        irrelevant_words = {'de', 'da', 'do', 'para', 'com', 'em', 'na', 'no', 'por', 'a', 'o', 'e', 'que', 'se'}
        words = phrase.split()
        
        # Filtrar frases muito curtas ou compostas apenas de palavras irrelevantes
        if len(words) < 2 or all(word in irrelevant_words for word in words):
            return True
        
        # Filtrar frases com apenas números ou caracteres especiais
        if re.match(r'^[\d\s\W]+$', phrase):
            return True
            
        return False
    
    async def _analyze_response_structure(self, response_contents: List[str]) -> Dict[str, Any]:
        """Analisa estrutura das respostas (início, meio, fim)"""
        try:
            structure_analysis = {
                "common_openings": [],
                "common_closings": [],
                "average_length": 0,
                "has_questions": 0,
                "has_lists": 0,
                "has_explanations": 0
            }
            
            total_length = 0
            
            for content in response_contents:
                total_length += len(content)
                
                # Analisar início (primeiras 50 caracteres)
                opening = content[:50].strip()
                if opening:
                    structure_analysis["common_openings"].append(opening)
                
                # Analisar fim (últimas 50 caracteres)
                closing = content[-50:].strip()
                if closing:
                    structure_analysis["common_closings"].append(closing)
                
                # Verificar presença de elementos estruturais
                if '?' in content:
                    structure_analysis["has_questions"] += 1
                
                if any(marker in content for marker in ['1.', '2.', '-', '•', '*']):
                    structure_analysis["has_lists"] += 1
                
                if any(word in content.lower() for word in ['porque', 'pois', 'devido', 'explicação']):
                    structure_analysis["has_explanations"] += 1
            
            # Calcular médias e percentuais
            structure_analysis["average_length"] = total_length / len(response_contents)
            structure_analysis["question_percentage"] = structure_analysis["has_questions"] / len(response_contents)
            structure_analysis["list_percentage"] = structure_analysis["has_lists"] / len(response_contents)
            structure_analysis["explanation_percentage"] = structure_analysis["has_explanations"] / len(response_contents)
            
            return structure_analysis
            
        except Exception as e:
            logger.error(f"Erro ao analisar estrutura: {e}")
            return {}
    
    async def _analyze_response_tone(self, response_contents: List[str]) -> Dict[str, Any]:
        """Analisa tom e estilo das respostas"""
        try:
            tone_indicators = {
                "formal": 0,
                "informal": 0,
                "helpful": 0,
                "technical": 0,
                "empathetic": 0
            }
            
            for content in response_contents:
                content_lower = content.lower()
                
                # Indicadores de formalidade
                if any(word in content_lower for word in ['senhor', 'senhora', 'vossa', 'cordialmente']):
                    tone_indicators["formal"] += 1
                elif any(word in content_lower for word in ['oi', 'olá', 'beleza', 'tranquilo']):
                    tone_indicators["informal"] += 1
                
                # Indicadores de ajuda
                if any(word in content_lower for word in ['ajudar', 'auxiliar', 'apoiar', 'resolver']):
                    tone_indicators["helpful"] += 1
                
                # Indicadores técnicos
                if any(word in content_lower for word in ['configuração', 'sistema', 'processo', 'método']):
                    tone_indicators["technical"] += 1
                
                # Indicadores de empatia
                if any(word in content_lower for word in ['entendo', 'compreendo', 'sinto', 'lamento']):
                    tone_indicators["empathetic"] += 1
            
            # Normalizar por número de respostas
            total_responses = len(response_contents)
            for key in tone_indicators:
                tone_indicators[key] = tone_indicators[key] / total_responses
            
            return tone_indicators
            
        except Exception as e:
            logger.error(f"Erro ao analisar tom: {e}")
            return {}
    
    async def _extract_template_structure(self, response_contents: List[str], common_elements: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extrai estrutura do template baseada nos elementos comuns
        
        Args:
            response_contents: Conteúdos das respostas
            common_elements: Elementos comuns identificados
            
        Returns:
            Estrutura do template
        """
        try:
            # Usar IA para gerar template mais sofisticado
            template_prompt = f"""
            Baseado nas seguintes respostas similares, extraia um template reutilizável:
            
            Respostas:
            {chr(10).join([f"- {content[:200]}" for content in response_contents[:5]])}
            
            Elementos comuns identificados:
            - Palavras frequentes: {', '.join(common_elements.get('common_words', [])[:5])}
            - Frases comuns: {', '.join(common_elements.get('common_phrases', [])[:3])}
            
            Crie um template que capture o padrão essencial, usando placeholders para partes variáveis.
            Formato: {{
                "template_text": "texto do template com {{placeholder}}",
                "placeholders": ["lista", "de", "placeholders"],
                "structure_type": "tipo da estrutura",
                "key_elements": ["elementos", "chave"]
            }}
            """
            
            try:
                ai_response = await self.ai_service.generate_text(
                    prompt=template_prompt,
                    max_tokens=500,
                    temperature=0.3
                )
                
                # Tentar parsear resposta da IA
                import json
                template_data = json.loads(ai_response['text'])
                
                # Validar estrutura
                if all(key in template_data for key in ['template_text', 'placeholders', 'structure_type']):
                    return template_data
                    
            except Exception as ai_error:
                logger.warning(f"Erro na geração de template via IA: {ai_error}")
            
            # Fallback: gerar template simples baseado em análise estatística
            return await self._generate_simple_template(response_contents, common_elements)
            
        except Exception as e:
            logger.error(f"Erro ao extrair estrutura do template: {e}")
            return {}
    
    async def _generate_simple_template(self, response_contents: List[str], common_elements: Dict[str, Any]) -> Dict[str, Any]:
        """Gera template simples como fallback"""
        try:
            # Identificar padrão mais comum
            most_common_phrases = common_elements.get('common_phrases', [])
            structural_elements = common_elements.get('structural_elements', {})
            
            # Criar template básico
            if most_common_phrases:
                base_phrase = most_common_phrases[0]
                template_text = f"{base_phrase} {{content}} {{conclusion}}"
                placeholders = ["content", "conclusion"]
                structure_type = "phrase_based"
            else:
                # Template genérico baseado na estrutura
                avg_length = structural_elements.get('average_length', 100)
                if avg_length > 200:
                    template_text = "{{greeting}} {{main_content}} {{additional_info}} {{closing}}"
                    placeholders = ["greeting", "main_content", "additional_info", "closing"]
                    structure_type = "detailed_response"
                else:
                    template_text = "{{greeting}} {{main_content}} {{closing}}"
                    placeholders = ["greeting", "main_content", "closing"]
                    structure_type = "simple_response"
            
            return {
                "template_text": template_text,
                "placeholders": placeholders,
                "structure_type": structure_type,
                "key_elements": common_elements.get('common_words', [])[:5],
                "generation_method": "statistical_fallback"
            }
            
        except Exception as e:
            logger.error(f"Erro ao gerar template simples: {e}")
            return {
                "template_text": "{{response_content}}",
                "placeholders": ["response_content"],
                "structure_type": "generic",
                "key_elements": [],
                "generation_method": "minimal_fallback"
            }
    
    async def _define_application_conditions(self, pattern: Pattern, evidence_memories: List[Any]) -> Dict[str, Any]:
        """
        Define condições para aplicação do template
        
        Args:
            pattern: Padrão base
            evidence_memories: Memórias de evidência
            
        Returns:
            Condições de aplicação
        """
        try:
            # Analisar contextos onde o padrão aparece
            contexts = []
            keywords = set()
            conversation_types = set()
            
            for memory in evidence_memories:
                # Extrair contexto da metadata
                metadata = memory.metadata or {}
                if 'context' in metadata:
                    contexts.append(metadata['context'])
                
                # Extrair keywords do conteúdo
                content_words = re.findall(r'\b\w+\b', memory.content.lower())
                keywords.update(content_words[:10])  # Primeiras 10 palavras
                
                # Identificar tipo de conversa
                conversation_types.add(memory.conversation_id[:8])  # Usar prefixo como tipo
            
            # Definir condições baseadas na análise
            conditions = {
                "trigger_keywords": list(keywords)[:20],  # Top 20 keywords
                "context_types": list(contexts)[:10] if contexts else ["general"],
                "conversation_patterns": list(conversation_types)[:5],
                "minimum_confidence": max(0.5, pattern.confidence - 0.2),
                "usage_frequency_threshold": max(2, pattern.frequency // 3),
                "temporal_conditions": {
                    "time_of_day": "any",
                    "day_of_week": "any",
                    "seasonal": "any"
                },
                "user_conditions": {
                    "experience_level": "any",
                    "interaction_history": "any",
                    "preferences": "any"
                },
                "content_conditions": {
                    "message_length": "any",
                    "complexity_level": "any",
                    "topic_category": pattern.pattern_type
                }
            }
            
            return conditions
            
        except Exception as e:
            logger.error(f"Erro ao definir condições de aplicação: {e}")
            return {
                "trigger_keywords": [],
                "context_types": ["general"],
                "minimum_confidence": 0.5
            }
    
    async def _calculate_template_confidence(self, template_structure: Dict[str, Any], evidence_memories: List[Any]) -> float:
        """
        Calcula confidence do template baseado na qualidade da extração
        
        Args:
            template_structure: Estrutura do template
            evidence_memories: Memórias de evidência
            
        Returns:
            Score de confidence (0.0 a 1.0)
        """
        try:
            confidence_factors = []
            
            # 1. Qualidade da estrutura do template
            structure_quality = 0.5  # Base
            if template_structure.get('template_text'):
                structure_quality += 0.2
            if template_structure.get('placeholders'):
                structure_quality += 0.1 * min(len(template_structure['placeholders']), 3)
            if template_structure.get('key_elements'):
                structure_quality += 0.1
            
            confidence_factors.append(min(1.0, structure_quality))
            
            # 2. Quantidade de evidências
            evidence_factor = min(1.0, len(evidence_memories) / 10.0)  # Máximo com 10 evidências
            confidence_factors.append(evidence_factor)
            
            # 3. Consistência das evidências
            consistency_factor = await self._calculate_evidence_consistency(evidence_memories)
            confidence_factors.append(consistency_factor)
            
            # 4. Método de geração
            generation_method = template_structure.get('generation_method', 'unknown')
            if generation_method == 'ai_assisted':
                method_factor = 0.9
            elif generation_method == 'statistical_fallback':
                method_factor = 0.7
            else:
                method_factor = 0.5
            
            confidence_factors.append(method_factor)
            
            # Calcular confidence final (média ponderada)
            weights = [0.3, 0.25, 0.25, 0.2]  # Pesos para cada fator
            final_confidence = sum(factor * weight for factor, weight in zip(confidence_factors, weights))
            
            return round(final_confidence, 3)
            
        except Exception as e:
            logger.error(f"Erro ao calcular confidence do template: {e}")
            return 0.5  # Confidence padrão em caso de erro
    
    async def _calculate_evidence_consistency(self, evidence_memories: List[Any]) -> float:
        """Calcula consistência entre as evidências"""
        try:
            if len(evidence_memories) < 2:
                return 1.0  # Uma evidência é sempre consistente consigo mesma
            
            # Calcular similaridade entre conteúdos
            similarities = []
            contents = [memory.content for memory in evidence_memories]
            
            for i in range(len(contents)):
                for j in range(i + 1, len(contents)):
                    similarity = await self._calculate_content_similarity(contents[i], contents[j])
                    similarities.append(similarity)
            
            # Retornar média das similaridades
            return sum(similarities) / len(similarities) if similarities else 0.5
            
        except Exception as e:
            logger.error(f"Erro ao calcular consistência das evidências: {e}")
            return 0.5
    
    async def _calculate_content_similarity(self, content1: str, content2: str) -> float:
        """Calcula similaridade entre dois conteúdos"""
        try:
            # Método simples baseado em palavras comuns
            words1 = set(re.findall(r'\b\w+\b', content1.lower()))
            words2 = set(re.findall(r'\b\w+\b', content2.lower()))
            
            if not words1 or not words2:
                return 0.0
            
            # Jaccard similarity
            intersection = len(words1.intersection(words2))
            union = len(words1.union(words2))
            
            return intersection / union if union > 0 else 0.0
            
        except Exception as e:
            logger.error(f"Erro ao calcular similaridade de conteúdo: {e}")
            return 0.0
    
    async def _validate_response_template(self, template: Dict[str, Any]) -> bool:
        """
        Valida se o template de resposta está bem formado
        
        Args:
            template: Template a ser validado
            
        Returns:
            True se válido, False caso contrário
        """
        try:
            # Verificar campos obrigatórios
            required_fields = ['id', 'pattern_id', 'template_type', 'structure', 'conditions', 'confidence']
            
            for field in required_fields:
                if field not in template:
                    logger.warning(f"Campo obrigatório ausente no template: {field}")
                    return False
            
            # Verificar estrutura do template
            structure = template.get('structure', {})
            if not structure.get('template_text'):
                logger.warning("Template sem texto definido")
                return False
            
            # Verificar confidence
            confidence = template.get('confidence', 0)
            if not isinstance(confidence, (int, float)) or confidence < 0 or confidence > 1:
                logger.warning(f"Confidence inválido: {confidence}")
                return False
            
            # Verificar condições
            conditions = template.get('conditions', {})
            if not isinstance(conditions, dict):
                logger.warning("Condições devem ser um dicionário")
                return False
            
            # Template válido
            return True
            
        except Exception as e:
            logger.error(f"Erro ao validar template: {e}")
            return False
    
    async def _analyze_workflow_patterns(self, memories: List[Any]) -> List[Pattern]:
        """Analisa padrões de workflow"""
        return []  # Implementação simplificada
    
    async def _analyze_preference_patterns(self, memories: List[Any]) -> List[Pattern]:
        """Analisa padrões de preferência"""
        return []  # Implementação simplificada
    
    async def _analyze_error_patterns(self, memories: List[Any]) -> List[Pattern]:
        """Analisa padrões de tratamento de erro"""
        return []  # Implementação simplificada
    
    async def _analyze_common_behaviors(self, conversations: Dict[str, List[Any]]) -> List[Pattern]:
        """Analisa comportamentos comuns entre conversas"""
        return []  # Implementação simplificada
    
    async def _analyze_temporal_patterns(self, memories: List[Any]) -> List[Pattern]:
        """Analisa padrões temporais"""
        return []  # Implementação simplificada
    
    async def _analyze_context_patterns(self, conversations: Dict[str, List[Any]]) -> List[Pattern]:
        """Analisa padrões de contexto"""
        return []  # Implementação simplificada
    
    async def _determine_learning_type(self, pattern: Pattern) -> str:
        """Determina o tipo de aprendizado baseado no padrão"""
        return "new_pattern"  # Implementação simplificada
    
    async def _generate_pattern_description(self, pattern: Pattern, evidence: List[Any]) -> str:
        """Gera descrição do padrão usando IA"""
        return f"Padrão {pattern.pattern_type}: {pattern.trigger} -> {pattern.action}"
    
    async def _calculate_learning_confidence(self, pattern: Pattern, evidence: List[Any]) -> float:
        """Calcula confidence score do aprendizado"""
        return pattern.confidence
    
    async def _generate_proposed_changes(self, pattern: Pattern) -> Dict[str, Any]:
        """Gera mudanças propostas baseadas no padrão"""
        return {"pattern_integration": {"add_to_knowledge_base": True}}
    
    async def _save_learning_log(self, learning_log: LearningLog):
        """Salva learning log no banco de dados"""
        try:
            # Adaptar para estrutura real da tabela learning_logs
            pattern_data = {
                "pattern_type": learning_log.learning_type,
                "description": learning_log.description,
                "evidence": learning_log.evidence,
                "suggested_response": learning_log.proposed_changes.get('suggested_response', '') if learning_log.proposed_changes else '',
                "pattern_id": learning_log.pattern_id,
                "learning_type": learning_log.learning_type
            }
            
            data = {
                "pattern_data": pattern_data,
                "confidence_score": learning_log.confidence_score,
                "status": learning_log.status,
                "created_at": learning_log.created_at.isoformat()
            }
            
            result = self.supabase.table("learning_logs").insert(data).execute()
            if result.data:
                logger.info(f"Learning log salvo: {learning_log.id}")
        except Exception as e:
            logger.error(f"Erro ao salvar learning log: {e}")


# Instância singleton
_learning_service: Optional[LearningService] = None

def get_learning_service() -> LearningService:
    """Retorna instância singleton do LearningService"""
    global _learning_service
    if _learning_service is None:
        _learning_service = LearningService()
    return _learning_service