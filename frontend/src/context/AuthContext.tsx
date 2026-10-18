import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api, ApiError, setAuthToken, setCsrfToken } from '../api/client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ mfaRequired: boolean; pendingToken?: string }>;
  verifyMfa: (pendingToken: string, code: string, isRecoveryCode?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      // Ensure CSRF token cookie is seeded
      await api.get('/auth/csrf');
      const currentUser = await api.get<User>('/auth/me');
      setUser(currentUser);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post<{
      mfa_required: boolean;
      pending_token?: string;
      token?: string;
      csrf_token?: string;
      user?: User;
    }>('/auth/login', { email, password });

    if (res.mfa_required && res.pending_token) {
      return { mfaRequired: true, pendingToken: res.pending_token };
    }

    if (res.token) {
      setAuthToken(res.token);
    }
    if (res.csrf_token) {
      setCsrfToken(res.csrf_token);
    }

    if (res.user) {
      setUser(res.user);
    }
    return { mfaRequired: false };
  };

  const verifyMfa = async (pendingToken: string, code: string, isRecoveryCode: boolean = false) => {
    const res = await api.post<{
      token?: string;
      csrf_token?: string;
      user: User;
    }>('/auth/mfa/verify', {
      pending_token: pendingToken,
      code,
      is_recovery_code: isRecoveryCode,
    });

    if (res.token) {
      setAuthToken(res.token);
    }
    if (res.csrf_token) {
      setCsrfToken(res.csrf_token);
    }

    setUser(res.user);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      setAuthToken(null);
      setCsrfToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, verifyMfa, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
