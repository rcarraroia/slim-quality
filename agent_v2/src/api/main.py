"""FastAPI main application"""
from fastapi import FastAPI
from fastapi.responses import JSONResponse
import logging
from pythonjsonlogger import jsonlogger

from ..core.config import settings, validate_settings
from .middleware.cors import setup_cors
from .routes import agent, webhook

# Configurar logging estruturado
logger = logging.getLogger()
logHandler = logging.StreamHandler()
formatter = jsonlogger.JsonFormatter()
logHandler.setFormatter(formatter)
logger.addHandler(logHandler)
logger.setLevel(settings.log_level)

# Criar app FastAPI
app = FastAPI(
    title="BIA v2 Agent API",
    description="API do agente BIA v2 para afiliados Slim Quality",
    version="2.0.0"
)

# Configurar CORS
setup_cors(app)

# Registrar rotas
app.include_router(agent.router)
app.include_router(webhook.router)


@app.on_event("startup")
async def startup_event():
    """Evento de inicialização"""
    logger.info("Iniciando BIA v2 Agent API")
    
    try:
        validate_settings()
        logger.info("Configurações validadas com sucesso")
    except Exception as e:
        logger.error(f"Erro ao validar configurações: {e}")
        raise


@app.on_event("shutdown")
async def shutdown_event():
    """Evento de encerramento"""
    logger.info("Encerrando BIA v2 Agent API")


@app.get("/")
async def root():
    """Health check"""
    return {
        "service": "BIA v2 Agent API",
        "version": "2.0.0",
        "status": "healthy"
    }


@app.get("/health")
async def health_check():
    """Health check detalhado"""
    return {
        "status": "healthy",
        "environment": settings.environment,
        "version": "2.0.0"
    }


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Handler global de exceções"""
    logger.error(f"Erro não tratado: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Erro interno do servidor"}
    )
