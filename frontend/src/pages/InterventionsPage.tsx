import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Intervention, Student } from '../types';
import { Modal } from '../components/Modal';
import {
  LifeBuoy,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  User,
  ArrowRight
} from 'lucide-react';

export const InterventionsPage: React.FC = () => {
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Academic Tutoring');
  const [priority, setPriority] = useState('Medium');
  const [notes, setNotes] = useState('');

  const fetchInterventions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (categoryFilter) params.append('category', categoryFilter);

      const [intervData, studentsData] = await Promise.all([
        api.get<Intervention[]>(`/interventions?${params.toString()}`),
        api.get<{ items: Student[] }>('/students?page=1&page_size=50'),
      ]);
      setInterventions(intervData || []);
      setStudents(studentsData.items || []);
    } catch (err) {
      console.error('Failed to load interventions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterventions();
  }, [statusFilter, categoryFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !title.trim()) return;

    try {
      await api.post('/interventions', {
        student_id: selectedStudentId,
        title,
        category,
        priority,
        notes,
      });
      setIsModalOpen(false);
      setTitle('');
      setNotes('');
      setSelectedStudentId('');
      fetchInterventions();
    } catch (err) {
      console.error('Failed to create intervention:', err);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await api.patch(`/interventions/${id}`, { status: newStatus });
      fetchInterventions();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#282828] border border-[#3A3A3A] p-5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <LifeBuoy className="w-5 h-5 text-purple-400" />
            <h2 className="text-xl font-bold text-white tracking-wide">
              Student Retention & Support Interventions
            </h2>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Coordinate actionable faculty outreach, academic tutoring, financial guidance, and follow-up tracking.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary text-xs py-2 px-3 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Schedule Intervention
        </button>
      </div>

      {/* Filter Bar */}
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <Filter className="w-3.5 h-3.5 text-[#19B5D5]" />
          <span>Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field text-xs py-1.5 bg-[#282828]"
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <span>Category:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input-field text-xs py-1.5 bg-[#282828]"
          >
            <option value="">All Categories</option>
            <option value="Academic Tutoring">Academic Tutoring</option>
            <option value="Attendance Follow-up">Attendance Follow-up</option>
            <option value="Faculty Mentoring">Faculty Mentoring</option>
            <option value="Study Planning">Study Planning</option>
            <option value="Administrative Guidance">Administrative Guidance</option>
            <option value="Referral to Student Support">Referral to Student Support</option>
          </select>
        </div>
      </div>

      {/* Interventions Table / Grid */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#282828] text-text-secondary border-b border-[#3A3A3A]">
              <tr>
                <th className="py-3 px-4 font-medium">Student</th>
                <th className="py-3 px-4 font-medium">Support Action / Title</th>
                <th className="py-3 px-4 font-medium">Category</th>
                <th className="py-3 px-4 font-medium">Priority</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium">Created Date</th>
                <th className="py-3 px-4 font-medium text-right">Quick Update</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3A3A3A]/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-text-secondary">
                    Loading interventions...
                  </td>
                </tr>
              ) : interventions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-text-secondary">
                    No active interventions found.
                  </td>
                </tr>
              ) : (
                interventions.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[#353535]/40 transition">
                    <td className="py-3 px-4">
                      <Link
                        to={`/students/${inv.student_id}`}
                        className="font-medium text-cyan-300 hover:underline block"
                      >
                        {inv.student_name || 'Student'}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-white block">{inv.title}</span>
                      {inv.notes && (
                        <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">{inv.notes}</p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-text-secondary">{inv.category}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        inv.priority === 'Urgent'
                          ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                          : 'bg-gray-500/15 text-gray-300 border border-gray-500/30'
                      }`}>
                        {inv.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                        inv.status === 'Completed'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : inv.status === 'In Progress'
                          ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                          : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-400">
                      {new Date(inv.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {inv.status !== 'Completed' ? (
                        <button
                          onClick={() => handleUpdateStatus(inv.id, 'Completed')}
                          className="btn-secondary text-[11px] py-1 px-2.5 text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Mark Done
                        </button>
                      ) : (
                        <span className="text-emerald-400 text-[11px] font-medium flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Schedule Support Action"
      >
        <form onSubmit={handleCreate} className="space-y-4 text-xs">
          <div>
            <label className="block text-text-secondary mb-1">Target Student *</label>
            <select
              required
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="input-field w-full bg-[#282828]"
            >
              <option value="">-- Choose a student --</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.student_id_code} — {s.first_name} {s.last_name} ({s.department})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-text-secondary mb-1">Action Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Academic Tutoring & Financial Support Plan"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-text-secondary mb-1">Support Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
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
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="input-field w-full bg-[#282828]"
              >
                <option value="Urgent">Urgent</option>
                <option value="Medium">Medium</option>
                <option value="Routine">Routine</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-text-secondary mb-1">Advising Notes & Follow-up Plan</label>
            <textarea
              rows={3}
              placeholder="Describe outreach steps, agreed study goals, or meeting arrangements..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input-field w-full"
            />
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-[#3A3A3A]">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="btn-secondary text-xs py-2 px-3"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedStudentId || !title.trim()}
              className="btn-primary text-xs py-2 px-4"
            >
              Schedule Intervention
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
