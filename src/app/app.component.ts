import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
  <!-- Vista sin layout (login) -->
  <router-outlet *ngIf="!auth.isAuthenticated()"></router-outlet>

  <!-- Vista autenticada -->
  <div *ngIf="auth.isAuthenticated()" class="min-h-screen bg-slate-50 font-sans">
    <!-- Barra superior azul -->
    <header class="bg-gradient-to-r from-blue-700 to-blue-600 shadow-md">
      <div class="max-w-[1320px] mx-auto px-4 py-3 flex justify-between items-center">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
          </div>
          <div>
            <h1 class="text-lg font-bold text-white">AQUARIUS</h1>
            <p class="text-xs text-blue-100">Gestión de Vacaciones</p>
          </div>
        </div>

        <!-- User menu -->
        <div class="relative">
          <button (click)="menuOpen = !menuOpen"
                  class="flex items-center gap-3 bg-white/10 hover:bg-white/20 backdrop-blur rounded-lg px-3 py-1.5 text-white transition">
            <div class="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold">
              {{ initials() }}
            </div>
            <div class="text-left hidden sm:block">
              <div class="text-sm font-medium leading-tight">{{ user()?.FullName }}</div>
              <div class="text-[10px] text-blue-100 uppercase tracking-wide">{{ user()?.Role }}</div>
            </div>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>

          <div *ngIf="menuOpen" class="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden z-40">
            <div class="px-4 py-3 border-b border-gray-100">
              <div class="text-sm font-semibold text-gray-800">{{ user()?.FullName }}</div>
              <div class="text-xs text-gray-500">{{ user()?.Email }}</div>
            </div>
            <a routerLink="/profile" (click)="menuOpen = false"
               class="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50">
              <span>👤</span> Mi perfil
            </a>
            <a *ngIf="auth.isAdmin()" routerLink="/users" (click)="menuOpen = false"
               class="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50">
              <span>🔑</span> Gestión de usuarios
            </a>
            <button (click)="logout()"
                    class="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 border-t border-gray-100">
              <span>🚪</span> Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </header>

    <div class="max-w-[1320px] mx-auto px-4 py-4">
      <!-- Tabs de navegación -->
      <nav class="flex gap-0.5 bg-white rounded-xl shadow-sm p-1 mb-5 overflow-x-auto">
        <a *ngFor="let tab of tabs" [routerLink]="tab.path"
           routerLinkActive="bg-blue-600 text-white shadow-sm"
           [routerLinkActiveOptions]="{ exact: false }"
           class="px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all text-gray-600 hover:text-blue-700 hover:bg-blue-50">
          {{ tab.icon }} {{ tab.label }}
        </a>
      </nav>

      <router-outlet></router-outlet>
    </div>
  </div>
  `,
})
export class AppComponent {
  auth = inject(AuthService);
  private router = inject(Router);

  menuOpen = false;

  tabs = [
    { path: '/dashboard',   label: 'Dashboard',     icon: '📊' },
    { path: '/employees',   label: 'Empleados',     icon: '👥' },
    { path: '/projections', label: 'Proyecciones',  icon: '📈' },
    { path: '/reports',     label: 'Reportes',      icon: '📋' },
    { path: '/reminders',   label: 'Recordatorios', icon: '📧' },
  ];

  user = this.auth.currentUser;

  initials = computed(() => {
    const name = this.user()?.FullName || '';
    return name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase() || '?';
  });

  logout() {
    this.menuOpen = false;
    this.auth.logout();
  }
}
