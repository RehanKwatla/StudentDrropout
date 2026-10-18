import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Menu, LogOut, Shield, User as UserIcon } from 'lucide-react';

interface HeaderProps {
  onToggleSidebar: () => void;
  title?: string;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, title = 'Dashboard' }) => {
  const { user, logout } = useAuth();

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'Administrator':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'Faculty':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/40';
    }
  };

  return (
    <header className="h-16 bg-[#282828] border-b border-[#3A3A3A] sticky top-0 z-30 flex items-center justify-between px-4 md:px-8">
      {/* Mobile Toggle & Title */}
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-text-secondary hover:text-white hover:bg-[#353535] md:hidden"
          aria-label="Toggle navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-base md:text-lg font-semibold text-white tracking-wide">
          {title}
        </h1>
      </div>

      {/* User Info & Actions */}
      <div className="flex items-center gap-3">
        {user && (
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-medium text-white">{user.full_name}</span>
              <span className="text-[11px] text-text-secondary">{user.email}</span>
            </div>

            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${getRoleBadge(user.role)}`}>
              {user.role}
            </span>

            <button
              onClick={() => logout()}
              title="Sign Out"
              className="p-2 rounded-lg text-text-secondary hover:text-red-400 hover:bg-red-500/10 transition border border-transparent hover:border-red-500/20"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
