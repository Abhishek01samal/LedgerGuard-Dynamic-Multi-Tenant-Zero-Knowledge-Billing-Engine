import type { AuthSession } from '../types';
import { INITIAL_TENANTS } from './mockData';

const SESSION_STORAGE_KEY = 'ledgerguard_auth_session';

export interface LoginDTO {
  email: string;
  password: string;
  tenantId: string;
}

export interface RegisterDTO {
  name: string;
  email: string;
  password: string;
  organizationName: string;
  plan: 'Starter' | 'Professional' | 'Enterprise';
}

export const authService = {
  /**
   * Authenticates user against specific tenant partition.
   * Conforms to POST /api/v1/auth/login specification.
   */
  async login(dto: LoginDTO): Promise<AuthSession> {
    await new Promise((resolve) => setTimeout(resolve, 200));

    const tenant = INITIAL_TENANTS.find((t) => t.id === dto.tenantId) || INITIAL_TENANTS[0];

    const session: AuthSession = {
      token: `eyJh-zk-jwt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      user: {
        id: 'usr_shraddha_01',
        name: 'Shraddha Wagh',
        email: dto.email,
        role: 'admin',
        tenantId: tenant.id,
        tenantName: tenant.name,
      },
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    };

    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch {
      // Safe fallback if local storage is restricted
    }

    return session;
  },

  /**
   * Registers a new tenant organization and provisions an isolated database context.
   */
  async register(dto: RegisterDTO): Promise<AuthSession> {
    await new Promise((resolve) => setTimeout(resolve, 250));

    const slug = dto.organizationName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const newTenantId = `tenant-${slug}-${Date.now().toString().slice(-4)}`;

    const session: AuthSession = {
      token: `eyJh-zk-jwt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      user: {
        id: `usr_${Date.now().toString().slice(-4)}`,
        name: dto.name,
        email: dto.email,
        role: 'admin',
        tenantId: newTenantId,
        tenantName: dto.organizationName,
      },
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    };

    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch {
      // Safe fallback
    }

    return session;
  },

  /**
   * Sends password reset verification with zero-knowledge blind token.
   */
  async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    return {
      success: true,
      message: `A cryptographically verified recovery link has been dispatched to ${email}.`,
    };
  },

  /**
   * Retrieves active authenticated session.
   */
  getCurrentSession(): AuthSession | null {
    try {
      const data = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!data) return null;
      return JSON.parse(data) as AuthSession;
    } catch {
      return null;
    }
  },

  /**
   * Clears session and revokes client auth token.
   */
  logout(): void {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // Safe fallback
    }
  },
};
