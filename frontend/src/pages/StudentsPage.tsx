import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Student } from '../types';
import { RiskBadge } from '../components/RiskBadge';
import { Modal } from '../components/Modal';
import {
  Search,
  Plus,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  AlertCircle
} from 'lucide-react';

export const StudentsPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(true);

  // Search and Filter States
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Create Student Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    student_id_code: '',
    first_name: '',
    last_name: '',
    email: '',
    department: 'Engineering',
    course: 'Informatics Engineering',
    semester: 1,
    admission_year: 2024,
    current_academic_status: 'Enrolled'
  });

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
        sort_by: sortBy,
        order: sortOrder,
      });

      if (search) params.append('search', search);
      if (deptFilter) params.append('department', deptFilter);
      if (riskFilter) params.append('risk_level', riskFilter);
      if (statusFilter) params.append('status', statusFilter);

      const res = await api.get<{ items: Student[]; total: number }>(`/students?${params.toString()}`);
      setStudents(res.items || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error('Failed to fetch students:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [page, deptFilter, riskFilter, statusFilter, sortBy, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchStudents();
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError(null);

    try {
      await api.post('/students', formData);
      setIsModalOpen(false);
      setFormData({
        student_id_code: '',
        first_name: '',
        last_name: '',
        email: '',
        department: 'Engineering',
        course: 'Informatics Engineering',
        semester: 1,
        admission_year: 2024,
        current_academic_status: 'Enrolled'
      });
      fetchStudents();
    } catch (err: any) {
      setModalError(err?.message || 'Failed to create student record.');
    } finally {
      setModalLoading(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-wide">Student Directory</h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Manage cohort profiles, academic assessments, and retention indicators.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary text-xs py-2 px-3 self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          Add Student Record
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="card p-4 space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by student code, name, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field w-full pl-9 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={deptFilter}
              onChange={(e) => {
                setDeptFilter(e.target.value);
                setPage(1);
              }}
              className="input-field text-xs py-2 bg-[#282828]"
            >
              <option value="">All Departments</option>
              <option value="Engineering">Engineering</option>
              <option value="Computer Science">Computer Science</option>
              <option value="Sciences">Sciences</option>
              <option value="Business & Management">Business & Management</option>
            </select>

            <select
              value={riskFilter}
              onChange={(e) => {
                setRiskFilter(e.target.value);
                setPage(1);
              }}
              className="input-field text-xs py-2 bg-[#282828]"
            >
              <option value="">All Risk Levels</option>
              <option value="High Risk">High Risk</option>
              <option value="Medium Risk">Medium Risk</option>
              <option value="Low Risk">Low Risk</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="input-field text-xs py-2 bg-[#282828]"
            >
              <option value="">All Statuses</option>
              <option value="Enrolled">Enrolled</option>
              <option value="At-Risk">At-Risk</option>
              <option value="Graduate">Graduate</option>
              <option value="Dropout">Dropout</option>
            </select>

            <button type="submit" className="btn-secondary text-xs py-2 px-3">
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Students Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#282828] text-text-secondary border-b border-[#3A3A3A]">
              <tr>
                <th className="py-3 px-4 font-medium">Identifier</th>
                <th className="py-3 px-4 font-medium">Full Name</th>
                <th className="py-3 px-4 font-medium">Department & Course</th>
                <th className="py-3 px-4 font-medium">Semester</th>
                <th className="py-3 px-4 font-medium">Academic Status</th>
                <th className="py-3 px-4 font-medium">Latest Risk Category</th>
                <th className="py-3 px-4 font-medium text-right">Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3A3A3A]/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">
                    Loading student records...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-text-secondary">
                    No student records found matching the criteria.
                  </td>
                </tr>
              ) : (
                students.map((s) => (
                  <tr key={s.id} className="hover:bg-[#353535]/50 transition">
                    <td className="py-3 px-4 font-mono font-medium text-white">
                      {s.student_id_code}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-white">{s.first_name} {s.last_name}</div>
                      <div className="text-[11px] text-text-secondary">{s.email}</div>
                    </td>
                    <td className="py-3 px-4 text-text-secondary">
                      <div>{s.department}</div>
                      <div className="text-[11px] text-gray-400">{s.course}</div>
                    </td>
                    <td className="py-3 px-4 text-white">
                      Sem {s.semester} <span className="text-[10px] text-gray-400">({s.admission_year})</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                        s.current_academic_status === 'At-Risk'
                          ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                          : s.current_academic_status === 'Graduate'
                          ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                          : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {s.current_academic_status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <RiskBadge
                        category={s.latest_prediction?.risk_category}
                        score={s.latest_prediction?.probability_dropout}
                        showScore
                      />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/students/${s.id}`}
                        className="btn-secondary text-xs py-1 px-3"
                      >
                        View Profile
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-[#3A3A3A] flex items-center justify-between text-xs text-text-secondary">
          <span>
            Showing {students.length} of {total} records (Page {page} of {totalPages})
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="p-1.5 rounded border border-[#3A3A3A] hover:bg-[#353535] disabled:opacity-40 disabled:cursor-not-allowed text-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-white px-2">
              {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="p-1.5 rounded border border-[#3A3A3A] hover:bg-[#353535] disabled:opacity-40 disabled:cursor-not-allowed text-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add Student Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Student Profile"
      >
        {modalError && (
          <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-lg text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{modalError}</span>
          </div>
        )}

        <form onSubmit={handleCreateStudent} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-text-secondary mb-1">Student Identifier Code *</label>
              <input
                type="text"
                required
                placeholder="STU-2024-009"
                value={formData.student_id_code}
                onChange={(e) => setFormData({ ...formData, student_id_code: e.target.value })}
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-text-secondary mb-1">Institutional Email *</label>
              <input
                type="email"
                required
                placeholder="student@university.edu"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input-field w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-text-secondary mb-1">First Name *</label>
              <input
                type="text"
                required
                placeholder="Jane"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-text-secondary mb-1">Last Name *</label>
              <input
                type="text"
                required
                placeholder="Doe"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="input-field w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-text-secondary mb-1">Department</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="input-field w-full bg-[#282828]"
              >
                <option value="Engineering">Engineering</option>
                <option value="Computer Science">Computer Science</option>
                <option value="Sciences">Sciences</option>
                <option value="Business & Management">Business & Management</option>
              </select>
            </div>
            <div>
              <label className="block text-text-secondary mb-1">Degree Course</label>
              <input
                type="text"
                value={formData.course}
                onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                className="input-field w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-text-secondary mb-1">Semester</label>
              <input
                type="number"
                min="1"
                max="12"
                value={formData.semester}
                onChange={(e) => setFormData({ ...formData, semester: parseInt(e.target.value) || 1 })}
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-text-secondary mb-1">Admission Year</label>
              <input
                type="number"
                min="2010"
                max="2030"
                value={formData.admission_year}
                onChange={(e) => setFormData({ ...formData, admission_year: parseInt(e.target.value) || 2024 })}
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-text-secondary mb-1">Status</label>
              <select
                value={formData.current_academic_status}
                onChange={(e) => setFormData({ ...formData, current_academic_status: e.target.value })}
                className="input-field w-full bg-[#282828]"
              >
                <option value="Enrolled">Enrolled</option>
                <option value="At-Risk">At-Risk</option>
                <option value="Graduate">Graduate</option>
                <option value="Dropout">Dropout</option>
              </select>
            </div>
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
              disabled={modalLoading}
              className="btn-primary text-xs py-2 px-4"
            >
              {modalLoading ? 'Saving...' : 'Create Student'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
