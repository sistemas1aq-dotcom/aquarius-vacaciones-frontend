import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { User, UserCreate, UserUpdate, UserRole } from '../../models/auth';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="p-6 max-w-7xl mx-auto">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">Gestión de usuarios</h1>
        <p class="text-sm text-gray-500">Administra los usuarios del sistema, sus roles y accesos.</p>
      </div>
      <button
        (click)="openCreate()"
        class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow font-medium"
      >+ Nuevo usuario</button>
    </div>

    <!-- Filtros -->
    <div class="bg-white rounded-lg shadow p-4 mb-4 flex flex-wrap gap-3">
      <input
        type="text"
        [(ngModel)]="searchTerm"
        (ngModelChange)="load()"
        placeholder="Buscar por nombre, usuario o email..."
        class="flex-1 min-w-[250px] px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
      />
      <select
        [(ngModel)]="roleFilter"
        (ngModelChange)="load()"
        class="px-3 py-2 border border-gray-300 rounded"
      >
        <option value="">Todos los roles</option>
        <option value="admin">Admin</option>
        <option value="gestor">Gestor</option>
      </select>
      <select
        [(ngModel)]="activeFilter"
        (ngModelChange)="load()"
        class="px-3 py-2 border border-gray-300 rounded"
      >
        <option value="">Todos los estados</option>
        <option value="true">Activos</option>
        <option value="false">Inactivos</option>
      </select>
    </div>

    <!-- Tabla -->
    <div class="bg-white rounded-lg shadow overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-blue-50 text-left">
          <tr class="text-gray-700">
            <th class="px-4 py-3">Usuario</th>
            <th class="px-4 py-3">Nombre completo</th>
            <th class="px-4 py-3">Email</th>
            <th class="px-4 py-3">Rol</th>
            <th class="px-4 py-3">Estado</th>
            <th class="px-4 py-3">Último login</th>
            <th class="px-4 py-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr *ngIf="loading()"><td colspan="7" class="text-center py-8 text-gray-400">Cargando...</td></tr>
          <tr *ngIf="!loading() && users().length === 0">
            <td colspan="7" class="text-center py-8 text-gray-400">Sin resultados</td>
          </tr>
          <tr *ngFor="let u of users()" class="hover:bg-blue-50/40">
            <td class="px-4 py-3 font-mono text-xs">{{ u.Username }}</td>
            <td class="px-4 py-3 font-medium text-gray-800">{{ u.FullName }}</td>
            <td class="px-4 py-3 text-gray-600">{{ u.Email }}</td>
            <td class="px-4 py-3">
              <span [class]="u.Role === 'admin' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'"
                    class="px-2 py-0.5 rounded text-xs font-semibold uppercase">
                {{ u.Role }}
              </span>
            </td>
            <td class="px-4 py-3">
              <span [class]="u.IsActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'"
                    class="px-2 py-0.5 rounded text-xs font-semibold">
                {{ u.IsActive ? 'Activo' : 'Inactivo' }}
              </span>
            </td>
            <td class="px-4 py-3 text-gray-500">
              {{ u.LastLoginAt ? (u.LastLoginAt | date:'dd/MM/yyyy HH:mm') : '—' }}
            </td>
            <td class="px-4 py-3 text-right whitespace-nowrap">
              <button (click)="openEdit(u)" class="text-blue-600 hover:underline text-xs mr-2">Editar</button>
              <button (click)="openReset(u)" class="text-orange-600 hover:underline text-xs mr-2">Reset Pass</button>
              <button *ngIf="u.IsActive"  (click)="deactivate(u)" class="text-red-600  hover:underline text-xs">Desactivar</button>
              <button *ngIf="!u.IsActive" (click)="activate(u)"   class="text-green-600 hover:underline text-xs">Activar</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- Modal Crear/Editar -->
  <div *ngIf="showForm()" class="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" (click)="closeForm()">
    <div class="bg-white rounded-lg shadow-xl w-full max-w-md" (click)="$event.stopPropagation()">
      <div class="p-5 border-b flex items-center justify-between">
        <h2 class="text-lg font-semibold">{{ editingId() ? 'Editar usuario' : 'Nuevo usuario' }}</h2>
        <button (click)="closeForm()" class="text-gray-400 hover:text-gray-600">✕</button>
      </div>
      <div class="p-5 space-y-3">
        <div>
          <label class="text-sm text-gray-700 font-medium">Username</label>
          <input [(ngModel)]="form.Username" [disabled]="!!editingId()"
                 class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-50" />
        </div>
        <div>
          <label class="text-sm text-gray-700 font-medium">Nombre completo</label>
          <input [(ngModel)]="form.FullName" name="fn"
                 class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        <div>
          <label class="text-sm text-gray-700 font-medium">Email</label>
          <input [(ngModel)]="form.Email" name="em" type="email"
                 class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        <div>
          <label class="text-sm text-gray-700 font-medium">Rol</label>
          <select [(ngModel)]="form.Role" name="rl"
                  class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="gestor">Gestor</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div *ngIf="!editingId()">
          <label class="text-sm text-gray-700 font-medium">Contraseña inicial</label>
          <input [(ngModel)]="form.Password" name="pw" type="text"
                 class="w-full px-3 py-2 border rounded font-mono" placeholder="mínimo 8 caracteres"/>
        </div>
        <label class="flex items-center gap-2 text-sm">
          <input type="checkbox" [(ngModel)]="form.IsActive" name="ia" /> Activo
        </label>
        <div *ngIf="formError()" class="bg-red-50 text-red-700 text-sm px-3 py-2 rounded">{{ formError() }}</div>
      </div>
      <div class="p-5 border-t flex justify-end gap-2">
        <button (click)="closeForm()" class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded">Cancelar</button>
        <button (click)="save()" [disabled]="saving()"
                class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded font-medium">
          {{ saving() ? 'Guardando...' : 'Guardar' }}
        </button>
      </div>
    </div>
  </div>

  <!-- Modal Reset Password -->
  <div *ngIf="showReset()" class="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" (click)="closeReset()">
    <div class="bg-white rounded-lg shadow-xl w-full max-w-sm" (click)="$event.stopPropagation()">
      <div class="p-5 border-b flex items-center justify-between">
        <h2 class="text-lg font-semibold">Resetear contraseña</h2>
        <button (click)="closeReset()" class="text-gray-400 hover:text-gray-600">✕</button>
      </div>
      <div class="p-5 space-y-3">
        <p class="text-sm text-gray-600">Usuario: <strong>{{ resetUser()?.FullName }}</strong></p>
        <input [(ngModel)]="newPassword" type="text" placeholder="Nueva contraseña (min 8)"
               class="w-full px-3 py-2 border rounded font-mono focus:ring-2 focus:ring-blue-500 outline-none"/>
        <div *ngIf="formError()" class="bg-red-50 text-red-700 text-sm px-3 py-2 rounded">{{ formError() }}</div>
      </div>
      <div class="p-5 border-t flex justify-end gap-2">
        <button (click)="closeReset()" class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded">Cancelar</button>
        <button (click)="doReset()" [disabled]="saving()"
                class="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white rounded font-medium">
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

  form: UserCreate = {
    Username: '', Email: '', FullName: '', Password: '', Role: 'gestor', IsActive: true,
  };

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    const params: any = {};
    if (this.searchTerm) params.search = this.searchTerm;
    if (this.roleFilter) params.role = this.roleFilter;
    if (this.activeFilter !== '') params.is_active = this.activeFilter === 'true';
    this.auth.listUsers(params).subscribe({
      next: (data) => { this.users.set(data); this.loading.set(false); },
      error: () => { this.loading.set(false); this.users.set([]); },
    });
  }

  openCreate() {
    this.editingId.set(null);
    this.form = { Username: '', Email: '', FullName: '', Password: '', Role: 'gestor', IsActive: true };
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
    if (this.newPassword.length < 8) {
      this.formError.set('Mínimo 8 caracteres');
      return;
    }
    this.saving.set(true);
    this.auth.resetUserPassword(u.Id, this.newPassword).subscribe({
      next: () => { this.saving.set(false); this.showReset.set(false); this.load(); alert('Contraseña reseteada'); },
      error: (err) => { this.formError.set(err?.error?.detail || 'Error'); this.saving.set(false); },
    });
  }

  activate(u: User)   { this.auth.activateUser(u.Id).subscribe(() => this.load()); }
  deactivate(u: User) {
    if (!confirm(`¿Desactivar a ${u.FullName}?`)) return;
    this.auth.deactivateUser(u.Id).subscribe({ next: () => this.load(), error: (err) => alert(err?.error?.detail || 'Error') });
  }
}
