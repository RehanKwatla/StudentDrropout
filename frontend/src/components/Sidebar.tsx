import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Brain,
  Compass,
  BarChart3,
  LifeBuoy,
  UploadCloud,
  Cpu,
  ShieldAlert,
  Settings,
  GraduationCap
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();

  const navigation = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Students', href: '/students', icon: Users },
    { name: 'Risk Predictions', href: '/predict', icon: Brain },
    { name: 'Explainable AI', href: '/explainability', icon: Compass },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Interventions', href: '/interventions', icon: LifeBuoy },
    { name: 'Data Import', href: '/import', icon: UploadCloud },
    { name: 'Model Insights', href: '/model-info', icon: Cpu },
    ...(user?.role === 'Administrator'
      ? [{ name: 'Audit Logs', href: '/audit', icon: ShieldAlert }]
      : []),
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-[#282828] border-r border-[#3A3A3A] flex flex-col transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-[#3A3A3A] bg-[#222222]">
          <div className="w-9 h-9 rounded-lg bg-[#19B5D5]/15 border border-[#19B5D5]/40 flex items-center justify-center text-[#19B5D5]">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div className="leading-tight">
            <span className="font-bold text-sm tracking-wide text-white block">STUDENT SUCCESS</span>
            <span className="text-[10px] text-[#19B5D5] font-mono tracking-wider uppercase">Early-Warning XAI</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={() => onClose()}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-[#19B5D5]/15 text-[#19B5D5] border border-[#19B5D5]/30'
                    : 'text-[#B8B8B8] hover:text-white hover:bg-[#353535]'
                }`
              }
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>

        {/* System & Model Status Footer */}
        <div className="p-4 border-t border-[#3A3A3A] bg-[#222222] text-xs text-[#B8B8B8]">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-white">PostgreSQL 18</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono">RLS</span>
          </div>
          <p className="text-[11px] text-gray-400">Model: <span className="text-gray-200">v1.0.0-rf</span> (TreeSHAP)</p>
        </div>
      </aside>
    </>
  );
};
