import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, JSON
)
from sqlalchemy.orm import relationship
from app.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="Faculty")  # Administrator, Faculty, ReadOnlyReviewer
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Multi-Factor Authentication
    mfa_enabled = Column(Boolean, default=False, nullable=False)
    mfa_secret = Column(String(255), nullable=True)  # TOTP base32 key (encrypted in production)
    recovery_codes_hash = Column(Text, nullable=True)  # Hashed single-use recovery codes
    
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    interventions_created = relationship("Intervention", foreign_keys="Intervention.created_by_user_id", back_populates="creator")
    interventions_assigned = relationship("Intervention", foreign_keys="Intervention.assigned_to_user_id", back_populates="assignee")
    notes = relationship("FacultyNote", back_populates="author")
    predictions = relationship("Prediction", back_populates="generator")

class Student(Base):
    __tablename__ = "students"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    student_id_code = Column(String(50), unique=True, index=True, nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), index=True, nullable=False)
    department = Column(String(100), nullable=False, default="Engineering")
    course = Column(String(150), nullable=False, default="Informatics Engineering")
    semester = Column(Integer, nullable=False, default=1)
    admission_year = Column(Integer, nullable=False, default=2024)
    current_academic_status = Column(String(50), nullable=False, default="Enrolled")  # Enrolled, Graduate, Dropout, At-Risk, On-Leave
    
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    academic_records = relationship("StudentAcademicRecord", back_populates="student", cascade="all, delete-orphan")
    predictions = relationship("Prediction", back_populates="student", cascade="all, delete-orphan", order_by="desc(Prediction.created_at)")
    interventions = relationship("Intervention", back_populates="student", cascade="all, delete-orphan", order_by="desc(Intervention.created_at)")
    notes = relationship("FacultyNote", back_populates="student", cascade="all, delete-orphan", order_by="desc(FacultyNote.created_at)")

class StudentAcademicRecord(Base):
    __tablename__ = "student_academic_records"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    student_id = Column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    assessment_date = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    # UCI / Academic Features
    marital_status = Column(Integer, default=1)
    application_mode = Column(Integer, default=1)
    application_order = Column(Integer, default=1)
    course_code = Column(Integer, default=33)
    daytime_evening_attendance = Column(Integer, default=1)
    previous_qualification = Column(Integer, default=1)
    previous_qualification_grade = Column(Float, default=120.0)
    nacionality = Column(Integer, default=1)
    mothers_qualification = Column(Integer, default=1)
    fathers_qualification = Column(Integer, default=1)
    mothers_occupation = Column(Integer, default=1)
    fathers_occupation = Column(Integer, default=1)
    admission_grade = Column(Float, default=120.0)
    displaced = Column(Integer, default=0)
    educational_special_needs = Column(Integer, default=0)
    debtor = Column(Integer, default=0)
    tuition_fees_up_to_date = Column(Integer, default=1)
    gender = Column(Integer, default=1)
    scholarship_holder = Column(Integer, default=0)
    age_at_enrollment = Column(Integer, default=20)
    international = Column(Integer, default=0)

    # 1st Semester metrics
    curricular_units_1st_sem_credited = Column(Integer, default=0)
    curricular_units_1st_sem_enrolled = Column(Integer, default=6)
    curricular_units_1st_sem_evaluations = Column(Integer, default=6)
    curricular_units_1st_sem_approved = Column(Integer, default=5)
    curricular_units_1st_sem_grade = Column(Float, default=12.5)
    curricular_units_1st_sem_without_evaluations = Column(Integer, default=0)

    # 2nd Semester metrics (if evaluated at or after 2nd semester)
    curricular_units_2nd_sem_credited = Column(Integer, default=0)
    curricular_units_2nd_sem_enrolled = Column(Integer, default=6)
    curricular_units_2nd_sem_evaluations = Column(Integer, default=6)
    curricular_units_2nd_sem_approved = Column(Integer, default=5)
    curricular_units_2nd_sem_grade = Column(Float, default=12.5)
    curricular_units_2nd_sem_without_evaluations = Column(Integer, default=0)

    # Macroeconomic context (optional from UCI dataset)
    unemployment_rate = Column(Float, default=10.8)
    inflation_rate = Column(Float, default=1.4)
    gdp = Column(Float, default=1.74)

    student = relationship("Student", back_populates="academic_records")

class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    student_id = Column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    model_version = Column(String(50), nullable=False)
    
    # Categorization and Probabilities
    risk_category = Column(String(20), nullable=False)  # High Risk, Medium Risk, Low Risk
    risk_score = Column(Float, nullable=False)  # 0.0 to 1.0 (calibrated dropout probability)
    probability_dropout = Column(Float, nullable=False)
    probability_enrolled = Column(Float, nullable=False)
    probability_graduate = Column(Float, nullable=False)
    predicted_class = Column(String(20), nullable=False)  # Dropout, Enrolled, Graduate

    # Explainability & Metadata
    top_factors = Column(JSON, nullable=False)  # [{feature, value, impact, direction, description}]
    explanation_summary = Column(Text, nullable=False)
    data_quality_warnings = Column(JSON, nullable=True)

    generated_by_user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    student = relationship("Student", back_populates="predictions")
    generator = relationship("User", back_populates="predictions")

class Intervention(Base):
    __tablename__ = "interventions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    student_id = Column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    category = Column(String(100), nullable=False)  # Academic Tutoring, Attendance Follow-up, Faculty Mentoring, Study Planning, Administrative Guidance, Referral
    status = Column(String(50), default="Pending", nullable=False)  # Pending, In Progress, Completed, Cancelled
    priority = Column(String(20), default="Medium", nullable=False)  # Urgent, Medium, Routine
    
    assigned_to_user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    due_date = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    
    created_by_user_id = Column(String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    student = relationship("Student", back_populates="interventions")
    creator = relationship("User", foreign_keys=[created_by_user_id], back_populates="interventions_created")
    assignee = relationship("User", foreign_keys=[assigned_to_user_id], back_populates="interventions_assigned")

class FacultyNote(Base):
    __tablename__ = "faculty_notes"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    student_id = Column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    author_user_id = Column(String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    content = Column(Text, nullable=False)
    is_confidential = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    student = relationship("Student", back_populates="notes")
    author = relationship("User", back_populates="notes")

class ModelVersion(Base):
    __tablename__ = "model_versions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    version_tag = Column(String(50), unique=True, index=True, nullable=False)
    algorithm = Column(String(100), nullable=False)
    trained_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    dataset_name = Column(String(200), nullable=False)
    
    test_accuracy = Column(Float, nullable=False)
    test_f1_weighted = Column(Float, nullable=False)
    test_f1_macro = Column(Float, nullable=False)
    test_f1_dropout = Column(Float, nullable=False)
    
    feature_count = Column(Integer, nullable=False)
    training_samples = Column(Integer, nullable=False)
    test_samples = Column(Integer, nullable=False)
    
    confusion_matrix = Column(JSON, nullable=False)
    class_metrics = Column(JSON, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    limitations_notes = Column(Text, nullable=False)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    timestamp = Column(DateTime(timezone=True), default=utc_now, index=True, nullable=False)
    action = Column(String(100), index=True, nullable=False)
    user_id = Column(String(36), nullable=True)
    user_email = Column(String(255), nullable=True)
    ip_address = Column(String(45), nullable=True)
    resource_type = Column(String(50), nullable=True)
    resource_id = Column(String(100), nullable=True)
    details = Column(JSON, nullable=True)

class RevokedToken(Base):
    __tablename__ = "revoked_tokens"

    token_jti = Column(String(255), primary_key=True)
    revoked_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)

class ImportJob(Base):
    __tablename__ = "import_jobs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    filename = Column(String(255), nullable=False)
    total_rows = Column(Integer, default=0, nullable=False)
    success_rows = Column(Integer, default=0, nullable=False)
    error_rows = Column(Integer, default=0, nullable=False)
    duplicate_rows = Column(Integer, default=0, nullable=False)
    error_log = Column(JSON, nullable=True)
    imported_by_user_id = Column(String(36), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
