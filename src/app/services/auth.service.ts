import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, map } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  LoginRequest, TokenResponse, User, PasswordChangeRequest,
  UserCreate, UserUpdate
} from '../models/auth';

const TOKEN_KEY = 'aquarius_token';
const USER_KEY = 'aquarius_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  // Estado reactivo con signals (Angular 19)
  currentUser = signal<User | null>(this.loadStoredUser());
  isAuthenticated = computed(() => this.currentUser() !== null);
  isAdmin = computed(() => this.currentUser()?.Role === 'admin');
  isGestor = computed(() => this.currentUser()?.Role === 'gestor');
  isTrabajador = computed(() => this.currentUser()?.Role === 'trabajador');

  // ─── Login / Logout ───────────────────────────────────────────
  login(data: LoginRequest): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${environment.apiUrl}/auth/login`, data)
      .pipe(tap(resp => this.storeSession(resp)));
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  refreshMe(): Observable<User> {
    return this.http.get<User>(`${environment.apiUrl}/auth/me`)
      .pipe(tap(user => {
        this.currentUser.set(user);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      }));
  }

  // ─── Password ─────────────────────────────────────────────────
  changePassword(data: PasswordChangeRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${environment.apiUrl}/auth/change-password`, data
    );
  }

  // ─── Gestión de usuarios (admin) ──────────────────────────────
  listUsers(params?: { role?: string; is_active?: boolean; search?: string }): Observable<User[]> {
    const query = new URLSearchParams();
    if (params?.role) query.set('role', params.role);
    if (params?.is_active !== undefined) query.set('is_active', String(params.is_active));
    if (params?.search) query.set('search', params.search);
    const q = query.toString();
    return this.http.get<User[]>(`${environment.apiUrl}/users${q ? '?' + q : ''}`);
  }

  getUser(id: number): Observable<User> {
    return this.http.get<User>(`${environment.apiUrl}/users/${id}`);
  }

  createUser(data: UserCreate): Observable<User> {
    return this.http.post<User>(`${environment.apiUrl}/users`, data);
  }

  updateUser(id: number, data: UserUpdate): Observable<User> {
    return this.http.put<User>(`${environment.apiUrl}/users/${id}`, data);
  }

  resetUserPassword(id: number, newPassword: string): Observable<User> {
    return this.http.post<User>(
      `${environment.apiUrl}/users/${id}/reset-password`,
      { new_password: newPassword }
    );
  }

  activateUser(id: number): Observable<User> {
    return this.http.post<User>(`${environment.apiUrl}/users/${id}/activate`, {});
  }

  deactivateUser(id: number): Observable<User> {
    return this.http.post<User>(`${environment.apiUrl}/users/${id}/deactivate`, {});
  }

  // ─── Helpers internos ─────────────────────────────────────────
  private loadStoredUser(): User | null {
    const stored = localStorage.getItem(USER_KEY);
    if (!stored) return null;
    try { return JSON.parse(stored) as User; } catch { return null; }
  }

  private storeSession(resp: TokenResponse): void {
    localStorage.setItem(TOKEN_KEY, resp.access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(resp.user));
    this.currentUser.set(resp.user);
  }
}
