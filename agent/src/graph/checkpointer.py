"""
Checkpointer Multi-Tenant - Persistência de estado isolada por tenant
Implementação customizada de BaseCheckpointSaver para LangGraph 1.0.5
Usa tabela multi_agent_conversations para isolamento de dados
"""
from typing import Optional, Iterator, Sequence
import structlog
from langgraph.checkpoint.base import BaseCheckpointSaver, Checkpoint, CheckpointTuple, CheckpointMetadata
from langgraph.checkpoint.serde.jsonplus import JsonPlusSerializer
from langchain_core.runnables import RunnableConfig
from datetime import datetime

from ..services.supabase_client import get_supabase_client

logger = structlog.get_logger(__name__)


class MultiTenantCheckpointer(BaseCheckpointSaver):
    """
    Salva e recupera checkpoints da conversação no Supabase com isolamento multi-tenant.
    
    MUDANÇAS vs versão single-tenant:
    - Usa tabela multi_agent_conversations (não conversations)
    - Thread ID format: "tenant_{tenant_id}_conv_{conversation_id}"
    - Filtra por tenant_id em TODAS as queries (isolamento garantido)
    - Salva checkpoint em multi_agent_conversations.metadata
    
    Implementa BaseCheckpointSaver do LangGraph 1.0.5.
    
    Usa tabela multi_agent_conversations:
    Campos relevantes:
        - id: SERIAL (PK) - conversation_id
        - tenant_id: INTEGER (FK) - ID do tenant (afiliado lojista)
        - lead_phone: VARCHAR - Telefone do lead
        - status: VARCHAR - Status da conversa (active, closed, etc)
        - metadata: JSONB - Armazena checkpoint e metadata do LangGraph
        - created_at: TIMESTAMPTZ
        - updated_at: TIMESTAMPTZ
    
    Estratégia:
    - thread_id = "tenant_{tenant_id}_conv_{conversation_id}"
    - Extrai tenant_id e conversation_id do thread_id
    - Filtra por tenant_id em TODAS as queries (RLS + application-level)
    - checkpoint e metadata armazenados em metadata.langgraph_checkpoint
    """
    
    def __init__(self):
        """Inicializa checkpointer com cliente Supabase e serializer"""
        super().__init__(serde=JsonPlusSerializer())
        self.supabase = get_supabase_client()
        logger.info("MultiTenantCheckpointer inicializado (usando tabela multi_agent_conversations)")
    
    def _parse_thread_id(self, thread_id: str) -> tuple[int, int]:
        """
        Extrai tenant_id e conversation_id do thread_id.
        
        Args:
            thread_id: String no formato "tenant_{tenant_id}_conv_{conversation_id}"
            
        Returns:
            Tupla (tenant_id, conversation_id)
            
        Raises:
            ValueError: Se thread_id não estiver no formato correto
        """
        try:
            # Formato: "tenant_{tenant_id}_conv_{conversation_id}"
            parts = thread_id.split("_")
            if len(parts) != 4 or parts[0] != "tenant" or parts[2] != "conv":
                raise ValueError(f"Thread ID inválido: {thread_id}")
            
            tenant_id = int(parts[1])
            conversation_id = int(parts[3])
            
            return tenant_id, conversation_id
        except (IndexError, ValueError) as e:
            logger.error(f"_parse_thread_id: Erro ao parsear thread_id '{thread_id}': {e}")
            raise ValueError(f"Thread ID deve estar no formato 'tenant_{{id}}_conv_{{id}}': {thread_id}")
    
    def get_tuple(self, config: RunnableConfig) -> Optional[CheckpointTuple]:
        """
        Recupera checkpoint específico com isolamento de tenant.
        
        Args:
            config: Configuração com thread_id no formato "tenant_{id}_conv_{id}"
            
        Returns:
            CheckpointTuple ou None se não existir
        """
        try:
            thread_id = config["configurable"]["thread_id"]
            tenant_id, conversation_id = self._parse_thread_id(thread_id)
            
            logger.info(f"get_tuple: Recuperando checkpoint para tenant {tenant_id}, conversation {conversation_id}")
            
            # Buscar conversa com filtro de tenant_id (isolamento)
            response = self.supabase.table("multi_agent_conversations") \
                .select("id, tenant_id, metadata, created_at, updated_at") \
                .eq("tenant_id", tenant_id) \
                .eq("id", conversation_id) \
                .single() \
                .execute()
            
            if not response.data:
                logger.info("get_tuple: Nenhuma conversa encontrada")
                return None
            
            row = response.data
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
            
            logger.info(f"get_tuple: Checkpoint recuperado (tenant: {tenant_id}, conversation: {conversation_id})")
            return checkpoint_tuple
            
        except ValueError as e:
            logger.error(f"get_tuple: Thread ID inválido: {e}")
            return None
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
        Lista checkpoints que correspondem aos critérios com isolamento de tenant.
        
        Args:
            config: Configuração com thread_id no formato "tenant_{id}_conv_{id}"
            before: Filtrar checkpoints antes deste config
            limit: Limitar número de resultados
            
        Yields:
            CheckpointTuples apenas do tenant especificado
        """
        try:
            thread_id = config["configurable"]["thread_id"]
            tenant_id, conversation_id = self._parse_thread_id(thread_id)
            
            logger.info(f"list: Listando checkpoints para tenant {tenant_id}, conversation {conversation_id}")
            
            # Buscar apenas conversas do tenant (isolamento)
            query = self.supabase.table("multi_agent_conversations") \
                .select("id, tenant_id, metadata, created_at, updated_at") \
                .eq("tenant_id", tenant_id) \
                .eq("id", conversation_id) \
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
            
            logger.info(f"list: {count} checkpoints listados para tenant {tenant_id}")
            
        except ValueError as e:
            logger.error(f"list: Thread ID inválido: {e}")
        except Exception as e:
            logger.error(f"list: Erro ao listar checkpoints: {e}")
    
    def put(
        self,
        config: RunnableConfig,
        checkpoint: Checkpoint,
        metadata: CheckpointMetadata
    ) -> RunnableConfig:
        """
        Salva checkpoint com isolamento de tenant.
        
        Args:
            config: Configuração com thread_id no formato "tenant_{id}_conv_{id}"
            checkpoint: Checkpoint a salvar
            metadata: Metadata do checkpoint
            
        Returns:
            Configuração atualizada
            
        Raises:
            ValueError: Se thread_id inválido ou tenant_id não corresponder
        """
        try:
            thread_id = config["configurable"]["thread_id"]
            tenant_id, conversation_id = self._parse_thread_id(thread_id)
            
            logger.info(f"put: Salvando checkpoint para tenant {tenant_id}, conversation {conversation_id}")
            
            # Serializar checkpoint
            checkpoint_data = {
                "checkpoint": self.serde.dumps(checkpoint),
                "metadata": metadata,
                "saved_at": datetime.utcnow().isoformat()
            }
            
            # Buscar conversa existente com filtro de tenant (isolamento)
            existing = self.supabase.table("multi_agent_conversations") \
                .select("id, tenant_id, metadata") \
                .eq("tenant_id", tenant_id) \
                .eq("id", conversation_id) \
                .single() \
                .execute()
            
            if existing.data:
                # Validar que tenant_id corresponde (segurança adicional)
                if existing.data["tenant_id"] != tenant_id:
                    raise ValueError(f"Tenant ID mismatch: esperado {tenant_id}, encontrado {existing.data['tenant_id']}")
                
                # Atualizar conversa existente
                current_metadata = existing.data.get("metadata", {})
                
                # Preservar metadata existente e adicionar checkpoint
                current_metadata["langgraph_checkpoint"] = checkpoint_data
                
                self.supabase.table("multi_agent_conversations").update({
                    "metadata": current_metadata,
                    "updated_at": datetime.utcnow().isoformat()
                }).eq("id", conversation_id).eq("tenant_id", tenant_id).execute()
                
                logger.info(f"put: Checkpoint atualizado (tenant: {tenant_id}, conversation: {conversation_id})")
            else:
                # Conversa não existe - isso não deveria acontecer
                # A conversa deve ser criada pelo webhook antes de processar mensagens
                logger.error(f"put: Conversa {conversation_id} não encontrada para tenant {tenant_id}")
                raise ValueError(f"Conversa {conversation_id} não existe para tenant {tenant_id}")
            
            return config
            
        except ValueError as e:
            logger.error(f"put: Erro de validação: {e}")
            raise
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
        # Para MVP, não implementamos writes intermediários
        # Apenas checkpoints completos
        logger.debug(f"put_writes: Ignorando {len(writes)} writes para task {task_id}")
        pass
