import type { AuthUser } from '../types/auth.types';
import { api, isMockMode } from './api';
import { getDemoUser, loginWithDemo, setDemoUser } from './mock-data';

export async function login(email: string, password: string): Promise<AuthUser> {
  if (isMockMode()) return loginWithDemo(email, password);
  const { data } = await api.post<{ data: { user: AuthUser } }>('/api/v1/auth/login', { email, password });
  return data.data.user;
}

export async function logout(): Promise<void> {
  if (isMockMode()) {
    setDemoUser(null);
    return;
  }
  await api.post('/api/v1/auth/logout');
}

export async function fetchMe(): Promise<AuthUser> {
  if (isMockMode()) {
    const user = getDemoUser();
    if (!user) throw new Error('No demo session');
    return user;
  }
  const { data } = await api.get<{ data: { user: AuthUser } }>('/api/v1/auth/me');
  return data.data.user;
}
