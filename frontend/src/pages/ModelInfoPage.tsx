import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import {
  Cpu,
  Database,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Calendar,
  Layers,
  FileCode2
} from 'lucide-react';

export const ModelInfoPage: React.FC = () => {
  const [info, setInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const data = await api.get('/model-info');
        setInfo(data);
      } catch (err) {
        console.error('Failed to load model info:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchInfo();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#282828] border border-[#3A3A3A] p-5 rounded-xl">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-purple-400" />
          <h2 className="text-xl font-bold text-white tracking-wide">
            Model Specifications & Responsible AI Card
          </h2>
        </div>
        <p className="text-xs text-text-secondary mt-1">
          Complete algorithmic transparency, training dataset provenance, and ethical guardrails for institutional compliance.
        </p>
      </div>

      {/* Grid: Architecture & Dataset Provenance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Model Architecture */}
        <div className="card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#19B5D5]" />
            Architecture & Pipeline Overview
          </h3>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-2 border-b border-[#3A3A3A]">
              <span className="text-text-secondary">Model Version</span>
              <span className="font-mono text-white font-semibold">{info?.model_architecture?.version_tag || 'v1.0.0-rf'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#3A3A3A]">
              <span className="text-text-secondary">Algorithm</span>
              <span className="text-white">{info?.model_architecture?.algorithm || 'RandomForestClassifier (150 trees)'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#3A3A3A]">
              <span className="text-text-secondary">Target Classes</span>
              <span className="text-cyan-300 font-mono">Dropout, Enrolled, Graduate (3-class)</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#3A3A3A]">
              <span className="text-text-secondary">Feature Count</span>
              <span className="font-mono text-white">{info?.model_architecture?.feature_count || 36} Standardized Features</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#3A3A3A]">
              <span className="text-text-secondary">Training / Test Cohort</span>
              <span className="font-mono text-white">3,539 Train / 885 Held-out Test</span>
            </div>
          </div>
        </div>

        {/* Dataset Provenance */}
        <div className="card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-400" />
            Dataset Provenance & Benchmark Source
          </h3>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-2 border-b border-[#3A3A3A]">
              <span className="text-text-secondary">Dataset Title</span>
              <span className="text-white font-medium">Predict Students' Dropout & Academic Success</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#3A3A3A]">
              <span className="text-text-secondary">Repository</span>
              <span className="text-[#19B5D5]">UCI Machine Learning Repository (DOI: 10.24432/C5MC89)</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#3A3A3A]">
              <span className="text-text-secondary">Host Institution</span>
              <span className="text-white">Polytechnic Institute of Portalegre, Portugal</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#3A3A3A]">
              <span className="text-text-secondary">Cohort Timeframe</span>
              <span className="text-white">2008/2009 through 2018/2019 academic years</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#3A3A3A]">
              <span className="text-text-secondary">Features Encompassed</span>
              <span className="text-white">Curricular progression, demographics, financial aid, macroeconomic</span>
            </div>
          </div>
        </div>
      </div>

      {/* Methodology & Class Imbalance */}
      <div className="card p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Scale className="w-4 h-4 text-amber-400" />
          Training Methodology & Data Leakage Prevention
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 bg-[#282828] rounded-xl border border-[#3A3A3A] space-y-2">
            <h4 className="font-semibold text-white">Stratified Split Separation</h4>
            <p className="text-text-secondary leading-relaxed">
              An 80/20 stratified split guarantees identical class distributions across training and evaluation splits, ensuring the minority "Enrolled" group (794 samples) is properly evaluated.
            </p>
          </div>

          <div className="p-4 bg-[#282828] rounded-xl border border-[#3A3A3A] space-y-2">
            <h4 className="font-semibold text-white">Zero Preprocessing Leakage</h4>
            <p className="text-text-secondary leading-relaxed">
              StandardScaler parameters are fitted strictly on training data alone. The held-out test cohort remained completely unexposed during feature scaling and hyperparameter selection.
            </p>
          </div>

          <div className="p-4 bg-[#282828] rounded-xl border border-[#3A3A3A] space-y-2">
            <h4 className="font-semibold text-white">Class Weight Balancing</h4>
            <p className="text-text-secondary leading-relaxed">
              Because Graduates outnumber Dropouts (2,209 vs 1,421), inverse class weighting was applied to penalize false negatives on the high-priority Dropout class during tree node splitting.
            </p>
          </div>
        </div>
      </div>

      {/* Institutional Generalizability & Ethical Warning */}
      <div className="card p-6 border-amber-500/30 bg-gradient-to-b from-[#303030] to-amber-950/10 space-y-3">
        <div className="flex items-center gap-2 text-amber-400">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <h3 className="text-sm font-semibold uppercase tracking-wider">
            Institutional Generalizability Disclaimer
          </h3>
        </div>
        <p className="text-xs text-gray-200 leading-relaxed">
          Model performance achieved on historical records from a single European higher-education institution must not be assumed to transfer without calibration. Variations in course grading scales (e.g. 0-20 system vs. 4.0 GPA), academic calendar differences, and socioeconomic contexts require validating model thresholds on local institutional data before deployment.
        </p>
      </div>
    </div>
  );
};
