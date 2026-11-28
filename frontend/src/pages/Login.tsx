import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { getErrorMessage } from '../services/api';
import { login } from '../services/auth.service';
import { useAuth } from '../routes/AuthContext';

export function Login() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [email, setEmail] = useState('admin@companya.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const user = await login(email, password);
      setUser(user);
      navigate('/');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="card animate-fade-up w-full max-w-md rounded-3xl p-8 shadow-2xl">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent">LedgerGuard</p>
        <h1 className="mt-3 text-3xl font-semibold">Sign in</h1>
        <p className="mt-2 text-sm text-slate-400">Tenant identity comes from the verified JWT, never from a query parameter.</p>
        <form className="mt-8 grid gap-4" onSubmit={onSubmit}>
          <label className="grid gap-1 text-xs text-slate-400">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field"
              required
            />
          </label>
          <label className="grid gap-1 text-xs text-slate-400">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field"
              required
            />
          </label>
          {error ? <ErrorMessage message={error} /> : null}
          <button
            type="submit"
            disabled={busy}
            className="button rounded-xl bg-white py-3 text-sm font-semibold text-ink disabled:opacity-60"
          >
            {busy ? 'Signing in…' : 'Continue'}
          </button>
        </form>
        <p className="mt-6 text-xs text-slate-500">
          Demo: admin@companya.com / admin@companyb.com · password123
        </p>
      </div>
    </div>
  );
}
