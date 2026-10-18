from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.entities import Prediction, ModelVersion, User
from app.ml.explainer import ml_service
from app.api.deps import get_current_user

router = APIRouter(prefix="/explainability", tags=["Explainable AI"])

@router.get("/global")
def get_global_explanations(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve global feature importance derived from SHAP values across the UCI dataset.
    Includes model limitations and correlation vs causation guidance.
    """
    # Fetch active model metadata from database or ml_service
    active_mv = db.query(ModelVersion).filter(ModelVersion.is_active == True).order_by(ModelVersion.trained_at.desc()).first()

    global_importance = ml_service.global_importance or []
    if not global_importance and active_mv:
        # Fallback if artifact not in memory
        ml_service.load_model()
        global_importance = ml_service.global_importance or []

    return {
        "model_version": active_mv.version_tag if active_mv else "v1.0.0-rf",
        "algorithm": active_mv.algorithm if active_mv else "RandomForestClassifier",
        "explanation_method": "TreeSHAP (Shapley Additive exPlanations)",
        "global_importance": global_importance[:15],
        "target_classes": [
            {"class": "Dropout", "description": "Student discontinued studies before completing qualification."},
            {"class": "Enrolled", "description": "Student actively continuing studies in normal progression."},
            {"class": "Graduate", "description": "Student successfully completed degree requirements."}
        ],
        "ethical_guidance": {
            "correlation_vs_causation": (
                "Feature contributions indicate statistical correlation within the trained machine learning model, "
                "not deterministic causation. A high positive SHAP value for 'Tuition fees not up to date' indicates "
                "that historically, students in this financial condition experienced higher dropout rates in this dataset; "
                "it does not imply the student cannot succeed or that this factor alone caused departure."
            ),
            "human_in_the_loop": (
                "Predictions and explanations are early-warning guidance to help faculty direct optional academic "
                "and financial counseling. No punitive, restrictive, or automatic institutional action may be taken "
                "based solely on machine-learning outputs."
            ),
            "institutional_generalizability": (
                "Trained on historical higher-education records from Portugal. Variations in academic calendar, "
                "grading scales (0-20), and admissions systems require local validation before institutional deployment."
            )
        }
    }

@router.get("/prediction/{prediction_id}")
def get_prediction_explanation(
    prediction_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve full local SHAP factor breakdown for a specific stored prediction."""
    pred = db.query(Prediction).filter(Prediction.id == prediction_id).first()
    if not pred:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prediction not found.")

    return {
        "prediction_id": pred.id,
        "student_id": pred.student_id,
        "model_version": pred.model_version,
        "risk_category": pred.risk_category,
        "risk_score": pred.risk_score,
        "predicted_class": pred.predicted_class,
        "probability_dropout": pred.probability_dropout,
        "probability_enrolled": pred.probability_enrolled,
        "probability_graduate": pred.probability_graduate,
        "top_factors": pred.top_factors,
        "explanation_summary": pred.explanation_summary,
        "data_quality_warnings": pred.data_quality_warnings,
        "created_at": pred.created_at
    }
