import time
import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, Tuple, List
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError, InvalidHashError
from jose import jwt, JWTError
import pyotp
from fastapi import Request, HTTPException, status
from app.config import settings

# Argon2id configuration (Security Requirement 9)
ph = PasswordHasher(
    time_cost=2,
    memory_cost=65536,  # 64 MB
    parallelism=1,
    hash_len=32
)

def hash_password(password: str) -> str:
    """Hash password using Argon2id with library-managed cryptographic salt."""
    return ph.hash(password)

def verify_password(password: str, hashed_password: str) -> bool:
    """Verify password against Argon2id hash safely without leaking timing information."""
    try:
        return ph.verify(hashed_password, password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False

# MFA Helpers (Security Requirement 10)
def generate_mfa_secret() -> str:
    """Generate a random base32 TOTP secret."""
    return pyotp.random_base32()

def get_mfa_uri(secret: str, email: str) -> str:
    """Generate otpauth:// URI for authenticator apps."""
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(name=email, issuer_name="StudentSuccess-EWS")

def verify_mfa_code(secret: str, code: str) -> bool:
    """Verify 6-digit TOTP code with standard 30-second window."""
    if not secret or not code:
        return False
    totp = pyotp.TOTP(secret)
    return totp.verify(code.strip(), valid_window=1)

def generate_recovery_codes(count: int = 8) -> Tuple[List[str], str]:
    """Generate plaintext recovery codes and return their combined Argon2/SHA256 hashes."""
    plain_codes = [f"{secrets.token_hex(4)}-{secrets.token_hex(4)}".upper() for _ in range(count)]
    # Store individual SHA-256 hashes joined by comma
    hashed_codes = ",".join(hashlib.sha256(code.encode("utf-8")).hexdigest() for code in plain_codes)
    return plain_codes, hashed_codes

def verify_and_consume_recovery_code(code: str, stored_hashes: Optional[str]) -> Tuple[bool, Optional[str]]:
    """Verify a single-use recovery code and return remaining updated hashes if valid."""
    if not stored_hashes:
        return False, stored_hashes
    code_hash = hashlib.sha256(code.strip().upper().encode("utf-8")).hexdigest()
    hashes = [h.strip() for h in stored_hashes.split(",") if h.strip()]
    if code_hash in hashes:
        hashes.remove(code_hash)
        return True, ",".join(hashes)
    return False, stored_hashes

# Session Tokens & JWT (Security Requirements 7, 12)
ALGORITHM = "HS256"

def create_session_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create signed session token containing jti, sub, role, and expiry."""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(seconds=settings.SESSION_MAX_AGE_SECONDS)
    
    to_encode.update({
        "exp": expire,
        "iat": now,
        "jti": secrets.token_urlsafe(32),
        "iss": "student-success-ews"
    })
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)

def decode_session_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and validate session token signature and expiration."""
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[ALGORITHM],
            issuer="student-success-ews"
        )
        return payload
    except JWTError:
        return None

# Anti-CSRF Token Generation & Validation (Security Requirement 3)
def generate_csrf_token() -> str:
    """Generate cryptographically secure unguessable CSRF token."""
    return secrets.token_urlsafe(32)

def validate_csrf(request: Request, cookie_csrf: Optional[str]) -> None:
    """
    Validate CSRF for state-changing HTTP methods (POST, PUT, PATCH, DELETE).
    Matches request header 'X-CSRF-Token' with the value from cookie.
    """
    if request.method in ("POST", "PUT", "PATCH", "DELETE"):
        header_csrf = request.headers.get("X-CSRF-Token")
        if not cookie_csrf or not header_csrf or not secrets.compare_digest(header_csrf, cookie_csrf):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF token validation failed or missing"
            )

# In-Memory Token Bucket Rate Limiter (Security Requirement 6)
class TokenBucketRateLimiter:
    def __init__(self):
        # key -> list of timestamps
        self.requests: Dict[str, List[float]] = {}

    def is_allowed(self, key: str, max_requests: int, window_seconds: int = 60) -> Tuple[bool, int]:
        now = time.time()
        timestamps = self.requests.get(key, [])
        # Purge older timestamps
        cutoff = now - window_seconds
        valid_timestamps = [ts for ts in timestamps if ts > cutoff]
        
        if len(valid_timestamps) >= max_requests:
            retry_after = int(window_seconds - (now - valid_timestamps[0]))
            self.requests[key] = valid_timestamps
            return False, max(1, retry_after)
        
        valid_timestamps.append(now)
        self.requests[key] = valid_timestamps
        return True, 0

rate_limiter = TokenBucketRateLimiter()

def enforce_rate_limit(request: Request, key_prefix: str, limit_per_minute: int) -> None:
    client_ip = request.client.host if request.client else "127.0.0.1"
    rate_key = f"{key_prefix}:{client_ip}"
    allowed, retry_after = rate_limiter.is_allowed(rate_key, max_requests=limit_per_minute, window_seconds=60)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please try again later.",
            headers={"Retry-After": str(retry_after)}
        )
