import secrets
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models.entities import User, RevokedToken
from app.schemas.schemas import (
    LoginRequest, MFAVerifyRequest, MFASetupResponse,
    MFAEnableRequest, UserResponse
)
from app.core.security import (
    verify_password, hash_password, create_session_token,
    decode_session_token, generate_csrf_token, enforce_rate_limit,
    generate_mfa_secret, get_mfa_uri, verify_mfa_code,
    generate_recovery_codes, verify_and_consume_recovery_code
)
from app.api.deps import get_current_user, log_audit_event

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login")
def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Authenticate user via Email and Password.
    Includes rate-limiting and generic error responses to prevent account enumeration.
    """
    enforce_rate_limit(request, key_prefix="login", limit_per_minute=settings.RATE_LIMIT_LOGIN_PER_MINUTE)

    generic_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email or password"
    )

    user = db.query(User).filter(User.email == payload.email.lower().strip()).first()
    if not user or not user.is_active:
        raise generic_error

    if not verify_password(payload.password, user.hashed_password):
        log_audit_event(db, "AUTH_LOGIN_FAILED", request, user=user, details={"reason": "bad_password"})
        raise generic_error

    # If MFA is enabled, issue short-lived pending MFA token (5 minutes)
    if user.mfa_enabled:
        pending_token = create_session_token(
            {"sub": user.id, "mfa_pending": True},
            expires_delta=timedelta(minutes=5)
        )
        return {
            "mfa_required": True,
            "pending_token": pending_token,
            "message": "Multi-factor authentication required. Please enter your 6-digit authenticator code."
        }

    # Generate session token & CSRF token
    token = create_session_token({"sub": user.id, "role": user.role})
    csrf_token = generate_csrf_token()

    # Set HttpOnly, Secure, SameSite Session Cookie (Security Requirements 7, 12)
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=token,
        max_age=settings.SESSION_MAX_AGE_SECONDS,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path="/"
    )

    # Set CSRF Token Cookie (readable by client script to include in X-CSRF-Token header)
    response.set_cookie(
        key=settings.CSRF_COOKIE_NAME,
        value=csrf_token,
        max_age=settings.SESSION_MAX_AGE_SECONDS,
        httponly=False,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path="/"
    )

    log_audit_event(db, "AUTH_LOGIN_SUCCESS", request, user=user)

    return {
        "mfa_required": False,
        "csrf_token": csrf_token,
        "user": UserResponse.model_validate(user)
    }

@router.post("/mfa/verify")
def verify_mfa(
    payload: MFAVerifyRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """Verify MFA TOTP code or single-use recovery code."""
    enforce_rate_limit(request, key_prefix="mfa_verify", limit_per_minute=10)

    token_data = decode_session_token(payload.pending_token)
    if not token_data or not token_data.get("mfa_pending"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired MFA session")

    user_id = token_data.get("sub")
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user or not user.mfa_secret:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or MFA not configured")

    if payload.is_recovery_code:
        valid, updated_hashes = verify_and_consume_recovery_code(payload.code, user.recovery_codes_hash)
        if not valid:
            log_audit_event(db, "MFA_RECOVERY_CODE_FAILED", request, user=user)
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or consumed recovery code")
        user.recovery_codes_hash = updated_hashes
        db.commit()
        log_audit_event(db, "MFA_RECOVERY_CODE_USED", request, user=user)
    else:
        if not verify_mfa_code(user.mfa_secret, payload.code):
            log_audit_event(db, "MFA_CODE_FAILED", request, user=user)
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid 6-digit authenticator code")
        log_audit_event(db, "MFA_VERIFY_SUCCESS", request, user=user)

    # Issue final session token
    token = create_session_token({"sub": user.id, "role": user.role})
    csrf_token = generate_csrf_token()

    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=token,
        max_age=settings.SESSION_MAX_AGE_SECONDS,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path="/"
    )
    response.set_cookie(
        key=settings.CSRF_COOKIE_NAME,
        value=csrf_token,
        max_age=settings.SESSION_MAX_AGE_SECONDS,
        httponly=False,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path="/"
    )

    return {
        "csrf_token": csrf_token,
        "user": UserResponse.from_orm(user)
    }

@router.post("/mfa/setup", response_model=MFASetupResponse)
def setup_mfa(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Initiate MFA TOTP enrollment. Generates secret, URI, and emergency recovery codes."""
    secret = generate_mfa_secret()
    uri = get_mfa_uri(secret, user.email)
    recovery_codes, _ = generate_recovery_codes(8)
    return {
        "secret": secret,
        "otpauth_uri": uri,
        "recovery_codes": recovery_codes
    }

@router.post("/mfa/enable")
def enable_mfa(
    payload: MFAEnableRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Confirm 6-digit TOTP code and enable MFA on the user account."""
    if not verify_mfa_code(payload.secret, payload.code):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Verification code failed. Please check authenticator app.")

    # Hash recovery codes
    _, hashed_codes = generate_recovery_codes(8)
    user.mfa_secret = payload.secret
    user.mfa_enabled = True
    user.recovery_codes_hash = hashed_codes
    db.commit()

    log_audit_event(db, "MFA_ENABLED", request, user=user)
    return {"message": "MFA has been successfully activated on your account."}

@router.post("/logout")
def logout(
    request: Request,
    response: Response,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Revoke session token and clear cookies."""
    token = request.cookies.get(settings.SESSION_COOKIE_NAME)
    if token:
        payload = decode_session_token(token)
        if payload and payload.get("jti"):
            exp = datetime.fromtimestamp(payload.get("exp", 0), tz=timezone.utc)
            revoked = RevokedToken(token_jti=payload["jti"], expires_at=exp)
            db.add(revoked)
            db.commit()

    response.delete_cookie(settings.SESSION_COOKIE_NAME, path="/")
    response.delete_cookie(settings.CSRF_COOKIE_NAME, path="/")
    log_audit_event(db, "AUTH_LOGOUT", request, user=user)
    return {"message": "Logged out successfully"}

@router.get("/me", response_model=UserResponse)
def get_me(user: User = Depends(get_current_user)):
    return user

@router.get("/csrf")
def get_csrf(request: Request, response: Response):
    """Return existing or new CSRF token."""
    csrf = request.cookies.get(settings.CSRF_COOKIE_NAME)
    if not csrf:
        csrf = generate_csrf_token()
        response.set_cookie(
            key=settings.CSRF_COOKIE_NAME,
            value=csrf,
            max_age=settings.SESSION_MAX_AGE_SECONDS,
            httponly=False,
            secure=settings.COOKIE_SECURE,
            samesite=settings.COOKIE_SAMESITE,
            path="/"
        )
    return {"csrf_token": csrf}
