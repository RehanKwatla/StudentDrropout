# Security Architecture & Verification Specification

**Product Title:** Student Success Early-Warning System — Explainable AI for Student Dropout Prediction  
**Assessment Date:** October 2026  
**Security Baseline:** OWASP Top 10 API Security, Academic Data Protection (FERPA Alignment), Zero-Trust Least-Privilege

---

## 1. Threat Model & Security Principles

The Student Success Early-Warning System handles sensitive student academic history, attendance, financial delinquency flags, and faculty retention notes. The threat model is governed by three primary principles:

1. **Least Privilege & Row Isolation**: Faculty members may only review students assigned to their jurisdiction or department. Confidential mentoring notes must never be accessible across faculty boundaries or leaked through unauthenticated APIs.
2. **Defense in Depth**: Security boundaries are enforced at three distinct layers: HTTP transport/origin (CORS, CSP, CSRF), application logic (Pydantic schemas, RBAC dependencies), and persistence (PostgreSQL Row-Level Security policies executed under restricted DB user `app_user`).
3. **Responsible & Explainable AI**: Machine learning outputs are strictly probabilistic. Explanations must clearly separate correlation from causation, and automated disciplinary actions based on predictions are architecturally prohibited.

---

## 2. 20 Mandatory Security Requirements Verification Matrix

| # | Requirement | Status | Verification Evidence / Implemented Mechanism |
|---|-------------|:------:|-----------------------------------------------|
| **1** | **SQL Injection Defense** | **PASS** | Parameterized queries via SQLAlchemy ORM. Strict allowlists on sortable columns in student queries. Verified in `test_sql_injection_defense_in_search_and_sort` with malicious SQL payloads (`' OR '1'='1`, `UNION SELECT`, `DROP TABLE`). |
| **2** | **Cross-Site Scripting (XSS)** | **PASS** | React contextual auto-escaping eliminates direct DOM HTML injection. Strict Content-Security-Policy (CSP) headers applied in FastAPI middleware (`default-src 'self'`). Verified in `test_xss_payload_safety`. |
| **3** | **Cross-Site Request Forgery (CSRF)** | **PASS** | Double-submit cookie anti-CSRF token architecture. All mutation HTTP methods (`POST`, `PATCH`, `DELETE`) require `X-CSRF-Token` header matching cryptographically signed HMAC token. Verified in `test_csrf_protection_on_state_changing_requests`. |
| **4** | **File Upload Validation** | **PASS** | CSV import pipeline enforces strict MIME-type (`text/csv`), file extension (`.csv`), file size limits (5MB max), and row schema validation. Non-CSV and malicious binary uploads are rejected with 400 Bad Request. Verified in `test_csv_upload_validation`. |
| **5** | **Broken Object-Level Authorization (BOLA/IDOR)** | **PASS** | All student records, predictions, interventions, and notes verify user role and ownership. Confidential notes filter by `author_user_id` or `Administrator` role on every lookup. |
| **6** | **Rate Limiting & Throttling** | **PASS** | In-memory token-bucket rate limiter enforcing per-IP and per-account limits on `/auth/login` (10/min) and expensive endpoints. Excessive rapid attempts trigger `429 Too Many Requests`. Verified in `test_rate_limiting_enforcement`. |
| **7** | **Secure JWT / Session Secrets** | **PASS** | Uses opaque server-signed HMAC session tokens stored exclusively in `HttpOnly`, `SameSite=Lax`, `Secure` cookies. Token expiry enforced (8 hours). Revoked tokens persisted in `revoked_tokens` table. Secret keys loaded strictly from environment. |
| **8** | **API Secrets Remain Server-Side** | **PASS** | All database credentials, session secrets, and hash salts reside in `.env`. Frontend Vite configuration exposes no sensitive variables; `.env.example` contains only placeholder templates. Tested via repository scan. |
| **9** | **Password Hashing** | **PASS** | State-of-the-art `argon2id` password hashing via `argon2-cffi` with library-managed salts. Constant-time password verification prevents timing attacks. Verified in `test_login_generic_error_on_invalid_credentials`. |
| **10** | **Multi-Factor Authentication (TOTP)** | **PASS** | RFC 6238 TOTP implementation via `pyotp`. Users enroll with secret keys, verify 6-digit codes, and receive single-use cryptographic recovery codes stored as secure SHA-256 hashes. Rate-limited verification prevents brute force. |
| **11** | **Strict CORS Configuration** | **PASS** | Explicit origin allowlist (`http://localhost:5173`, `http://127.0.0.1:5173`). Wildcard origins with credentials explicitly prohibited. Restricted headers and allowed methods configured. |
| **12** | **No Auth Tokens in localStorage** | **PASS** | Zero session tokens or credentials in `localStorage` or `sessionStorage`. All authenticated state managed via browser-native `HttpOnly` cookies immune to script-based exfiltration. |
| **13** | **Server-Side Permission Enforcement** | **PASS** | Role-Based Access Control (`Administrator`, `Faculty`, `ReadOnlyReviewer`) enforced via FastAPI dependency injection (`require_roles`). Frontend route guards serve solely as UX conveniences. |
| **14** | **PostgreSQL Row-Level Security (RLS)** | **PASS** | Implemented on PostgreSQL 18 table `faculty_notes`. Non-superuser role `app_user` cannot access confidential notes created by other faculty. Verified against live PostgreSQL cluster on port 5433 in `test_postgresql_row_level_security_enforcement`. |
| **15** | **Webhook Signature Verification** | **N/A** | **NOT APPLICABLE**. The Student Success Early-Warning System does not expose external inbound webhooks in this release. Requirement documented as non-applicable. |
| **16** | **Server-Side Request Forgery (SSRF)** | **PASS** | No endpoints accept arbitrary outbound user-supplied URLs. External dataset downloads are hardcoded to the authoritative UCI repository domain. Loopback, private IP ranges, and arbitrary proxies are prohibited. |
| **17** | **No Exposed Source Maps** | **PASS** | Frontend Vite configuration specifies `sourcemap: false` in `build` options. Verified: `frontend/dist/assets/` contains zero `.map` files after `npm run build`. |
| **18** | **Change Default Credentials** | **PASS** | Zero hardcoded administrator credentials in application source code. Bootstrap database seeder requires explicit invocation and generates randomized or environment-derived credentials. |
| **19** | **No Sensitive Data in Logs** | **PASS** | Custom `SensitiveDataRedactionFilter` in Python `logging` module automatically redacts passwords, MFA secrets, recovery codes, cookies, and Bearer tokens before writing to log streams or task logs. |
| **20** | **Update Vulnerable Dependencies** | **PASS** | All Python dependencies pinned to stable releases (`fastapi 0.115+`, `sqlalchemy 2.0+`, `pydantic 2.10+`, `scikit-learn 1.6+`, `shap 0.46+`). Node modules verified with modern lockfile. |

---

## 3. PostgreSQL Row-Level Security (RLS) Architecture

The application enforces database-level multi-user isolation on the `faculty_notes` relation using PostgreSQL native Row-Level Security:

```sql
-- Enable RLS and force security on ordinary application connections
ALTER TABLE faculty_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE faculty_notes FORCE ROW LEVEL SECURITY;

-- Grant least-privilege DML to restricted app_user
GRANT SELECT, INSERT, UPDATE, DELETE ON faculty_notes TO app_user;

-- Policy: Faculty can only see notes if they are public OR if they authored them.
-- Administrators bypass confidentiality restriction to ensure institutional safety.
CREATE POLICY faculty_notes_access_policy ON faculty_notes
    FOR ALL
    TO app_user
    USING (
        is_confidential = false
        OR author_user_id = current_setting('app.current_user_id', true)
        OR current_setting('app.current_user_role', true) = 'Administrator'
    )
    WITH CHECK (
        author_user_id = current_setting('app.current_user_id', true)
        OR current_setting('app.current_user_role', true) = 'Administrator'
    );
```

### Request-Scoped Identity Binding
When an HTTP request is authenticated, FastAPI dependency `deps.py` binds the validated session context directly to the active database connection via `SELECT set_config('app.current_user_id', :uid, false)`. This ensures that even if an attacker attempts BOLA parameter tampering in request payloads, PostgreSQL rejects the query at the database engine level.

---

## 4. Production Hardening & Deployment Guidelines

1. **Enforce HTTPS (HSTS)**:
   - Configure a reverse proxy (e.g., Nginx, Caddy, or AWS ALB) with TLS 1.3 termination.
   - Set `COOKIE_SECURE=true` in production environment variables to ensure cookies are transmitted exclusively over encrypted connections.
2. **Reverse Proxy Security Headers**:
   - `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY`
   - `Referrer-Policy: strict-origin-when-cross-origin`
3. **Database Secrets Rotation**:
   - Isolate migration privileges from runtime DML permissions.
   - Run database schema migrations using a designated deployment role, and execute the web service under `app_user`.
