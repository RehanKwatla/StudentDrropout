from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database import get_db
from app.models.entities import Intervention, Student, User
from app.schemas.schemas import (
    InterventionCreate, InterventionUpdate, InterventionResponse
)
from app.api.deps import (
    get_current_user, require_faculty_or_admin, log_audit_event
)

router = APIRouter(prefix="/interventions", tags=["Interventions"])

@router.get("")
def list_interventions(
    status_filter: Optional[str] = Query(None, alias="status"),
    category: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    student_id: Optional[str] = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List student interventions with support category, status, and assigned staff."""
    query = db.query(Intervention)

    if status_filter:
        query = query.filter(Intervention.status == status_filter)
    if category:
        query = query.filter(Intervention.category == category)
    if priority:
        query = query.filter(Intervention.priority == priority)
    if student_id:
        query = query.filter(Intervention.student_id == student_id)

    interventions = query.order_by(desc(Intervention.created_at)).all()

    results = []
    for item in interventions:
        student = db.query(Student).filter(Student.id == item.student_id).first()
        results.append({
            "id": item.id,
            "student_id": item.student_id,
            "title": item.title,
            "category": item.category,
            "status": item.status,
            "priority": item.priority,
            "assigned_to_user_id": item.assigned_to_user_id,
            "due_date": item.due_date,
            "notes": item.notes,
            "created_by_user_id": item.created_by_user_id,
            "created_at": item.created_at,
            "updated_at": item.updated_at,
            "student_name": f"{student.first_name} {student.last_name}" if student else "Unknown"
        })
    return results

@router.post("", response_model=InterventionResponse, status_code=status.HTTP_201_CREATED)
def create_intervention(
    payload: InterventionCreate,
    request: Request,
    user: User = Depends(require_faculty_or_admin),
    db: Session = Depends(get_db)
):
    """Create a new actionable student support intervention."""
    student = db.query(Student).filter(Student.id == payload.student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")

    intervention = Intervention(
        student_id=payload.student_id,
        title=payload.title,
        category=payload.category,
        priority=payload.priority,
        assigned_to_user_id=payload.assigned_to_user_id or user.id,
        due_date=payload.due_date,
        notes=payload.notes,
        created_by_user_id=user.id
    )
    db.add(intervention)
    db.commit()
    db.refresh(intervention)

    log_audit_event(
        db, "INTERVENTION_CREATED", request, user=user,
        resource_type="Intervention", resource_id=intervention.id,
        details={"category": intervention.category, "student_id": student.id}
    )

    return {
        "id": intervention.id,
        "student_id": intervention.student_id,
        "title": intervention.title,
        "category": intervention.category,
        "status": intervention.status,
        "priority": intervention.priority,
        "assigned_to_user_id": intervention.assigned_to_user_id,
        "due_date": intervention.due_date,
        "notes": intervention.notes,
        "created_by_user_id": intervention.created_by_user_id,
        "created_at": intervention.created_at,
        "updated_at": intervention.updated_at,
        "student_name": f"{student.first_name} {student.last_name}"
    }

@router.patch("/{intervention_id}", response_model=InterventionResponse)
def update_intervention(
    intervention_id: str,
    payload: InterventionUpdate,
    request: Request,
    user: User = Depends(require_faculty_or_admin),
    db: Session = Depends(get_db)
):
    """Update intervention status, notes, or assigned staff."""
    intervention = db.query(Intervention).filter(Intervention.id == intervention_id).first()
    if not intervention:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Intervention not found.")

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(intervention, field, val)

    db.commit()
    db.refresh(intervention)

    student = db.query(Student).filter(Student.id == intervention.student_id).first()

    log_audit_event(
        db, "INTERVENTION_UPDATED", request, user=user,
        resource_type="Intervention", resource_id=intervention.id,
        details=update_data
    )
    return {
        "id": intervention.id,
        "student_id": intervention.student_id,
        "title": intervention.title,
        "category": intervention.category,
        "status": intervention.status,
        "priority": intervention.priority,
        "assigned_to_user_id": intervention.assigned_to_user_id,
        "due_date": intervention.due_date,
        "notes": intervention.notes,
        "created_by_user_id": intervention.created_by_user_id,
        "created_at": intervention.created_at,
        "updated_at": intervention.updated_at,
        "student_name": f"{student.first_name} {student.last_name}" if student else "Unknown"
    }
