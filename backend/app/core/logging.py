import re
import logging
from typing import Any

SENSITIVE_PATTERNS = [
    re.compile(r"(password['\"]?\s*[:=]\s*['\"])([^'\"]+)(['\"])", re.IGNORECASE),
    re.compile(r"(token['\"]?\s*[:=]\s*['\"])([^'\"]+)(['\"])", re.IGNORECASE),
    re.compile(r"(secret['\"]?\s*[:=]\s*['\"])([^'\"]+)(['\"])", re.IGNORECASE),
    re.compile(r"(cookie['\"]?\s*[:=]\s*['\"])([^'\"]+)(['\"])", re.IGNORECASE),
    re.compile(r"(authorization['\"]?\s*[:=]\s*['\"])([^'\"]+)(['\"])", re.IGNORECASE),
    re.compile(r"(mfa_code['\"]?\s*[:=]\s*['\"])([^'\"]+)(['\"])", re.IGNORECASE),
    re.compile(r"(recovery_code['\"]?\s*[:=]\s*['\"])([^'\"]+)(['\"])", re.IGNORECASE),
]

class SensitiveDataRedactor(logging.Filter):
    """
    Logging filter that redacts sensitive values (passwords, tokens, cookies, recovery codes)
    from all log messages to satisfy Security Requirement 19 while preserving numeric formats.
    """
    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            record.msg = self.redact(record.msg)
        if record.args:
            if isinstance(record.args, dict):
                record.args = {k: (self.redact(v) if isinstance(v, str) else v) for k, v in record.args.items()}
            elif isinstance(record.args, (list, tuple)):
                record.args = tuple((self.redact(v) if isinstance(v, str) else v) for v in record.args)
        return True

    @staticmethod
    def redact(text: str) -> str:
        for pattern in SENSITIVE_PATTERNS:
            text = pattern.sub(r"\1[REDACTED]\3", text)
        return text

def setup_logging(level: int = logging.INFO) -> None:
    """Configures root and app loggers with the sensitive data redaction filter."""
    handler = logging.StreamHandler()
    formatter = logging.Formatter(
        fmt="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    handler.setFormatter(formatter)
    handler.addFilter(SensitiveDataRedactor())

    root_logger = logging.getLogger()
    root_logger.setLevel(level)
    for h in list(root_logger.handlers):
        root_logger.removeHandler(h)
    root_logger.addHandler(handler)
