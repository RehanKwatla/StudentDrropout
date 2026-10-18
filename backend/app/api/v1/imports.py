import io
import csv
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.entities import Student, StudentAcademicRecord, ImportJob, User
from app.schemas.schemas import ImportJobResponse
from app.api.deps import require_faculty_or_admin, log_audit_event

router = APIRouter(prefix="/imports", tags=["Data Import"])

MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB
MAX_ROW_COUNT = 5000

REQUIRED_CSV_FIELDS = ["student_id_code", "first_name", "last_name", "email"]

@router.post("/csv", response_model=ImportJobResponse)
async def import_students_csv(
    request: Request,
    file: UploadFile = File(...),
    user: User = Depends(require_faculty_or_admin),
    db: Session = Depends(get_db)
):
    """
    Import student directory and academic records via CSV upload.
    Enforces format validation, size limits, schema checks, duplicate detection, and row-level validation.
    """
    # 1. File Type and Extension Validation (Security Requirement 4)
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Only .csv files are permitted."
        )

    # 2. File Size Validation
    content = await file.read()
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds maximum permitted limit (5MB)."
        )

    # 3. Safe Decoding
    try:
        text_content = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        try:
            text_content = content.decode("latin-1")
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not parse file encoding. Please upload UTF-8 encoded CSV."
            )

    reader = csv.DictReader(io.StringIO(text_content))
    if not reader.fieldnames:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CSV file appears empty or has no header.")

    # Check required fields
    cleaned_headers = [h.strip() for h in reader.fieldnames if h]
    for req_field in REQUIRED_CSV_FIELDS:
        if req_field not in cleaned_headers:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Missing required CSV column header: '{req_field}'. Required headers: {', '.join(REQUIRED_CSV_FIELDS)}"
            )

    success_count = 0
    duplicate_count = 0
    error_count = 0
    error_log: List[Dict[str, Any]] = []

    # Cache existing codes & emails to prevent duplicates in batch
    existing_codes = set(code[0] for code in db.query(Student.student_id_code).all())
    existing_emails = set(email[0].lower() for email in db.query(Student.email).all())

    row_index = 1
    new_students = []

    for row in reader:
        row_index += 1
        if row_index > MAX_ROW_COUNT:
            error_log.append({"row": row_index, "error": f"Import halted: exceeded max limit of {MAX_ROW_COUNT} rows."})
            break

        # Strip fields
        clean_row = {k.strip(): (v.strip() if v else "") for k, v in row.items() if k}
        code = clean_row.get("student_id_code", "")
        email = clean_row.get("email", "").lower()
        first_name = clean_row.get("first_name", "")
        last_name = clean_row.get("last_name", "")

        # Row-level validation
        if not code or not first_name or not last_name or not email:
            error_count += 1
            error_log.append({"row": row_index, "error": "Missing mandatory student identifier or name field"})
            continue

        if "@" not in email:
            error_count += 1
            error_log.append({"row": row_index, "error": f"Malformed email address: '{email}'"})
            continue

        # Duplicate detection
        if code in existing_codes or email in existing_emails:
            duplicate_count += 1
            error_log.append({"row": row_index, "error": f"Duplicate student code '{code}' or email '{email}'"})
            continue

        # Build Student & Academic Record
        try:
            semester = int(clean_row.get("semester", 1))
        except ValueError:
            semester = 1

        try:
            adm_year = int(clean_row.get("admission_year", 2024))
        except ValueError:
            adm_year = 2024

        student = Student(
            student_id_code=code,
            first_name=first_name,
            last_name=last_name,
            email=email,
            department=clean_row.get("department", "Engineering"),
            course=clean_row.get("course", "Informatics Engineering"),
            semester=semester,
            admission_year=adm_year,
            current_academic_status=clean_row.get("current_academic_status", "Enrolled")
        )
        db.add(student)
        db.flush()

        # Parse academic numbers if present
        def get_float(k, default=0.0):
            try:
                return float(clean_row.get(k, default))
            except ValueError:
                return default

        def get_int(k, default=0):
            try:
                return int(clean_row.get(k, default))
            except ValueError:
                return default

        record = StudentAcademicRecord(
            student_id=student.id,
            curricular_units_1st_sem_enrolled=get_int("curricular_units_1st_sem_enrolled", 6),
            curricular_units_1st_sem_evaluations=get_int("curricular_units_1st_sem_evaluations", 6),
            curricular_units_1st_sem_approved=get_int("curricular_units_1st_sem_approved", 5),
            curricular_units_1st_sem_grade=get_float("curricular_units_1st_sem_grade", 12.0),
            curricular_units_2nd_sem_enrolled=get_int("curricular_units_2nd_sem_enrolled", 6),
            curricular_units_2nd_sem_evaluations=get_int("curricular_units_2nd_sem_evaluations", 6),
            curricular_units_2nd_sem_approved=get_int("curricular_units_2nd_sem_approved", 5),
            curricular_units_2nd_sem_grade=get_float("curricular_units_2nd_sem_grade", 12.0),
            tuition_fees_up_to_date=get_int("tuition_fees_up_to_date", 1),
            debtor=get_int("debtor", 0),
            scholarship_holder=get_int("scholarship_holder", 0),
            admission_grade=get_float("admission_grade", 125.0)
        )
        db.add(record)

        existing_codes.add(code)
        existing_emails.add(email)
        success_count += 1

    # Record Import Job
    total_processed = success_count + duplicate_count + error_count
    import_job = ImportJob(
        filename=file.filename or "unknown.csv",
        total_rows=total_processed,
        success_rows=success_count,
        error_rows=error_count,
        duplicate_rows=duplicate_count,
        error_log=error_log[:50],  # Store up to 50 errors in log
        imported_by_user_id=user.id
    )
    db.add(import_job)
    db.commit()
    db.refresh(import_job)

    log_audit_event(
        db, "CSV_IMPORT_COMPLETED", request, user=user,
        resource_type="ImportJob", resource_id=import_job.id,
        details={"success": success_count, "duplicates": duplicate_count, "errors": error_count}
    )

    return import_job

@router.get("/history", response_model=List[ImportJobResponse])
def get_import_history(
    user: User = Depends(require_faculty_or_admin),
    db: Session = Depends(get_db)
):
    """Retrieve historical CSV import jobs."""
    return db.query(ImportJob).order_by(ImportJob.created_at.desc()).limit(20).all()
