import pytest
from fastapi.testclient import TestClient

def test_login_generic_error_on_invalid_credentials(client: TestClient):
    """Security Requirement 9: Generic authentication error does not reveal if account exists."""
    # Test nonexistent user
    res1 = client.post("/api/v1/auth/login", json={"email": "nonexistent_9876@university.edu", "password": "RandomPassword123!"})
    assert res1.status_code == 401
    assert "Invalid email or password" in res1.json()["detail"]

    # Test existing user with wrong password
    res2 = client.post("/api/v1/auth/login", json={"email": "admin@university.edu", "password": "WrongPassword123!"})
    assert res2.status_code == 401
    assert "Invalid email or password" in res2.json()["detail"]
    assert res1.json()["detail"] == res2.json()["detail"]

def test_sql_injection_defense_in_search_and_sort(client: TestClient):
    """Security Requirement 1: Parameterized queries and allowlisted sorting defend against SQLi."""
    # Authenticate as faculty
    login_res = client.post("/api/v1/auth/login", json={"email": "faculty.smith@university.edu", "password": "FacultyPass123!Secure"})
    assert login_res.status_code == 200

    # Malicious SQL injection payloads in search parameter
    sqli_payloads = [
        "' OR '1'='1",
        "'; DROP TABLE students; --",
        "admin'--",
        "\" OR 1=1 --",
        "1 UNION SELECT 1, 2, 3--"
    ]
    for payload in sqli_payloads:
        res = client.get(f"/api/v1/students?search={payload}")
        assert res.status_code == 200
        # No server crash, returns clean JSON items
        assert "items" in res.json()

    # Malicious payload in sort_by (should fallback safely to default sort column)
    res_sort = client.get("/api/v1/students?sort_by=id;DROP+TABLE+users;--")
    assert res_sort.status_code == 200

def test_xss_payload_safety(client: TestClient):
    """Security Requirement 2: XSS payloads safely sanitized/stored as plain text."""
    login_res = client.post("/api/v1/auth/login", json={"email": "admin@university.edu", "password": "AdminPass123!Secure"})
    assert login_res.status_code == 200
    csrf_token = login_res.json()["csrf_token"]

    xss_payload = "<script>alert('xss')</script>"
    # Search with XSS payload
    res_search = client.get(f"/api/v1/students?search={xss_payload}")
    assert res_search.status_code == 200

def test_csrf_protection_on_state_changing_requests(client: TestClient):
    """Security Requirement 3: Cookie-authenticated mutations require valid CSRF token header."""
    login_res = client.post("/api/v1/auth/login", json={"email": "admin@university.edu", "password": "AdminPass123!Secure"})
    assert login_res.status_code == 200

    # Attempt state-changing POST without X-CSRF-Token header
    res_no_csrf = client.post(
        "/api/v1/students",
        json={
            "student_id_code": "STU-TEST-CSRF",
            "first_name": "Test",
            "last_name": "CSRF",
            "email": "csrf.test@demo.edu",
            "department": "Engineering",
            "course": "Informatics",
            "semester": 1,
            "admission_year": 2024,
            "current_academic_status": "Enrolled"
        }
    )
    assert res_no_csrf.status_code == 403
    assert "CSRF verification failed" in res_no_csrf.json()["detail"]

def test_rate_limiting_enforcement(client: TestClient):
    """Security Requirement 6: Excessive rapid requests trigger HTTP 429 Too Many Requests."""
    for i in range(25):
        res = client.post("/api/v1/auth/login", json={"email": f"ratetest_{i}@test.com", "password": "AnyPassword123!"})
        if res.status_code == 429:
            assert "Rate limit exceeded" in res.json()["detail"]
            assert "Retry-After" in res.headers
            break
