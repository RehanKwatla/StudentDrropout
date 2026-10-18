import pytest
import io
from fastapi.testclient import TestClient

def test_health_check(client: TestClient):
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["database"]["connected"] is True
    assert data["machine_learning"]["model_loaded"] is True

def test_auth_and_session_lifecycle(client: TestClient):
    # 1. Login as faculty
    login_res = client.post("/api/v1/auth/login", json={
        "email": "faculty.smith@university.edu",
        "password": "FacultyPass123!Secure"
    })
    assert login_res.status_code == 200
    user_data = login_res.json()["user"]
    assert user_data["email"] == "faculty.smith@university.edu"
    assert user_data["role"] == "Faculty"

    # 2. Get /auth/me
    me_res = client.get("/api/v1/auth/me")
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "faculty.smith@university.edu"

    # 3. Logout
    logout_res = client.post("/api/v1/auth/logout")
    assert logout_res.status_code == 200

def test_student_list_and_detail(client: TestClient):
    # Login
    client.post("/api/v1/auth/login", json={
        "email": "faculty.smith@university.edu",
        "password": "FacultyPass123!Secure"
    })

    # List
    res = client.get("/api/v1/students?page=1&page_size=5")
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert len(data["items"]) > 0

    first_student = data["items"][0]
    # Detail
    detail_res = client.get(f"/api/v1/students/{first_student['id']}")
    assert detail_res.status_code == 200
    detail_data = detail_res.json()
    assert detail_data["student"]["id"] == first_student["id"]

def test_prediction_endpoint_with_real_inference_and_shap(client: TestClient):
    login_res = client.post("/api/v1/auth/login", json={
        "email": "faculty.smith@university.edu",
        "password": "FacultyPass123!Secure"
    })
    assert login_res.status_code == 200
    csrf_token = login_res.json()["csrf_token"]

    pred_res = client.post(
        "/api/v1/predictions/predict",
        headers={"X-CSRF-Token": csrf_token},
        json={
            "features": {
                "curricular_units_1st_sem_approved": 0,
                "curricular_units_1st_sem_grade": 0.0,
                "curricular_units_2nd_sem_approved": 0,
                "curricular_units_2nd_sem_grade": 0.0,
                "tuition_fees_up_to_date": 0,
                "debtor": 1,
                "admission_grade": 105.0
            }
        }
    )
    assert pred_res.status_code == 200
    pred = pred_res.json()
    assert pred["risk_category"] == "High Risk"
    assert pred["predicted_class"] in ["Dropout", "Enrolled", "Graduate"]
    # Check probabilities sum to ~1.0
    prob_sum = pred["probability_dropout"] + pred["probability_enrolled"] + pred["probability_graduate"]
    assert abs(prob_sum - 1.0) < 0.01
    # Check SHAP top factors
    assert len(pred["top_factors"]) > 0
    assert "explanation_summary" in pred
    assert len(pred["explanation_summary"]) > 10

def test_explainability_global_endpoint(client: TestClient):
    client.post("/api/v1/auth/login", json={
        "email": "faculty.smith@university.edu",
        "password": "FacultyPass123!Secure"
    })
    res = client.get("/api/v1/explainability/global")
    assert res.status_code == 200
    data = res.json()
    assert "global_importance" in data
    assert len(data["global_importance"]) > 0
    assert "ethical_guidance" in data
    assert "correlation_vs_causation" in data["ethical_guidance"]

def test_interventions_crud(client: TestClient):
    login_res = client.post("/api/v1/auth/login", json={
        "email": "faculty.smith@university.edu",
        "password": "FacultyPass123!Secure"
    })
    csrf_token = login_res.json()["csrf_token"]

    # Get a student
    students = client.get("/api/v1/students?page=1&page_size=1").json()["items"]
    student_id = students[0]["id"]

    # Create intervention
    create_res = client.post(
        "/api/v1/interventions",
        headers={"X-CSRF-Token": csrf_token},
        json={
            "student_id": student_id,
            "title": "Automated Test Tutoring Outreach",
            "category": "Academic Tutoring",
            "priority": "Urgent",
            "notes": "Testing intervention persistence"
        }
    )
    assert create_res.status_code == 201
    interv_id = create_res.json()["id"]

    # Update status
    update_res = client.patch(
        f"/api/v1/interventions/{interv_id}",
        headers={"X-CSRF-Token": csrf_token},
        json={"status": "Completed"}
    )
    assert update_res.status_code == 200
    assert update_res.json()["status"] == "Completed"

def test_csv_upload_validation(client: TestClient):
    login_res = client.post("/api/v1/auth/login", json={
        "email": "faculty.smith@university.edu",
        "password": "FacultyPass123!Secure"
    })
    csrf_token = login_res.json()["csrf_token"]

    # Reject non-csv file extension (Security Requirement 4)
    res_bad_ext = client.post(
        "/api/v1/imports/csv",
        headers={"X-CSRF-Token": csrf_token},
        files={"file": ("malicious.exe", b"binarycontent", "application/octet-stream")}
    )
    assert res_bad_ext.status_code == 400
    assert "Only .csv files are permitted" in res_bad_ext.json()["detail"]
