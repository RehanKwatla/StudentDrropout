import json
import logging
from typing import Generator, Optional, List
from fastapi import Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db, set_rls_context
from app.models.entities import User, RevokedToken, AuditLog
from app.core.security import decode_session_token

logger = logging.getLogger("app.deps")

def get_current_user_optional(
    request: Request,
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Extracts authenticated user from HttpOnly session cookie or Authorization Bearer header.
    Returns None if unauthenticated.
    """
    token = request.cookies.get(settings.SESSION_COOKIE_NAME)
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

    if not token:
        return None

    payload = decode_session_token(token)
    if not payload:
        return None

    # Check revocation table
    jti = payload.get("jti")
    if jti:
        revoked = db.query(RevokedToken).filter(RevokedToken.token_jti == jti).first()
        if revoked:
            return None

    user_id = payload.get("sub")
    if not user_id:
        return None

    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if user:
        # Set PostgreSQL Row-Level Security session context for current request
        set_rls_context(db, user_id=user.id, role=user.role)
    return user

def get_current_user(
    current_user: Optional[User] = Depends(get_current_user_optional)
) -> User:
    """Enforces authentication; raises 401 Unauthorized if missing."""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in."
        )
    return current_user

def require_roles(allowed_roles: List[str]):
    """Enforces server-side Role-Based Access Control (RBAC)."""
    def role_checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed_roles:
            logger.warning("Access denied: User %s with role %s attempted to access restricted endpoint requiring %s", user.email, user.role, allowed_roles)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {', '.join(allowed_roles)}"
            )
        return user
    return role_checker

require_admin = require_roles(["Administrator"])
require_faculty_or_admin = require_roles(["Administrator", "Faculty"])
require_authenticated = require_roles(["Administrator", "Faculty", "ReadOnlyReviewer"])

def log_audit_event(
    db: Session,
    action: str,
    request: Request,
    user: Optional[User] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    details: Optional[dict] = None
) -> None:
    """Records security and operational audit event in database."""
    try:
        ip = request.client.host if request.client else "127.0.0.1"
        audit = AuditLog(
            action=action,
            user_id=user.id if user else None,
            user_email=user.email if user else None,
            ip_address=ip,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details or {}
        )
        db.add(audit)
        db.commit()
    except Exception as e:
        logger.error("Failed to write audit log event %s: %s", action, e)
