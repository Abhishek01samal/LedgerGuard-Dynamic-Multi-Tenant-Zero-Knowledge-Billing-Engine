import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Mail, ShieldCheck, Check } from 'lucide-react';
import { authService } from '../../services/auth.service';

export interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Email address is required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setError('');
    setIsLoading(true);
    try {
      await authService.requestPasswordReset(email);
      setIsSent(true);
    } catch {
      setError('Failed to dispatch recovery link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setError('');
    setIsSent(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Reset Account Password"
      subtitle="Enter your verified organization work email to receive a recovery token"
      maxWidth="md"
      footer={
        isSent ? (
          <Button variant="primary" size="sm" onClick={handleClose}>
            Back to Sign In
          </Button>
        ) : (
          <>
            <Button variant="outline" size="sm" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSubmit} isLoading={isLoading}>
              Send Recovery Link
            </Button>
          </>
        )
      }
    >
      {isSent ? (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-2 text-left">
          <div className="flex items-center gap-2 font-semibold">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Recovery Token Dispatched</span>
          </div>
          <p className="text-[11px] text-emerald-800 leading-relaxed">
            We have sent a blind cryptographic recovery token to <strong className="font-semibold">{email}</strong>. Check your inbox to safely reset your password.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Work Email Address"
            type="email"
            placeholder="admin@apexfinancial.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError('');
            }}
            error={error}
            required
            leftIcon={<Mail className="w-3.5 h-3.5" />}
          />

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-xs flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              LedgerGuard uses salted zero-knowledge hashes to verify password reset authorizations without storing plaintext recovery keys.
            </p>
          </div>
        </form>
      )}
    </Modal>
  );
};
