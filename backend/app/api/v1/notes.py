from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database import get_db
from app.models.entities import FacultyNote, Student, User
from app.schemas.schemas import NoteCreate, NoteResponse
from app.api.deps import (
    get_current_user, require_faculty_or_admin, log_audit_event
)

router = APIRouter(prefix="/notes", tags=["Faculty Notes"])

@router.get("/student/{student_id}", response_model=List[NoteResponse])
def get_student_notes(
    student_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve faculty notes for a student.
    Enforces privacy restrictions: Confidential notes are only visible to their author or an Administrator.
    """
    notes = db.query(FacultyNote).filter(
        FacultyNote.student_id == student_id
    ).order_by(desc(FacultyNote.created_at)).all()

    # Filter according to confidentiality rules
    visible_notes = []
    for n in notes:
        if not n.is_confidential or user.role == "Administrator" or n.author_user_id == user.id:
            visible_notes.append(n)

    return visible_notes

@router.post("/student/{student_id}", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
def create_student_note(
    student_id: str,
    payload: NoteCreate,
    request: Request,
    user: User = Depends(require_faculty_or_admin),
    db: Session = Depends(get_db)
):
    """Create a new faculty advising note for a student."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")

    note = FacultyNote(
        student_id=student.id,
        author_user_id=user.id,
        content=payload.content,
        is_confidential=payload.is_confidential
    )
    db.add(note)
    db.commit()
    db.refresh(note)

    log_audit_event(
        db, "FACULTY_NOTE_CREATED", request, user=user,
        resource_type="FacultyNote", resource_id=note.id,
        details={"is_confidential": note.is_confidential, "student_id": student.id}
    )
    return note
