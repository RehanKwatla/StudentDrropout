import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { Student, Prediction, StudentAcademicRecord, Intervention, FacultyNote } from '../types';
import { RiskBadge } from '../components/RiskBadge';
import { FactorBreakdown } from '../components/FactorBreakdown';
import { Modal } from '../components/Modal';
import {
  GraduationCap,
  ArrowLeft,
  Brain,
  LifeBuoy,
  MessageSquare,
  FileText,
  Calendar,
  AlertTriangle,
  Plus,
  Lock,
  Clock,
  Sparkles
} from 'lucide-react';

export const StudentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [student, setStudent] = useState<Student | null>(null);
  const [latestPred, setLatestPred] = useState<Prediction | null>(null);
  const [predHistory, setPredHistory] = useState<Prediction[]>([]);
  const [academicRecord, setAcademicRecord] = useState<StudentAcademicRecord | null>(null);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [notes, setNotes] = useState<FacultyNote[]>([]);
  const [loading, setLoading] = useState(true);

  // Intervention Modal
  const [isIntervModalOpen, setIsIntervModalOpen] = useState(false);
  const [intervTitle, setIntervTitle] = useState('');
  const [intervCategory, setIntervCategory] = useState('Academic Tutoring');
  const [intervPriority, setIntervPriority] = useState('Medium');
  const [intervNotes, setIntervNotes] = useState('');

  // Add Note Form
  const [noteContent, setNoteContent] = useState('');
  const [noteConfidential, setNoteConfidential] = useState(false);

  const fetchStudentDetails = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await api.get<{
        student: Student;
        latest_prediction: Prediction | null;
        prediction_history: Prediction[];
        academic_record: StudentAcademicRecord | null;
      }>(`/students/${id}`);

      setStudent(data.student);
      setLatestPred(data.latest_prediction);
      setPredHistory(data.prediction_history || []);
      setAcademicRecord(data.academic_record);

      // Fetch interventions & notes
      const [intervData, notesData] = await Promise.all([
        api.get<Intervention[]>(`/interventions?student_id=${id}`),
        api.get<FacultyNote[]>(`/notes/student/${id}`),
      ]);
      setInterventions(intervData || []);
      setNotes(notesData || []);
    } catch (err) {
      console.error('Failed to fetch student details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentDetails();
  }, [id]);

  const handleCreateIntervention = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await api.post('/interventions', {
        student_id: id,
        title: intervTitle,
        category: intervCategory,
        priority: intervPriority,
        notes: intervNotes,
      });
      setIsIntervModalOpen(false);
      setIntervTitle('');
      setIntervNotes('');
      fetchStudentDetails();
    } catch (err) {
      console.error('Failed to create intervention:', err);
    }
  };

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !noteContent.trim()) return;
    try {
      await api.post(`/notes/student/${id}`, {
        content: noteContent,
        is_confidential: noteConfidential,
      });
      setNoteContent('');
      setNoteConfidential(false);
      fetchStudentDetails();
    } catch (err) {
      console.error('Failed to add note:', err);
    }
  };

  if (loading) {
    return (
      <div className="card p-12 text-center text-text-secondary text-sm">
        Loading student profile and XAI assessment...
      </div>
    );
  }

  if (!student) {
    return (
      <div className="card p-12 text-center space-y-4">
        <p className="text-white font-medium">Student record not found.</p>
        <Link to="/students" className="btn-secondary text-xs inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Directory
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/students"
            className="p-2 rounded-lg bg-[#282828] border border-[#3A3A3A] hover:text-white transition"
            title="Back to Students Directory"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-wide">
                {student.first_name} {student.last_name}
              </h2>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#353535] text-cyan-300 border border-[#3A3A3A]">
                {student.student_id_code}
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              {student.department} • {student.course} • Semester {student.semester}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <RiskBadge
            category={latestPred?.risk_category}
            score={latestPred?.probability_dropout}
            showScore
          />
          <Link
            to={`/predict?student_id=${student.id}`}
            className="btn-primary text-xs py-2 px-3"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Re-evaluate Risk
          </Link>
        </div>
      </div>

      {/* Main Grid: Prediction & Academic Assessment */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Latest Prediction & XAI Explanation */}
        <div className="lg:col-span-2 space-y-6">
          {/* Prediction Card */}
          <div className="card p-6 border-[#3A3A3A] relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-[#19B5D5]" />
                <h3 className="text-base font-semibold text-white">
                  Explainable AI Risk Assessment
                </h3>
              </div>
              <span className="text-[11px] font-mono text-gray-400">
                Model {latestPred?.model_version || 'v1.0.0-rf'}
              </span>
            </div>

            {latestPred ? (
              <div className="space-y-5">
                {/* Probability meters */}
                <div className="grid grid-cols-3 gap-3 p-4 bg-[#252525] rounded-xl border border-[#3A3A3A]/60 text-center">
                  <div>
                    <span className="text-[11px] text-red-400 font-medium block mb-1">Dropout Risk</span>
                    <span className="text-xl font-bold text-red-400">
                      {(latestPred.probability_dropout * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-amber-400 font-medium block mb-1">Enrolled (P)</span>
                    <span className="text-xl font-bold text-amber-400">
                      {(latestPred.probability_enrolled * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-emerald-400 font-medium block mb-1">Graduation (P)</span>
                    <span className="text-xl font-bold text-emerald-400">
                      {(latestPred.probability_graduate * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Plain-Language Explanation */}
                <div className="p-4 bg-[#282828] rounded-xl border border-[#3A3A3A] text-xs space-y-1.5">
                  <span className="font-semibold text-[#19B5D5] uppercase tracking-wider text-[10px] block">
                    Advisor Plain-Language Explanation
                  </span>
                  <p className="text-gray-200 leading-relaxed">
                    {latestPred.explanation_summary}
                  </p>
                </div>

                {/* Local SHAP Factor Breakdown */}
                <div>
                  <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">
                    Top SHAP Feature Attributions (Marginal Impact on Dropout Forecast)
                  </h4>
                  <FactorBreakdown factors={latestPred.top_factors} maxItems={8} />
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-text-secondary text-xs">
                No prediction has been generated for this student yet.
              </div>
            )}

            {/* Disclaimer Alert */}
            <div className="mt-6 p-3 rounded-lg bg-[#222222] border border-[#3A3A3A] text-[11px] text-text-secondary flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>Ethical AI Guardrail:</strong> Predictions reflect statistical patterns in historical training data and require timely faculty human review. Do not use predictions to penalize or restrict students.
              </span>
            </div>
          </div>

          {/* Academic Progression Summary */}
          {academicRecord && (
            <div className="card p-6">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                Current Semester Curricular Metrics
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="p-3 bg-[#282828] rounded-lg border border-[#3A3A3A]">
                  <span className="text-gray-400 block mb-1">1st Sem Units</span>
                  <span className="text-white font-semibold text-sm">
                    {academicRecord.curricular_units_1st_sem_approved} / {academicRecord.curricular_units_1st_sem_enrolled} Approved
                  </span>
                  <span className="text-[10px] text-gray-500 block mt-1">Grade: {academicRecord.curricular_units_1st_sem_grade}/20</span>
                </div>

                <div className="p-3 bg-[#282828] rounded-lg border border-[#3A3A3A]">
                  <span className="text-gray-400 block mb-1">2nd Sem Units</span>
                  <span className="text-white font-semibold text-sm">
                    {academicRecord.curricular_units_2nd_sem_approved} / {academicRecord.curricular_units_2nd_sem_enrolled} Approved
                  </span>
                  <span className="text-[10px] text-gray-500 block mt-1">Grade: {academicRecord.curricular_units_2nd_sem_grade}/20</span>
                </div>

                <div className="p-3 bg-[#282828] rounded-lg border border-[#3A3A3A]">
                  <span className="text-gray-400 block mb-1">Tuition Fees</span>
                  <span className={`font-semibold text-sm ${academicRecord.tuition_fees_up_to_date ? 'text-emerald-400' : 'text-red-400'}`}>
                    {academicRecord.tuition_fees_up_to_date ? 'Up to Date' : 'Unpaid Overdue'}
                  </span>
                  <span className="text-[10px] text-gray-500 block mt-1">
                    Debtor: {academicRecord.debtor ? 'Yes' : 'No'}
                  </span>
                </div>

                <div className="p-3 bg-[#282828] rounded-lg border border-[#3A3A3A]">
                  <span className="text-gray-400 block mb-1">Admission Grade</span>
                  <span className="text-white font-semibold text-sm">
                    {academicRecord.admission_grade} / 200
                  </span>
                  <span className="text-[10px] text-gray-500 block mt-1">
                    Scholarship: {academicRecord.scholarship_holder ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Interventions & Faculty Notes */}
        <div className="space-y-6">
          {/* Actionable Support Interventions */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <LifeBuoy className="w-4 h-4 text-purple-400" />
                Support Interventions
              </h3>
              <button
                onClick={() => setIsIntervModalOpen(true)}
                className="btn-primary text-[11px] py-1 px-2.5"
              >
                <Plus className="w-3.5 h-3.5" /> New Action
              </button>
            </div>

            <div className="space-y-2.5">
              {interventions.length === 0 ? (
                <p className="text-xs text-text-secondary italic py-3 text-center">
                  No interventions scheduled for this student yet.
                </p>
              ) : (
                interventions.map((inv) => (
                  <div key={inv.id} className="p-3 rounded-lg bg-[#282828] border border-[#3A3A3A] space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">{inv.title}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                        inv.status === 'Completed'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-amber-500/15 text-amber-400'
                      }`}>
                        {inv.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-text-secondary">
                      Category: <span className="text-gray-300">{inv.category}</span> • Priority: <span className="text-gray-300">{inv.priority}</span>
                    </div>
                    {inv.notes && (
                      <p className="text-[11px] text-gray-400 bg-[#222222] p-2 rounded mt-1">
                        {inv.notes}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Faculty Advising Notes */}
          <div className="card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-cyan-400" />
              Faculty Advising Notes
            </h3>

            {/* Note submission form */}
            <form onSubmit={handleCreateNote} className="space-y-2">
              <textarea
                rows={2}
                placeholder="Add confidential advising note or meeting summary..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                className="input-field w-full text-xs"
              />
              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-1.5 text-text-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={noteConfidential}
                    onChange={(e) => setNoteConfidential(e.target.checked)}
                    className="rounded bg-[#282828] border-[#3A3A3A]"
                  />
                  <span className="flex items-center gap-1">
                    <Lock className="w-3 h-3 text-amber-400" /> Confidential
                  </span>
                </label>
                <button
                  type="submit"
                  disabled={!noteContent.trim()}
                  className="btn-primary text-xs py-1 px-3"
                >
                  Save Note
                </button>
              </div>
            </form>

            {/* Existing Notes List */}
            <div className="space-y-2 pt-2 border-t border-[#3A3A3A]">
              {notes.length === 0 ? (
                <p className="text-xs text-text-secondary italic text-center py-2">
                  No notes recorded yet.
                </p>
              ) : (
                notes.map((n) => (
                  <div key={n.id} className="p-2.5 rounded bg-[#282828] border border-[#3A3A3A] text-xs space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-text-secondary">
                      <span>{new Date(n.created_at).toLocaleDateString()}</span>
                      {n.is_confidential && (
                        <span className="flex items-center gap-0.5 text-amber-400 text-[10px]">
                          <Lock className="w-2.5 h-2.5" /> Confidential
                        </span>
                      )}
                    </div>
                    <p className="text-gray-200">{n.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* New Intervention Modal */}
      <Modal
        isOpen={isIntervModalOpen}
        onClose={() => setIsIntervModalOpen(false)}
        title="Schedule Student Intervention"
      >
        <form onSubmit={handleCreateIntervention} className="space-y-4 text-xs">
          <div>
            <label className="block text-text-secondary mb-1">Intervention Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Remedial Calculus Tutoring Outreach"
              value={intervTitle}
              onChange={(e) => setIntervTitle(e.target.value)}
              className="input-field w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-text-secondary mb-1">Support Category *</label>
              <select
                value={intervCategory}
                onChange={(e) => setIntervCategory(e.target.value)}
                className="input-field w-full bg-[#282828]"
              >
                <option value="Academic Tutoring">Academic Tutoring</option>
                <option value="Attendance Follow-up">Attendance Follow-up</option>
                <option value="Faculty Mentoring">Faculty Mentoring</option>
                <option value="Study Planning">Study Planning</option>
                <option value="Administrative Guidance">Administrative Guidance</option>
                <option value="Referral to Student Support">Referral to Student Support</option>
              </select>
            </div>
            <div>
              <label className="block text-text-secondary mb-1">Priority</label>
              <select
                value={intervPriority}
                onChange={(e) => setIntervPriority(e.target.value)}
                className="input-field w-full bg-[#282828]"
              >
                <option value="Urgent">Urgent</option>
                <option value="Medium">Medium</option>
                <option value="Routine">Routine</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-text-secondary mb-1">Action Notes / Plan</label>
            <textarea
              rows={3}
              placeholder="Detail contact steps, recommended resources, or advising notes..."
              value={intervNotes}
              onChange={(e) => setIntervNotes(e.target.value)}
              className="input-field w-full"
            />
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-[#3A3A3A]">
            <button
              type="button"
              onClick={() => setIsIntervModalOpen(false)}
              className="btn-secondary text-xs py-2 px-3"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!intervTitle.trim()}
              className="btn-primary text-xs py-2 px-4"
            >
              Save Intervention
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
