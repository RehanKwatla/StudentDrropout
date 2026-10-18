import React from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  ShieldCheck,
  Brain,
  HelpCircle,
  LifeBuoy,
  ArrowRight,
  Database,
  Search,
  CheckCircle,
  Lock
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#202020] text-white flex flex-col">
      {/* Top Navbar */}
      <header className="h-20 border-b border-[#3A3A3A] px-6 md:px-12 flex items-center justify-between bg-[#282828]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#19B5D5]/15 border border-[#19B5D5]/40 flex items-center justify-center text-[#19B5D5]">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <span className="font-bold text-base tracking-wide text-white block">STUDENT SUCCESS</span>
            <span className="text-[11px] text-[#19B5D5] font-mono tracking-wider uppercase">Early-Warning System</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link
            to="/login"
            className="btn-primary text-sm px-5 py-2.5 shadow-lg shadow-[#19B5D5]/20"
          >
            Sign In to Dashboard
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-6 md:px-12 py-20 md:py-28 max-w-6xl mx-auto flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#19B5D5]/15 border border-[#19B5D5]/30 text-[#19B5D5] text-xs font-medium mb-6">
          <Brain className="w-4 h-4" />
          Explainable AI for Student Dropout Prediction
        </div>

        <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-tight max-w-4xl leading-tight md:leading-tight mb-6">
          Identify Risk Earlier. <br className="hidden sm:inline" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-[#19B5D5]">
            Support Students Better.
          </span>
        </h1>

        <p className="text-base md:text-lg text-text-secondary max-w-2xl leading-relaxed mb-10">
          An academic decision-support platform designed to assist university faculty and advisors in identifying students at risk of departure, understanding the underlying academic and financial drivers through transparent SHAP attributions, and initiating timely human interventions.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/login"
            className="btn-primary text-base px-6 py-3 font-semibold shadow-lg shadow-[#19B5D5]/25"
          >
            Launch Faculty Workspace
            <ArrowRight className="w-5 h-5 ml-1" />
          </Link>
          <a
            href="#process"
            className="btn-secondary text-base px-6 py-3"
          >
            How the System Works
          </a>
        </div>
      </section>

      {/* Feature Cards (3 core pillars) */}
      <section className="px-6 md:px-12 py-16 max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="card p-6 bg-[#282828] border border-[#3A3A3A] rounded-xl hover:border-[#19B5D5]/40 transition">
            <div className="w-12 h-12 rounded-lg bg-[#19B5D5]/15 border border-[#19B5D5]/30 flex items-center justify-center text-[#19B5D5] mb-5">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">1. Early Risk Identification</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              Detects disengagement indicators during first and second semesters—such as sudden drops in approved curricular units or unpaid fees—months before academic withdrawal occurs.
            </p>
          </div>

          {/* Card 2 */}
          <div className="card p-6 bg-[#282828] border border-[#3A3A3A] rounded-xl hover:border-[#19B5D5]/40 transition">
            <div className="w-12 h-12 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-5">
              <Brain className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">2. Explainable AI Predictions</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              No black-box predictions. Uses game-theoretic TreeSHAP values to decompose individual forecasts into specific positive risk drivers and protective academic factors for faculty clarity.
            </p>
          </div>

          {/* Card 3 */}
          <div className="card p-6 bg-[#282828] border border-[#3A3A3A] rounded-xl hover:border-[#19B5D5]/40 transition">
            <div className="w-12 h-12 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-5">
              <LifeBuoy className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">3. Actionable Student Support</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              Transitions predictions immediately into advisor workflows: schedule tutoring, coordinate financial aid review, assign faculty mentors, and record follow-up history with strict privacy controls.
            </p>
          </div>
        </div>
      </section>

      {/* Four-Stage Process */}
      <section id="process" className="px-6 md:px-12 py-16 bg-[#252525] border-y border-[#3A3A3A]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
              The 4-Stage Decision Support Workflow
            </h2>
            <p className="text-sm text-text-secondary">
              A transparent feedback loop empowering educators without automating high-stakes decisions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-[#303030] p-5 rounded-xl border border-[#3A3A3A] relative">
              <span className="text-xs font-mono text-[#19B5D5] font-bold block mb-2">STAGE 01</span>
              <h4 className="font-semibold text-white mb-1">Student Data</h4>
              <p className="text-xs text-text-secondary">
                Securely ingests demographic, enrollment, and semester curricular progression records.
              </p>
            </div>

            <div className="bg-[#303030] p-5 rounded-xl border border-[#3A3A3A] relative">
              <span className="text-xs font-mono text-[#19B5D5] font-bold block mb-2">STAGE 02</span>
              <h4 className="font-semibold text-white mb-1">ML Prediction</h4>
              <p className="text-xs text-text-secondary">
                Calibrated Random Forest model evaluates dropout, enrolled, and graduation probabilities.
              </p>
            </div>

            <div className="bg-[#303030] p-5 rounded-xl border border-[#3A3A3A] relative">
              <span className="text-xs font-mono text-[#19B5D5] font-bold block mb-2">STAGE 03</span>
              <h4 className="font-semibold text-white mb-1">XAI Explanation</h4>
              <p className="text-xs text-text-secondary">
                SHAP generates localized feature impact breakdowns distinguishing correlation from causation.
              </p>
            </div>

            <div className="bg-[#303030] p-5 rounded-xl border border-[#3A3A3A] relative">
              <span className="text-xs font-mono text-[#19B5D5] font-bold block mb-2">STAGE 04</span>
              <h4 className="font-semibold text-white mb-1">Faculty Action</h4>
              <p className="text-xs text-text-secondary">
                Advisors review recommendations, initiate tailored tutoring or mentoring, and monitor follow-ups.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Responsible AI Notice */}
      <section className="px-6 md:px-12 py-16 max-w-4xl mx-auto text-center">
        <div className="p-6 rounded-xl bg-[#282828] border border-[#3A3A3A] text-left flex items-start gap-4">
          <ShieldCheck className="w-8 h-8 text-[#19B5D5] shrink-0 mt-1" />
          <div className="space-y-1">
            <h4 className="font-semibold text-white text-sm">Commitment to Responsible AI & Student Privacy</h4>
            <p className="text-xs text-text-secondary leading-relaxed">
              Risk scores are probabilistic decision-support estimates and must never be treated as definitive judgments or automated institutional penalties. All records are protected under PostgreSQL Row-Level Security, least-privilege role boundaries, and audit logging.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-[#3A3A3A] bg-[#181818] px-6 md:px-12 py-8 text-xs text-text-secondary flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <p className="text-white font-medium">Student Success Early-Warning System (XAI)</p>
          <p className="text-gray-400 mt-0.5">Academic Engineering Demonstration • Model Version v1.0.0-rf</p>
        </div>
        <div className="flex items-center gap-6">
          <Link to="/login" className="hover:text-white transition">Sign In</Link>
          <a href="https://archive.ics.uci.edu/dataset/697/predict+students+dropout+and+academic+success" target="_blank" rel="noreferrer" className="hover:text-white transition">UCI Dataset</a>
        </div>
      </footer>
    </div>
  );
};
