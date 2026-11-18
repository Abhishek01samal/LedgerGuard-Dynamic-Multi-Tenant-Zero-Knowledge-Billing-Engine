import React, { useState } from 'react';
import { ShieldCheck, Mail, Lock, ArrowRight, Eye, EyeOff, Sparkles, ArrowLeft } from 'lucide-react';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { authService } from '../../services/auth.service';
import { INITIAL_TENANTS } from '../../services/mockData';
import { useToast } from '../../context/ToastContext';
import type { AuthSession } from '../../types';

export interface LoginPageProps {
  onLoginSuccess: (session: AuthSession) => void;
  onNavigateRegister: () => void;
  onNavigateHome: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  onNavigateRegister,
  onNavigateHome,
}) => {
  const { showToast } = useToast();
  const [email, setEmail] = useState('shraddha.wagh@infotact.com');
  const [password, setPassword] = useState('LedgerGuard2026!');
  const [tenantId, setTenantId] = useState(INITIAL_TENANTS[0].id);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isForgotOpen, setIsForgotOpen] = useState(false);

  const selectedTenant = INITIAL_TENANTS.find((t) => t.id === tenantId) || INITIAL_TENANTS[0];

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!email.trim()) {
      errs.email = 'Work email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = 'Please enter a valid work email';
    }
    if (!password) {
      errs.password = 'Password is required';
    } else if (password.length < 6) {
      errs.password = 'Password must be at least 6 characters';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      const session = await authService.login({ email, password, tenantId });
      showToast(`Welcome back, ${session.user.name}! Connected to ${selectedTenant.name}.`, 'success');
      onLoginSuccess(session);
    } catch {
      showToast('Authentication failed. Check your credentials.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail('shraddha.wagh@infotact.com');
    setPassword('LedgerGuard2026!');
    setTenantId(INITIAL_TENANTS[0].id);
    setErrors({});
    showToast('Demo admin credentials filled.', 'info');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-4 sm:p-6 font-sans">
      {/* Top Bar with Back to Landing Page */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between">
        <button
          onClick={onNavigateHome}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 font-medium transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Landing Page</span>
        </button>

        <Badge variant="zk" size="sm">Auth Guard v1</Badge>
      </div>

      {/* Main Login Card */}
      <div className="max-w-md w-full mx-auto bg-white border border-slate-200 rounded-2xl shadow-xl p-6 sm:p-8 space-y-6">
        {/* Branding & Header */}
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center mx-auto shadow-xs">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Sign in to LedgerGuard
          </h1>
          <p className="text-xs text-slate-500">
            Multi-Tenant Zero-Knowledge Financial Console
          </p>
        </div>

        {/* Demo Fast Fill Pill */}
        <button
          type="button"
          onClick={handleFillDemo}
          className="w-full py-2 px-3 rounded-lg bg-indigo-50/70 border border-indigo-200/80 text-indigo-800 text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-indigo-100/70 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>Quick-Fill Demo Admin Credentials</span>
        </button>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <Input
            label="Work Email Address"
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            required
            leftIcon={<Mail className="w-3.5 h-3.5" />}
          />

          <div>
            <div className="relative">
              <Input
                label="Account Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
                required
                leftIcon={<Lock className="w-3.5 h-3.5" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-400 hover:text-slate-600 focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />
            </div>
            <div className="flex justify-end mt-1">
              <button
                type="button"
                onClick={() => setIsForgotOpen(true)}
                className="text-[11px] text-slate-500 hover:text-slate-900 font-medium transition-colors"
              >
                Forgot password?
              </button>
            </div>
          </div>

          <Select
            label="Target Tenant Organization (Database Context)"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            helperText={`Connects to dynamic partition: ${selectedTenant.databaseName}`}
            options={INITIAL_TENANTS.map((t) => ({
              value: t.id,
              label: `${t.name} (${t.status === 'active' ? 'Active' : 'Inactive'})`,
            }))}
          />

          <Button
            type="submit"
            variant="primary"
            className="w-full mt-2"
            isLoading={isLoading}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Authenticate & Access Ledger
          </Button>
        </form>

        {/* Register Organization Footnote */}
        <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
          <span>Need a new tenant instance? </span>
          <button
            onClick={onNavigateRegister}
            className="text-slate-900 font-semibold hover:underline"
          >
            Register Organization
          </button>
        </div>
      </div>

      {/* Footer Info */}
      <div className="max-w-md w-full mx-auto text-center text-[11px] text-slate-400">
        <p>Protected by zk-SNARK cryptographic authentication • LedgerGuard v0.6.0</p>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotOpen}
        onClose={() => setIsForgotOpen(false)}
      />
    </div>
  );
};
