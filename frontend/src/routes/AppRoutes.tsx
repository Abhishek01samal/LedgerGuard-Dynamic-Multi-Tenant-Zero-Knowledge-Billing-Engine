import { BarChart3, LayoutDashboard, LogOut, Receipt, Wallet } from 'lucide-react';
import { useCallback, useEffect, type ReactNode } from 'react';
import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { useAuthExpiry } from '../hooks/useAuthExpiry';
import { Analytics } from '../pages/Analytics';
import { Billing } from '../pages/Billing';
import { Dashboard } from '../pages/Dashboard';
import { Ledger } from '../pages/Ledger';
import { Login } from '../pages/Login';
import { logout } from '../services/auth.service';
import { useAuth } from './AuthContext';

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/billing', label: 'Billing', icon: Wallet },
  { to: '/ledger', label: 'Ledger', icon: Receipt },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
];

function Shell({ children }: { children: ReactNode }) {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const onExpired = useCallback(() => {
    setUser(null);
    navigate('/login');
  }, [navigate, setUser]);
  useAuthExpiry(Boolean(user), onExpired);

  async function onLogout() {
    await logout().catch(() => undefined);
    setUser(null);
    navigate('/login');
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="border-b border-line bg-panel/70 px-4 py-5 lg:border-b-0 lg:border-r">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent">LedgerGuard</p>
        <p className="mt-3 text-sm text-slate-300">{user?.email}</p>
        <p className="font-mono text-xs text-slate-500">{user?.tenantId}</p>
        <nav className="mt-8 grid gap-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `button flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-all ${isActive ? 'translate-x-1 bg-white/15 text-white shadow-[inset_2px_0_0_#fff]' : 'text-slate-300 hover:translate-x-1 hover:bg-white/10 hover:text-white'}`
              }
            >
              <item.icon size={16} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button onClick={() => void onLogout()} className="button mt-8 flex items-center gap-2 px-3 text-sm text-slate-400 hover:text-white">
          <LogOut size={16} />
          Log out
        </button>
      </aside>
      <main className="px-4 py-6 lg:px-10 lg:py-8">{children}</main>
    </div>
  );
}

function Protected({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  if (!ready) return <LoadingSpinner label="Checking session" />;
  if (!user) return <Navigate to="/login" replace />;
  return <Shell>{children}</Shell>;
}

export function AppRoutes() {
  const { setUser, setReady, user } = useAuth();
  const bootstrap = useAuthExpiry(true, () => {
    setUser(null);
    setReady(true);
  });

  useEffect(() => {
    if (bootstrap.data) setUser(bootstrap.data);
    if (!bootstrap.isLoading) setReady(true);
  }, [bootstrap.data, bootstrap.isLoading, setReady, setUser]);

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route
        path="/"
        element={
          <Protected>
            <Dashboard />
          </Protected>
        }
      />
      <Route
        path="/analytics"
        element={
          <Protected>
            <Analytics />
          </Protected>
        }
      />
      <Route
        path="/ledger"
        element={
          <Protected>
            <Ledger />
          </Protected>
        }
      />
      <Route
        path="/billing"
        element={
          <Protected>
            <Billing />
          </Protected>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
