"""
Memory Service - SICC

Responsável por gerenciar armazenamento e recuperação de memórias vetorizadas.
Utiliza embeddings GTE-small (384 dimensões) e busca vetorial com pgvector.
"""

import os
import asyncio
import logging
from typing import List, Dict, Any, Optional, Union
from datetime import datetime, timedelta
import numpy as np
from sentence_transformers import SentenceTransformer
from supabase import Client
import uuid

try:
    from ..supabase_client import get_supabase_client
except ImportError:
    # Fallback para importação direta quando executado como script
    import sys
    import os
    sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
    from ..supabase_client import get_supabase_client

# Configurar logging
logger = logging.getLogger(__name__)

class Memory:
    """Representa uma memória vetorizada"""
    
    def __init__(self, id: str, conversation_id: str, content: str, 
                 embedding: List[float], metadata: Dict[str, Any], 
                 relevance_score: float, created_at: datetime):
        self.id = id
        self.conversation_id = conversation_id
        self.content = content
        self.embedding = embedding
        self.metadata = metadata
        self.relevance_score = relevance_score
        self.created_at = created_at
    
    def to_dict(self) -> Dict[str, Any]:
        """Converte para dicionário"""
        return {
            "id": self.id,
            "conversation_id": self.conversation_id,
            "content": self.content,
            "embedding": self.embedding,
            "metadata": self.metadata,
            "relevance_score": self.relevance_score,
            "created_at": self.created_at.isoformat()
        }

class MemoryService:
    """
    Serviço de gerenciamento de memórias vetorizadas para SICC
    
    Funcionalidades:
    - Geração de embeddings usando GTE-small (384 dimensões)
    - Armazenamento de memórias com metadados
    - Busca vetorial por similaridade usando pgvector
    - Estratégia de retenção baseada em relevância
    """
    
    def __init__(self, supabase_client: Optional[Client] = None):
        """
        Inicializa o Memory Service
        
        Args:
            supabase_client: Cliente Supabase (opcional, usa padrão se None)
        """
        self.supabase = supabase_client or get_supabase_client()
        self._model = None
        self._model_lock = asyncio.Lock()
        
        # Configurações
        self.embedding_model_name = "sentence-transformers/all-MiniLM-L6-v2"  # 384 dimensões
        self.embedding_dimensions = 384
        self.max_memories_per_conversation = 100
        self.retention_days = 90
        
        logger.info("MemoryService inicializado")
    
    async def _get_embedding_model(self) -> SentenceTransformer:
        """
        Obtém o modelo de embedding (lazy loading com thread safety)
        
        Returns:
            Modelo SentenceTransformer carregado
        """
        if self._model is None:
            async with self._model_lock:
                if self._model is None:
                    logger.info(f"Carregando modelo de embedding: {self.embedding_model_name}")
                    # Executar em thread separada para não bloquear
                    loop = asyncio.get_event_loop()
                    self._model = await loop.run_in_executor(
                        None, 
                        lambda: SentenceTransformer(self.embedding_model_name)
                    )
                    logger.info("Modelo de embedding carregado com sucesso")
        
        return self._model
    
    async def generate_embedding(self, text: str) -> List[float]:
        """
        Gera embedding vetorial para um texto
        
        Args:
            text: Texto para gerar embedding
            
        Returns:
            Lista de floats representando o embedding (384 dimensões)
            
        Raises:
            ValueError: Se o texto estiver vazio
            RuntimeError: Se houver erro na geração do embedding
        """
        if not text or not text.strip():
            raise ValueError("Texto não pode estar vazio")
        
        try:
            model = await self._get_embedding_model()
            
            # Executar geração de embedding em thread separada
            loop = asyncio.get_event_loop()
            embedding = await loop.run_in_executor(
                None,
                lambda: model.encode(text.strip())
            )
            
            # Normalizar para busca por similaridade coseno
            embedding = embedding / np.linalg.norm(embedding)
            
            # Converter para lista e validar dimensões
            embedding_list = embedding.tolist()
            
            if len(embedding_list) != self.embedding_dimensions:
                raise RuntimeError(
                    f"Embedding gerado tem {len(embedding_list)} dimensões, "
                    f"esperado {self.embedding_dimensions}"
                )
            
            logger.debug(f"Embedding gerado para texto de {len(text)} caracteres")
            return embedding_list
            
        except Exception as e:
            logger.error(f"Erro ao gerar embedding: {e}")
            raise RuntimeError(f"Falha na geração de embedding: {e}")
    
    async def store_memory(self, conversation_id: str, content: str, 
                          metadata: Optional[Dict[str, Any]] = None) -> Memory:
        """
        Armazena fragmento de conversa como embedding vetorial
        
        Args:
            conversation_id: ID da conversa de origem
            content: Conteúdo textual para armazenar
            metadata: Metadados contextuais opcionais
            
        Returns:
            Objeto Memory criado
            
        Raises:
            ValueError: Se parâmetros inválidos
            RuntimeError: Se erro no armazenamento
        """
        if not conversation_id or not content:
            raise ValueError("conversation_id e content são obrigatórios")
        
        try:
            # Gerar embedding
            embedding = await self.generate_embedding(content)
            
            # Preparar dados
            memory_data = {
                "conversation_id": conversation_id,
                "content": content.strip(),
                "embedding": embedding,
                "metadata": metadata or {},
                "relevance_score": 0.0,  # Será calculado posteriormente
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }
            
            # Inserir no banco
            result = self.supabase.table("memory_chunks").insert(memory_data).execute()
            
            if not result.data or len(result.data) == 0:
                raise RuntimeError("Falha ao inserir memória no banco")
            
            # Criar objeto Memory a partir do resultado
            row = result.data[0]
            memory = Memory(
                id=row["id"],
                conversation_id=row["conversation_id"],
                content=row["content"],
                embedding=row["embedding"],
                metadata=row["metadata"] or {},
                relevance_score=row["relevance_score"],
                created_at=datetime.fromisoformat(row["created_at"].replace("Z", "+00:00"))
            )
            
            logger.info(f"Memória armazenada com sucesso: {memory.id}")
            
            # Verificar limite de memórias por conversa
            await self._cleanup_conversation_memories(conversation_id)
            
            return memory
            
        except Exception as e:
            logger.error(f"Erro ao armazenar memória: {e}")
            raise RuntimeError(f"Falha no armazenamento: {e}")
    
    async def search_similar(self, query: str, limit: int = 5, 
                           filters: Optional[Dict[str, Any]] = None) -> List[Memory]:
        """
        Busca memórias similares usando pgvector
        
        Args:
            query: Texto de consulta
            limit: Número máximo de resultados (padrão: 5)
            filters: Filtros opcionais por metadados
            
        Returns:
            Lista de memórias ordenadas por similaridade
            
        Raises:
            ValueError: Se parâmetros inválidos
            RuntimeError: Se erro na busca
        """
        if not query or not query.strip():
            raise ValueError("Query não pode estar vazia")
        
        if limit <= 0 or limit > 100:
            raise ValueError("Limit deve estar entre 1 e 100")
        
        try:
            # Gerar embedding da query
            query_embedding = await self.generate_embedding(query)
            
            # Preparar filtros
            conversation_filter = None
            metadata_filter = None
            
            if filters:
                conversation_filter = filters.get("conversation_id")
                if "metadata" in filters:
                    metadata_filter = filters["metadata"]
            
            # Executar busca vetorial usando função RPC
            result = self.supabase.rpc("search_similar_memories", {
                "query_embedding": query_embedding,
                "similarity_threshold": 0.1,
                "max_results": limit,
                "conversation_filter": conversation_filter,
                "metadata_filter": metadata_filter
            }).execute()
            
            if not result.data:
                logger.debug("Nenhuma memória encontrada")
                return []
            
            # Converter resultados para objetos Memory
            memories = []
            for row in result.data:
                try:
                    memory = Memory(
                        id=row["id"],
                        conversation_id=row["conversation_id"],
                        content=row["content"],
                        embedding=[],  # Não carregamos embedding na busca
                        metadata=row["metadata"] or {},
                        relevance_score=row["similarity_score"],  # Usar similarity como relevance
                        created_at=datetime.fromisoformat(row["created_at"].replace("Z", "+00:00"))
                    )
                    memories.append(memory)
                    
                    # Atualizar relevance_score da memória (boost por uso)
                    await self._boost_memory_relevance(row["id"])
                    
                except Exception as e:
                    logger.warning(f"Erro ao processar memória {row.get('id')}: {e}")
                    continue
            
            logger.debug(f"Encontradas {len(memories)} memórias similares para query")
            return memories
            
        except Exception as e:
            logger.error(f"Erro na busca de memórias similares: {e}")
            raise RuntimeError(f"Falha na busca: {e}")
    
    async def search_hybrid(self, query: str, limit: int = 5,
                          text_weight: float = 0.3, vector_weight: float = 0.7,
                          filters: Optional[Dict[str, Any]] = None) -> List[Memory]:
        """
        Busca híbrida combinando similaridade vetorial e busca textual
        
        Args:
            query: Texto de consulta
            limit: Número máximo de resultados
            text_weight: Peso da busca textual (0.0-1.0)
            vector_weight: Peso da busca vetorial (0.0-1.0)
            filters: Filtros opcionais
            
        Returns:
            Lista de memórias ordenadas por score combinado
        """
        if not query or not query.strip():
            raise ValueError("Query não pode estar vazia")
        
        try:
            # Gerar embedding da query
            query_embedding = await self.generate_embedding(query)
            
            # Preparar filtros
            conversation_filter = None
            if filters and "conversation_id" in filters:
                conversation_filter = filters["conversation_id"]
            
            # Executar busca híbrida
            result = self.supabase.rpc("search_memories_hybrid", {
                "query_text": query.strip(),
                "query_embedding": query_embedding,
                "similarity_threshold": 0.05,
                "text_weight": text_weight,
                "vector_weight": vector_weight,
                "max_results": limit,
                "conversation_filter": conversation_filter
            }).execute()
            
            if not result.data:
                return []
            
            # Converter resultados
            memories = []
            for row in result.data:
                try:
                    memory = Memory(
                        id=row["id"],
                        conversation_id=row["conversation_id"],
                        content=row["content"],
                        embedding=[],
                        metadata=row["metadata"] or {},
                        relevance_score=row["combined_score"],
                        created_at=datetime.fromisoformat(row["created_at"].replace("Z", "+00:00"))
                    )
                    memories.append(memory)
                    
                    # Boost por uso
                    await self._boost_memory_relevance(row["id"])
                    
                except Exception as e:
                    logger.warning(f"Erro ao processar memória híbrida {row.get('id')}: {e}")
                    continue
            
            logger.debug(f"Busca híbrida encontrou {len(memories)} memórias")
            return memories
            
        except Exception as e:
            logger.error(f"Erro na busca híbrida: {e}")
            return []
    
    async def get_relevant_context(self, conversation_id: str, 
                                 current_message: str) -> List[Memory]:
        """
        Recupera contexto relevante para conversa atual
        
        Args:
            conversation_id: ID da conversa atual
            current_message: Mensagem atual para buscar contexto
            
        Returns:
            Lista de memórias relevantes para o contexto
        """
        try:
            # Buscar memórias da própria conversa
            conversation_memories = await self.search_similar(
                current_message,
                limit=3,
                filters={"conversation_id": conversation_id}
            )
            
            # Buscar memórias similares de outras conversas
            global_memories = await self.search_similar(
                current_message,
                limit=2,
                filters={}
            )
            
            # Filtrar memórias globais que não sejam da conversa atual
            global_memories = [
                m for m in global_memories 
                if m.conversation_id != conversation_id
            ]
            
            # Combinar e ordenar por relevância
            all_memories = conversation_memories + global_memories
            all_memories.sort(key=lambda m: m.relevance_score, reverse=True)
            
            logger.debug(f"Contexto relevante: {len(all_memories)} memórias")
            return all_memories[:5]  # Máximo 5 memórias de contexto
            
        except Exception as e:
            logger.error(f"Erro ao obter contexto relevante: {e}")
            return []  # Retornar lista vazia em caso de erro
    
    async def cleanup_old_memories(self, retention_days: int = 90) -> int:
        """
        Remove memórias antigas baseado em estratégia de retenção
        
        Args:
            retention_days: Dias para manter memórias (padrão: 90)
            
        Returns:
            Número de memórias removidas
        """
        try:
            # Usar função RPC para limpeza inteligente
            result = self.supabase.rpc("cleanup_memories_intelligent", {
                "retention_days": retention_days,
                "min_relevance_score": 0.3,
                "max_memories_per_conversation": self.max_memories_per_conversation
            }).execute()
            
            total_deleted = 0
            if result.data:
                for cleanup_result in result.data:
                    deleted_count = cleanup_result.get("deleted_count", 0)
                    cleanup_type = cleanup_result.get("cleanup_type", "unknown")
                    total_deleted += deleted_count
                    
                    if deleted_count > 0:
                        logger.info(f"Limpeza {cleanup_type}: {deleted_count} memórias removidas")
            
            logger.info(f"Limpeza concluída: {total_deleted} memórias removidas no total")
            return total_deleted
            
        except Exception as e:
            logger.error(f"Erro na limpeza de memórias antigas: {e}")
            return 0
    
    async def _cleanup_conversation_memories(self, conversation_id: str) -> None:
        """
        Limpa memórias em excesso de uma conversa específica
        
        Args:
            conversation_id: ID da conversa para limpar
        """
        try:
            # Contar memórias da conversa
            count_result = self.supabase.table("memory_chunks").select(
                "id", count="exact"
            ).eq("conversation_id", conversation_id).is_("deleted_at", "null").execute()
            
            total_memories = count_result.count or 0
            
            if total_memories > self.max_memories_per_conversation:
                # Remover memórias mais antigas com menor relevância
                excess = total_memories - self.max_memories_per_conversation
                
                old_memories = self.supabase.table("memory_chunks").select("id").eq(
                    "conversation_id", conversation_id
                ).is_("deleted_at", "null").order(
                    "relevance_score", desc=False
                ).order("created_at", desc=False).limit(excess).execute()
                
                if old_memories.data:
                    memory_ids = [m["id"] for m in old_memories.data]
                    
                    self.supabase.table("memory_chunks").update({
                        "deleted_at": datetime.utcnow().isoformat()
                    }).in_("id", memory_ids).execute()
                    
                    logger.debug(f"Removidas {len(memory_ids)} memórias em excesso da conversa {conversation_id}")
                    
        except Exception as e:
            logger.warning(f"Erro na limpeza de memórias da conversa: {e}")
    
    async def _boost_memory_relevance(self, memory_id: str, boost: float = 0.1) -> None:
        """
        Aumenta relevance_score de uma memória baseado no uso
        
        Args:
            memory_id: ID da memória para aumentar relevância
            boost: Valor do boost (padrão: 0.1)
        """
        try:
            # Usar função RPC para atualizar relevância
            result = self.supabase.rpc("update_memory_relevance", {
                "memory_id": memory_id,
                "usage_boost": boost
            }).execute()
            
            if result.data:
                logger.debug(f"Relevância da memória {memory_id} aumentada em {boost}")
            else:
                logger.warning(f"Falha ao aumentar relevância da memória {memory_id}")
                
        except Exception as e:
            logger.warning(f"Erro ao aumentar relevância da memória {memory_id}: {e}")
    
    async def _calculate_text_similarity(self, text1: str, text2: str) -> float:
        """
        Calcula similaridade entre dois textos usando embeddings
        
        Args:
            text1: Primeiro texto
            text2: Segundo texto
            
        Returns:
            Score de similaridade (0.0 a 1.0)
        """
        try:
            # Gerar embeddings para ambos os textos
            embedding1 = await self.generate_embedding(text1)
            embedding2 = await self.generate_embedding(text2)
            
            # Calcular similaridade coseno
            dot_product = np.dot(embedding1, embedding2)
            
            # Como os embeddings já estão normalizados, o produto escalar é a similaridade coseno
            similarity = float(dot_product)
            
            # Garantir que está no range [0, 1]
            similarity = max(0.0, min(1.0, (similarity + 1.0) / 2.0))
            
            return similarity
            
        except Exception as e:
            logger.warning(f"Erro ao calcular similaridade: {e}")
            return 0.0

# Singleton instance
_memory_service: Optional[MemoryService] = None

def get_memory_service() -> MemoryService:
    """Retorna instância singleton do MemoryService"""
    global _memory_service
    if _memory_service is None:
        _memory_service = MemoryService()
    return _memory_service