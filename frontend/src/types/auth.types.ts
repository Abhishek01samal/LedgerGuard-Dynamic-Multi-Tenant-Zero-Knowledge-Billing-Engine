export interface AuthUser {
  id: string;
  email: string;
  tenantId: string;
  role: 'admin' | 'member';
}

export interface ApiErrorBody {
  success: false;
  message: string;
  code?: string;
  data?: unknown;
}
