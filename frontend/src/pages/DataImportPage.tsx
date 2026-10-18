import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { ImportJob } from '../types';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Download,
  Clock,
  RefreshCw,
  Info
} from 'lucide-react';

export const DataImportPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ImportJob[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const fetchHistory = async () => {
    try {
      const data = await api.get<ImportJob[]>('/imports/history');
      setHistory(data || []);
    } catch (err) {
      console.error('Failed to load import history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (!selected.name.toLowerCase().endsWith('.csv')) {
        setError('Only .csv files are supported.');
        setFile(null);
        return;
      }
      setFile(selected);
      setError(null);
      setResult(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post<ImportJob>('/imports/csv', formData);
      setResult(res);
      setFile(null);
      fetchHistory();
    } catch (err: any) {
      setError(err?.message || 'CSV upload failed. Please verify headers.');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadSample = () => {
    const sampleHeaders = [
      'student_id_code',
      'first_name',
      'last_name',
      'email',
      'department',
      'course',
      'semester',
      'admission_year',
      'curricular_units_1st_sem_enrolled',
      'curricular_units_1st_sem_approved',
      'curricular_units_1st_sem_grade',
      'curricular_units_2nd_sem_enrolled',
      'curricular_units_2nd_sem_approved',
      'curricular_units_2nd_sem_grade',
      'tuition_fees_up_to_date',
      'debtor',
      'scholarship_holder',
      'admission_grade',
      'current_academic_status'
    ];
    const sampleRow = [
      'STU-2024-099',
      'Demo',
      'Student',
      'demo.student@university.edu',
      'Engineering',
      'Informatics Engineering',
      '2',
      '2024',
      '6',
      '5',
      '13.5',
      '6',
      '5',
      '14.0',
      '1',
      '0',
      '0',
      '130.0',
      'Enrolled'
    ];
    const csvContent = [sampleHeaders.join(','), sampleRow.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'student_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#282828] border border-[#3A3A3A] p-5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-[#19B5D5]" />
            <h2 className="text-xl font-bold text-white tracking-wide">
              Cohort CSV Ingestion
            </h2>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Batch import student demographics and curricular indicators with schema validation and duplicate detection.
          </p>
        </div>

        <button
          onClick={handleDownloadSample}
          className="btn-secondary text-xs py-2 px-3 flex items-center gap-2 self-start sm:self-auto"
        >
          <Download className="w-4 h-4" /> Download CSV Template
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/15 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Upload Zone */}
      <div className="card p-6">
        <form onSubmit={handleUpload} className="space-y-5">
          <div className="border-2 border-dashed border-[#3A3A3A] hover:border-[#19B5D5]/60 rounded-xl p-8 text-center transition bg-[#252525] relative">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center gap-3 pointer-events-none">
              <div className="w-12 h-12 rounded-xl bg-[#19B5D5]/15 border border-[#19B5D5]/30 flex items-center justify-center text-[#19B5D5]">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  {file ? file.name : 'Click or drag CSV file here to upload'}
                </p>
                <p className="text-xs text-text-secondary mt-1">
                  Format: UTF-8 encoded .CSV (Max file size: 5 MB)
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center text-xs">
            <div className="text-text-secondary flex items-center gap-1.5">
              <Info className="w-4 h-4 text-[#19B5D5]" />
              <span>Rows with duplicate student codes or emails will be reported safely without halting valid rows.</span>
            </div>

            <button
              type="submit"
              disabled={!file || uploading}
              className="btn-primary text-xs py-2 px-4 shadow-lg shadow-[#19B5D5]/20"
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Validating & Ingesting...
                </>
              ) : (
                'Upload & Commit Cohort'
              )}
            </button>
          </div>
        </form>

        {/* Upload Result Summary */}
        {result && (
          <div className="mt-6 p-5 bg-[#282828] rounded-xl border border-emerald-500/30 space-y-4 animate-fadeIn">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
              <h4 className="text-sm font-semibold">Import Job Completed: {result.filename}</h4>
            </div>

            <div className="grid grid-cols-4 gap-3 text-center text-xs">
              <div className="p-3 bg-[#303030] rounded-lg border border-[#3A3A3A]">
                <span className="text-text-secondary block mb-1">Total Processed</span>
                <span className="text-white font-bold text-base font-mono">{result.total_rows}</span>
              </div>
              <div className="p-3 bg-[#303030] rounded-lg border border-[#3A3A3A]">
                <span className="text-emerald-400 block mb-1">Successfully Added</span>
                <span className="text-emerald-400 font-bold text-base font-mono">{result.success_rows}</span>
              </div>
              <div className="p-3 bg-[#303030] rounded-lg border border-[#3A3A3A]">
                <span className="text-amber-400 block mb-1">Duplicates Skipped</span>
                <span className="text-amber-400 font-bold text-base font-mono">{result.duplicate_rows}</span>
              </div>
              <div className="p-3 bg-[#303030] rounded-lg border border-[#3A3A3A]">
                <span className="text-red-400 block mb-1">Format Errors</span>
                <span className="text-red-400 font-bold text-base font-mono">{result.error_rows}</span>
              </div>
            </div>

            {result.error_log && result.error_log.length > 0 && (
              <div className="p-3 bg-[#202020] rounded-lg border border-red-500/20 text-xs text-red-300">
                <span className="font-semibold block mb-1">Row Validation Warnings:</span>
                <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                  {result.error_log.map((err: any, idx: number) => (
                    <li key={idx}>Row {err.row}: {err.error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Historical Import Jobs */}
      <div className="card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          Import Audit History
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#282828] text-text-secondary border-b border-[#3A3A3A]">
              <tr>
                <th className="py-2.5 px-3">Filename</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Total Rows</th>
                <th className="py-2.5 px-3">Successful</th>
                <th className="py-2.5 px-3">Duplicates</th>
                <th className="py-2.5 px-3 text-right">Errors</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3A3A3A]/40 font-mono">
              {loadingHistory ? (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-text-secondary">
                    Loading history...
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-text-secondary">
                    No past import jobs recorded.
                  </td>
                </tr>
              ) : (
                history.map((job) => (
                  <tr key={job.id} className="hover:bg-[#353535]/30">
                    <td className="py-2.5 px-3 text-white font-sans">{job.filename}</td>
                    <td className="py-2.5 px-3 text-text-secondary">
                      {new Date(job.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-3 text-white">{job.total_rows}</td>
                    <td className="py-2.5 px-3 text-emerald-400 font-bold">{job.success_rows}</td>
                    <td className="py-2.5 px-3 text-amber-400">{job.duplicate_rows}</td>
                    <td className="py-2.5 px-3 text-right text-red-400">{job.error_rows}</td>
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
