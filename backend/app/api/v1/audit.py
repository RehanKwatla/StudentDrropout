from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database import get_db
from app.models.entities import AuditLog, User
from app.schemas.schemas import AuditLogResponse
from app.api.deps import require_admin

router = APIRouter(prefix="/audit", tags=["Audit Logs"])

@router.get("/logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    action: Optional[str] = Query(None),
    user_email: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Retrieve audit trail of authentication and security-critical actions (Administrator only).
    """
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action == action)
    if user_email:
        query = query.filter(AuditLog.user_email.ilike(f"%{user_email}%"))

    logs = query.order_by(desc(AuditLog.timestamp)).limit(limit).all()
    return logs
