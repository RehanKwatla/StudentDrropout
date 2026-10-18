import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { Student, Prediction } from '../types';
import { RiskBadge } from '../components/RiskBadge';
import { FactorBreakdown } from '../components/FactorBreakdown';
import {
  Brain,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  FileText,
  User,
  ArrowRight,
  RefreshCw,
  Info
} from 'lucide-react';

export const PredictionWorkspacePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialStudentId = searchParams.get('student_id') || '';

  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(initialStudentId);
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Manual Assessment Feature Form
  const [features, setFeatures] = useState({
    curricular_units_1st_sem_enrolled: 6,
    curricular_units_1st_sem_evaluations: 6,
    curricular_units_1st_sem_approved: 5,
    curricular_units_1st_sem_grade: 13.0,
    curricular_units_2nd_sem_enrolled: 6,
    curricular_units_2nd_sem_evaluations: 6,
    curricular_units_2nd_sem_approved: 5,
    curricular_units_2nd_sem_grade: 13.0,
    tuition_fees_up_to_date: 1,
    debtor: 0,
    scholarship_holder: 0,
    age_at_enrollment: 20,
    admission_grade: 125.0
  });

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await api.get<{ items: Student[] }>('/students?page=1&page_size=50');
        setStudents(res.items || []);
      } catch (err) {
        console.error('Failed to load students list:', err);
      }
    };
    fetchStudents();
  }, []);

  const handleStudentSelect = (studentId: string) => {
    setSelectedStudentId(studentId);
    if (!studentId) {
      setPrediction(null);
    }
  };

  const handleRunPrediction = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload: any = { features };
      if (selectedStudentId) {
        payload.student_id = selectedStudentId;
      }

      const result = await api.post<Prediction>('/predictions/predict', payload);
      setPrediction(result);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate model prediction.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#282828] border border-[#3A3A3A] p-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-[#19B5D5]" />
            <h2 className="text-xl font-bold text-white tracking-wide">
              Prediction & Explainability Workspace
            </h2>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Execute real-time model inference and generate game-theoretic SHAP attributions for student risk forecasting.
          </p>
        </div>

        <div className="text-xs text-text-secondary flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Active Pipeline: <strong>RandomForest (v1.0.0-rf)</strong></span>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/15 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid: Form on Left, Output on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Inputs (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="card p-5 space-y-5">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              Assessment Input Parameters
            </h3>

            {/* Select existing student */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Link to Cohort Student (Optional)
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => handleStudentSelect(e.target.value)}
                className="input-field w-full text-xs bg-[#282828]"
              >
                <option value="">-- Manual Sandbox Input --</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.student_id_code} — {s.first_name} {s.last_name} ({s.department})
                  </option>
                ))}
              </select>
            </div>

            <form onSubmit={handleRunPrediction} className="space-y-4 text-xs">
              {/* 1st Semester */}
              <div className="p-3.5 bg-[#282828] rounded-xl border border-[#3A3A3A] space-y-3">
                <span className="font-semibold text-white block text-[11px] uppercase tracking-wider text-[#19B5D5]">
                  First Semester Performance
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-text-secondary mb-1">Approved Units (0-10)</label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={features.curricular_units_1st_sem_approved}
                      onChange={(e) =>
                        setFeatures({ ...features, curricular_units_1st_sem_approved: parseInt(e.target.value) || 0 })
                      }
                      className="input-field w-full font-mono text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-text-secondary mb-1">Grade Average (0-20)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="20"
                      value={features.curricular_units_1st_sem_grade}
                      onChange={(e) =>
                        setFeatures({ ...features, curricular_units_1st_sem_grade: parseFloat(e.target.value) || 0 })
                      }
                      className="input-field w-full font-mono text-white"
                    />
                  </div>
                </div>
              </div>

              {/* 2nd Semester */}
              <div className="p-3.5 bg-[#282828] rounded-xl border border-[#3A3A3A] space-y-3">
                <span className="font-semibold text-white block text-[11px] uppercase tracking-wider text-[#19B5D5]">
                  Second Semester Performance
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-text-secondary mb-1">Approved Units (0-10)</label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={features.curricular_units_2nd_sem_approved}
                      onChange={(e) =>
                        setFeatures({ ...features, curricular_units_2nd_sem_approved: parseInt(e.target.value) || 0 })
                      }
                      className="input-field w-full font-mono text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-text-secondary mb-1">Grade Average (0-20)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="20"
                      value={features.curricular_units_2nd_sem_grade}
                      onChange={(e) =>
                        setFeatures({ ...features, curricular_units_2nd_sem_grade: parseFloat(e.target.value) || 0 })
                      }
                      className="input-field w-full font-mono text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Financial & Status Factors */}
              <div className="p-3.5 bg-[#282828] rounded-xl border border-[#3A3A3A] space-y-3">
                <span className="font-semibold text-white block text-[11px] uppercase tracking-wider text-[#19B5D5]">
                  Financial & Academic Standing
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-text-secondary mb-1">Tuition Fees Status</label>
                    <select
                      value={features.tuition_fees_up_to_date}
                      onChange={(e) =>
                        setFeatures({ ...features, tuition_fees_up_to_date: parseInt(e.target.value) })
                      }
                      className="input-field w-full bg-[#202020]"
                    >
                      <option value={1}>Paid Up-to-Date</option>
                      <option value={0}>Unpaid / Overdue</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-text-secondary mb-1">Debtor Standing</label>
                    <select
                      value={features.debtor}
                      onChange={(e) => setFeatures({ ...features, debtor: parseInt(e.target.value) })}
                      className="input-field w-full bg-[#202020]"
                    >
                      <option value={0}>No Debt</option>
                      <option value={1}>Has Outstanding Debt</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-text-secondary mb-1">Scholarship Holder</label>
                    <select
                      value={features.scholarship_holder}
                      onChange={(e) => setFeatures({ ...features, scholarship_holder: parseInt(e.target.value) })}
                      className="input-field w-full bg-[#202020]"
                    >
                      <option value={0}>No</option>
                      <option value={1}>Yes (Scholarship)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-text-secondary mb-1">Admission Grade (0-200)</label>
                    <input
                      type="number"
                      step="1"
                      min="50"
                      max="200"
                      value={features.admission_grade}
                      onChange={(e) =>
                        setFeatures({ ...features, admission_grade: parseFloat(e.target.value) || 100 })
                      }
                      className="input-field w-full font-mono text-white"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3 font-semibold shadow-lg shadow-[#19B5D5]/20"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Running Model Inference & SHAP...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Prediction & Explanation
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Output: Real XAI Results (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {prediction ? (
            <div className="card p-6 space-y-5 border-[#3A3A3A] relative animate-fadeIn">
              {/* Header result */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#3A3A3A]">
                <div>
                  <span className="text-[10px] text-text-secondary uppercase tracking-wider block font-mono">
                    Model Output • {prediction.model_version}
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xl font-bold text-white">
                      Predicted Class: {prediction.predicted_class}
                    </span>
                    <RiskBadge
                      category={prediction.risk_category}
                      score={prediction.probability_dropout}
                      showScore
                    />
                  </div>
                </div>

                {prediction.student_id && (
                  <Link
                    to={`/students/${prediction.student_id}`}
                    className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 self-start sm:self-auto"
                  >
                    Open Student Profile <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>

              {/* Multiclass Probabilities */}
              <div className="grid grid-cols-3 gap-3 p-4 bg-[#252525] rounded-xl border border-[#3A3A3A] text-center">
                <div className="p-2">
                  <span className="text-xs text-red-400 font-medium block">Dropout Probability</span>
                  <span className="text-2xl font-bold text-red-400 font-mono">
                    {(prediction.probability_dropout * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="p-2 border-x border-[#3A3A3A]">
                  <span className="text-xs text-amber-400 font-medium block">Enrolled Probability</span>
                  <span className="text-2xl font-bold text-amber-400 font-mono">
                    {(prediction.probability_enrolled * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="p-2">
                  <span className="text-xs text-emerald-400 font-medium block">Graduation Probability</span>
                  <span className="text-2xl font-bold text-emerald-400 font-mono">
                    {(prediction.probability_graduate * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Plain-Language Summary */}
              <div className="p-4 bg-[#282828] rounded-xl border border-[#3A3A3A] text-xs space-y-1.5">
                <span className="font-semibold text-[#19B5D5] uppercase tracking-wider text-[10px] block">
                  Plain-Language Advisor Explanation
                </span>
                <p className="text-gray-200 leading-relaxed">
                  {prediction.explanation_summary}
                </p>
              </div>

              {/* Local SHAP Factor Attribution */}
              <div>
                <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">
                  Local SHAP Breakdown: Contributing & Protective Factors
                </h4>
                <FactorBreakdown factors={prediction.top_factors} maxItems={8} />
              </div>

              {/* Warnings / Disclaimer */}
              {prediction.data_quality_warnings && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-300">
                  <p className="font-semibold mb-1">Data Quality Warnings:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                    {prediction.data_quality_warnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-3 border-t border-[#3A3A3A] text-[11px] text-text-secondary flex items-start gap-2">
                <Info className="w-4 h-4 text-[#19B5D5] shrink-0 mt-0.5" />
                <span>
                  Feature contributions reflect marginal SHAP values for the trained tree model. Predictions are intended to assist advising and must not be used to restrict student opportunities.
                </span>
              </div>
            </div>
          ) : (
            <div className="card p-12 text-center text-text-secondary space-y-3">
              <Brain className="w-12 h-12 text-gray-500 mx-auto opacity-40" />
              <h3 className="text-base font-semibold text-white">No Prediction Generated Yet</h3>
              <p className="text-xs text-text-secondary max-w-sm mx-auto">
                Configure student parameters on the left and click "Generate Prediction & Explanation" to run model inference.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
