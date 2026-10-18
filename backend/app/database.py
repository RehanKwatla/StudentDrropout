import logging
from typing import Generator
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.config import settings

logger = logging.getLogger("app.database")

Base = declarative_base()

# Primary database engine (PostgreSQL with psycopg3 binary driver)
try:
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
        echo=False
    )
    # Test connection
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    logger.info("Successfully connected to primary PostgreSQL database at %s", settings.DATABASE_URL)
    is_sqlite = False
except Exception as e:
    logger.warning("Could not connect to PostgreSQL (%s). Falling back to SQLite development database: %s", e, settings.SQLITE_FALLBACK_URL)
    engine = create_engine(
        settings.SQLITE_FALLBACK_URL,
        connect_args={"check_same_thread": False},
        echo=False
    )
    is_sqlite = True

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency yielding a database session within an explicit transaction boundary.
    """
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

def set_rls_context(db: Session, user_id: str, role: str) -> None:
    """
    Sets session-level context for PostgreSQL Row-Level Security policies.
    Does not execute on SQLite fallback.
    """
    if not is_sqlite:
        try:
            db.execute(text("SELECT set_config('app.current_user_id', :uid, false)"), {"uid": str(user_id)})
            db.execute(text("SELECT set_config('app.current_user_role', :role, false)"), {"role": str(role)})
        except Exception as e:
            logger.debug("Failed setting RLS session variables: %s", e)
