"""
Checkpointer Supabase - Persistência de estado
Implementação customizada de BaseCheckpointSaver para LangGraph 1.0.5
Usa tabela conversations existente no banco
"""
from typing import Optional, Iterator, Sequence
import structlog
from langgraph.checkpoint.base import BaseCheckpointSaver, Checkpoint, CheckpointTuple, CheckpointMetadata
from langgraph.checkpoint.serde.jsonplus import JsonPlusSerializer
from langchain_core.runnables import RunnableConfig
from datetime import datetime

from ..services.supabase_client import get_supabase_client

logger = structlog.get_logger(__name__)


class SupabaseCheckpointer(BaseCheckpointSaver):
    """
    Salva e recupera checkpoints da conversação no Supabase.
    
    Implementa BaseCheckpointSaver do LangGraph 1.0.5.
    
    Usa tabela conversations EXISTENTE no banco:
    Campos relevantes:
        - id: UUID (PK)
        - customer_id: UUID - ID do cliente/lead
        - channel: conversation_channel - Canal da conversa
        - status: conversation_status - Status da conversa
        - metadata: JSONB - Armazena checkpoint e metadata do LangGraph
        - created_at: TIMESTAMPTZ
        - updated_at: TIMESTAMPTZ
    
    Estratégia:
    - thread_id = customer_id (UUID do cliente)
    - checkpoint e metadata armazenados em metadata.langgraph_checkpoint
    """
    
    def __init__(self):
        """Inicializa checkpointer com cliente Supabase e serializer"""
        super().__init__(serde=JsonPlusSerializer())
        self.supabase = get_supabase_client()
        logger.info("SupabaseCheckpointer inicializado (usando tabela conversations existente)")
    
    def get_tuple(self, config: RunnableConfig) -> Optional[CheckpointTuple]:
        """
        Recupera checkpoint específico.
        
        Args:
            config: Configuração com thread_id (customer_id)
            
        Returns:
            CheckpointTuple ou None se não existir
        """
        try:
            thread_id = config["configurable"]["thread_id"]
            
            logger.info(f"get_tuple: Recuperando checkpoint para customer {thread_id}")
            
            # Buscar conversa do cliente
            response = self.supabase.table("conversations") \
                .select("id, metadata, created_at, updated_at") \
                .eq("customer_id", thread_id) \
                .order("updated_at", desc=True) \
                .limit(1) \
                .execute()
            
            if not response.data:
                logger.info("get_tuple: Nenhuma conversa encontrada")
                return None
            
            row = response.data[0]
            metadata_field = row.get("metadata", {})
            
            # Checkpoint armazenado em metadata.langgraph_checkpoint
            checkpoint_data = metadata_field.get("langgraph_checkpoint")
            if not checkpoint_data:
                logger.info("get_tuple: Conversa existe mas sem checkpoint LangGraph")
                return None
            
            # Deserializar checkpoint
            checkpoint = self.serde.loads(checkpoint_data.get("checkpoint", "{}"))
            metadata = checkpoint_data.get("metadata", {})
            
            checkpoint_tuple = CheckpointTuple(
                config=config,
                checkpoint=checkpoint,
                metadata=metadata,
                parent_config=None  # Não usamos parent por enquanto
            )
            
            logger.info(f"get_tuple: Checkpoint recuperado (conversation_id: {row['id']})")
            return checkpoint_tuple
            
        except Exception as e:
            logger.error(f"get_tuple: Erro ao recuperar checkpoint: {e}")
            return None
    
    def list(
        self,
        config: RunnableConfig,
        *,
        before: Optional[RunnableConfig] = None,
        limit: Optional[int] = None
    ) -> Iterator[CheckpointTuple]:
        """
        Lista checkpoints que correspondem aos critérios.
        
        Args:
            config: Configuração com thread_id (customer_id)
            before: Filtrar checkpoints antes deste config
            limit: Limitar número de resultados
            
        Yields:
            CheckpointTuples
        """
        try:
            thread_id = config["configurable"]["thread_id"]
            logger.info(f"list: Listando checkpoints para customer {thread_id}")
            
            query = self.supabase.table("conversations") \
                .select("id, metadata, created_at, updated_at") \
                .eq("customer_id", thread_id) \
                .order("updated_at", desc=True)
            
            if limit:
                query = query.limit(limit)
            
            response = query.execute()
            
            count = 0
            for row in response.data:
                metadata_field = row.get("metadata", {})
                checkpoint_data = metadata_field.get("langgraph_checkpoint")
                
                if not checkpoint_data:
                    continue
                
                checkpoint = self.serde.loads(checkpoint_data.get("checkpoint", "{}"))
                metadata = checkpoint_data.get("metadata", {})
                
                yield CheckpointTuple(
                    config=config,
                    checkpoint=checkpoint,
                    metadata=metadata,
                    parent_config=None
                )
                count += 1
            
            logger.info(f"list: {count} checkpoints listados")
            
        except Exception as e:
            logger.error(f"list: Erro ao listar checkpoints: {e}")
    
    def put(
        self,
        config: RunnableConfig,
        checkpoint: Checkpoint,
        metadata: CheckpointMetadata
    ) -> RunnableConfig:
        """
        Salva checkpoint.
        
        Args:
            config: Configuração com thread_id (customer_id)
            checkpoint: Checkpoint a salvar
            metadata: Metadata do checkpoint
            
        Returns:
            Configuração atualizada
        """
        try:
            thread_id = config["configurable"]["thread_id"]
            
            logger.info(f"put: Salvando checkpoint para customer {thread_id}")
            
            # Serializar checkpoint
            checkpoint_data = {
                "checkpoint": self.serde.dumps(checkpoint),
                "metadata": metadata,
                "saved_at": datetime.utcnow().isoformat()
            }
            
            # Buscar conversa existente
            existing = self.supabase.table("conversations") \
                .select("id, metadata") \
                .eq("customer_id", thread_id) \
                .order("updated_at", desc=True) \
                .limit(1) \
                .execute()
            
            if existing.data:
                # Atualizar conversa existente
                conversation_id = existing.data[0]["id"]
                current_metadata = existing.data[0].get("metadata", {})
                
                # Preservar metadata existente e adicionar checkpoint
                current_metadata["langgraph_checkpoint"] = checkpoint_data
                
                self.supabase.table("conversations").update({
                    "metadata": current_metadata,
                    "updated_at": datetime.utcnow().isoformat()
                }).eq("id", conversation_id).execute()
                
                logger.info(f"put: Checkpoint atualizado (conversation_id: {conversation_id})")
            else:
                # Criar nova conversa
                new_conversation = {
                    "customer_id": thread_id,
                    "channel": "whatsapp",  # Default
                    "status": "open",
                    "metadata": {
                        "langgraph_checkpoint": checkpoint_data
                    }
                }
                
                result = self.supabase.table("conversations").insert(new_conversation).execute()
                logger.info(f"put: Nova conversa criada com checkpoint")
            
            return config
            
        except Exception as e:
            logger.error(f"put: Erro ao salvar checkpoint: {e}")
            raise
    
    def put_writes(
        self,
        config: RunnableConfig,
        writes: Sequence[tuple],
        task_id: str
    ) -> None:
        """
        Salva writes intermediários.
        
        Args:
            config: Configuração
            writes: Lista de writes
            task_id: ID da task
        """
        # Para Sprint 2, não implementamos writes intermediários
        # Apenas checkpoints completos
        logger.debug(f"put_writes: Ignorando {len(writes)} writes para task {task_id}")
        pass
