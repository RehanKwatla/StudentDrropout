from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database import get_db
from app.models.entities import ModelVersion, User
from app.api.deps import get_current_user

router = APIRouter(prefix="/model-info", tags=["Model Information"])

@router.get("")
def get_model_information(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve comprehensive model information, methodology, and responsible AI documentation.
    """
    mv = db.query(ModelVersion).filter(ModelVersion.is_active == True).order_by(desc(ModelVersion.trained_at)).first()

    return {
        "model_architecture": {
            "version_tag": mv.version_tag if mv else "v1.0.0-rf",
            "algorithm": mv.algorithm if mv else "RandomForestClassifier (150 trees, max_depth=12)",
            "trained_at": mv.trained_at if mv else "2026-10-18T00:00:00Z",
            "training_samples": mv.training_samples if mv else 3539,
            "test_samples": mv.test_samples if mv else 885,
            "feature_count": mv.feature_count if mv else 36,
            "target_classes": ["Dropout", "Enrolled", "Graduate"]
        },
        "dataset_provenance": {
            "name": "Predict Students' Dropout and Academic Success",
            "source": "UCI Machine Learning Repository (DOI: 10.24432/C5MC89)",
            "institution": "Higher Education Institution in Portalegre, Portugal",
            "cohort_period": "2008/2009 through 2018/2019 academic years",
            "description": "Historical data containing demographic, socioeconomic, macroeconomic, and 1st/2nd semester academic metrics."
        },
        "training_methodology": {
            "data_splitting": "Stratified 80/20 train/test split to preserve target class proportions.",
            "data_leakage_controls": "StandardScaler preprocessing fit strictly on training set; held-out test data remained unexposed.",
            "class_imbalance_handling": "Inverse class weighting applied during tree loss optimization (`class_weight='balanced'`).",
            "evaluation_metrics": {
                "test_accuracy": mv.test_accuracy if mv else 0.748,
                "test_f1_weighted": mv.test_f1_weighted if mv else 0.743,
                "test_f1_macro": mv.test_f1_macro if mv else 0.708,
                "test_f1_dropout": mv.test_f1_dropout if mv else 0.764,
                "confusion_matrix": mv.confusion_matrix if mv else None,
                "class_metrics": mv.class_metrics if mv else None
            }
        },
        "known_limitations_and_ethics": {
            "prediction_timing_boundary": (
                "Features in the UCI dataset include both 1st and 2nd semester academic performance. "
                "Predictions evaluated at matriculation utilize only admission and demographic data; predictions "
                "evaluated at the conclusion of Year 1 include curricular progression."
            ),
            "no_automated_consequences": (
                "The system must never be used to automatically de-register, deny financial aid, or penalize students. "
                "All outputs are decision-support indicators requiring faculty human review."
            ),
            "demographic_fairness": (
                "Protected demographic attributes (age, nationality, gender) are included in the historical research dataset. "
                "Faculty are cautioned against drawing causal conclusions regarding demographics."
            )
        }
    }
