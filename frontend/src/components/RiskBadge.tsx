import React from 'react';
import { AlertTriangle, AlertCircle, CheckCircle, HelpCircle } from 'lucide-react';

interface RiskBadgeProps {
  category?: string;
  score?: number;
  showScore?: boolean;
  className?: string;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  category = 'Unassessed',
  score,
  showScore = false,
  className = ''
}) => {
  const normCategory = (category || 'Unassessed').toLowerCase();

  if (normCategory.includes('high')) {
    return (
      <span
        title="High Risk — requires timely human review"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/30 ${className}`}
      >
        <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
        <span>High Risk</span>
        {showScore && score !== undefined && (
          <span className="opacity-75">({(score * 100).toFixed(0)}%)</span>
        )}
      </span>
    );
  }

  if (normCategory.includes('medium') || normCategory.includes('moderate')) {
    return (
      <span
        title="Medium Risk — monitor and consider academic support"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 ${className}`}
      >
        <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
        <span>Medium Risk</span>
        {showScore && score !== undefined && (
          <span className="opacity-75">({(score * 100).toFixed(0)}%)</span>
        )}
      </span>
    );
  }

  if (normCategory.includes('low')) {
    return (
      <span
        title="Low Risk — continue routine academic support"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 ${className}`}
      >
        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
        <span>Low Risk</span>
        {showScore && score !== undefined && (
          <span className="opacity-75">({(score * 100).toFixed(0)}%)</span>
        )}
      </span>
    );
  }

  return (
    <span
      title="Unassessed — no prediction generated yet"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-500/15 text-gray-400 border border-gray-500/30 ${className}`}
    >
      <HelpCircle className="w-3.5 h-3.5 text-gray-400" />
      <span>Unassessed</span>
    </span>
  );
};
