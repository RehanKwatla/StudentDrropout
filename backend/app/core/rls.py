import logging
from sqlalchemy import text
from app.config import settings
from app.database import engine, is_sqlite

logger = logging.getLogger("app.core.rls")

def setup_postgresql_rls() -> bool:
    """
    Executes PostgreSQL Row-Level Security setup using administrator connection.
    Configures app_user with least privilege and RLS enforcement on faculty_notes.
    Returns True if RLS was configured on PostgreSQL, or False if running SQLite fallback.
    """
    if is_sqlite:
        logger.info("Running on SQLite fallback. PostgreSQL RLS policies cannot be applied to SQLite.")
        return False

    try:
        app_user = settings.APP_DB_USER
        app_password = settings.APP_DB_PASSWORD

        statements = [
            f"""
            DO $do$
            BEGIN
                IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '{app_user}') THEN
                    CREATE ROLE {app_user} WITH LOGIN PASSWORD '{app_password}';
                END IF;
            END
            $do$
            """,
            f"GRANT USAGE ON SCHEMA public TO {app_user}",
            f"GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO {app_user}",
            f"GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO {app_user}",
            f"ALTER TABLE faculty_notes ENABLE ROW LEVEL SECURITY",
            f"ALTER TABLE faculty_notes FORCE ROW LEVEL SECURITY",
            f"DROP POLICY IF EXISTS faculty_notes_access_policy ON faculty_notes",
            f"""
            CREATE POLICY faculty_notes_access_policy ON faculty_notes
                FOR ALL
                TO {app_user}
                USING (
                    current_setting('app.current_user_role', true) = 'Administrator'
                    OR author_user_id = current_setting('app.current_user_id', true)
                    OR is_confidential = false
                )
                WITH CHECK (
                    current_setting('app.current_user_role', true) = 'Administrator'
                    OR author_user_id = current_setting('app.current_user_id', true)
                )
            """
        ]

        with engine.begin() as conn:
            for stmt in statements:
                stmt_clean = stmt.strip()
                if stmt_clean:
                    conn.execute(text(stmt_clean))

        logger.info("PostgreSQL Row-Level Security (RLS) successfully configured on faculty_notes table for role %s", app_user)
        return True
    except Exception as e:
        logger.error("Failed to setup PostgreSQL RLS policies: %s", e)
        return False
