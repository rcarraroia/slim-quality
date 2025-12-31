"""
Cliente Supabase - Acesso direto ao banco de dados
"""
from typing import List, Dict, Any, Optional
import structlog
from supabase import create_client, Client
import os

logger = structlog.get_logger(__name__)

# Cliente singleton
_supabase_client: Optional[Client] = None


def get_supabase_client() -> Client:
    """
    Retorna cliente Supabase singleton.
    
    Returns:
        Cliente Supabase configurado
    """
    global _supabase_client
    
    if _supabase_client is None:
        logger.info("Inicializando cliente Supabase")
        
        # Usar variáveis de ambiente diretamente
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
        
        if not supabase_url or not supabase_key:
            raise ValueError("SUPABASE_URL e SUPABASE_SERVICE_KEY devem estar definidas")
        
        _supabase_client = create_client(supabase_url, supabase_key)
    
    return _supabase_client


async def get_products(filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    """
    Consulta produtos no Supabase com filtros opcionais.
    
    Args:
        filters: Filtros opcionais (problem, price_range, etc)
        
    Returns:
        Lista de produtos
        
    Example:
        >>> products = await get_products({"problem": "dor_costas"})
    """
    logger.info(f"get_products: Consultando produtos com filtros: {filters}")
    
    try:
        supabase = get_supabase_client()
        
        # Query base
        query = supabase.table("products").select("*")
        
        # Aplicar filtros se fornecidos
        if filters:
            if "problem" in filters:
                # Filtrar por problema de saúde
                query = query.contains("health_problems", [filters["problem"]])
            
            if "price_range" in filters:
                price_range = filters["price_range"]
                if "min" in price_range:
                    query = query.gte("price", price_range["min"])
                if "max" in price_range:
                    query = query.lte("price", price_range["max"])
            
            if "available" in filters:
                query = query.eq("available", filters["available"])
        
        # Executar query
        result = query.execute()
        
        if result.data:
            logger.info(f"get_products: Encontrados {len(result.data)} produtos")
            return result.data
        else:
            logger.warning("get_products: Nenhum produto encontrado")
            return []
            
    except Exception as e:
        logger.error(f"get_products: Erro ao consultar produtos: {e}")
        raise
        client = get_supabase_client()
        
        # Query base
        query = client.table("products").select("""
            id,
            name,
            description,
            price,
            dimensions,
            firmness,
            technologies:product_technologies(
                technology:technologies(name, description)
            )
        """)
        
        # Aplicar filtros se fornecidos
        if filters:
            # Filtro por problema de saúde
            if "problem" in filters:
                problem = filters["problem"]
                # Mapear problema para firmeza recomendada
                problem_to_firmness = {
                    "dor_costas": "medium-firm",
                    "dor_coluna": "firm",
                    "insonia": "medium",
                    "dor_cervical": "medium-firm",
                    "dor_lombar": "firm",
                    "ma_postura": "firm",
                }
                if problem in problem_to_firmness:
                    query = query.eq("firmness", problem_to_firmness[problem])
            
            # Filtro por faixa de preço
            if "price_range" in filters:
                price_range = filters["price_range"]
                if price_range == "low":
                    query = query.lte("price", 2000)
                elif price_range == "medium":
                    query = query.gte("price", 2000).lte("price", 4000)
                elif price_range == "high":
                    query = query.gte("price", 4000)
        
        # Limitar resultados
        query = query.limit(10)
        
        # Executar query
        response = query.execute()
        
        products = response.data if response.data else []
        logger.info(f"get_products: {len(products)} produtos encontrados")
        
        return products
        
    except Exception as e:
        logger.error(f"get_products: Erro ao consultar produtos: {e}")
        return []


async def save_conversation(lead_id: str, state: Dict[str, Any]) -> bool:
    """
    Salva estado da conversação no Supabase.
    
    Args:
        lead_id: ID do lead (phone number)
        state: Estado completo da conversação
        
    Returns:
        True se salvou com sucesso, False caso contrário
    """
    logger.info(f"save_conversation: Salvando conversação para lead {lead_id}")
    
    try:
        client = get_supabase_client()
        
        # Inserir ou atualizar
        response = client.table("conversations").upsert({
            "lead_id": lead_id,
            "state": state,
            "updated_at": "now()"
        }).execute()
        
        logger.info("save_conversation: Conversação salva com sucesso")
        return True
        
    except Exception as e:
        logger.error(f"save_conversation: Erro ao salvar: {e}")
        return False
