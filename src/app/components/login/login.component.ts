import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#16589e] via-[#2876b7] to-[#3b93d0] p-4">
      <div class="w-full max-w-md">
        <!-- Logo/Header -->
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl shadow-lg mb-4">
            <svg class="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
          </div>
          <h1 class="text-3xl font-bold text-white mb-1">AQUARIUS</h1>
          <p class="text-blue-100 text-sm">Sistema de Gestión de Vacaciones</p>
        </div>

        <!-- Card login -->
        <div class="bg-white rounded-2xl shadow-2xl p-8">
          <h2 class="text-2xl font-semibold text-gray-800 mb-6 text-center">Iniciar sesión</h2>

          <form (ngSubmit)="submit()" #f="ngForm" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Usuario o correo</label>
              <input
                type="text"
                name="username"
                [(ngModel)]="username"
                required
                autofocus
                autocomplete="username"
                class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder="admin"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <div class="relative">
                <input
                  [type]="showPass() ? 'text' : 'password'"
                  name="password"
                  [(ngModel)]="password"
                  required
                  autocomplete="current-password"
                  class="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  (click)="showPass.set(!showPass())"
                  class="absolute inset-y-0 right-2 text-gray-400 hover:text-gray-600 text-xs"
                >{{ showPass() ? 'Ocultar' : 'Ver' }}</button>
              </div>
            </div>

            <div *ngIf="error()" class="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
              {{ error() }}
            </div>

            <button
              type="submit"
              [disabled]="loading() || !f.valid"
              class="w-full bg-gradient-to-r from-[#16589e] to-[#3b93d0] hover:from-[#114777] hover:to-[#2876b7] disabled:from-blue-300 disabled:to-blue-300 text-white font-semibold py-2.5 rounded-lg transition shadow-md"
            >
              <span *ngIf="!loading()">Ingresar</span>
              <span *ngIf="loading()">Iniciando sesión...</span>
            </button>
          </form>

          <div class="mt-6 pt-6 border-t border-gray-100 text-xs text-gray-500 text-center">
            AQUARIUS &copy; 2026 — Recursos Humanos
          </div>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  username = '';
  password = '';
  showPass = signal(false);
  loading = signal(false);
  error = signal<string | null>(null);

  submit() {
    if (this.loading()) return;
    this.error.set(null);
    this.loading.set(true);

    this.auth.login({ username: this.username, password: this.password }).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
        this.router.navigateByUrl(returnUrl);
      },
      error: (err) => {
        this.error.set(err?.error?.detail || 'Usuario o contraseña incorrectos');
        this.loading.set(false);
      },
    });
  }
}
