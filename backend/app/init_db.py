import logging
from app.database import engine, Base, is_sqlite
from app.models.entities import (
    User, Student, StudentAcademicRecord, Prediction,
    Intervention, FacultyNote, ModelVersion, AuditLog,
    RevokedToken, ImportJob
)
from app.core.rls import setup_postgresql_rls
from app.core.logging import setup_logging

setup_logging()
logger = logging.getLogger("app.init_db")

def init_database() -> None:
    logger.info("Initializing database schema...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created successfully.")
    
    if not is_sqlite:
        logger.info("Applying PostgreSQL Row-Level Security (RLS) policies...")
        setup_postgresql_rls()
    else:
        logger.info("Running on SQLite fallback. RLS not supported on SQLite.")

if __name__ == "__main__":
    init_database()
