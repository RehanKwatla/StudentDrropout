export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'Administrator' | 'Faculty' | 'ReadOnlyReviewer';
  is_active: boolean;
  mfa_enabled: boolean;
  created_at: string;
}

export interface FactorDetail {
  feature: string;
  label: string;
  value: number;
  shap_value: number;
  impact: number;
  direction: 'increases_risk' | 'decreases_risk';
}

export interface Prediction {
  id?: string;
  student_id?: string;
  model_version: string;
  predicted_class: 'Dropout' | 'Enrolled' | 'Graduate';
  risk_category: 'High Risk' | 'Medium Risk' | 'Low Risk';
  risk_score: number;
  probability_dropout: number;
  probability_enrolled: number;
  probability_graduate: number;
  top_factors: FactorDetail[];
  explanation_summary: string;
  data_quality_warnings?: string[];
  created_at?: string;
}

export interface Student {
  id: string;
  student_id_code: string;
  first_name: string;
  last_name: string;
  email: string;
  department: string;
  course: string;
  semester: number;
  admission_year: number;
  current_academic_status: string;
  created_at: string;
  updated_at: string;
  latest_prediction?: {
    id: string;
    risk_category: string;
    risk_score: number;
    probability_dropout: number;
    predicted_class: string;
    created_at: string;
  };
}

export interface StudentAcademicRecord {
  id: string;
  student_id: string;
  curricular_units_1st_sem_enrolled: number;
  curricular_units_1st_sem_evaluations: number;
  curricular_units_1st_sem_approved: number;
  curricular_units_1st_sem_grade: number;
  curricular_units_2nd_sem_enrolled: number;
  curricular_units_2nd_sem_evaluations: number;
  curricular_units_2nd_sem_approved: number;
  curricular_units_2nd_sem_grade: number;
  tuition_fees_up_to_date: number;
  debtor: number;
  scholarship_holder: number;
  age_at_enrollment: number;
  admission_grade: number;
}

export interface Intervention {
  id: string;
  student_id: string;
  student_name?: string;
  title: string;
  category: string;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';
  priority: 'Urgent' | 'Medium' | 'Routine';
  assigned_to_user_id?: string;
  due_date?: string;
  notes?: string;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface FacultyNote {
  id: string;
  student_id: string;
  author_user_id: string;
  content: string;
  is_confidential: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  user_id?: string;
  user_email?: string;
  ip_address?: string;
  resource_type?: string;
  resource_id?: string;
  details?: Record<string, any>;
}

export interface ImportJob {
  id: string;
  filename: string;
  total_rows: number;
  success_rows: number;
  error_rows: number;
  duplicate_rows: number;
  created_at: string;
  error_log?: Array<{ row: number; error: string }>;
}

export interface AnalyticsOverview {
  total_students: number;
  high_risk_count: number;
  medium_risk_count: number;
  low_risk_count: number;
  unassessed_count: number;
  pending_follow_ups: number;
  total_predictions: number;
  risk_distribution: Array<{
    name: string;
    value: number;
    color: string;
  }>;
}

export interface ModelPerformance {
  version_tag: string;
  algorithm: string;
  trained_at: string;
  dataset_name: string;
  test_accuracy: number;
  test_f1_weighted: number;
  test_f1_macro: number;
  test_f1_dropout: number;
  training_samples: number;
  test_samples: number;
  confusion_matrix?: {
    labels: string[];
    matrix: number[][];
  };
  class_metrics?: Record<string, any>;
  limitations_notes: string;
}
