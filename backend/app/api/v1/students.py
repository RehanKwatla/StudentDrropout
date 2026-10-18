from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc
from app.database import get_db
from app.models.entities import Student, StudentAcademicRecord, Prediction, User
from app.schemas.schemas import StudentCreate, StudentUpdate, StudentResponse
from app.api.deps import (
    get_current_user, require_faculty_or_admin,
    require_admin, log_audit_event
)

router = APIRouter(prefix="/students", tags=["Students"])

ALLOWED_SORT_FIELDS = {
    "student_id_code": Student.student_id_code,
    "last_name": Student.last_name,
    "first_name": Student.first_name,
    "department": Student.department,
    "semester": Student.semester,
    "created_at": Student.created_at,
    "status": Student.current_academic_status
}

@router.get("")
def list_students(
    search: Optional[str] = Query(None, description="Search by name or student ID code"),
    department: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    risk_level: Optional[str] = Query(None),
    sort_by: str = Query("created_at"),
    order: str = Query("desc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List students with search, filters, pagination, and allowlisted sorting.
    Includes latest prediction info when available.
    """
    query = db.query(Student)

    # 1. Parameterized Search (Prevents SQLi - Security Requirement 1)
    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Student.student_id_code.ilike(search_term),
                Student.first_name.ilike(search_term),
                Student.last_name.ilike(search_term),
                Student.email.ilike(search_term)
            )
        )

    if department:
        query = query.filter(Student.department == department)

    if status_filter:
        query = query.filter(Student.current_academic_status == status_filter)

    # Allowlisted sorting to prevent SQL injection in ORDER BY
    sort_column = ALLOWED_SORT_FIELDS.get(sort_by, Student.created_at)
    if order.lower() == "asc":
        query = query.order_by(asc(sort_column))
    else:
        query = query.order_by(desc(sort_column))

    total = query.count()
    students = query.offset((page - 1) * page_size).limit(page_size).all()

    # Attach latest prediction to each student
    results = []
    for s in students:
        latest_pred = db.query(Prediction).filter(Prediction.student_id == s.id).order_by(desc(Prediction.created_at)).first()
        pred_dict = None
        if latest_pred:
            pred_dict = {
                "id": latest_pred.id,
                "risk_category": latest_pred.risk_category,
                "risk_score": latest_pred.risk_score,
                "probability_dropout": latest_pred.probability_dropout,
                "predicted_class": latest_pred.predicted_class,
                "created_at": latest_pred.created_at
            }
        
        # Filter by risk level if requested
        if risk_level:
            if not pred_dict or pred_dict["risk_category"].lower() != risk_level.lower():
                continue

        results.append({
            "id": s.id,
            "student_id_code": s.student_id_code,
            "first_name": s.first_name,
            "last_name": s.last_name,
            "email": s.email,
            "department": s.department,
            "course": s.course,
            "semester": s.semester,
            "admission_year": s.admission_year,
            "current_academic_status": s.current_academic_status,
            "created_at": s.created_at,
            "updated_at": s.updated_at,
            "latest_prediction": pred_dict
        })

    return {
        "items": results,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size if page_size else 1
    }

@router.post("", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
def create_student(
    payload: StudentCreate,
    request: Request,
    user: User = Depends(require_faculty_or_admin),
    db: Session = Depends(get_db)
):
    """Create a new student record with duplicate detection."""
    existing_code = db.query(Student).filter(Student.student_id_code == payload.student_id_code).first()
    if existing_code:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Student ID code '{payload.student_id_code}' already exists."
        )

    existing_email = db.query(Student).filter(Student.email == payload.email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Student with email '{payload.email}' already exists."
        )

    student = Student(**payload.model_dump())
    db.add(student)
    db.flush()

    # Create default academic baseline record
    academic_record = StudentAcademicRecord(
        student_id=student.id,
        curricular_units_1st_sem_enrolled=6,
        curricular_units_1st_sem_approved=5,
        curricular_units_1st_sem_grade=13.0,
        tuition_fees_up_to_date=1,
        debtor=0
    )
    db.add(academic_record)
    db.commit()
    db.refresh(student)

    log_audit_event(db, "STUDENT_CREATED", request, user=user, resource_type="Student", resource_id=student.id)
    return student

@router.get("/{student_id}")
def get_student_detail(
    student_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve full student profile with academic assessment, predictions, and interventions."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student record not found.")

    latest_pred = db.query(Prediction).filter(Prediction.student_id == student.id).order_by(desc(Prediction.created_at)).first()
    pred_history = db.query(Prediction).filter(Prediction.student_id == student.id).order_by(desc(Prediction.created_at)).limit(10).all()
    academic_record = db.query(StudentAcademicRecord).filter(StudentAcademicRecord.student_id == student.id).first()

    return {
        "student": {
            "id": student.id,
            "student_id_code": student.student_id_code,
            "first_name": student.first_name,
            "last_name": student.last_name,
            "email": student.email,
            "department": student.department,
            "course": student.course,
            "semester": student.semester,
            "admission_year": student.admission_year,
            "current_academic_status": student.current_academic_status,
            "created_at": student.created_at,
            "updated_at": student.updated_at
        },
        "latest_prediction": latest_pred,
        "prediction_history": pred_history,
        "academic_record": academic_record
    }

@router.put("/{student_id}", response_model=StudentResponse)
def update_student(
    student_id: str,
    payload: StudentUpdate,
    request: Request,
    user: User = Depends(require_faculty_or_admin),
    db: Session = Depends(get_db)
):
    """Update student record."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(student, field, val)

    db.commit()
    db.refresh(student)
    log_audit_event(db, "STUDENT_UPDATED", request, user=user, resource_type="Student", resource_id=student.id)
    return student

@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_student(
    student_id: str,
    request: Request,
    user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Delete student record (Admin only)."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")

    db.delete(student)
    db.commit()
    log_audit_event(db, "STUDENT_DELETED", request, user=user, resource_type="Student", resource_id=student_id)
    return None
