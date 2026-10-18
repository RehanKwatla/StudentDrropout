import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { AuditLog } from '../types';
import { ShieldAlert, Search, Filter, Clock, User, Shield } from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [emailFilter, setEmailFilter] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (actionFilter) params.append('action', actionFilter);
      if (emailFilter) params.append('user_email', emailFilter);

      const data = await api.get<AuditLog[]>(`/audit/logs?${params.toString()}`);
      setLogs(data || []);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, emailFilter]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#282828] border border-[#3A3A3A] p-5 rounded-xl">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-red-400" />
          <h2 className="text-xl font-bold text-white tracking-wide">
            Security & Compliance Audit Trail
          </h2>
        </div>
        <p className="text-xs text-text-secondary mt-1">
          Chronological record of authentication attempts, model evaluations, data mutations, and administrative actions.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <Filter className="w-3.5 h-3.5 text-[#19B5D5]" />
          <span>Action:</span>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="input-field text-xs py-1.5 bg-[#282828]"
          >
            <option value="">All Actions</option>
            <option value="AUTH_LOGIN_SUCCESS">AUTH_LOGIN_SUCCESS</option>
            <option value="AUTH_LOGIN_FAILED">AUTH_LOGIN_FAILED</option>
            <option value="PREDICTION_GENERATED">PREDICTION_GENERATED</option>
            <option value="STUDENT_CREATED">STUDENT_CREATED</option>
            <option value="STUDENT_UPDATED">STUDENT_UPDATED</option>
            <option value="INTERVENTION_CREATED">INTERVENTION_CREATED</option>
            <option value="CSV_IMPORT_COMPLETED">CSV_IMPORT_COMPLETED</option>
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs text-text-secondary flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 text-gray-500" />
          <input
            type="text"
            placeholder="Filter by user email..."
            value={emailFilter}
            onChange={(e) => setEmailFilter(e.target.value)}
            className="input-field text-xs py-1.5 w-full"
          />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#282828] text-text-secondary border-b border-[#3A3A3A]">
              <tr>
                <th className="py-3 px-4 font-medium">Timestamp (UTC)</th>
                <th className="py-3 px-4 font-medium">Event Action</th>
                <th className="py-3 px-4 font-medium">Initiator</th>
                <th className="py-3 px-4 font-medium">IP Address</th>
                <th className="py-3 px-4 font-medium">Target Resource</th>
                <th className="py-3 px-4 font-medium">Metadata Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3A3A3A]/40 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-text-secondary">
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-text-secondary">
                    No matching audit records found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#353535]/30">
                    <td className="py-2.5 px-4 text-text-secondary">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        log.action.includes('FAILED')
                          ? 'bg-red-500/20 text-red-400'
                          : log.action.includes('SUCCESS')
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-cyan-500/20 text-cyan-400'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-sans text-white">
                      {log.user_email || 'System / Unauth'}
                    </td>
                    <td className="py-2.5 px-4 text-gray-400">{log.ip_address || '127.0.0.1'}</td>
                    <td className="py-2.5 px-4 font-sans text-text-secondary">
                      {log.resource_type ? `${log.resource_type}:${log.resource_id?.slice(0, 8)}...` : 'N/A'}
                    </td>
                    <td className="py-2.5 px-4 text-gray-400 max-w-xs truncate">
                      {log.details ? JSON.stringify(log.details) : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
