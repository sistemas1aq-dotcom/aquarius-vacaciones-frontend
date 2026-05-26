import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from './services/auth.service';
import { ROLE_LABELS, UserRole } from './models/auth';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  roles?: UserRole[];   // si no se especifica, todos los autenticados
}
interface NavSection {
  title: string;
  items: NavItem[];
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
  <!-- Vista sin layout (login) -->
  <router-outlet *ngIf="!auth.isAuthenticated()"></router-outlet>

  <!-- Vista autenticada (h-screen + overflow-hidden: solo scrollea <main>, footer siempre visible) -->
  <div *ngIf="auth.isAuthenticated()" class="h-screen flex bg-slate-50 font-sans overflow-hidden">

    <!-- ============ SIDEBAR ============ -->
    <aside class="bg-gradient-to-b from-[#16589e] to-[#3b93d0] text-white flex-shrink-0 flex flex-col transition-all duration-200"
           [class.w-64]="sidebarOpen()" [class.w-16]="!sidebarOpen()">
      <!-- Logo -->
      <div class="px-4 py-4 border-b border-white/10 flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-white text-blue-700 flex items-center justify-center font-extrabold text-lg flex-shrink-0">
          A
        </div>
        <div *ngIf="sidebarOpen()" class="flex-1 min-w-0">
          <div class="font-bold text-sm leading-tight truncate">AQUARIUS</div>
          <div class="text-[10px] text-blue-200 truncate">Gestión de Vacaciones</div>
        </div>
      </div>

      <!-- Navegación -->
      <nav class="overflow-y-auto flex-1">
        <ng-container *ngFor="let section of visibleSections()">
          <div *ngIf="sidebarOpen()" class="px-4 pt-4 pb-1 text-[10px] font-bold tracking-wider text-blue-300 uppercase">
            {{ section.title }}
          </div>
          <div *ngIf="!sidebarOpen()" class="my-2 mx-3 border-t border-white/10"></div>

          <a *ngFor="let item of section.items" [routerLink]="item.path"
             routerLinkActive="!bg-white !text-blue-700 shadow font-semibold"
             [routerLinkActiveOptions]="{ exact: false }"
             [title]="item.label"
             class="mx-2 my-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-blue-50 hover:bg-white/10 transition">
            <span class="text-base flex-shrink-0">{{ item.icon }}</span>
            <span *ngIf="sidebarOpen()" class="truncate">{{ item.label }}</span>
          </a>
        </ng-container>
      </nav>
    </aside>

    <!-- ============ MAIN ============ -->
    <div class="flex-1 flex flex-col min-w-0">

      <!-- Header -->
      <header class="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <div class="flex items-center gap-3">
          <button (click)="sidebarOpen.set(!sidebarOpen())"
                  class="w-9 h-9 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500"
                  title="Toggle sidebar">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>
          <h2 class="text-lg font-semibold text-gray-800">{{ pageTitle() }}</h2>
        </div>

        <!-- User chip -->
        <div class="relative">
          <button (click)="menuOpen = !menuOpen"
                  class="flex items-center gap-2 hover:bg-gray-50 rounded-lg pl-1 pr-3 py-1 transition">
            <div class="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              {{ initials() }}
            </div>
            <div class="text-left hidden sm:block">
              <div class="text-sm font-medium text-gray-800 leading-tight">{{ user()?.FullName }}</div>
              <div class="text-[11px] text-gray-500">{{ user()?.Username }}</div>
            </div>
            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>

          <div *ngIf="menuOpen" class="absolute right-0 mt-2 w-60 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden z-40">
            <div class="px-4 py-3 border-b border-gray-100">
              <div class="text-sm font-semibold text-gray-800 truncate">{{ user()?.FullName }}</div>
              <div class="text-xs text-gray-500 truncate">{{ user()?.Email }}</div>
              <div class="mt-1.5 inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 uppercase">
                {{ roleLabel() }}
              </div>
            </div>
            <a routerLink="/profile" (click)="menuOpen = false"
               class="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50">
              <span>👤</span> Mi perfil
            </a>
            <button (click)="logout()"
                    class="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 border-t border-gray-100">
              <span>🚪</span> Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <!-- Contenido -->
      <main class="flex-1 overflow-y-auto p-6">
        <router-outlet></router-outlet>
      </main>

      <!-- Footer -->
      <footer class="bg-white border-t border-gray-200 px-6 py-2 text-center text-xs text-gray-400">
        AQUARIUS — Powered by <span class="font-semibold text-blue-700">Aquarius Consulting</span> © {{ year }}
      </footer>
    </div>
  </div>
  `,
})
export class AppComponent {
  auth = inject(AuthService);
  private router = inject(Router);

  menuOpen = false;
  sidebarOpen = signal(true);
  year = new Date().getFullYear();

  user = this.auth.currentUser;

  // Estructura de navegación por secciones
  sections: NavSection[] = [
    {
      title: 'Principal',
      items: [
        { path: '/dashboard', label: 'Dashboard', icon: '📊' },
      ],
    },
    {
      title: 'Operaciones',
      items: [
        { path: '/employees',   label: 'Empleados',     icon: '👥', roles: ['admin', 'gestor'] },
        { path: '/projections', label: 'Proyecciones',  icon: '📈', roles: ['admin', 'gestor'] },
        { path: '/reports',     label: 'Reportes',      icon: '📋', roles: ['admin', 'gestor'] },
        { path: '/reminders',   label: 'Recordatorios', icon: '📧', roles: ['admin', 'gestor'] },
      ],
    },
    {
      title: 'Administración',
      items: [
        { path: '/users',   label: 'Usuarios',  icon: '🔑', roles: ['admin'] },
        { path: '/profile', label: 'Mi perfil', icon: '👤' },
      ],
    },
  ];

  visibleSections = computed<NavSection[]>(() => {
    const role = this.user()?.Role as UserRole | undefined;
    return this.sections
      .map(s => ({
        ...s,
        items: s.items.filter(i => !i.roles || (role && i.roles.includes(role))),
      }))
      .filter(s => s.items.length > 0);
  });

  initials = computed(() => {
    const name = this.user()?.FullName || '';
    return name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase() || '?';
  });

  roleLabel = computed(() => {
    const r = this.user()?.Role as UserRole | undefined;
    return r ? ROLE_LABELS[r] : '';
  });

  // Título dinámico según ruta
  pageTitle = signal('Dashboard');
  constructor() {
    this.router.events.subscribe(() => {
      const url = this.router.url.split('?')[0];
      const titles: Record<string, string> = {
        '/dashboard': 'Dashboard',
        '/employees': 'Empleados',
        '/projections': 'Proyecciones',
        '/reports': 'Reportes',
        '/reminders': 'Recordatorios',
        '/users': 'Gestión de Usuarios',
        '/profile': 'Mi Perfil',
      };
      const found = Object.keys(titles).find(k => url.startsWith(k));
      this.pageTitle.set(found ? titles[found] : 'AQUARIUS');
    });
  }

  logout() {
    this.menuOpen = false;
    this.auth.logout();
  }
}
