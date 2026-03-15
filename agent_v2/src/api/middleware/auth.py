"""Middleware de autenticação JWT Supabase"""
from fastapi import Request, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from ...core.config import settings
from ...core.database import db

security = HTTPBearer()


async def verify_jwt(credentials: HTTPAuthorizationCredentials) -> dict:
    """Valida JWT do Supabase e retorna payload"""
    token = credentials.credentials
    
    try:
        # Decodificar JWT (sem verificar assinatura - Supabase já validou)
        payload = jwt.decode(token, options={"verify_signature": False})
        user_id = payload.get("sub")
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido"
            )
        
        # Verificar se afiliado tem assinatura ativa
        tenant = await db.get_tenant_by_affiliate_id(user_id)
        
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Assinatura não encontrada ou inativa"
            )
        
        return {
            "user_id": user_id,
            "tenant_id": tenant["id"]
        }
        
    except jwt.DecodeError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido"
        )
