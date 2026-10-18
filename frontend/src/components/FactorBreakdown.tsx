import React from 'react';
import { FactorDetail } from '../types';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface FactorBreakdownProps {
  factors: FactorDetail[];
  maxItems?: number;
}

export const FactorBreakdown: React.FC<FactorBreakdownProps> = ({ factors, maxItems = 6 }) => {
  if (!factors || factors.length === 0) {
    return <p className="text-sm text-text-secondary italic">No factor attribution available.</p>;
  }

  const displayed = factors.slice(0, maxItems);
  const maxImpact = Math.max(...displayed.map((f) => f.impact), 0.01);

  return (
    <div className="space-y-3">
      {displayed.map((f, i) => {
        const isRisk = f.direction === 'increases_risk';
        const percent = Math.min(100, Math.round((f.impact / maxImpact) * 100));

        return (
          <div key={i} className="text-xs space-y-1">
            <div className="flex justify-between items-center text-text-secondary">
              <span className="font-medium text-text-primary flex items-center gap-1">
                {isRisk ? (
                  <ArrowUpRight className="w-3.5 h-3.5 text-red-400 shrink-0" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                )}
                <span title={`Raw feature key: ${f.feature}`}>{f.label}</span>
              </span>
              <span className="font-mono text-gray-300">
                Value: <span className="text-white font-semibold">{f.value}</span> | SHAP: {f.shap_value > 0 ? `+${f.shap_value}` : f.shap_value}
              </span>
            </div>
            
            <div className="w-full bg-[#252525] h-2 rounded-full overflow-hidden border border-[#3A3A3A]/40 flex">
              {isRisk ? (
                <div
                  className="bg-red-500/80 h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${percent}%` }}
                  title={`Elevates dropout risk (+${f.impact})`}
                />
              ) : (
                <div
                  className="bg-emerald-500/80 h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${percent}%` }}
                  title={`Protective factor (-${f.impact})`}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
