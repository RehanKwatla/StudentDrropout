import pytest
import uuid
from sqlalchemy import create_engine, text
from app.config import settings
from app.database import is_sqlite

@pytest.mark.skipif(is_sqlite, reason="PostgreSQL RLS tests require a live PostgreSQL database connection")
def test_postgresql_row_level_security_enforcement():
    """
    Security Requirement 14: Verifies PostgreSQL Row-Level Security (RLS) enforcement
    using the restricted non-superuser application role 'app_user'.
    """
    # 1. Connect as the restricted application role
    app_db_url = f"postgresql+psycopg://{settings.APP_DB_USER}:{settings.APP_DB_PASSWORD}@localhost:5433/student_success"
    app_engine = create_engine(app_db_url)

    author_a_id = str(uuid.uuid4())
    author_b_id = str(uuid.uuid4())
    admin_id = str(uuid.uuid4())

    note_confidential_id = str(uuid.uuid4())
    note_public_id = str(uuid.uuid4())

    # Ensure dummy student and test users exist
    dummy_student_id = str(uuid.uuid4())

    with settings_admin_engine().begin() as admin_conn:
        # Create users for the foreign key reference
        admin_conn.execute(text("""
            INSERT INTO users (id, email, hashed_password, full_name, role, is_active, mfa_enabled, created_at, updated_at)
            VALUES 
                (:uid_a, :email_a, 'hashed', 'Faculty A', 'Faculty', true, false, NOW(), NOW()),
                (:uid_b, :email_b, 'hashed', 'Faculty B', 'Faculty', true, false, NOW(), NOW()),
                (:uid_adm, :email_adm, 'hashed', 'Admin RLS', 'Administrator', true, false, NOW(), NOW())
        """), {
            "uid_a": author_a_id, "email_a": f"a_{author_a_id[:8]}@demo.edu",
            "uid_b": author_b_id, "email_b": f"b_{author_b_id[:8]}@demo.edu",
            "uid_adm": admin_id, "email_adm": f"adm_{admin_id[:8]}@demo.edu"
        })

        admin_conn.execute(text("""
            INSERT INTO students (id, student_id_code, first_name, last_name, email, department, course, semester, admission_year, current_academic_status, created_at, updated_at)
            VALUES (:id, :code, 'RLS', 'Tester', 'rls.tester@demo.edu', 'Engineering', 'Informatics', 1, 2024, 'Enrolled', NOW(), NOW())
            ON CONFLICT (student_id_code) DO NOTHING
        """), {"id": dummy_student_id, "code": f"STU-RLS-{dummy_student_id[:8]}"})

        # Insert notes as admin connection
        admin_conn.execute(text("""
            INSERT INTO faculty_notes (id, student_id, author_user_id, content, is_confidential, created_at)
            VALUES (:id, :sid, :author, 'CONFIDENTIAL NOTE BY A', true, NOW())
        """), {"id": note_confidential_id, "sid": dummy_student_id, "author": author_a_id})

        admin_conn.execute(text("""
            INSERT INTO faculty_notes (id, student_id, author_user_id, content, is_confidential, created_at)
            VALUES (:id, :sid, :author, 'PUBLIC NOTE BY B', false, NOW())
        """), {"id": note_public_id, "sid": dummy_student_id, "author": author_b_id})

    # Test Case 1: Other faculty user (Author B) attempts to select notes
    with app_engine.connect() as conn:
        with conn.begin():
            conn.execute(text("SELECT set_config('app.current_user_id', :uid, true)"), {"uid": author_b_id})
            conn.execute(text("SELECT set_config('app.current_user_role', 'Faculty', true)"))
            
            res = conn.execute(text("SELECT id, content FROM faculty_notes WHERE id IN (:nid1, :nid2)"), {
                "nid1": note_confidential_id,
                "nid2": note_public_id
            }).fetchall()

            visible_ids = [row[0] for row in res]
            # Public note MUST be visible
            assert note_public_id in visible_ids
            # Confidential note by Author A MUST NOT be visible to Faculty B due to PostgreSQL RLS!
            assert note_confidential_id not in visible_ids, "PostgreSQL RLS failed: Faculty B saw confidential note by Faculty A!"

    # Test Case 2: Author A queries notes (their own confidential note MUST be visible)
    with app_engine.connect() as conn:
        with conn.begin():
            conn.execute(text("SELECT set_config('app.current_user_id', :uid, true)"), {"uid": author_a_id})
            conn.execute(text("SELECT set_config('app.current_user_role', 'Faculty', true)"))
            
            res = conn.execute(text("SELECT id, content FROM faculty_notes WHERE id IN (:nid1, :nid2)"), {
                "nid1": note_confidential_id,
                "nid2": note_public_id
            }).fetchall()

            visible_ids = [row[0] for row in res]
            assert note_confidential_id in visible_ids
            assert note_public_id in visible_ids

    # Test Case 3: Administrator queries notes (ALL notes MUST be visible)
    with app_engine.connect() as conn:
        with conn.begin():
            conn.execute(text("SELECT set_config('app.current_user_id', :uid, true)"), {"uid": admin_id})
            conn.execute(text("SELECT set_config('app.current_user_role', 'Administrator', true)"))
            
            res = conn.execute(text("SELECT id, content FROM faculty_notes WHERE id IN (:nid1, :nid2)"), {
                "nid1": note_confidential_id,
                "nid2": note_public_id
            }).fetchall()

            visible_ids = [row[0] for row in res]
            assert note_confidential_id in visible_ids
            assert note_public_id in visible_ids

def settings_admin_engine():
    return create_engine(settings.DATABASE_URL)

