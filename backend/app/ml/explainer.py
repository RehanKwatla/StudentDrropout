import os
import logging
from typing import Dict, Any, List, Tuple
import joblib
import numpy as np
import pandas as pd
import shap
from app.config import settings

logger = logging.getLogger("app.ml.explainer")

class ModelExplainerService:
    def __init__(self):
        self.artifact = None
        self.model = None
        self.scaler = None
        self.classes = None
        self.feature_columns = None
        self.feature_labels = None
        self.global_importance = None
        self.version_tag = None
        self.metrics = None
        self.explainer = None
        self.load_model()

    def load_model(self) -> bool:
        """Load the serialized model artifact from disk."""
        artifact_path = os.path.join(settings.MODEL_ARTIFACTS_DIR, "student_dropout_rf_model.joblib")
        if not os.path.exists(artifact_path):
            candidates = [
                os.path.join(os.path.dirname(os.path.abspath(__file__)), "artifacts", "student_dropout_rf_model.joblib"),
                os.path.join(os.getcwd(), "backend", "app", "ml", "artifacts", "student_dropout_rf_model.joblib"),
                os.path.join(os.getcwd(), "app", "ml", "artifacts", "student_dropout_rf_model.joblib"),
            ]
            for cand in candidates:
                if os.path.exists(cand):
                    artifact_path = cand
                    break

        if not os.path.exists(artifact_path):
            logger.warning("Model artifact not found at %s. Train model first.", artifact_path)
            return False

        try:
            self.artifact = joblib.load(artifact_path)
            self.model = self.artifact['model']
            self.scaler = self.artifact['scaler']
            self.classes = self.artifact['classes']
            self.feature_columns = self.artifact['feature_columns']
            self.feature_labels = self.artifact['feature_labels']
            self.global_importance = self.artifact['global_importance']
            self.version_tag = self.artifact['version_tag']
            self.metrics = self.artifact['metrics']

            # TreeExplainer for fast, exact Shapley values on trees
            self.explainer = shap.TreeExplainer(self.model)
            logger.info("Successfully loaded model %s with classes: %s", self.version_tag, self.classes)
            return True
        except Exception as e:
            logger.error("Failed to load model artifact: %s", e)
            return False

    def predict_and_explain(self, feature_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Run model inference and generate local SHAP explanation for a student's record.
        """
        if not self.model:
            # Try reloading in case it was trained just now
            if not self.load_model():
                raise RuntimeError("Prediction model is not trained or loaded yet.")

        # Build feature vector
        vector = []
        warnings = []
        for col in self.feature_columns:
            val = feature_data.get(col)
            if val is None:
                # Default fallback
                val = 0.0
                warnings.append(f"Missing feature '{col}' defaulted to 0.0")
            try:
                vector.append(float(val))
            except (ValueError, TypeError):
                vector.append(0.0)
                warnings.append(f"Invalid numeric value for '{col}' defaulted to 0.0")

        input_df = pd.DataFrame([vector], columns=self.feature_columns)

        # 1. Model Inference
        probas = self.model.predict_proba(input_df)[0]
        prob_dict = {cls_name: float(p) for cls_name, p in zip(self.classes, probas)}
        
        prob_dropout = prob_dict.get('Dropout', 0.0)
        prob_enrolled = prob_dict.get('Enrolled', 0.0)
        prob_graduate = prob_dict.get('Graduate', 0.0)

        # Predicted outcome class (highest probability)
        predicted_class = max(prob_dict, key=prob_dict.get)

        # Calibrated Risk Category (Human-interpretable decision boundaries)
        if prob_dropout >= 0.50 or predicted_class == 'Dropout':
            risk_category = "High Risk"
        elif prob_dropout >= 0.25:
            risk_category = "Medium Risk"
        else:
            risk_category = "Low Risk"

        # 2. Local SHAP Attribution for 'Dropout' class
        dropout_idx = self.classes.index('Dropout')
        shap_values = self.explainer.shap_values(input_df)

        if isinstance(shap_values, list):
            sample_shap = shap_values[dropout_idx][0]
        elif len(shap_values.shape) == 3:
            sample_shap = shap_values[0, :, dropout_idx]
        else:
            sample_shap = shap_values[0]

        # Combine features with their SHAP impact
        factors = []
        for col, val, shap_val in zip(self.feature_columns, vector, sample_shap):
            label = self.feature_labels.get(col, col.replace('_', ' ').title())
            direction = "increases_risk" if shap_val > 0 else "decreases_risk"
            factors.append({
                "feature": col,
                "label": label,
                "value": round(val, 2),
                "shap_value": round(float(shap_val), 4),
                "impact": round(abs(float(shap_val)), 4),
                "direction": direction
            })

        # Sort by absolute impact
        factors_sorted = sorted(factors, key=lambda x: x["impact"], reverse=True)
        top_factors = factors_sorted[:8]

        # 3. Generate Plain-Language Faculty Explanation
        risk_drivers = [f for f in top_factors if f["direction"] == "increases_risk"][:3]
        protective = [f for f in top_factors if f["direction"] == "decreases_risk"][:3]

        driver_phrases = [f"{d['label']} ({d['value']})" for d in risk_drivers]
        protective_phrases = [f"{p['label']} ({p['value']})" for p in protective]

        summary_parts = []
        if risk_drivers:
            summary_parts.append(f"Primary risk drivers elevating dropout probability: {', '.join(driver_phrases)}.")
        if protective:
            summary_parts.append(f"Protective academic factors supporting retention: {', '.join(protective_phrases)}.")
        if not summary_parts:
            summary_parts.append("Student demonstrates balanced indicators near typical historical enrollment averages.")

        plain_summary = " ".join(summary_parts)

        return {
            "model_version": self.version_tag,
            "predicted_class": predicted_class,
            "risk_category": risk_category,
            "risk_score": round(prob_dropout, 4),
            "probability_dropout": round(prob_dropout, 4),
            "probability_enrolled": round(prob_enrolled, 4),
            "probability_graduate": round(prob_graduate, 4),
            "top_factors": top_factors,
            "all_factors": factors_sorted,
            "explanation_summary": plain_summary,
            "data_quality_warnings": warnings if warnings else None
        }

# Global singleton service instance
ml_service = ModelExplainerService()
