import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { customerService } from '../../services/customer.service';
import type { Customer, Tenant } from '../../types';
import { Building, User, Mail, Phone, MapPin, Plus } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTenant?: Tenant;
  onCustomerCreated: (newCustomer: Customer) => void;
}

export const AddCustomerModal: React.FC<AddCustomerModalProps> = ({
  isOpen,
  onClose,
  currentTenant,
  onCustomerCreated,
}) => {
  const { showToast } = useToast();

  const [company, setCompany] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [notes, setNotes] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!company.trim()) {
      errs.company = 'Company name is required';
    }
    if (!name.trim()) {
      errs.name = 'Contact person name is required';
    }
    if (!email.trim()) {
      errs.email = 'Billing email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = 'Enter a valid email address';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !currentTenant) return;

    setIsSubmitting(true);
    try {
      const newCust = await customerService.createCustomer(currentTenant.id, {
        company: company.trim(),
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim() || 'San Francisco, CA, USA',
        status,
        notes: notes.trim(),
      });

      showToast(`Customer account "${newCust.company}" registered successfully.`, 'success');
      onCustomerCreated(newCust);
      // Reset form
      setCompany('');
      setName('');
      setEmail('');
      setPhone('');
      setAddress('');
      setStatus('active');
      setNotes('');
      onClose();
    } catch {
      showToast('Failed to create customer account.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Customer"
      subtitle={`Register enterprise client record under ${currentTenant?.name || 'Active Tenant'}`}
      maxWidth="md"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Register Client
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Company Name"
            placeholder="e.g. Acme Corporation"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            error={errors.company}
            leftIcon={<Building className="w-3.5 h-3.5" />}
            required
          />

          <Input
            label="Contact Person"
            placeholder="e.g. Sarah Connor"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
            leftIcon={<User className="w-3.5 h-3.5" />}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Corporate Email"
            type="email"
            placeholder="billing@acme.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            leftIcon={<Mail className="w-3.5 h-3.5" />}
            required
          />

          <Input
            label="Phone Number"
            placeholder="+1 (555) 019-2834"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            leftIcon={<Phone className="w-3.5 h-3.5" />}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Billing Jurisdiction / Address"
            placeholder="e.g. New York, NY, USA"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            leftIcon={<MapPin className="w-3.5 h-3.5" />}
          />

          <Select
            label="Initial Account Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
            options={[
              { value: 'active', label: 'Active (Permitted Billing)' },
              { value: 'inactive', label: 'Inactive / Onboarding' },
            ]}
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-slate-700 block mb-1">
            Internal Accounting Remarks
          </label>
          <textarea
            rows={2}
            placeholder="Optional credit terms or remittance instructions..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 resize-none"
          />
        </div>
      </form>
    </Modal>
  );
};
