"""Middleware CORS"""
from fastapi.middleware.cors import CORSMiddleware
from ...core.config import settings


def setup_cors(app):
    """Configura CORS para o frontend"""
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.frontend_url, "http://localhost:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
