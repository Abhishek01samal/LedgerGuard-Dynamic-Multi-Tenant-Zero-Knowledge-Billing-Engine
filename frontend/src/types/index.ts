export type TenantStatus = 'active' | 'inactive' | 'suspended';

export interface Tenant {
  id: string;
  name: string;
  databaseName: string;
  status: TenantStatus;
  plan: 'Starter' | 'Professional' | 'Enterprise';
  createdAt: string;
}

export type InvoiceStatus = 'paid' | 'pending' | 'overdue' | 'draft';
export type ZkProofStatus = 'verified' | 'pending' | 'unverified';

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  tenantId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  status: InvoiceStatus;
  zkProofStatus: ZkProofStatus;
  zkProofHash?: string;
  dueDate: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  tenantId: string;
  name: string;
  company: string;
  email: string;
  phone?: string;
  totalBilled: number;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface Transaction {
  id: string;
  invoiceId: string;
  tenantId: string;
  customerName: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  status: 'succeeded' | 'pending' | 'failed';
  zkVerified: boolean;
  timestamp: string;
}

export interface DashboardMetrics {
  totalRevenue: number;
  revenueMoMGrowth: number;
  totalInvoices: number;
  paidInvoices: number;
  pendingInvoices: number;
  overdueInvoices: number;
  activeCustomers: number;
  collectedRevenue: number;
  outstandingRevenue: number;
  collectionRate: number;
  zkProofCoverage: number;
}

export interface MonthlyRevenueData {
  month: string;
  invoiced: number;
  collected: number;
  proofsCount: number;
}

export type ActivityEventType =
  | 'invoice_created'
  | 'payment_settled'
  | 'proof_verified'
  | 'customer_added'
  | 'tenant_sync';

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  title: string;
  description: string;
  timestamp: string;
  hash?: string;
  status: 'success' | 'pending' | 'info';
}

export interface TenantPartitionHealth {
  databaseName: string;
  status: 'healthy' | 'degraded' | 'syncing';
  latencyMs: number;
  proofQuotaUsed: number;
  proofQuotaTotal: number;
  activeConnections: number;
  lastSyncAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'billing_manager' | 'auditor';
  tenantId: string;
  tenantName: string;
}

export interface AuthSession {
  token: string;
  user: User;
  expiresAt: string;
}
