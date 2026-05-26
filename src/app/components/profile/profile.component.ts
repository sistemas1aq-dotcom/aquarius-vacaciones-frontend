import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="p-6 max-w-2xl mx-auto">
    <h1 class="text-2xl font-bold text-gray-800 mb-6">Mi perfil</h1>

    <div class="bg-white rounded-lg shadow p-6 mb-6">
      <h2 class="font-semibold text-gray-700 mb-4">Información</h2>
      <dl class="grid grid-cols-2 gap-y-3 text-sm">
        <dt class="text-gray-500">Nombre</dt>
        <dd class="text-gray-800 font-medium">{{ user()?.FullName }}</dd>
        <dt class="text-gray-500">Usuario</dt>
        <dd class="text-gray-800 font-mono">{{ user()?.Username }}</dd>
        <dt class="text-gray-500">Email</dt>
        <dd class="text-gray-800">{{ user()?.Email }}</dd>
        <dt class="text-gray-500">Rol</dt>
        <dd>
          <span class="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-semibold uppercase">
            {{ user()?.Role }}
          </span>
        </dd>
        <dt class="text-gray-500">Último acceso</dt>
        <dd class="text-gray-600">{{ user()?.LastLoginAt ? (user()!.LastLoginAt | date:'dd/MM/yyyy HH:mm') : '—' }}</dd>
      </dl>
    </div>

    <div class="bg-white rounded-lg shadow p-6">
      <h2 class="font-semibold text-gray-700 mb-4">Cambiar contraseña</h2>
      <form (ngSubmit)="change()" class="space-y-3 max-w-md">
        <div>
          <label class="block text-sm text-gray-600 mb-1">Contraseña actual</label>
          <input type="password" [(ngModel)]="currentPwd" name="c" required
                 class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"/>
        </div>
        <div>
          <label class="block text-sm text-gray-600 mb-1">Nueva contraseña (min 8)</label>
          <input type="password" [(ngModel)]="newPwd" name="n" required minlength="8"
                 class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"/>
        </div>
        <div>
          <label class="block text-sm text-gray-600 mb-1">Confirmar nueva contraseña</label>
          <input type="password" [(ngModel)]="confirmPwd" name="cf" required
                 class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"/>
        </div>

        <div *ngIf="error()"   class="bg-red-50 text-red-700 text-sm px-3 py-2 rounded">{{ error() }}</div>
        <div *ngIf="success()" class="bg-green-50 text-green-700 text-sm px-3 py-2 rounded">{{ success() }}</div>

        <button type="submit" [disabled]="loading()"
                class="bg-gradient-to-r from-[#16589e] to-[#3b93d0] hover:from-[#114777] hover:to-[#2876b7] disabled:opacity-40 text-white px-5 py-2 rounded font-medium transition">
          {{ loading() ? 'Guardando...' : 'Actualizar contraseña' }}
        </button>
      </form>
    </div>
  </div>
  `,
})
export class ProfileComponent {
  private auth = inject(AuthService);
  user = this.auth.currentUser;

  currentPwd = '';
  newPwd = '';
  confirmPwd = '';
  loading = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);

  change() {
    this.error.set(null);
    this.success.set(null);
    if (this.newPwd !== this.confirmPwd) {
      this.error.set('Las contraseñas nuevas no coinciden');
      return;
    }
    if (this.newPwd.length < 8) {
      this.error.set('Mínimo 8 caracteres');
      return;
    }
    this.loading.set(true);
    this.auth.changePassword({ current_password: this.currentPwd, new_password: this.newPwd }).subscribe({
      next: () => {
        this.success.set('Contraseña actualizada exitosamente');
        this.currentPwd = this.newPwd = this.confirmPwd = '';
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.detail || 'Error al cambiar contraseña');
        this.loading.set(false);
      },
    });
  }
}
