import logging
from fastapi import FastAPI, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from app.config import settings
from app.core.logging import setup_logging
from app.core.security import validate_csrf
from app.api.v1.auth import router as auth_router
from app.api.v1.students import router as students_router
from app.api.v1.predictions import router as predictions_router
from app.api.v1.explainability import router as explainability_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.interventions import router as interventions_router
from app.api.v1.notes import router as notes_router
from app.api.v1.imports import router as imports_router
from app.api.v1.model_info import router as model_info_router
from app.api.v1.audit import router as audit_router
from app.api.v1.health import router as health_router

setup_logging()
logger = logging.getLogger("app.main")

app = FastAPI(
    title="Student Success Early-Warning System API",
    description="Explainable AI (XAI) for Student Dropout Prediction and Proactive Retention Support",
    version="1.0.0",
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT != "production" else None
)

# 1. Strict CORS Middleware (Security Requirement 11)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-CSRF-Token", "Accept"],
    max_age=600
)

# 2. Security Headers & CSRF Verification Middleware (Security Requirements 2, 3)
@app.middleware("http")
async def security_headers_and_csrf_middleware(request: Request, call_next):
    # CSRF Check on state-changing requests
    # Exclude public auth endpoints that establish credentials (login, mfa verify)
    exempt_paths = [
        "/api/v1/auth/login",
        "/api/v1/auth/logout",
        "/api/v1/auth/mfa/verify",
        "/api/v1/health",
        "/docs",
        "/openapi.json"
    ]
    path = request.url.path
    if not any(path.startswith(ep) for ep in exempt_paths):
        cookie_csrf = request.cookies.get(settings.CSRF_COOKIE_NAME)
        # If user has a session cookie, require valid CSRF token header for mutation methods
        if request.cookies.get(settings.SESSION_COOKIE_NAME):
            try:
                validate_csrf(request, cookie_csrf)
            except Exception as exc:
                return JSONResponse(
                    status_code=status.HTTP_403_FORBIDDEN,
                    content={"detail": "CSRF verification failed: missing or invalid X-CSRF-Token header"}
                )

    response: Response = await call_next(request)

    # Security Headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "img-src 'self' data:; "
        "connect-src 'self' http://localhost:8000 http://127.0.0.1:8000 http://localhost:5173;"
    )

    return response

# 3. Centralized Exception Handlers (Prevents stack trace leaks - Security Requirement 19)
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": "Input validation error", "errors": exc.errors()}
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled server exception on %s %s: %s", request.method, request.url.path, str(exc), exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Please contact the administrator."}
    )

# 4. Mount API Routes under /api/v1
api_v1 = FastAPI()
api_v1.include_router(health_router)
api_v1.include_router(auth_router)
api_v1.include_router(students_router)
api_v1.include_router(predictions_router)
api_v1.include_router(explainability_router)
api_v1.include_router(analytics_router)
api_v1.include_router(interventions_router)
api_v1.include_router(notes_router)
api_v1.include_router(imports_router)
api_v1.include_router(model_info_router)
api_v1.include_router(audit_router)

app.mount("/api/v1", api_v1)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
