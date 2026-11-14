import React, { useState } from 'react';
import { User, Lock, ShieldCheck, KeyRound } from 'lucide-react';

interface AdminLoginModalProps {
  onLogin: (username: string, password: string) => Promise<void>;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setLoading(true);
    setError(null);
    try {
      await onLogin(username.trim(), password);
    } catch (err: any) {
      setError(err.message || 'Invalid administrator credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="bg-dark-900 border border-dark-800 rounded-2xl max-w-md w-full p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-500 via-teal-400 to-indigo-500" />

        <div className="w-14 h-14 rounded-2xl bg-primary-500/10 border border-primary-500/20 text-primary-400 flex items-center justify-center mx-auto mb-4">
          <KeyRound className="w-7 h-7" />
        </div>

        <h2 className="text-xl font-bold text-slate-100 text-center">
          Administrator Control Center
        </h2>
        <p className="text-xs text-slate-400 text-center mt-1 mb-6">
          Server-side authentication required to access autonomous operations, live monitoring, and game governance.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Administrator Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter administrator username..."
                className="w-full bg-dark-950 border border-dark-750 text-sm text-slate-200 rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Administrator Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter administrator password..."
                className="w-full bg-dark-950 border border-dark-750 text-sm text-slate-200 rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-primary-500"
              />
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500">
              Protected via Argon2id hashing and rate-limited brute force protection.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-500 text-white transition-colors disabled:opacity-50 shadow-lg shadow-primary-500/20 flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            {loading ? 'Authenticating...' : 'Authenticate as Administrator'}
          </button>
        </form>
      </div>
    </div>
  );
};
