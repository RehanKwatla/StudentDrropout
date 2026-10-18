import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { AnalyticsOverview, Student } from '../types';
import { RiskBadge } from '../components/RiskBadge';
import {
  Users,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Clock,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Filter
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';

export const DashboardPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState<string>('All');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [overviewData, studentsData] = await Promise.all([
          api.get<AnalyticsOverview>('/analytics/overview'),
          api.get<{ items: Student[] }>('/students?page=1&page_size=20'),
        ]);
        setAnalytics(overviewData);
        setStudents(studentsData.items || []);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredStudents = students.filter((s) => {
    if (selectedDept !== 'All' && s.department !== selectedDept) return false;
    return true;
  });

  const urgentStudents = filteredStudents.filter(
    (s) => s.latest_prediction?.risk_category === 'High Risk'
  );

  const departments = ['All', ...new Set(students.map((s) => s.department).filter(Boolean))];

  return (
    <div className="space-y-6">
      {/* Top Banner / Academic Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#282828] border border-[#3A3A3A] p-5 rounded-xl">
        <div>
          <h2 className="text-xl font-bold text-white tracking-wide">
            Faculty Early-Warning Dashboard
          </h2>
          <p className="text-xs text-text-secondary mt-1">
            Explainable AI decision-support platform for undergraduate retention and timely advising.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#202020] border border-[#3A3A3A] rounded-lg px-3 py-1.5 text-xs text-text-secondary">
            <Filter className="w-3.5 h-3.5 text-[#19B5D5]" />
            <span>Department:</span>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-transparent text-white focus:outline-none"
            >
              {departments.map((d) => (
                <option key={d} value={d} className="bg-[#282828]">
                  {d}
                </option>
              ))}
            </select>
          </div>

          <Link to="/predict" className="btn-primary text-xs py-2 px-3">
            <Sparkles className="w-3.5 h-3.5" />
            Run Prediction
          </Link>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Students */}
        <div className="card p-4 space-y-2">
          <div className="flex items-center justify-between text-text-secondary text-xs">
            <span>Total Students</span>
            <Users className="w-4 h-4 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-white">
            {loading ? '...' : analytics?.total_students ?? 0}
          </p>
          <span className="text-[10px] text-gray-400 block">Enrolled in Cohort</span>
        </div>

        {/* High Risk */}
        <div className="card p-4 space-y-2 border-red-500/30 bg-gradient-to-b from-[#303030] to-red-950/10">
          <div className="flex items-center justify-between text-red-400 text-xs">
            <span className="font-medium">High Risk</span>
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-2xl font-bold text-red-400">
            {loading ? '...' : analytics?.high_risk_count ?? 0}
          </p>
          <span className="text-[10px] text-red-400/80 block">Requires human review</span>
        </div>

        {/* Medium Risk */}
        <div className="card p-4 space-y-2 border-amber-500/30">
          <div className="flex items-center justify-between text-amber-400 text-xs">
            <span className="font-medium">Medium Risk</span>
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-400">
            {loading ? '...' : analytics?.medium_risk_count ?? 0}
          </p>
          <span className="text-[10px] text-amber-400/80 block">Monitor progress</span>
        </div>

        {/* Low Risk */}
        <div className="card p-4 space-y-2 border-emerald-500/30">
          <div className="flex items-center justify-between text-emerald-400 text-xs">
            <span className="font-medium">Low Risk</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400">
            {loading ? '...' : analytics?.low_risk_count ?? 0}
          </p>
          <span className="text-[10px] text-emerald-400/80 block">Routine advising</span>
        </div>

        {/* Pending Follow-ups */}
        <div className="card p-4 space-y-2">
          <div className="flex items-center justify-between text-text-secondary text-xs">
            <span>Interventions</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-bold text-cyan-400">
            {loading ? '...' : analytics?.pending_follow_ups ?? 0}
          </p>
          <span className="text-[10px] text-gray-400 block">Active follow-ups</span>
        </div>

        {/* Predictions Total */}
        <div className="card p-4 space-y-2">
          <div className="flex items-center justify-between text-text-secondary text-xs">
            <span>Model Runs</span>
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-purple-400">
            {loading ? '...' : analytics?.total_predictions ?? 0}
          </p>
          <span className="text-[10px] text-gray-400 block">Evaluated records</span>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Distribution Donut */}
        <div className="card p-5 lg:col-span-1 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white mb-1">
              Risk Level Distribution
            </h3>
            <p className="text-xs text-text-secondary mb-4">
              Breakdown based on latest student predictions.
            </p>
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            {loading ? (
              <div className="text-xs text-gray-400">Loading chart...</div>
            ) : analytics?.risk_distribution ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.risk_distribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {analytics.risk_distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#282828', borderColor: '#3A3A3A', fontSize: '12px' }}
                    itemStyle={{ color: '#FFFFFF' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-[#3A3A3A] text-xs">
            {analytics?.risk_distribution.map((d) => (
              <div key={d.name} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                <span className="text-text-secondary">{d.name}:</span>
                <span className="text-white font-semibold">{d.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Students Requiring Urgent Review */}
        <div className="card p-5 lg:col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Students Requiring Immediate Human Review
              </h3>
              <p className="text-xs text-text-secondary">
                Students with elevated dropout probabilities based on current semester records.
              </p>
            </div>
            <Link to="/students?risk_level=High Risk" className="text-xs text-[#19B5D5] hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#282828] text-text-secondary border-b border-[#3A3A3A]">
                <tr>
                  <th className="py-2.5 px-3 font-medium">Student Code</th>
                  <th className="py-2.5 px-3 font-medium">Name</th>
                  <th className="py-2.5 px-3 font-medium">Department</th>
                  <th className="py-2.5 px-3 font-medium">Risk Status</th>
                  <th className="py-2.5 px-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3A3A3A]/60">
                {urgentStudents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-text-secondary">
                      No high-risk students currently identified in selected department.
                    </td>
                  </tr>
                ) : (
                  urgentStudents.slice(0, 5).map((s) => (
                    <tr key={s.id} className="hover:bg-[#353535]/50 transition">
                      <td className="py-3 px-3 font-mono font-medium text-white">
                        {s.student_id_code}
                      </td>
                      <td className="py-3 px-3 text-white">
                        {s.first_name} {s.last_name}
                      </td>
                      <td className="py-3 px-3 text-text-secondary">{s.department}</td>
                      <td className="py-3 px-3">
                        <RiskBadge
                          category={s.latest_prediction?.risk_category}
                          score={s.latest_prediction?.probability_dropout}
                          showScore
                        />
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Link
                          to={`/students/${s.id}`}
                          className="btn-secondary text-xs py-1 px-2.5 inline-flex items-center gap-1"
                        >
                          Review Profile
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="pt-3 border-t border-[#3A3A3A] text-[11px] text-text-secondary flex items-center justify-between">
            <span>Notice: A risk category is an early-warning signal, never a definitive judgment.</span>
            <Link to="/interventions" className="text-[#19B5D5] hover:underline">
              Manage Support Interventions →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
