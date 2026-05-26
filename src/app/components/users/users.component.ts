import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { User, UserCreate, UserUpdate, UserRole, ROLE_LABELS, ROLE_OPTIONS } from '../../models/auth';
import { PaginationComponent, paginate } from '../shared/pagination.component';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  template: `
  <!-- ============ Header ============ -->
  <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
    <div>
      <h1 class="text-2xl font-bold text-gray-800">Gestión de Usuarios</h1>
      <p class="text-sm text-gray-500">Administra usuarios del sistema, roles y accesos</p>
    </div>
    <button (click)="openCreate()"
            class="bg-gradient-to-r from-[#16589e] to-[#3b93d0] hover:from-[#114777] hover:to-[#2876b7] text-white px-5 py-2.5 rounded-lg shadow-sm font-semibold text-sm flex items-center gap-2 transition">
      <span>+</span> Nuevo Usuario
    </button>
  </div>

  <!-- ============ KPI cards ============ -->
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
    <div class="rounded-2xl p-5 bg-blue-50">
      <div class="text-2xl mb-2">👥</div>
      <div class="text-3xl font-extrabold text-blue-700">{{ users().length }}</div>
      <div class="text-xs text-blue-700/70 font-medium mt-1">Total usuarios</div>
    </div>
    <div class="rounded-2xl p-5 bg-emerald-50">
      <div class="text-2xl mb-2">✅</div>
      <div class="text-3xl font-extrabold text-emerald-700">{{ countActive() }}</div>
      <div class="text-xs text-emerald-700/70 font-medium mt-1">Activos</div>
    </div>
    <div class="rounded-2xl p-5 bg-violet-50">
      <div class="text-2xl mb-2">🔑</div>
      <div class="text-3xl font-extrabold text-violet-700">{{ countByRole('admin') }}</div>
      <div class="text-xs text-violet-700/70 font-medium mt-1">Administradores</div>
    </div>
    <div class="rounded-2xl p-5 bg-cyan-50">
      <div class="text-2xl mb-2">🧑‍💼</div>
      <div class="text-3xl font-extrabold text-cyan-700">{{ countByRole('gestor') + countByRole('trabajador') }}</div>
      <div class="text-xs text-cyan-700/70 font-medium mt-1">Gestores + Trabajadores</div>
    </div>
  </div>

  <!-- ============ Filtros ============ -->
  <div class="bg-white rounded-2xl shadow-sm p-4 mb-4 flex flex-wrap gap-3">
    <input type="text" [(ngModel)]="searchTerm" (ngModelChange)="load()"
           placeholder="Buscar por nombre, usuario o email..."
           class="flex-1 min-w-[250px] px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
    <select [(ngModel)]="roleFilter" (ngModelChange)="load()"
            class="px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white">
      <option value="">Todos los roles</option>
      <option *ngFor="let r of roleOptions" [value]="r.value">{{ r.label }}</option>
    </select>
    <select [(ngModel)]="activeFilter" (ngModelChange)="load()"
            class="px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white">
      <option value="">Todos los estados</option>
      <option value="true">Activos</option>
      <option value="false">Inactivos</option>
    </select>
  </div>

  <!-- ============ Tabla ============ -->
  <div class="bg-white rounded-2xl shadow-sm overflow-hidden">
    <table class="w-full text-sm">
      <thead class="bg-blue-50 text-left">
        <tr class="text-blue-900">
          <th class="px-4 py-3 font-semibold">Usuario</th>
          <th class="px-4 py-3 font-semibold">Nombre completo</th>
          <th class="px-4 py-3 font-semibold">Email</th>
          <th class="px-4 py-3 font-semibold">Rol</th>
          <th class="px-4 py-3 font-semibold">Estado</th>
          <th class="px-4 py-3 font-semibold">Último login</th>
          <th class="px-4 py-3 font-semibold text-right">Acciones</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-100">
        <tr *ngIf="loading()"><td colspan="7" class="text-center py-10 text-gray-400">Cargando...</td></tr>
        <tr *ngIf="!loading() && users().length === 0">
          <td colspan="7" class="text-center py-10 text-gray-400">Sin resultados</td>
        </tr>
        <tr *ngFor="let u of paginatedUsers()" class="hover:bg-blue-50/40 transition">
          <td class="px-4 py-3 font-mono text-xs text-gray-600">{{ u.Username }}</td>
          <td class="px-4 py-3 font-medium text-gray-800">{{ u.FullName }}</td>
          <td class="px-4 py-3 text-gray-600">{{ u.Email }}</td>
          <td class="px-4 py-3">
            <span [class]="roleBadgeClasses(u.Role)"
                  class="px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap">
              {{ roleLabel(u.Role) }}
            </span>
          </td>
          <td class="px-4 py-3">
            <span [class]="u.IsActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'"
                  class="px-2.5 py-1 rounded-full text-[11px] font-semibold">
              {{ u.IsActive ? 'Activo' : 'Inactivo' }}
            </span>
          </td>
          <td class="px-4 py-3 text-gray-500 text-xs">
            {{ u.LastLoginAt ? (u.LastLoginAt | date:'dd/MM/yyyy HH:mm') : '—' }}
          </td>
          <td class="px-4 py-3 text-right whitespace-nowrap">
            <button (click)="openEdit(u)" class="text-blue-600 hover:underline text-xs mr-2">Editar</button>
            <button (click)="openReset(u)" class="text-orange-600 hover:underline text-xs mr-2">Reset</button>
            <button *ngIf="u.IsActive"  (click)="deactivate(u)" class="text-red-600 hover:underline text-xs">Desactivar</button>
            <button *ngIf="!u.IsActive" (click)="activate(u)"   class="text-emerald-600 hover:underline text-xs">Activar</button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- ============ Paginación ============ -->
    <app-pagination
      [totalItems]="users().length"
      [pageSize]="pageSize"
      [currentPage]="currentPage()"
      (pageChange)="currentPage.set($event)" />
  </div>

  <!-- ============ Modal Crear/Editar ============ -->
  <div *ngIf="showForm()" class="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" (click)="closeForm()">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md" (click)="$event.stopPropagation()">
      <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 class="text-lg font-bold text-gray-800">{{ editingId() ? 'Editar usuario' : 'Nuevo usuario' }}</h2>
        <button (click)="closeForm()" class="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
      </div>
      <div class="p-6 space-y-4">
        <div>
          <label class="text-xs font-semibold text-gray-600 uppercase tracking-wide">Username</label>
          <input [(ngModel)]="form.Username" [disabled]="!!editingId()" name="un"
                 class="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-50 disabled:text-gray-500" />
        </div>
        <div>
          <label class="text-xs font-semibold text-gray-600 uppercase tracking-wide">Nombre completo</label>
          <input [(ngModel)]="form.FullName" name="fn"
                 class="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        <div>
          <label class="text-xs font-semibold text-gray-600 uppercase tracking-wide">Email</label>
          <input [(ngModel)]="form.Email" name="em" type="email"
                 class="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        <div>
          <label class="text-xs font-semibold text-gray-600 uppercase tracking-wide">Rol</label>
          <select [(ngModel)]="form.Role" name="rl"
                  class="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
            <option *ngFor="let r of roleOptions" [value]="r.value">{{ r.label }}</option>
          </select>
        </div>
        <div *ngIf="!editingId()">
          <label class="text-xs font-semibold text-gray-600 uppercase tracking-wide">Contraseña inicial</label>
          <input [(ngModel)]="form.Password" name="pw" type="text" placeholder="mínimo 8 caracteres"
                 class="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg font-mono focus:ring-2 focus:ring-blue-500 outline-none"/>
        </div>
        <label class="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" [(ngModel)]="form.IsActive" name="ia" class="w-4 h-4 rounded text-blue-600"/>
          Usuario activo
        </label>
        <div *ngIf="formError()" class="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{{ formError() }}</div>
      </div>
      <div class="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
        <button (click)="closeForm()" class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm">Cancelar</button>
        <button (click)="save()" [disabled]="saving()"
                class="px-5 py-2 bg-gradient-to-r from-[#16589e] to-[#3b93d0] hover:from-[#114777] hover:to-[#2876b7] disabled:opacity-40 text-white rounded-lg font-semibold text-sm transition">
          {{ saving() ? 'Guardando...' : 'Guardar' }}
        </button>
      </div>
    </div>
  </div>

  <!-- ============ Modal Reset Password ============ -->
  <div *ngIf="showReset()" class="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" (click)="closeReset()">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm" (click)="$event.stopPropagation()">
      <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 class="text-lg font-bold text-gray-800">Resetear contraseña</h2>
        <button (click)="closeReset()" class="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
      </div>
      <div class="p-6 space-y-3">
        <p class="text-sm text-gray-600">Usuario: <strong>{{ resetUser()?.FullName }}</strong></p>
        <input [(ngModel)]="newPassword" type="text" placeholder="Nueva contraseña (mín 8)" name="np"
               class="w-full px-3 py-2 border border-gray-200 rounded-lg font-mono focus:ring-2 focus:ring-orange-500 outline-none"/>
        <div *ngIf="formError()" class="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{{ formError() }}</div>
      </div>
      <div class="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
        <button (click)="closeReset()" class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm">Cancelar</button>
        <button (click)="doReset()" [disabled]="saving()"
                class="px-5 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white rounded-lg font-semibold text-sm">
          Resetear
        </button>
      </div>
    </div>
  </div>
  `,
})
export class UsersComponent implements OnInit {
  private auth = inject(AuthService);

  users = signal<User[]>([]);
  loading = signal(false);
  saving = signal(false);
  showForm = signal(false);
  showReset = signal(false);
  editingId = signal<number | null>(null);
  resetUser = signal<User | null>(null);
  formError = signal<string | null>(null);

  searchTerm = '';
  roleFilter = '';
  activeFilter = '';
  newPassword = '';

  roleOptions = ROLE_OPTIONS;

  // ─── Paginación ───────────────────────────────────────────────
  readonly pageSize = 7;
  currentPage = signal(1);
  paginatedUsers = computed(() => paginate(this.users(), this.currentPage(), this.pageSize));

  form: UserCreate = {
    Username: '', Email: '', FullName: '', Password: '', Role: 'trabajador', IsActive: true,
  };

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    const params: any = {};
    if (this.searchTerm) params.search = this.searchTerm;
    if (this.roleFilter) params.role = this.roleFilter;
    if (this.activeFilter !== '') params.is_active = this.activeFilter === 'true';
    this.auth.listUsers(params).subscribe({
      next: (data) => {
        this.users.set(data);
        this.currentPage.set(1);   // reset al filtrar / recargar
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); this.users.set([]); },
    });
  }

  // ─── Helpers de presentación ──────────────────────────────────
  roleLabel(role: string): string {
    return ROLE_LABELS[role as UserRole] ?? role;
  }
  roleBadgeClasses(role: string): string {
    switch (role) {
      case 'admin':      return 'bg-violet-100 text-violet-700';
      case 'gestor':     return 'bg-blue-100 text-blue-700';
      case 'trabajador': return 'bg-emerald-100 text-emerald-700';
      default:           return 'bg-gray-100 text-gray-700';
    }
  }
  countActive(): number { return this.users().filter(u => u.IsActive).length; }
  countByRole(role: UserRole): number { return this.users().filter(u => u.Role === role).length; }

  // ─── Crear / editar ───────────────────────────────────────────
  openCreate() {
    this.editingId.set(null);
    this.form = { Username: '', Email: '', FullName: '', Password: '', Role: 'trabajador', IsActive: true };
    this.formError.set(null);
    this.showForm.set(true);
  }

  openEdit(u: User) {
    this.editingId.set(u.Id);
    this.form = {
      Username: u.Username, Email: u.Email, FullName: u.FullName,
      Password: '', Role: u.Role as UserRole, IsActive: u.IsActive,
    };
    this.formError.set(null);
    this.showForm.set(true);
  }

  closeForm() { this.showForm.set(false); }

  save() {
    this.formError.set(null);
    this.saving.set(true);
    const id = this.editingId();
    if (id) {
      const upd: UserUpdate = {
        Email: this.form.Email, FullName: this.form.FullName,
        Role: this.form.Role, IsActive: this.form.IsActive,
      };
      this.auth.updateUser(id, upd).subscribe({
        next: () => { this.saving.set(false); this.showForm.set(false); this.load(); },
        error: (err) => { this.formError.set(err?.error?.detail || 'Error al actualizar'); this.saving.set(false); },
      });
    } else {
      if (!this.form.Password || this.form.Password.length < 8) {
        this.formError.set('La contraseña debe tener al menos 8 caracteres');
        this.saving.set(false);
        return;
      }
      this.auth.createUser(this.form).subscribe({
        next: () => { this.saving.set(false); this.showForm.set(false); this.load(); },
        error: (err) => { this.formError.set(err?.error?.detail || 'Error al crear'); this.saving.set(false); },
      });
    }
  }

  // ─── Reset password ──────────────────────────────────────────
  openReset(u: User) {
    this.resetUser.set(u);
    this.newPassword = '';
    this.formError.set(null);
    this.showReset.set(true);
  }
  closeReset() { this.showReset.set(false); this.resetUser.set(null); }
  doReset() {
    const u = this.resetUser();
    if (!u) return;
    if (this.newPassword.length < 8) { this.formError.set('Mínimo 8 caracteres'); return; }
    this.saving.set(true);
    this.auth.resetUserPassword(u.Id, this.newPassword).subscribe({
      next: () => { this.saving.set(false); this.showReset.set(false); this.load(); alert('Contraseña reseteada'); },
      error: (err) => { this.formError.set(err?.error?.detail || 'Error'); this.saving.set(false); },
    });
  }

  activate(u: User)   { this.auth.activateUser(u.Id).subscribe(() => this.load()); }
  deactivate(u: User) {
    if (!confirm(`¿Desactivar a ${u.FullName}?`)) return;
    this.auth.deactivateUser(u.Id).subscribe({
      next: () => this.load(),
      error: (err) => alert(err?.error?.detail || 'Error'),
    });
  }
}
