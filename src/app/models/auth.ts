export type UserRole = 'admin' | 'gestor';

export interface User {
  Id: number;
  Username: string;
  Email: string;
  FullName: string;
  Role: UserRole;
  IsActive: boolean;
  LastLoginAt?: string | null;
  CreatedAt: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface PasswordChangeRequest {
  current_password: string;
  new_password: string;
}

export interface UserCreate {
  Username: string;
  Email: string;
  FullName: string;
  Password: string;
  Role: UserRole;
  IsActive?: boolean;
}

export interface UserUpdate {
  Email?: string;
  FullName?: string;
  Role?: UserRole;
  IsActive?: boolean;
}
