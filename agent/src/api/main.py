"""
FastAPI Application - Entry point
"""
import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from ..config import get_settings

# Configurar logging estruturado
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer()
    ]
)

logger = structlog.get_logger(__name__)

# Criar app FastAPI
settings = get_settings()
app = FastAPI(
    title="Slim Quality Agent",
    description="Backend conversacional com LangGraph + Claude AI",
    version="0.1.0",
    debug=settings.debug
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: Restringir em produção
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "Slim Quality Agent",
        "version": "0.1.0",
        "status": "running"
    }

@app.get("/health")
async def health_simple():
    """Health check simples"""
    return {
        "status": "healthy",
        "timestamp": "2025-12-31T14:42:00Z",
        "version": "0.1.0"
    }

@app.on_event("startup")
async def startup_event():
    """Executado ao iniciar a aplicação"""
    logger.info("Slim Quality Agent iniciando...")
    logger.info(f"Debug mode: {settings.debug}")
    
    # Carregar routers de forma lazy após inicialização
    try:
        logger.info("Carregando routers...")
        
        # Import lazy dos routers
        from .webhooks import router as webhooks_router
        from .chat import router as chat_router  
        from .health import router as health_router
        
        # Incluir routers
        app.include_router(webhooks_router, tags=["Webhooks"])
        app.include_router(chat_router, tags=["Chat"])
        app.include_router(health_router, tags=["Health"])
        
        logger.info("Routers carregados com sucesso")
        
    except Exception as e:
        logger.error(f"Erro ao carregar routers: {e}")
        # Continuar funcionando mesmo se routers falharem


@app.on_event("shutdown")
async def shutdown_event():
    """Executado ao encerrar a aplicação"""
    logger.info("Slim Quality Agent encerrando...")
