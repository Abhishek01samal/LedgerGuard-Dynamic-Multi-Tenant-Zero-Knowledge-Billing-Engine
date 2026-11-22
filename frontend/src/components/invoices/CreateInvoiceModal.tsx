import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Badge } from '../common/Badge';
import { customerService } from '../../services/customer.service';
import { invoiceService } from '../../services/invoice.service';
import { formatCurrency } from '../../utils/formatters';
import type { Tenant, Customer, Invoice } from '../../types';
import {
  Plus,
  Trash2,
  ShieldCheck,
  Building,
  User,
  Mail,
  Calendar,
  DollarSign,
  FileText,
  Percent,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTenant?: Tenant;
  onInvoiceCreated: (newInvoice: Invoice) => void;
}

interface LineItemState {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
}

export const CreateInvoiceModal: React.FC<CreateInvoiceModalProps> = ({
  isOpen,
  onClose,
  currentTenant,
  onInvoiceCreated,
}) => {
  const { showToast } = useToast();

  // Directory customers for fast selection
  const [tenantCustomers, setTenantCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('manual');

  // Customer Form Fields
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'EUR' | 'GBP'>('USD');

  // Dates & Payment Terms
  const todayStr = new Date().toISOString().split('T')[0];
  const [issueDate, setIssueDate] = useState(todayStr);
  const [paymentTerms, setPaymentTerms] = useState<'due_on_receipt' | 'net_15' | 'net_30' | 'net_60' | 'custom'>('net_30');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('Payment due under agreed credit terms. Cryptographically verified on LedgerGuard.');

  // Multi-line items state
  const [lineItems, setLineItems] = useState<LineItemState[]>([
    { id: 'item-1', description: 'Enterprise Cloud Infrastructure & SLA', quantity: '1', unitPrice: '4500' },
  ]);

  // Tax & Discount
  const [taxRatePercent, setTaxRatePercent] = useState<number>(8.5);
  const [discountPercent, setDiscountPercent] = useState<number>(0);

  // Validation & Loading
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load customer directory when modal opens
  useEffect(() => {
    if (isOpen && currentTenant) {
      customerService.getCustomers(currentTenant.id).then((custs) => {
        setTenantCustomers(custs);
      });
    }
  }, [isOpen, currentTenant]);

  // Compute Due Date automatically based on issueDate and paymentTerms
  useEffect(() => {
    const base = new Date(issueDate || todayStr);
    let addDays = 30;
    if (paymentTerms === 'due_on_receipt') addDays = 0;
    else if (paymentTerms === 'net_15') addDays = 15;
    else if (paymentTerms === 'net_30') addDays = 30;
    else if (paymentTerms === 'net_60') addDays = 60;
    else if (paymentTerms === 'custom') return; // Do not overwrite manual custom due date

    base.setDate(base.getDate() + addDays);
    setDueDate(base.toISOString().split('T')[0]);
  }, [issueDate, paymentTerms]);

  // Handle existing customer selection
  const handleCustomerSelect = (custId: string) => {
    setSelectedCustomerId(custId);
    if (custId === 'manual') {
      setCustomerName('');
      setCustomerEmail('');
    } else {
      const found = tenantCustomers.find((c) => c.id === custId);
      if (found) {
        setCustomerName(found.company || found.name);
        setCustomerEmail(found.email);
        if (errors.customerName || errors.customerEmail) {
          setErrors((prev) => {
            const next = { ...prev };
            delete next.customerName;
            delete next.customerEmail;
            return next;
          });
        }
      }
    }
  };

  // Line item handlers
  const handleAddLineItem = () => {
    const newItemId = `item-${Date.now()}`;
    setLineItems((prev) => [
      ...prev,
      { id: newItemId, description: '', quantity: '1', unitPrice: '' },
    ]);
  };

  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length <= 1) {
      showToast('An invoice must contain at least one line item.', 'error');
      return;
    }
    setLineItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: keyof LineItemState, val: string) => {
    setLineItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  // Financial Computations
  const subtotal = useMemo(() => {
    return lineItems.reduce((acc, item) => {
      const q = parseFloat(item.quantity) || 0;
      const p = parseFloat(item.unitPrice) || 0;
      return acc + q * p;
    }, 0);
  }, [lineItems]);

  const discountAmount = useMemo(() => {
    return Math.round(subtotal * (discountPercent / 100));
  }, [subtotal, discountPercent]);

  const taxableAmount = Math.max(0, subtotal - discountAmount);

  const taxAmount = useMemo(() => {
    return Math.round(taxableAmount * (taxRatePercent / 100));
  }, [taxableAmount, taxRatePercent]);

  const totalAmount = taxableAmount + taxAmount;

  // Validation
  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};

    if (!customerName.trim()) {
      errs.customerName = 'Customer / Company name is required.';
    }

    if (!customerEmail.trim()) {
      errs.customerEmail = 'Customer email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      errs.customerEmail = 'Enter a valid email address.';
    }

    if (!dueDate) {
      errs.dueDate = 'Due date is required.';
    } else if (new Date(dueDate) < new Date(issueDate)) {
      errs.dueDate = 'Due date cannot be before issue date.';
    }

    // Line items validation
    lineItems.forEach((item, index) => {
      if (!item.description.trim()) {
        errs[`item_${index}_desc`] = 'Description required';
      }
      const qty = parseFloat(item.quantity);
      if (isNaN(qty) || qty <= 0) {
        errs[`item_${index}_qty`] = 'Qty > 0';
      }
      const price = parseFloat(item.unitPrice);
      if (isNaN(price) || price < 0) {
        errs[`item_${index}_price`] = 'Price >= 0';
      }
    });

    if (totalAmount <= 0) {
      errs.total = 'Invoice total must be greater than zero.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !currentTenant) return;

    setIsSubmitting(true);
    try {
      const preparedItems = lineItems.map((item) => ({
        description: item.description,
        quantity: parseFloat(item.quantity) || 1,
        unitPrice: parseFloat(item.unitPrice) || 0,
        amount: (parseFloat(item.quantity) || 1) * (parseFloat(item.unitPrice) || 0),
      }));

      const newInv = await invoiceService.createInvoice(currentTenant.id, {
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerId: selectedCustomerId !== 'manual' ? selectedCustomerId : undefined,
        items: preparedItems,
        subtotal,
        tax: taxAmount,
        total: totalAmount,
        currency,
        dueDate,
        notes,
      });

      showToast(
        `Invoice ${newInv.invoiceNumber} created and sealed with zero-knowledge proof!`,
        'success'
      );
      onInvoiceCreated(newInv);
      onClose();
    } catch {
      showToast('Failed to generate invoice. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Cryptographic Invoice"
      subtitle={`Issue multi-line billing record under tenant partition: ${currentTenant?.name || 'Active'}`}
      maxWidth="2xl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>Blind SNARK commitment generated on submit</span>
          </div>

          <div className="flex items-center gap-2">
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
              Generate Invoice
            </Button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6 text-xs text-slate-700">
        {/* Section 1: Customer Account Selection */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-slate-600" />
              Customer Information
            </span>
            <Badge variant="neutral" size="sm">
              Tenant Isolated
            </Badge>
          </div>

          {/* Quick Select from Directory */}
          {tenantCustomers.length > 0 && (
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                Select from Tenant Directory
              </label>
              <Select
                value={selectedCustomerId}
                onChange={(e) => handleCustomerSelect(e.target.value)}
                options={[
                  { value: 'manual', label: 'Manual Entry (New Customer)' },
                  ...tenantCustomers.map((c) => ({
                    value: c.id,
                    label: `${c.company} (${c.email})`,
                  })),
                ]}
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <Input
                label="Customer / Company Name"
                placeholder="e.g. Acme Corp"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                error={errors.customerName}
                leftIcon={<User className="w-3.5 h-3.5" />}
                required
              />
            </div>

            <div className="sm:col-span-1">
              <Input
                label="Contact Email"
                type="email"
                placeholder="billing@acme.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                error={errors.customerEmail}
                leftIcon={<Mail className="w-3.5 h-3.5" />}
                required
              />
            </div>

            <div className="sm:col-span-1">
              <Select
                label="Currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as typeof currency)}
                options={[
                  { value: 'USD', label: 'USD ($)' },
                  { value: 'EUR', label: 'EUR (€)' },
                  { value: 'GBP', label: 'GBP (£)' },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Invoice Terms & Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Input
              label="Issue Date"
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              leftIcon={<Calendar className="w-3.5 h-3.5" />}
              required
            />
          </div>

          <div>
            <Select
              label="Payment Terms"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value as typeof paymentTerms)}
              options={[
                { value: 'net_30', label: 'Net 30 Days' },
                { value: 'net_15', label: 'Net 15 Days' },
                { value: 'net_60', label: 'Net 60 Days' },
                { value: 'due_on_receipt', label: 'Due on Receipt' },
                { value: 'custom', label: 'Custom Due Date' },
              ]}
            />
          </div>

          <div>
            <Input
              label="Due Date"
              type="date"
              value={dueDate}
              onChange={(e) => {
                setDueDate(e.target.value);
                setPaymentTerms('custom');
              }}
              error={errors.dueDate}
              leftIcon={<Calendar className="w-3.5 h-3.5" />}
              required
            />
          </div>
        </div>

        {/* Section 3: Dynamic Multi-Line Items Builder */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-600" />
              Itemized Billing Line Items
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddLineItem}
              leftIcon={<Plus className="w-3 h-3" />}
              className="text-xs py-1"
            >
              Add Item
            </Button>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-50 p-2.5 border-b border-slate-200 grid grid-cols-12 gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <div className="col-span-6 sm:col-span-6">Description</div>
              <div className="col-span-2 sm:col-span-2 text-center">Qty</div>
              <div className="col-span-2 sm:col-span-2 text-right">Unit Price</div>
              <div className="col-span-2 sm:col-span-2 text-right">Line Total</div>
            </div>

            <div className="divide-y divide-slate-100 p-2 space-y-2">
              {lineItems.map((item, index) => {
                const q = parseFloat(item.quantity) || 0;
                const p = parseFloat(item.unitPrice) || 0;
                const lineTotal = q * p;

                return (
                  <div key={item.id} className="grid grid-cols-12 gap-2 items-center pt-2">
                    {/* Description */}
                    <div className="col-span-6 sm:col-span-6">
                      <input
                        type="text"
                        placeholder="Description of service or product"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        className={`w-full text-xs px-2.5 py-1.5 border rounded bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400 ${
                          errors[`item_${index}_desc`] ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                        }`}
                        required
                      />
                    </div>

                    {/* Quantity */}
                    <div className="col-span-2 sm:col-span-2">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        className={`w-full text-xs px-2 py-1.5 text-center border rounded bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400 font-mono ${
                          errors[`item_${index}_qty`] ? 'border-rose-400' : 'border-slate-200'
                        }`}
                        required
                      />
                    </div>

                    {/* Unit Price */}
                    <div className="col-span-2 sm:col-span-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                        className={`w-full text-xs px-2 py-1.5 text-right border rounded bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400 font-mono ${
                          errors[`item_${index}_price`] ? 'border-rose-400' : 'border-slate-200'
                        }`}
                        required
                      />
                    </div>

                    {/* Line Total + Remove Button */}
                    <div className="col-span-2 sm:col-span-2 flex items-center justify-end gap-1.5">
                      <span className="font-mono font-bold text-slate-900 text-xs">
                        {formatCurrency(lineTotal, currency)}
                      </span>
                      {lineItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLineItem(index)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                          title="Remove Line Item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Section 4: Calculation Totals & ZK Proof Simulation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Notes and Terms */}
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Statement Notes & Remittance Instructions
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 resize-none"
              />
            </div>

            {/* Zero-Knowledge Blinded Commitment Preview */}
            <div className="p-3 bg-slate-900 text-white rounded-lg space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-emerald-400 font-bold">
                <div className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>ZK-SNARK Commitment Schema</span>
                </div>
                <Badge variant="zk" size="sm">
                  BN254 Curve
                </Badge>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                Generates a cryptographic hash proving arithmetic equality of subtotal, tax, and line items without disclosing individual item rates to audit verifiers.
              </p>
            </div>
          </div>

          {/* Totals Summary Card */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5 font-mono text-xs">
            <div className="flex justify-between text-slate-600">
              <span className="font-sans">Subtotal:</span>
              <span className="font-bold">{formatCurrency(subtotal, currency)}</span>
            </div>

            {/* Discount selector */}
            <div className="flex items-center justify-between text-slate-600 gap-2 font-sans">
              <div className="flex items-center gap-1 text-[11px]">
                <Percent className="w-3 h-3 text-slate-400" />
                <span>Discount:</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono">
                <select
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                  className="text-xs bg-white border border-slate-200 rounded px-1.5 py-0.5 focus:outline-none"
                >
                  <option value={0}>0%</option>
                  <option value={5}>5%</option>
                  <option value={10}>10%</option>
                  <option value={15}>15%</option>
                </select>
                <span className="text-slate-500 font-bold">
                  -{formatCurrency(discountAmount, currency)}
                </span>
              </div>
            </div>

            {/* Tax selector */}
            <div className="flex items-center justify-between text-slate-600 gap-2 font-sans">
              <div className="flex items-center gap-1 text-[11px]">
                <DollarSign className="w-3 h-3 text-slate-400" />
                <span>Sales Tax Rate:</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono">
                <select
                  value={taxRatePercent}
                  onChange={(e) => setTaxRatePercent(parseFloat(e.target.value) || 0)}
                  className="text-xs bg-white border border-slate-200 rounded px-1.5 py-0.5 focus:outline-none"
                >
                  <option value={0}>0% (Tax Exempt)</option>
                  <option value={5}>5.0%</option>
                  <option value={8.5}>8.5% (Standard)</option>
                  <option value={10}>10.0%</option>
                  <option value={18}>18.0% (GST/VAT)</option>
                </select>
                <span className="font-bold">{formatCurrency(taxAmount, currency)}</span>
              </div>
            </div>

            {/* Grand Total */}
            <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-slate-900 font-bold text-sm">
              <span className="font-sans">Total Billed:</span>
              <span className="text-emerald-700 font-sans">
                {formatCurrency(totalAmount, currency)}
              </span>
            </div>

            {errors.total && (
              <span className="text-rose-600 text-[10px] block font-sans font-medium">
                {errors.total}
              </span>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
};
