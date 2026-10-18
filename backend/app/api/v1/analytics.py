from collections import defaultdict
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database import get_db
from app.models.entities import Student, Prediction, Intervention, ModelVersion, User
from app.api.deps import get_current_user

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/overview")
def get_analytics_overview(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Compute real aggregated dashboard metrics and risk distributions derived directly from the database.
    """
    total_students = db.query(Student).count()
    total_predictions = db.query(Prediction).count()
    pending_interventions = db.query(Intervention).filter(
        Intervention.status.in_(["Pending", "In Progress"])
    ).count()

    # Get latest prediction for each student
    students = db.query(Student).all()
    risk_counts = {"High Risk": 0, "Medium Risk": 0, "Low Risk": 0, "Unassessed": 0}
    
    for s in students:
        latest = db.query(Prediction).filter(Prediction.student_id == s.id).order_by(desc(Prediction.created_at)).first()
        if latest:
            category = latest.risk_category
            if category in risk_counts:
                risk_counts[category] += 1
            else:
                risk_counts["Medium Risk"] += 1
        else:
            risk_counts["Unassessed"] += 1

    # Donut chart distribution
    distribution_donut = [
        {"name": "High Risk", "value": risk_counts["High Risk"], "color": "#EF4444"},
        {"name": "Medium Risk", "value": risk_counts["Medium Risk"], "color": "#F59E0B"},
        {"name": "Low Risk", "value": risk_counts["Low Risk"], "color": "#10B981"},
        {"name": "Unassessed", "value": risk_counts["Unassessed"], "color": "#6B7280"}
    ]

    return {
        "total_students": total_students,
        "high_risk_count": risk_counts["High Risk"],
        "medium_risk_count": risk_counts["Medium Risk"],
        "low_risk_count": risk_counts["Low Risk"],
        "unassessed_count": risk_counts["Unassessed"],
        "pending_follow_ups": pending_interventions,
        "total_predictions": total_predictions,
        "risk_distribution": distribution_donut
    }

@router.get("/by-department")
def get_department_analytics(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Aggregate risk counts grouped by academic department."""
    students = db.query(Student).all()
    dept_map = defaultdict(lambda: {"High Risk": 0, "Medium Risk": 0, "Low Risk": 0, "Total": 0})

    for s in students:
        dept = s.department or "General"
        dept_map[dept]["Total"] += 1
        latest = db.query(Prediction).filter(Prediction.student_id == s.id).order_by(desc(Prediction.created_at)).first()
        if latest:
            dept_map[dept][latest.risk_category] += 1
        else:
            dept_map[dept]["Low Risk"] += 1

    chart_data = []
    for dept, counts in dept_map.items():
        chart_data.append({
            "department": dept,
            "high_risk": counts["High Risk"],
            "medium_risk": counts["Medium Risk"],
            "low_risk": counts["Low Risk"],
            "total": counts["Total"]
        })

    return chart_data

@router.get("/model-performance")
def get_model_performance(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve held-out test evaluation metrics and confusion matrix from stored active model."""
    mv = db.query(ModelVersion).filter(ModelVersion.is_active == True).order_by(desc(ModelVersion.trained_at)).first()
    if not mv:
        return {
            "status": "Not evaluated",
            "message": "No active model evaluation run found. Train model to generate metrics."
        }

    return {
        "version_tag": mv.version_tag,
        "algorithm": mv.algorithm,
        "trained_at": mv.trained_at,
        "dataset_name": mv.dataset_name,
        "test_accuracy": mv.test_accuracy,
        "test_f1_weighted": mv.test_f1_weighted,
        "test_f1_macro": mv.test_f1_macro,
        "test_f1_dropout": mv.test_f1_dropout,
        "training_samples": mv.training_samples,
        "test_samples": mv.test_samples,
        "confusion_matrix": mv.confusion_matrix,
        "class_metrics": mv.class_metrics,
        "limitations_notes": mv.limitations_notes
    }
