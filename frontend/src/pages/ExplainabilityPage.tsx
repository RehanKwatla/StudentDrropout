import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Compass, Brain, ShieldAlert, CheckCircle2, HelpCircle, BarChart2 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer
} from 'recharts';

interface GlobalExplanationResponse {
  model_version: string;
  algorithm: string;
  explanation_method: string;
  global_importance: Array<{
    feature: string;
    label: string;
    importance: number;
  }>;
  target_classes: Array<{ class: string; description: string }>;
  ethical_guidance: {
    correlation_vs_causation: string;
    human_in_the_loop: string;
    institutional_generalizability: string;
  };
}

export const ExplainabilityPage: React.FC = () => {
  const [data, setData] = useState<GlobalExplanationResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGlobalXAI = async () => {
      try {
        const res = await api.get<GlobalExplanationResponse>('/explainability/global');
        setData(res);
      } catch (err) {
        console.error('Failed to load global XAI data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchGlobalXAI();
  }, []);

  const chartData = (data?.global_importance || []).slice(0, 10).map((item) => ({
    name: item.label,
    importance: parseFloat(item.importance.toFixed(3)),
  }));

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#282828] border border-[#3A3A3A] p-5 rounded-xl">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-[#19B5D5]" />
          <h2 className="text-xl font-bold text-white tracking-wide">
            Explainable AI (XAI) Framework
          </h2>
        </div>
        <p className="text-xs text-text-secondary mt-1">
          Rigorous, transparent decision-support powered by game-theoretic TreeSHAP (SHapley Additive exPlanations).
        </p>
      </div>

      {/* Global Feature Importance Chart */}
      <div className="card p-6 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-[#19B5D5]" />
            Global Feature Importance (Mean |SHAP Value| Across Cohort)
          </h3>
          <p className="text-xs text-text-secondary mt-0.5">
            Top academic and socio-economic variables that exert the highest overall influence on the model's dropout probability estimates.
          </p>
        </div>

        <div className="h-80 w-full pt-4">
          {loading ? (
            <div className="h-full flex items-center justify-center text-xs text-text-secondary">
              Loading SHAP values...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 160, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#3A3A3A" horizontal={false} />
                <XAxis
                  type="number"
                  stroke="#888888"
                  fontSize={11}
                  tickLine={false}
                  label={{ value: 'Mean Absolute SHAP Impact', position: 'insideBottom', offset: -5, fill: '#888888', fontSize: 10 }}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="#CCCCCC"
                  fontSize={11}
                  tickLine={false}
                  width={150}
                />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: '#282828', borderColor: '#3A3A3A', fontSize: '12px' }}
                  itemStyle={{ color: '#19B5D5' }}
                  formatter={(val: any) => [`Impact: ${val}`, 'SHAP Importance']}
                />
                <Bar dataKey="importance" fill="#19B5D5" radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Critical Distinction: Correlation vs Causation */}
      <div className="card p-6 border-cyan-500/30 bg-gradient-to-b from-[#303030] to-cyan-950/10 space-y-3">
        <div className="flex items-center gap-2 text-[#19B5D5]">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <h3 className="text-sm font-semibold uppercase tracking-wider">
            Critical Guidance: Correlation vs. Causation
          </h3>
        </div>
        <p className="text-xs text-gray-200 leading-relaxed">
          {data?.ethical_guidance.correlation_vs_causation || (
            "Feature contributions indicate statistical correlation within the trained machine learning model, not deterministic causation. A high positive SHAP value for 'Tuition fees not up to date' indicates that historically, students in this financial condition experienced higher dropout rates in this dataset; it does not imply the student cannot succeed or that this factor alone caused departure."
          )}
        </p>
      </div>

      {/* Three Pillars: Methodology, Target Classes, and Responsible Practice */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
        {/* Method */}
        <div className="card p-5 space-y-2">
          <h4 className="font-semibold text-white flex items-center gap-1.5 text-sm">
            <Brain className="w-4 h-4 text-purple-400" />
            TreeSHAP Attribution
          </h4>
          <p className="text-text-secondary leading-relaxed">
            Unlike heuristic feature importance scores (such as Gini impurity), TreeSHAP guarantees mathematical fairness, consistency, and additivity based on cooperative game theory.
          </p>
        </div>

        {/* Human-in-the-loop */}
        <div className="card p-5 space-y-2">
          <h4 className="font-semibold text-white flex items-center gap-1.5 text-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Human-in-the-Loop Protocol
          </h4>
          <p className="text-text-secondary leading-relaxed">
            Predictions serve solely as early warnings to trigger optional, proactive advisor reach-out. The system enforces strict policies against automated student penalties or restrictions.
          </p>
        </div>

        {/* Generalizability */}
        <div className="card p-5 space-y-2">
          <h4 className="font-semibold text-white flex items-center gap-1.5 text-sm">
            <HelpCircle className="w-4 h-4 text-amber-400" />
            Institutional Context
          </h4>
          <p className="text-text-secondary leading-relaxed">
            The model was trained on the UCI Higher Education benchmark dataset. While core indicators (course pass rates, fees) are robust, new institutions should calibrate probability thresholds locally.
          </p>
        </div>
      </div>
    </div>
  );
};
