import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';

import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { StudentsPage } from './pages/StudentsPage';
import { StudentDetailPage } from './pages/StudentDetailPage';
import { PredictionWorkspacePage } from './pages/PredictionWorkspacePage';
import { ExplainabilityPage } from './pages/ExplainabilityPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { InterventionsPage } from './pages/InterventionsPage';
import { DataImportPage } from './pages/DataImportPage';
import { ModelInfoPage } from './pages/ModelInfoPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { SettingsPage } from './pages/SettingsPage';

const ProtectedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#202020] flex items-center justify-center text-white text-sm">
        Verifying secure session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const getPageTitle = (pathname: string) => {
    if (pathname.startsWith('/students/')) return 'Student Profile & Assessment';
    switch (pathname) {
      case '/dashboard': return 'Faculty Early-Warning Dashboard';
      case '/students': return 'Student Directory & Records';
      case '/predict': return 'ML Prediction & Explanation Workspace';
      case '/explainability': return 'Explainable AI Framework (TreeSHAP)';
      case '/analytics': return 'Cohort Retention Analytics & Evaluation';
      case '/interventions': return 'Student Support Interventions';
      case '/import': return 'Cohort CSV Data Ingestion';
      case '/model-info': return 'Model Specifications & Limitations';
      case '/audit': return 'Security & Compliance Audit Trail';
      case '/settings': return 'Account & Security Settings';
      default: return 'Student Success Dashboard';
    }
  };

  return (
    <div className="min-h-screen bg-[#202020] text-white flex">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 md:pl-64">
        <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} title={getPageTitle(location.pathname)} />
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Application Routes */}
          <Route path="/dashboard" element={<ProtectedLayout><DashboardPage /></ProtectedLayout>} />
          <Route path="/students" element={<ProtectedLayout><StudentsPage /></ProtectedLayout>} />
          <Route path="/students/:id" element={<ProtectedLayout><StudentDetailPage /></ProtectedLayout>} />
          <Route path="/predict" element={<ProtectedLayout><PredictionWorkspacePage /></ProtectedLayout>} />
          <Route path="/explainability" element={<ProtectedLayout><ExplainabilityPage /></ProtectedLayout>} />
          <Route path="/analytics" element={<ProtectedLayout><AnalyticsPage /></ProtectedLayout>} />
          <Route path="/interventions" element={<ProtectedLayout><InterventionsPage /></ProtectedLayout>} />
          <Route path="/import" element={<ProtectedLayout><DataImportPage /></ProtectedLayout>} />
          <Route path="/model-info" element={<ProtectedLayout><ModelInfoPage /></ProtectedLayout>} />
          <Route path="/audit" element={<ProtectedLayout><AuditLogsPage /></ProtectedLayout>} />
          <Route path="/settings" element={<ProtectedLayout><SettingsPage /></ProtectedLayout>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
