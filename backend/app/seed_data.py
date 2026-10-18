import os
import sys
import logging
from datetime import datetime, timezone, timedelta
from app.config import settings
from app.database import SessionLocal, engine, Base
from app.models.entities import (
    User, Student, StudentAcademicRecord, Prediction,
    Intervention, FacultyNote, ModelVersion
)
from app.core.security import hash_password
from app.ml.explainer import ml_service
from app.core.logging import setup_logging

setup_logging()
logger = logging.getLogger("app.seed")

DEMO_USERS = [
    {
        "email": os.environ.get("ADMIN_EMAIL", "admin@university.edu"),
        "password": os.environ.get("ADMIN_PASSWORD", "AdminPass123!Secure"),
        "full_name": "Dr. Eleanor Vance (Dean / Admin)",
        "role": "Administrator"
    },
    {
        "email": "faculty.smith@university.edu",
        "password": "FacultyPass123!Secure",
        "full_name": "Prof. Marcus Smith (Academic Advisor)",
        "role": "Faculty"
    },
    {
        "email": "reviewer@university.edu",
        "password": "ReviewerPass123!Secure",
        "full_name": "Sarah Jenkins (Auditor / Reviewer)",
        "role": "ReadOnlyReviewer"
    }
]

DEMO_STUDENTS = [
    {
        "code": "STU-2024-001",
        "first_name": "Alex",
        "last_name": "Rivera",
        "email": "alex.rivera@demo.edu",
        "department": "Engineering",
        "course": "Informatics Engineering",
        "semester": 2,
        "admission_year": 2024,
        "status": "At-Risk",
        "academic": {
            "curricular_units_1st_sem_enrolled": 6,
            "curricular_units_1st_sem_evaluations": 6,
            "curricular_units_1st_sem_approved": 1,
            "curricular_units_1st_sem_grade": 9.2,
            "curricular_units_2nd_sem_enrolled": 6,
            "curricular_units_2nd_sem_evaluations": 4,
            "curricular_units_2nd_sem_approved": 0,
            "curricular_units_2nd_sem_grade": 0.0,
            "tuition_fees_up_to_date": 0,
            "debtor": 1,
            "scholarship_holder": 0,
            "age_at_enrollment": 24,
            "admission_grade": 110.0
        }
    },
    {
        "code": "STU-2024-002",
        "first_name": "Jordan",
        "last_name": "Taylor",
        "email": "jordan.taylor@demo.edu",
        "department": "Engineering",
        "course": "Electronics Engineering",
        "semester": 2,
        "admission_year": 2024,
        "status": "Enrolled",
        "academic": {
            "curricular_units_1st_sem_enrolled": 6,
            "curricular_units_1st_sem_evaluations": 6,
            "curricular_units_1st_sem_approved": 3,
            "curricular_units_1st_sem_grade": 11.5,
            "curricular_units_2nd_sem_enrolled": 6,
            "curricular_units_2nd_sem_evaluations": 5,
            "curricular_units_2nd_sem_approved": 3,
            "curricular_units_2nd_sem_grade": 11.0,
            "tuition_fees_up_to_date": 1,
            "debtor": 0,
            "scholarship_holder": 0,
            "age_at_enrollment": 19,
            "admission_grade": 128.0
        }
    },
    {
        "code": "STU-2024-003",
        "first_name": "Taylor",
        "last_name": "Morgan",
        "email": "taylor.morgan@demo.edu",
        "department": "Computer Science",
        "course": "Software Engineering",
        "semester": 2,
        "admission_year": 2024,
        "status": "Enrolled",
        "academic": {
            "curricular_units_1st_sem_enrolled": 6,
            "curricular_units_1st_sem_evaluations": 6,
            "curricular_units_1st_sem_approved": 6,
            "curricular_units_1st_sem_grade": 16.5,
            "curricular_units_2nd_sem_enrolled": 6,
            "curricular_units_2nd_sem_evaluations": 6,
            "curricular_units_2nd_sem_approved": 6,
            "curricular_units_2nd_sem_grade": 16.8,
            "tuition_fees_up_to_date": 1,
            "debtor": 0,
            "scholarship_holder": 1,
            "age_at_enrollment": 18,
            "admission_grade": 154.0
        }
    },
    {
        "code": "STU-2024-004",
        "first_name": "Liam",
        "last_name": "Chen",
        "email": "liam.chen@demo.edu",
        "department": "Business & Management",
        "course": "Management Studies",
        "semester": 1,
        "admission_year": 2024,
        "status": "Enrolled",
        "academic": {
            "curricular_units_1st_sem_enrolled": 5,
            "curricular_units_1st_sem_evaluations": 5,
            "curricular_units_1st_sem_approved": 4,
            "curricular_units_1st_sem_grade": 13.8,
            "curricular_units_2nd_sem_enrolled": 5,
            "curricular_units_2nd_sem_evaluations": 5,
            "curricular_units_2nd_sem_approved": 4,
            "curricular_units_2nd_sem_grade": 13.2,
            "tuition_fees_up_to_date": 1,
            "debtor": 0,
            "scholarship_holder": 0,
            "age_at_enrollment": 20,
            "admission_grade": 135.0
        }
    },
    {
        "code": "STU-2024-005",
        "first_name": "Sophia",
        "last_name": "Santos",
        "email": "sophia.santos@demo.edu",
        "department": "Sciences",
        "course": "Biotechnology",
        "semester": 2,
        "admission_year": 2024,
        "status": "At-Risk",
        "academic": {
            "curricular_units_1st_sem_enrolled": 6,
            "curricular_units_1st_sem_evaluations": 4,
            "curricular_units_1st_sem_approved": 2,
            "curricular_units_1st_sem_grade": 10.0,
            "curricular_units_2nd_sem_enrolled": 6,
            "curricular_units_2nd_sem_evaluations": 2,
            "curricular_units_2nd_sem_approved": 0,
            "curricular_units_2nd_sem_grade": 0.0,
            "tuition_fees_up_to_date": 0,
            "debtor": 1,
            "scholarship_holder": 0,
            "age_at_enrollment": 26,
            "admission_grade": 115.0
        }
    }
]

def seed_demo_data(reset: bool = False):
    """Seed synthetic demo users, students, academic records, predictions, and interventions."""
    db = SessionLocal()
    try:
        if reset:
            logger.info("Resetting synthetic demo data...")
            # Delete in cascade order
            db.query(Prediction).delete()
            db.query(Intervention).delete()
            db.query(FacultyNote).delete()
            db.query(StudentAcademicRecord).delete()
            db.query(Student).delete()
            db.commit()

        # 1. Seed Users
        user_objs = {}
        for u in DEMO_USERS:
            existing = db.query(User).filter(User.email == u["email"]).first()
            if not existing:
                new_user = User(
                    email=u["email"],
                    hashed_password=hash_password(u["password"]),
                    full_name=u["full_name"],
                    role=u["role"],
                    is_active=True
                )
                db.add(new_user)
                db.flush()
                user_objs[u["role"]] = new_user
                logger.info("Created demo user: %s (%s)", u["email"], u["role"])
            else:
                user_objs[u["role"]] = existing

        admin_user = user_objs.get("Administrator")
        faculty_user = user_objs.get("Faculty")

        # 2. Seed Students & Run Real ML Inference
        for s_data in DEMO_STUDENTS:
            existing_s = db.query(Student).filter(Student.student_id_code == s_data["code"]).first()
            if not existing_s:
                student = Student(
                    student_id_code=s_data["code"],
                    first_name=s_data["first_name"],
                    last_name=s_data["last_name"],
                    email=s_data["email"],
                    department=s_data["department"],
                    course=s_data["course"],
                    semester=s_data["semester"],
                    admission_year=s_data["admission_year"],
                    current_academic_status=s_data["status"]
                )
                db.add(student)
                db.flush()

                # Academic record
                ac = s_data["academic"]
                record = StudentAcademicRecord(
                    student_id=student.id,
                    curricular_units_1st_sem_enrolled=ac.get("curricular_units_1st_sem_enrolled", 6),
                    curricular_units_1st_sem_evaluations=ac.get("curricular_units_1st_sem_evaluations", 6),
                    curricular_units_1st_sem_approved=ac.get("curricular_units_1st_sem_approved", 5),
                    curricular_units_1st_sem_grade=ac.get("curricular_units_1st_sem_grade", 12.0),
                    curricular_units_2nd_sem_enrolled=ac.get("curricular_units_2nd_sem_enrolled", 6),
                    curricular_units_2nd_sem_evaluations=ac.get("curricular_units_2nd_sem_evaluations", 6),
                    curricular_units_2nd_sem_approved=ac.get("curricular_units_2nd_sem_approved", 5),
                    curricular_units_2nd_sem_grade=ac.get("curricular_units_2nd_sem_grade", 12.0),
                    tuition_fees_up_to_date=ac.get("tuition_fees_up_to_date", 1),
                    debtor=ac.get("debtor", 0),
                    scholarship_holder=ac.get("scholarship_holder", 0),
                    age_at_enrollment=ac.get("age_at_enrollment", 20),
                    admission_grade=ac.get("admission_grade", 120.0)
                )
                db.add(record)
                db.flush()

                # 3. Generate Real ML Prediction using Trained Model
                if ml_service.model:
                    try:
                        feature_dict = {
                            'marital_status': 1, 'application_mode': 1, 'application_order': 1,
                            'course_code': 33, 'daytime_evening_attendance': 1,
                            'previous_qualification': 1, 'previous_qualification_grade': 120.0,
                            'nacionality': 1, 'mothers_qualification': 1, 'fathers_qualification': 1,
                            'mothers_occupation': 1, 'fathers_occupation': 1,
                            'admission_grade': record.admission_grade, 'displaced': 0,
                            'educational_special_needs': 0, 'debtor': record.debtor,
                            'tuition_fees_up_to_date': record.tuition_fees_up_to_date, 'gender': 1,
                            'scholarship_holder': record.scholarship_holder,
                            'age_at_enrollment': record.age_at_enrollment, 'international': 0,
                            'curricular_units_1st_sem_credited': 0,
                            'curricular_units_1st_sem_enrolled': record.curricular_units_1st_sem_enrolled,
                            'curricular_units_1st_sem_evaluations': record.curricular_units_1st_sem_evaluations,
                            'curricular_units_1st_sem_approved': record.curricular_units_1st_sem_approved,
                            'curricular_units_1st_sem_grade': record.curricular_units_1st_sem_grade,
                            'curricular_units_1st_sem_without_evaluations': 0,
                            'curricular_units_2nd_sem_credited': 0,
                            'curricular_units_2nd_sem_enrolled': record.curricular_units_2nd_sem_enrolled,
                            'curricular_units_2nd_sem_evaluations': record.curricular_units_2nd_sem_evaluations,
                            'curricular_units_2nd_sem_approved': record.curricular_units_2nd_sem_approved,
                            'curricular_units_2nd_sem_grade': record.curricular_units_2nd_sem_grade,
                            'curricular_units_2nd_sem_without_evaluations': 0,
                            'unemployment_rate': 10.8, 'inflation_rate': 1.4, 'gdp': 1.74
                        }
                        pred_res = ml_service.predict_and_explain(feature_dict)
                        pred = Prediction(
                            student_id=student.id,
                            model_version=pred_res["model_version"],
                            risk_category=pred_res["risk_category"],
                            risk_score=pred_res["risk_score"],
                            probability_dropout=pred_res["probability_dropout"],
                            probability_enrolled=pred_res["probability_enrolled"],
                            probability_graduate=pred_res["probability_graduate"],
                            predicted_class=pred_res["predicted_class"],
                            top_factors=pred_res["top_factors"],
                            explanation_summary=pred_res["explanation_summary"],
                            generated_by_user_id=faculty_user.id if faculty_user else None
                        )
                        db.add(pred)

                        # If High Risk, add sample intervention and note
                        if pred_res["risk_category"] == "High Risk":
                            interv = Intervention(
                                student_id=student.id,
                                title="Financial & Academic Tutoring Advising Outreach",
                                category="Academic Tutoring",
                                priority="Urgent",
                                status="In Progress",
                                assigned_to_user_id=faculty_user.id if faculty_user else None,
                                due_date=datetime.now(timezone.utc) + timedelta(days=7),
                                notes="Contacted student regarding fee payment deadline and arranged remedial math tutoring.",
                                created_by_user_id=faculty_user.id if faculty_user else admin_user.id
                            )
                            db.add(interv)

                            note = FacultyNote(
                                student_id=student.id,
                                author_user_id=faculty_user.id if faculty_user else admin_user.id,
                                content="Student indicated part-time work obligations impacted 2nd semester attendance. Discussing schedule options.",
                                is_confidential=False
                            )
                            db.add(note)

                    except Exception as e:
                        logger.warning("Could not run prediction for %s: %s", student.student_id_code, e)

                logger.info("Created synthetic demo student: %s (%s)", student.student_id_code, s_data["first_name"])

        db.commit()
        logger.info("Demo data seeding completed successfully.")
    finally:
        db.close()

seed_database = seed_demo_data

if __name__ == "__main__":
    reset_flag = "--reset" in sys.argv
    seed_demo_data(reset=reset_flag)
