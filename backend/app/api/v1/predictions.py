from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.config import settings
from app.database import get_db
from app.models.entities import Student, StudentAcademicRecord, Prediction, User
from app.schemas.schemas import PredictRequest, PredictionResponse
from app.ml.explainer import ml_service
from app.core.security import enforce_rate_limit
from app.api.deps import (
    get_current_user, require_faculty_or_admin, log_audit_event
)

router = APIRouter(prefix="/predictions", tags=["Predictions"])

@router.post("/predict", response_model=PredictionResponse)
def generate_prediction(
    payload: PredictRequest,
    request: Request,
    user: User = Depends(require_faculty_or_admin),
    db: Session = Depends(get_db)
):
    """
    Generate ML prediction and local SHAP explainability breakdown.
    Persists prediction to database when student_id is provided.
    """
    enforce_rate_limit(request, key_prefix="predict", limit_per_minute=settings.RATE_LIMIT_PREDICTION_PER_MINUTE)

    feature_dict: Dict[str, Any] = {}
    student = None

    if payload.student_id:
        student = db.query(Student).filter(Student.id == payload.student_id).first()
        if not student:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")

        record = db.query(StudentAcademicRecord).filter(StudentAcademicRecord.student_id == student.id).first()
        if record:
            # Extract features from academic record
            feature_dict = {
                'marital_status': record.marital_status,
                'application_mode': record.application_mode,
                'application_order': record.application_order,
                'course_code': record.course_code,
                'daytime_evening_attendance': record.daytime_evening_attendance,
                'previous_qualification': record.previous_qualification,
                'previous_qualification_grade': record.previous_qualification_grade,
                'nacionality': record.nacionality,
                'mothers_qualification': record.mothers_qualification,
                'fathers_qualification': record.fathers_qualification,
                'mothers_occupation': record.mothers_occupation,
                'fathers_occupation': record.fathers_occupation,
                'admission_grade': record.admission_grade,
                'displaced': record.displaced,
                'educational_special_needs': record.educational_special_needs,
                'debtor': record.debtor,
                'tuition_fees_up_to_date': record.tuition_fees_up_to_date,
                'gender': record.gender,
                'scholarship_holder': record.scholarship_holder,
                'age_at_enrollment': record.age_at_enrollment,
                'international': record.international,
                'curricular_units_1st_sem_credited': record.curricular_units_1st_sem_credited,
                'curricular_units_1st_sem_enrolled': record.curricular_units_1st_sem_enrolled,
                'curricular_units_1st_sem_evaluations': record.curricular_units_1st_sem_evaluations,
                'curricular_units_1st_sem_approved': record.curricular_units_1st_sem_approved,
                'curricular_units_1st_sem_grade': record.curricular_units_1st_sem_grade,
                'curricular_units_1st_sem_without_evaluations': record.curricular_units_1st_sem_without_evaluations,
                'curricular_units_2nd_sem_credited': record.curricular_units_2nd_sem_credited,
                'curricular_units_2nd_sem_enrolled': record.curricular_units_2nd_sem_enrolled,
                'curricular_units_2nd_sem_evaluations': record.curricular_units_2nd_sem_evaluations,
                'curricular_units_2nd_sem_approved': record.curricular_units_2nd_sem_approved,
                'curricular_units_2nd_sem_grade': record.curricular_units_2nd_sem_grade,
                'curricular_units_2nd_sem_without_evaluations': record.curricular_units_2nd_sem_without_evaluations,
                'unemployment_rate': record.unemployment_rate,
                'inflation_rate': record.inflation_rate,
                'gdp': record.gdp
            }

    # Override/supplement with any manual features provided in request
    if payload.features:
        feature_dict.update(payload.features)

    # Execute ML Inference & SHAP explanation
    try:
        result = ml_service.predict_and_explain(feature_dict)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction error: {str(e)}"
        )

    # Persist prediction in database if student exists
    saved_pred_id = None
    created_at = None
    if student:
        pred_record = Prediction(
            student_id=student.id,
            model_version=result["model_version"],
            risk_category=result["risk_category"],
            risk_score=result["risk_score"],
            probability_dropout=result["probability_dropout"],
            probability_enrolled=result["probability_enrolled"],
            probability_graduate=result["probability_graduate"],
            predicted_class=result["predicted_class"],
            top_factors=result["top_factors"],
            explanation_summary=result["explanation_summary"],
            data_quality_warnings=result["data_quality_warnings"],
            generated_by_user_id=user.id
        )
        db.add(pred_record)
        db.commit()
        db.refresh(pred_record)
        saved_pred_id = pred_record.id
        created_at = pred_record.created_at

        log_audit_event(
            db, "PREDICTION_GENERATED", request, user=user,
            resource_type="Student", resource_id=student.id,
            details={"risk_category": result["risk_category"], "risk_score": result["risk_score"]}
        )

    return {
        "id": saved_pred_id,
        "student_id": student.id if student else None,
        "model_version": result["model_version"],
        "predicted_class": result["predicted_class"],
        "risk_category": result["risk_category"],
        "risk_score": result["risk_score"],
        "probability_dropout": result["probability_dropout"],
        "probability_enrolled": result["probability_enrolled"],
        "probability_graduate": result["probability_graduate"],
        "top_factors": result["top_factors"],
        "explanation_summary": result["explanation_summary"],
        "data_quality_warnings": result["data_quality_warnings"],
        "created_at": created_at
    }

@router.get("/history/{student_id}")
def get_prediction_history(
    student_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve historical prediction trend for a specific student."""
    predictions = db.query(Prediction).filter(
        Prediction.student_id == student_id
    ).order_by(desc(Prediction.created_at)).all()
    return predictions

@router.get("/latest")
def get_latest_predictions(
    limit: int = 10,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve recent predictions across the institution."""
    predictions = db.query(Prediction).order_by(desc(Prediction.created_at)).limit(limit).all()
    results = []
    for p in predictions:
        student = db.query(Student).filter(Student.id == p.student_id).first()
        results.append({
            "id": p.id,
            "student_id": p.student_id,
            "student_code": student.student_id_code if student else "N/A",
            "student_name": f"{student.first_name} {student.last_name}" if student else "Unknown",
            "risk_category": p.risk_category,
            "risk_score": p.risk_score,
            "predicted_class": p.predicted_class,
            "created_at": p.created_at
        })
    return results
