from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field

# Auth & User Schemas
class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)

class MFAVerifyRequest(BaseModel):
    pending_token: str
    code: str = Field(..., min_length=6, max_length=20)
    is_recovery_code: bool = False

class MFASetupResponse(BaseModel):
    secret: str
    otpauth_uri: str
    recovery_codes: List[str]

class MFAEnableRequest(BaseModel):
    secret: str
    code: str
    recovery_codes: List[str]

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    is_active: bool
    mfa_enabled: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Student Schemas
class StudentBase(BaseModel):
    student_id_code: str = Field(..., max_length=50)
    first_name: str = Field(..., max_length=100)
    last_name: str = Field(..., max_length=100)
    email: EmailStr
    department: str = Field("Engineering", max_length=100)
    course: str = Field("Informatics Engineering", max_length=150)
    semester: int = Field(1, ge=1, le=12)
    admission_year: int = Field(2024, ge=2000, le=2030)
    current_academic_status: str = Field("Enrolled")

class StudentCreate(StudentBase):
    pass

class StudentUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    department: Optional[str] = None
    course: Optional[str] = None
    semester: Optional[int] = None
    admission_year: Optional[int] = None
    current_academic_status: Optional[str] = None

class StudentResponse(StudentBase):
    id: str
    created_at: datetime
    updated_at: datetime
    latest_prediction: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True

# Prediction Schemas
class PredictRequest(BaseModel):
    student_id: Optional[str] = None
    features: Optional[Dict[str, float]] = None

class FactorDetail(BaseModel):
    feature: str
    label: str
    value: float
    shap_value: float
    impact: float
    direction: str

class PredictionResponse(BaseModel):
    id: Optional[str] = None
    student_id: Optional[str] = None
    model_version: str
    predicted_class: str
    risk_category: str
    risk_score: float
    probability_dropout: float
    probability_enrolled: float
    probability_graduate: float
    top_factors: List[FactorDetail]
    explanation_summary: str
    data_quality_warnings: Optional[List[str]] = None
    created_at: Optional[datetime] = None

# Intervention Schemas
class InterventionCreate(BaseModel):
    student_id: str
    title: str = Field(..., min_length=3, max_length=200)
    category: str = Field(..., max_length=100)
    priority: str = Field("Medium", max_length=20)
    assigned_to_user_id: Optional[str] = None
    due_date: Optional[datetime] = None
    notes: Optional[str] = None

class InterventionUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_to_user_id: Optional[str] = None
    due_date: Optional[datetime] = None
    notes: Optional[str] = None

class InterventionResponse(BaseModel):
    id: str
    student_id: str
    title: str
    category: str
    status: str
    priority: str
    assigned_to_user_id: Optional[str]
    due_date: Optional[datetime]
    notes: Optional[str]
    created_by_user_id: str
    created_at: datetime
    updated_at: datetime
    student_name: Optional[str] = None

    class Config:
        from_attributes = True

# Faculty Notes Schemas
class NoteCreate(BaseModel):
    content: str = Field(..., min_length=1)
    is_confidential: bool = False

class NoteResponse(BaseModel):
    id: str
    student_id: str
    author_user_id: str
    content: str
    is_confidential: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Audit & Import Schemas
class AuditLogResponse(BaseModel):
    id: str
    timestamp: datetime
    action: str
    user_id: Optional[str]
    user_email: Optional[str]
    ip_address: Optional[str]
    resource_type: Optional[str]
    resource_id: Optional[str]
    details: Optional[Dict[str, Any]]

    class Config:
        from_attributes = True

class ImportJobResponse(BaseModel):
    id: str
    filename: str
    total_rows: int
    success_rows: int
    error_rows: int
    duplicate_rows: int
    created_at: datetime
    error_log: Optional[List[Dict[str, Any]]] = None

    class Config:
        from_attributes = True
