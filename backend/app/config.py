import os
from typing import List
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    ENVIRONMENT: str = "development"
    SECRET_KEY: str = Field(
        default="dev_secret_key_student_dropout_xai_system_must_be_overridden_in_production_with_64_bytes",
        description="Cryptographic secret key for signing sessions and tokens"
    )
    SESSION_COOKIE_NAME: str = "student_success_session"
    CSRF_COOKIE_NAME: str = "student_success_csrf"
    SESSION_MAX_AGE_SECONDS: int = 28800  # 8 hours
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: str = "lax"

    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    DATABASE_URL: str = "postgresql+psycopg://postgres@localhost:5433/student_success"
    SQLITE_FALLBACK_URL: str = "sqlite:///./student_success.db"

    # Application role credentials for RLS testing
    APP_DB_USER: str = "app_user"
    APP_DB_PASSWORD: str = "secure_app_user_password_2026"

    UCI_DATASET_URL: str = "https://archive.ics.uci.edu/static/public/697/predict+students+dropout+and+academic+success.zip"
    MODEL_ARTIFACTS_DIR: str = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ml", "artifacts")

    RATE_LIMIT_LOGIN_PER_MINUTE: int = 20
    RATE_LIMIT_PREDICTION_PER_MINUTE: int = 100
    RATE_LIMIT_GLOBAL_PER_MINUTE: int = 600

    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

settings = Settings()
