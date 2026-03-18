import { useState, type FormEvent } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login({ username: username.trim(), password: password.trim() });
    } catch (err: unknown) {
      const errObj = err as {
        response?: { data?: { detail?: unknown } };
        message?: unknown;
      };
      const detail = errObj?.response?.data?.detail;
      if (typeof detail === 'string' && detail.length > 0) {
        setError(detail);
      } else if (typeof errObj?.message === 'string' && errObj.message.length > 0) {
        setError(errObj.message);
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-[#0e1117] flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <div className="text-3xl font-black tracking-tight text-[#00ff88]">
            MOWBOT<span className="text-white">FLEET</span>
          </div>
          <div className="mt-2 text-xs tracking-widest uppercase text-gray-500">
            Fleet Management System
          </div>
        </div>

        <div className="rounded-2xl border border-gray-800 bg-[#1a1c23] p-8 shadow-2xl">
          <div className="mb-6 text-xs tracking-widest uppercase text-gray-500 font-semibold">
            Sign In
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <div className="mb-2 text-[10px] tracking-widest uppercase text-gray-500 font-semibold">
                Username
              </div>
              <input
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-gray-800 bg-[#0e1117] px-4 py-3 text-sm text-white placeholder:text-gray-600 outline-none focus:border-[#00ff88] transition-colors"
                placeholder="admin"
              />
            </label>

            <label className="block">
              <div className="mb-2 text-[10px] tracking-widest uppercase text-gray-500 font-semibold">
                Password
              </div>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-gray-800 bg-[#0e1117] px-4 py-3 text-sm text-white placeholder:text-gray-600 outline-none focus:border-[#00ff88] transition-colors"
                placeholder="••••••••"
              />
            </label>

            {error && (
              <div className="rounded-xl border border-red-900 bg-red-950/30 px-4 py-3 text-xs text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-xl bg-[#00ff88] py-3 text-sm font-black text-[#0e1117] transition-opacity disabled:opacity-50 hover:opacity-90"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center text-[10px] text-gray-600">
          Default credentials: <span className="font-mono text-gray-500">admin / admin</span>
        </div>
      </div>
    </div>
  );
}
