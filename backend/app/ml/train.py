import os
import io
import json
import zipfile
import urllib.request
import logging
from datetime import datetime, timezone
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, f1_score
import shap

from app.config import settings
from app.database import SessionLocal
from app.models.entities import ModelVersion
from app.core.logging import setup_logging

setup_logging()
logger = logging.getLogger("app.ml.train")

ARTIFACTS_DIR = settings.MODEL_ARTIFACTS_DIR
os.makedirs(ARTIFACTS_DIR, exist_ok=True)

# Canonical feature list mapped from UCI dataset
FEATURE_COLUMNS = [
    'marital_status', 'application_mode', 'application_order', 'course_code',
    'daytime_evening_attendance', 'previous_qualification', 'previous_qualification_grade',
    'nacionality', 'mothers_qualification', 'fathers_qualification',
    'mothers_occupation', 'fathers_occupation', 'admission_grade', 'displaced',
    'educational_special_needs', 'debtor', 'tuition_fees_up_to_date', 'gender',
    'scholarship_holder', 'age_at_enrollment', 'international',
    'curricular_units_1st_sem_credited', 'curricular_units_1st_sem_enrolled',
    'curricular_units_1st_sem_evaluations', 'curricular_units_1st_sem_approved',
    'curricular_units_1st_sem_grade', 'curricular_units_1st_sem_without_evaluations',
    'curricular_units_2nd_sem_credited', 'curricular_units_2nd_sem_enrolled',
    'curricular_units_2nd_sem_evaluations', 'curricular_units_2nd_sem_approved',
    'curricular_units_2nd_sem_grade', 'curricular_units_2nd_sem_without_evaluations',
    'unemployment_rate', 'inflation_rate', 'gdp'
]

FEATURE_LABELS = {
    'curricular_units_1st_sem_approved': '1st Sem Approved Units',
    'curricular_units_2nd_sem_approved': '2nd Sem Approved Units',
    'curricular_units_1st_sem_grade': '1st Sem Grade Average',
    'curricular_units_2nd_sem_grade': '2nd Sem Grade Average',
    'tuition_fees_up_to_date': 'Tuition Fees Paid Up-to-Date',
    'curricular_units_1st_sem_evaluations': '1st Sem Evaluations Attended',
    'curricular_units_2nd_sem_evaluations': '2nd Sem Evaluations Attended',
    'debtor': 'Outstanding Student Debt',
    'scholarship_holder': 'Scholarship Holder',
    'admission_grade': 'Admission Grade',
    'age_at_enrollment': 'Age at Enrollment',
    'course_code': 'Degree Course Code',
    'previous_qualification_grade': 'Previous Qualification Grade',
    'gender': 'Gender (0: Female, 1: Male)',
    'application_mode': 'Application Pathway',
    'unemployment_rate': 'Regional Unemployment Rate',
    'gdp': 'GDP Growth Metric',
    'inflation_rate': 'Inflation Rate'
}

def download_uci_dataset() -> pd.DataFrame:
    """Download and unpack the UCI Student Dropout and Academic Success dataset."""
    logger.info("Fetching UCI dataset from: %s", settings.UCI_DATASET_URL)
    req = urllib.request.Request(settings.UCI_DATASET_URL, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=30) as resp:
        zf = zipfile.ZipFile(io.BytesIO(resp.read()))
        with zf.open('data.csv') as f:
            df = pd.read_csv(f, sep=';')
    
    # Strip whitespace/tabs in column names
    df.columns = [c.strip() for c in df.columns]
    logger.info("Successfully loaded raw dataset. Shape: %s", df.shape)
    return df

def preprocess_dataset(df: pd.DataFrame):
    """Normalize column names and map to standardized features."""
    col_mapping = {
        'Marital status': 'marital_status',
        'Application mode': 'application_mode',
        'Application order': 'application_order',
        'Course': 'course_code',
        'Daytime/evening attendance': 'daytime_evening_attendance',
        'Previous qualification': 'previous_qualification',
        'Previous qualification (grade)': 'previous_qualification_grade',
        'Nacionality': 'nacionality',
        "Mother's qualification": 'mothers_qualification',
        "Father's qualification": 'fathers_qualification',
        "Mother's occupation": 'mothers_occupation',
        "Father's occupation": 'fathers_occupation',
        'Admission grade': 'admission_grade',
        'Displaced': 'displaced',
        'Educational special needs': 'educational_special_needs',
        'Debtor': 'debtor',
        'Tuition fees up to date': 'tuition_fees_up_to_date',
        'Gender': 'gender',
        'Scholarship holder': 'scholarship_holder',
        'Age at enrollment': 'age_at_enrollment',
        'International': 'international',
        'Curricular units 1st sem (credited)': 'curricular_units_1st_sem_credited',
        'Curricular units 1st sem (enrolled)': 'curricular_units_1st_sem_enrolled',
        'Curricular units 1st sem (evaluations)': 'curricular_units_1st_sem_evaluations',
        'Curricular units 1st sem (approved)': 'curricular_units_1st_sem_approved',
        'Curricular units 1st sem (grade)': 'curricular_units_1st_sem_grade',
        'Curricular units 1st sem (without evaluations)': 'curricular_units_1st_sem_without_evaluations',
        'Curricular units 2nd sem (credited)': 'curricular_units_2nd_sem_credited',
        'Curricular units 2nd sem (enrolled)': 'curricular_units_2nd_sem_enrolled',
        'Curricular units 2nd sem (evaluations)': 'curricular_units_2nd_sem_evaluations',
        'Curricular units 2nd sem (approved)': 'curricular_units_2nd_sem_approved',
        'Curricular units 2nd sem (grade)': 'curricular_units_2nd_sem_grade',
        'Curricular units 2nd sem (without evaluations)': 'curricular_units_2nd_sem_without_evaluations',
        'Unemployment rate': 'unemployment_rate',
        'Inflation rate': 'inflation_rate',
        'GDP': 'gdp',
        'Target': 'target'
    }

    df_renamed = df.rename(columns=col_mapping)
    X = df_renamed[FEATURE_COLUMNS].copy()
    y = df_renamed['target'].copy()

    # Fill any null values safely
    X = X.fillna(X.median())
    return X, y

def train_and_evaluate_models():
    """Train Baseline Logistic Regression & Random Forest, evaluate, and save SHAP explainer."""
    df_raw = download_uci_dataset()
    X, y = preprocess_dataset(df_raw)

    classes = ['Dropout', 'Enrolled', 'Graduate']
    logger.info("Class distribution:\n%s", y.value_counts())

    # Stratified 80/20 Train/Test Split (ensures representative target distribution)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    # Preprocessing: StandardScaler fitted ONLY on training set to prevent data leakage
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # 1. Baseline Model: Multiclass Logistic Regression
    logger.info("Training Logistic Regression baseline...")
    lr_model = LogisticRegression(max_iter=1000, class_weight='balanced', random_state=42)
    lr_model.fit(X_train_scaled, y_train)
    y_pred_lr = lr_model.predict(X_test_scaled)
    lr_acc = float(accuracy_score(y_test, y_pred_lr))
    lr_f1 = float(f1_score(y_test, y_pred_lr, average='weighted'))
    logger.info("Baseline Logistic Regression — Accuracy: %.4f, Weighted F1: %.4f", lr_acc, lr_f1)

    # 2. Candidate Model: Random Forest Classifier
    logger.info("Training Random Forest candidate model...")
    rf_model = RandomForestClassifier(
        n_estimators=150,
        max_depth=12,
        min_samples_split=4,
        min_samples_leaf=2,
        class_weight='balanced',
        random_state=42,
        n_jobs=-1
    )
    rf_model.fit(X_train, y_train)  # Trees can operate directly on unscaled X_train
    y_pred_rf = rf_model.predict(X_test)
    y_pred_proba_rf = rf_model.predict_proba(X_test)

    rf_acc = float(accuracy_score(y_test, y_pred_rf))
    rf_f1_weighted = float(f1_score(y_test, y_pred_rf, average='weighted'))
    rf_f1_macro = float(f1_score(y_test, y_pred_rf, average='macro'))

    report_dict = classification_report(y_test, y_pred_rf, target_names=rf_model.classes_, output_dict=True)
    rf_f1_dropout = float(report_dict.get('Dropout', {}).get('f1-score', 0.0))
    conf_mat = confusion_matrix(y_test, y_pred_rf, labels=rf_model.classes_).tolist()

    logger.info("Random Forest — Accuracy: %.4f, Macro F1: %.4f, Dropout F1: %.4f", rf_acc, rf_f1_macro, rf_f1_dropout)

    # 3. Fit SHAP TreeExplainer on Random Forest
    logger.info("Computing SHAP TreeExplainer and global importance...")
    explainer = shap.TreeExplainer(rf_model)
    # Compute SHAP values on a sample of test data to get global feature importance
    shap_sample = X_test.iloc[:200]
    shap_values = explainer.shap_values(shap_sample)

    # Dropout class index
    dropout_idx = list(rf_model.classes_).index('Dropout')
    
    # Global feature importance: mean absolute SHAP value for Dropout class
    if isinstance(shap_values, list):
        # shap returns list of arrays [n_samples, n_features] for each class
        mean_abs_shap = np.mean(np.abs(shap_values[dropout_idx]), axis=0)
    elif len(shap_values.shape) == 3:
        mean_abs_shap = np.mean(np.abs(shap_values[:, :, dropout_idx]), axis=0)
    else:
        mean_abs_shap = np.mean(np.abs(shap_values), axis=0)

    importance_df = pd.DataFrame({
        'feature': FEATURE_COLUMNS,
        'label': [FEATURE_LABELS.get(f, f.replace('_', ' ').title()) for f in FEATURE_COLUMNS],
        'importance': mean_abs_shap.tolist()
    }).sort_values(by='importance', ascending=False)

    global_importance_list = importance_df.to_dict(orient='records')

    # 4. Save Artifacts to Disk
    version_tag = "v1.0.0-rf"
    model_artifact = {
        'model': rf_model,
        'scaler': scaler,
        'classes': list(rf_model.classes_),
        'feature_columns': FEATURE_COLUMNS,
        'feature_labels': FEATURE_LABELS,
        'global_importance': global_importance_list,
        'version_tag': version_tag,
        'metrics': {
            'accuracy': rf_acc,
            'f1_weighted': rf_f1_weighted,
            'f1_macro': rf_f1_macro,
            'f1_dropout': rf_f1_dropout,
            'confusion_matrix': conf_mat,
            'classification_report': report_dict
        }
    }

    artifact_path = os.path.join(ARTIFACTS_DIR, "student_dropout_rf_model.joblib")
    joblib.dump(model_artifact, artifact_path)
    logger.info("Model artifact successfully saved to %s", artifact_path)

    # 5. Persist Model Version into Database
    try:
        db = SessionLocal()
        existing = db.query(ModelVersion).filter(ModelVersion.version_tag == version_tag).first()
        if not existing:
            mv = ModelVersion(
                version_tag=version_tag,
                algorithm="RandomForestClassifier (150 trees, max_depth=12, balanced)",
                trained_at=datetime.now(timezone.utc),
                dataset_name="UCI Predict Students Dropout and Academic Success (Portuguese Higher Education)",
                test_accuracy=rf_acc,
                test_f1_weighted=rf_f1_weighted,
                test_f1_macro=rf_f1_macro,
                test_f1_dropout=rf_f1_dropout,
                feature_count=len(FEATURE_COLUMNS),
                training_samples=len(X_train),
                test_samples=len(X_test),
                confusion_matrix={"labels": list(rf_model.classes_), "matrix": conf_mat},
                class_metrics=report_dict,
                is_active=True,
                limitations_notes=(
                    "Trained on historical data from a Portuguese higher-education institution. "
                    "Academic metrics reflect two semesters. Feature distributions and course grading systems "
                    "may not generalize directly to different institutions without retraining and calibration."
                )
            )
            db.add(mv)
            db.commit()
            logger.info("Model version %s successfully persisted in database.", version_tag)
        db.close()
    except Exception as e:
        logger.warning("Could not persist ModelVersion into database: %s", e)

    return model_artifact

if __name__ == "__main__":
    train_and_evaluate_models()
