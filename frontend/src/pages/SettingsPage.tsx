import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import {
  Settings,
  Shield,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Copy,
  Eye,
  RefreshCw
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, refreshUser } = useAuth();

  // MFA Setup States
  const [setupData, setSetupData] = useState<{
    secret: string;
    otpauth_uri: string;
    recovery_codes: string[];
  } | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupSuccess, setSetupSuccess] = useState<string | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleStartMFASetup = async () => {
    setSetupLoading(true);
    setSetupError(null);
    try {
      const res = await api.post<any>('/auth/mfa/setup');
      setSetupData(res);
    } catch (err: any) {
      setSetupError(err?.message || 'Failed to initiate MFA setup.');
    } finally {
      setSetupLoading(false);
    }
  };

  const handleConfirmMFA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupData || !verifyCode.trim()) return;

    setSetupLoading(true);
    setSetupError(null);
    try {
      await api.post('/auth/mfa/enable', {
        secret: setupData.secret,
        code: verifyCode,
        recovery_codes: setupData.recovery_codes,
      });
      setSetupSuccess('Multi-factor authentication (TOTP) successfully activated on your account.');
      setSetupData(null);
      setVerifyCode('');
      refreshUser();
    } catch (err: any) {
      setSetupError(err?.message || 'Invalid 6-digit confirmation code. Please check your authenticator app.');
    } finally {
      setSetupLoading(false);
    }
  };

  const copyRecoveryCodes = () => {
    if (!setupData) return;
    navigator.clipboard.writeText(setupData.recovery_codes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Banner */}
      <div className="bg-[#282828] border border-[#3A3A3A] p-5 rounded-xl">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-[#19B5D5]" />
          <h2 className="text-xl font-bold text-white tracking-wide">
            Account & Security Settings
          </h2>
        </div>
        <p className="text-xs text-text-secondary mt-1">
          Manage identity security, multi-factor authentication (TOTP), and review institutional access controls.
        </p>
      </div>

      {setupSuccess && (
        <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{setupSuccess}</span>
        </div>
      )}

      {setupError && (
        <div className="p-4 bg-red-500/15 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{setupError}</span>
        </div>
      )}

      {/* Account Profile Card */}
      <div className="card p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Shield className="w-4 h-4 text-cyan-400" />
          Authenticated User Profile
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-[#282828] rounded-lg border border-[#3A3A3A]">
            <span className="text-text-secondary block mb-1">Full Name</span>
            <span className="text-white font-semibold text-sm">{user?.full_name}</span>
          </div>

          <div className="p-3 bg-[#282828] rounded-lg border border-[#3A3A3A]">
            <span className="text-text-secondary block mb-1">Institutional Email</span>
            <span className="text-white font-semibold text-sm">{user?.email}</span>
          </div>

          <div className="p-3 bg-[#282828] rounded-lg border border-[#3A3A3A]">
            <span className="text-text-secondary block mb-1">Server-Side Role</span>
            <span className="text-cyan-300 font-semibold text-sm">{user?.role}</span>
          </div>

          <div className="p-3 bg-[#282828] rounded-lg border border-[#3A3A3A]">
            <span className="text-text-secondary block mb-1">MFA Status</span>
            <span className={`font-semibold text-sm ${user?.mfa_enabled ? 'text-emerald-400' : 'text-amber-400'}`}>
              {user?.mfa_enabled ? 'Active (TOTP Authenticator)' : 'Not Configured'}
            </span>
          </div>
        </div>
      </div>

      {/* Multi-Factor Authentication Card */}
      <div className="card p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-purple-400" />
              Two-Factor Authentication (TOTP)
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Secure your account using standard TOTP apps (Google Authenticator, Microsoft Authenticator, 1Password).
            </p>
          </div>

          {!user?.mfa_enabled && !setupData && (
            <button
              onClick={handleStartMFASetup}
              disabled={setupLoading}
              className="btn-primary text-xs py-2 px-3"
            >
              {setupLoading ? 'Preparing...' : 'Set Up TOTP MFA'}
            </button>
          )}
        </div>

        {/* MFA Setup Wizard */}
        {setupData && (
          <div className="p-5 bg-[#252525] rounded-xl border border-[#3A3A3A] space-y-5 animate-fadeIn">
            <div>
              <span className="text-xs font-semibold text-[#19B5D5] block mb-1">Step 1: Save Your Base32 Secret Key</span>
              <p className="text-xs text-text-secondary mb-2">
                Enter this secret manually into your authenticator app:
              </p>
              <div className="p-3 bg-[#1e1e1e] rounded-lg border border-[#3A3A3A] font-mono text-cyan-300 text-sm tracking-wider flex justify-between items-center select-all">
                <span>{setupData.secret}</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-white">Step 2: Save Emergency Recovery Codes</span>
                <button
                  type="button"
                  onClick={copyRecoveryCodes}
                  className="text-xs text-[#19B5D5] hover:underline flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copied ? 'Copied!' : 'Copy All'}
                </button>
              </div>
              <p className="text-[11px] text-text-secondary mb-2">
                Store these single-use recovery codes in a secure password manager.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-[#1e1e1e] rounded-lg border border-[#3A3A3A] font-mono text-xs text-gray-300">
                {setupData.recovery_codes.map((c, i) => (
                  <div key={i} className="py-1 px-2 bg-[#282828] rounded text-center">
                    {c}
                  </div>
                ))}
              </div>
            </div>

            {/* Confirmation form */}
            <form onSubmit={handleConfirmMFA} className="space-y-3 pt-2 border-t border-[#3A3A3A]">
              <span className="text-xs font-semibold text-white block">Step 3: Enter Current 6-Digit Code</span>
              <div className="flex gap-3">
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="123456"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value)}
                  className="input-field text-center font-mono text-base tracking-widest max-w-xs"
                />
                <button
                  type="submit"
                  disabled={setupLoading || verifyCode.length !== 6}
                  className="btn-primary text-xs py-2 px-4"
                >
                  {setupLoading ? 'Confirming...' : 'Verify & Enable'}
                </button>
                <button
                  type="button"
                  onClick={() => setSetupData(null)}
                  className="btn-secondary text-xs py-2 px-3"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Security Architecture & Storage Policy Card */}
      <div className="card p-6 space-y-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Lock className="w-4 h-4 text-emerald-400" />
          Active Security Architecture & Controls
        </h3>

        <div className="space-y-2 text-xs text-text-secondary leading-relaxed">
          <p>
            • <strong>No Tokens in LocalStorage:</strong> Session identifiers and JWT credentials are managed in server-controlled <code className="text-cyan-300">HttpOnly</code>, <code className="text-cyan-300">SameSite=Lax</code> cookies.
          </p>
          <p>
            • <strong>Anti-CSRF Verification:</strong> State-changing requests (POST, PUT, PATCH, DELETE) require a cryptographically unguessable <code className="text-cyan-300">X-CSRF-Token</code> header.
          </p>
          <p>
            • <strong>Argon2id Hashing:</strong> Passwords are protected using modern Argon2id with 64MB memory cost and automatic cryptographic salting.
          </p>
          <p>
            • <strong>PostgreSQL Row-Level Security:</strong> Policies isolate faculty notes and confidential records at the database engine level.
          </p>
        </div>
      </div>
    </div>
  );
};
