"""Cliente Redis para cache e fila"""
import redis.asyncio as redis
from typing import Optional, Any
import json
from .config import settings


class RedisClient:
    """Cliente Redis assíncrono com prefixo bia: para isolamento"""
    
    # Prefixo para isolar dados do BIA v2 no Redis compartilhado
    KEY_PREFIX = "bia:"
    
    def __init__(self):
        self.client: Optional[redis.Redis] = None
    
    def _add_prefix(self, key: str) -> str:
        """Adiciona prefixo bia: à chave se ainda não tiver"""
        if not key.startswith(self.KEY_PREFIX):
            return f"{self.KEY_PREFIX}{key}"
        return key
    
    async def connect(self):
        """Conecta ao Redis"""
        self.client = await redis.from_url(
            settings.redis_url,
            encoding="utf-8",
            decode_responses=True
        )
    
    async def disconnect(self):
        """Desconecta do Redis"""
        if self.client:
            await self.client.close()
    
    async def get(self, key: str) -> Optional[Any]:
        """Busca valor no cache"""
        if not self.client:
            await self.connect()
        
        prefixed_key = self._add_prefix(key)
        value = await self.client.get(prefixed_key)
        if value:
            try:
                return json.loads(value)
            except:
                return value
        return None
    
    async def set(self, key: str, value: Any, expire: int = 3600):
        """Salva valor no cache com TTL"""
        if not self.client:
            await self.connect()
        
        if isinstance(value, (dict, list)):
            value = json.dumps(value)
        
        prefixed_key = self._add_prefix(key)
        await self.client.set(prefixed_key, value, ex=expire)
    
    async def delete(self, key: str):
        """Deleta chave do cache"""
        if not self.client:
            await self.connect()
        
        prefixed_key = self._add_prefix(key)
        await self.client.delete(prefixed_key)
    
    async def enqueue(self, queue_name: str, data: dict):
        """Adiciona item na fila"""
        if not self.client:
            await self.connect()
        
        prefixed_queue = self._add_prefix(queue_name)
        await self.client.rpush(prefixed_queue, json.dumps(data))
    
    async def dequeue(self, queue_name: str, timeout: int = 0) -> Optional[dict]:
        """Remove item da fila (blocking)"""
        if not self.client:
            await self.connect()
        
        prefixed_queue = self._add_prefix(queue_name)
        result = await self.client.blpop(prefixed_queue, timeout=timeout)
        if result:
            _, data = result
            return json.loads(data)
        return None


# Instância global
redis_client = RedisClient()
