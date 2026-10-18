from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db, is_sqlite
from app.ml.explainer import ml_service

router = APIRouter(tags=["Health"])

@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    """Health check endpoint validating database connectivity and ML model availability."""
    db_ok = False
    try:
        db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    return {
        "status": "healthy" if db_ok else "degraded",
        "database": {
            "connected": db_ok,
            "engine": "sqlite_fallback" if is_sqlite else "postgresql",
            "url": settings.SQLITE_FALLBACK_URL if is_sqlite else settings.DATABASE_URL.split("@")[-1]
        },
        "machine_learning": {
            "model_loaded": ml_service.model is not None,
            "version": ml_service.version_tag or "none",
            "classes": ml_service.classes or []
        },
        "environment": settings.ENVIRONMENT
    }
