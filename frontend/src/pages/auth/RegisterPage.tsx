import React, { useState } from 'react';
import { ShieldCheck, Mail, Lock, Building, User, ArrowRight, ArrowLeft, Database } from 'lucide-react';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { authService } from '../../services/auth.service';
import { useToast } from '../../context/ToastContext';
import type { AuthSession } from '../../types';

export interface RegisterPageProps {
  onRegisterSuccess: (session: AuthSession) => void;
  onNavigateLogin: () => void;
  onNavigateHome: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({
  onRegisterSuccess,
  onNavigateLogin,
  onNavigateHome,
}) => {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [plan, setPlan] = useState<'Starter' | 'Professional' | 'Enterprise'>('Professional');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const generatedDbName = organizationName
    ? `ledgerguard_tenant_${organizationName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
    : 'ledgerguard_tenant_myorg';

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Administrator name is required';
    if (!email.trim()) {
      errs.email = 'Work email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = 'Please enter a valid work email';
    }
    if (!organizationName.trim()) {
      errs.organizationName = 'Organization legal name is required';
    }
    if (!password) {
      errs.password = 'Password is required';
    } else if (password.length < 6) {
      errs.password = 'Password must be at least 6 characters';
    }
    if (password !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
    }
    if (!agreedToTerms) {
      errs.terms = 'You must agree to the service terms';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      const session = await authService.register({
        name,
        email,
        password,
        organizationName,
        plan,
      });

      showToast(`Organization "${organizationName}" registered! Isolated DB partition created.`, 'success');
      onRegisterSuccess(session);
    } catch {
      showToast('Registration failed. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-4 sm:p-6 font-sans">
      {/* Top Bar with Back Link */}
      <div className="max-w-lg w-full mx-auto flex items-center justify-between">
        <button
          onClick={onNavigateHome}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 font-medium transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Landing Page</span>
        </button>

        <Badge variant="zk" size="sm">Tenant Provisioning</Badge>
      </div>

      {/* Main Registration Card */}
      <div className="max-w-lg w-full mx-auto bg-white border border-slate-200 rounded-2xl shadow-xl p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center mx-auto shadow-xs">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Register Tenant Organization
          </h1>
          <p className="text-xs text-slate-500">
            Provision an isolated Zero-Knowledge billing database partition
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Administrator Full Name"
              placeholder="e.g. Shraddha Wagh"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errors.name}
              required
              leftIcon={<User className="w-3.5 h-3.5" />}
            />
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
          </div>

          <Input
            label="Organization Legal Name"
            placeholder="e.g. Acme Financial Technologies"
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
            error={errors.organizationName}
            required
            leftIcon={<Building className="w-3.5 h-3.5" />}
          />

          {/* Database Partition Live Preview */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-slate-500" />
              <span className="text-slate-600">Provisioned DB:</span>
              <code className="text-slate-900 font-mono font-semibold">{generatedDbName}</code>
            </div>
            <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-medium">Isolated</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Initial Subscription Tier"
              value={plan}
              onChange={(e) => setPlan(e.target.value as 'Starter' | 'Professional' | 'Enterprise')}
              options={[
                { value: 'Starter', label: 'Starter ($499/mo)' },
                { value: 'Professional', label: 'Professional ($1,850/mo)' },
                { value: 'Enterprise', label: 'Enterprise ($4,200/mo)' },
              ]}
            />

            <Input
              label="Admin Password"
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              required
              leftIcon={<Lock className="w-3.5 h-3.5" />}
            />
          </div>

          <Input
            label="Confirm Password"
            type="password"
            placeholder="••••••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={errors.confirmPassword}
            required
            leftIcon={<Lock className="w-3.5 h-3.5" />}
          />

          <div className="pt-1">
            <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-600 select-none">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              <span>
                I agree to the cryptographic data isolation policies and Zero-Knowledge billing engine terms of service.
              </span>
            </label>
            {errors.terms && <p className="text-[11px] text-rose-600 mt-1">{errors.terms}</p>}
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full mt-3"
            isLoading={isLoading}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Provision Database & Onboard
          </Button>
        </form>

        <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
          <span>Already registered your organization? </span>
          <button
            onClick={onNavigateLogin}
            className="text-slate-900 font-semibold hover:underline"
          >
            Sign In
          </button>
        </div>
      </div>

      <div className="max-w-lg w-full mx-auto text-center text-[11px] text-slate-400">
        <p>LedgerGuard Dynamic Partition Engine • Infotact Solutions Internship 2026</p>
      </div>
    </div>
  );
};
