import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, Lock, Mail, AlertCircle, KeyRound, ArrowRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, verifyMfa } = useAuth();

  const [email, setEmail] = useState('faculty.smith@university.edu');
  const [password, setPassword] = useState('FacultyPass123!Secure');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // MFA Flow States
  const [mfaRequired, setMfaRequired] = useState(false);
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [isRecoveryCode, setIsRecoveryCode] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mfaRequired && pendingToken) {
        await verifyMfa(pendingToken, mfaCode, isRecoveryCode);
        navigate('/dashboard');
      } else {
        const res = await login(email, password);
        if (res.mfaRequired && res.pendingToken) {
          setMfaRequired(true);
          setPendingToken(res.pendingToken);
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const setDemoAccount = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#202020] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#282828] border border-[#3A3A3A] rounded-2xl shadow-2xl p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-[#19B5D5]/15 border border-[#19B5D5]/40 flex items-center justify-center text-[#19B5D5] mx-auto">
            <GraduationCap className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Faculty & Staff Sign In</h2>
          <p className="text-xs text-text-secondary">
            Student Success Early-Warning System (Explainable AI)
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!mfaRequired ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Institutional Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="advisor@university.edu"
                  className="input-field w-full pl-9"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="input-field w-full pl-9"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 mt-2 font-medium"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </form>
        ) : (
          /* MFA Verification View */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-3 bg-[#303030] rounded-lg border border-[#3A3A3A] text-xs text-text-secondary">
              <KeyRound className="w-5 h-5 text-[#19B5D5] mb-2" />
              <p className="font-semibold text-white mb-1">Two-Factor Authentication Required</p>
              <p>Enter the 6-digit TOTP code from your mobile authenticator app, or use an emergency recovery code.</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                {isRecoveryCode ? 'Emergency Recovery Code' : '6-Digit Authenticator Code'}
              </label>
              <input
                type="text"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                required
                maxLength={isRecoveryCode ? 25 : 6}
                placeholder={isRecoveryCode ? 'XXXX-XXXX' : '123456'}
                className="input-field w-full text-center text-lg tracking-widest font-mono"
              />
            </div>

            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => setIsRecoveryCode(!isRecoveryCode)}
                className="text-[#19B5D5] hover:underline"
              >
                {isRecoveryCode ? 'Use 6-digit TOTP code' : 'Use recovery code instead'}
              </button>
              <button
                type="button"
                onClick={() => setMfaRequired(false)}
                className="text-gray-400 hover:text-white"
              >
                Back
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || !mfaCode.trim()}
              className="btn-primary w-full py-2.5"
            >
              {loading ? 'Verifying Code...' : 'Verify & Continue'}
            </button>
          </form>
        )}

        {/* Demo Quick-Fill Accounts */}
        <div className="pt-4 border-t border-[#3A3A3A] space-y-2">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-center">
            Demo Evaluation Accounts
          </p>
          <div className="grid grid-cols-1 gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setDemoAccount('faculty.smith@university.edu', 'FacultyPass123!Secure')}
              className="p-2 rounded bg-[#303030] hover:bg-[#383838] border border-[#3A3A3A] text-left flex justify-between items-center transition"
            >
              <div>
                <span className="font-medium text-cyan-300 block">Faculty Advisor</span>
                <span className="text-[11px] text-gray-400">faculty.smith@university.edu</span>
              </div>
              <span className="text-[10px] bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded">Select</span>
            </button>

            <button
              type="button"
              onClick={() => setDemoAccount('admin@university.edu', 'AdminPass123!Secure')}
              className="p-2 rounded bg-[#303030] hover:bg-[#383838] border border-[#3A3A3A] text-left flex justify-between items-center transition"
            >
              <div>
                <span className="font-medium text-purple-300 block">Administrator</span>
                <span className="text-[11px] text-gray-400">admin@university.edu</span>
              </div>
              <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">Select</span>
            </button>

            <button
              type="button"
              onClick={() => setDemoAccount('reviewer@university.edu', 'ReviewerPass123!Secure')}
              className="p-2 rounded bg-[#303030] hover:bg-[#383838] border border-[#3A3A3A] text-left flex justify-between items-center transition"
            >
              <div>
                <span className="font-medium text-gray-300 block">Read-Only Reviewer</span>
                <span className="text-[11px] text-gray-400">reviewer@university.edu</span>
              </div>
              <span className="text-[10px] bg-gray-500/20 text-gray-400 px-2 py-0.5 rounded">Select</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
