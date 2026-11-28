export interface AuthUserDTO {
  id: string;
  email: string;
  tenantId: string;
  role: 'admin' | 'member';
}

export interface LoginRequestDTO {
  email: string;
  password: string;
}
