import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { Reminder, DashboardAlert } from '../../models/interfaces';
import { PaginationComponent, paginate } from '../shared/pagination.component';

@Component({
  selector: 'app-reminders',
  standalone: true,
  imports: [CommonModule, PaginationComponent],
  template: `
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-5">
      <div class="flex justify-between items-center mb-4 flex-wrap gap-3">
        <div>
          <h4 class="text-base font-bold text-gray-800">Recordatorios Automáticos</h4>
          <p class="text-xs text-gray-400 mt-1">Empleados con +30d pendientes — recordatorio diario hasta programar vacaciones</p>
        </div>
        <button (click)="sendReminders()"
          class="px-5 py-2.5 text-xs font-semibold rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition"
          [disabled]="sending">
          {{ sending ? 'Enviando...' : '📧 Enviar Recordatorios Diarios' }}
        </button>
      </div>

      <!-- Resumen actual de empleados pendientes -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div class="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div class="text-xs text-amber-700 font-semibold uppercase">Empleados pendientes</div>
          <div class="text-2xl font-bold text-amber-700 mt-1">{{ pending30.length }}</div>
          <div class="text-xs text-amber-600 mt-0.5">con +30 días sin programar</div>
        </div>
        <div class="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <div class="text-xs text-orange-700 font-semibold uppercase">Total días pendientes (Año)</div>
          <div class="text-2xl font-bold text-orange-700 mt-1">{{ totalPendingDays() | number:'1.0-0' }}</div>
          <div class="text-xs text-orange-600 mt-0.5">suma del año, sin truncas</div>
        </div>
        <div class="bg-red-50 border border-red-200 rounded-lg p-3">
          <div class="text-xs text-red-700 font-semibold uppercase">Promedio por empleado</div>
          <div class="text-2xl font-bold text-red-700 mt-1">{{ avgPendingDays() | number:'1.0-0' }}</div>
          <div class="text-xs text-red-600 mt-0.5">días del año / empleado</div>
        </div>
      </div>

      <div *ngIf="lastResult" class="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-4 text-sm text-emerald-700">
        {{ lastResult }}
      </div>

      <!-- Detalle de empleados con días pendientes actuales -->
      <div *ngIf="pending30.length > 0" class="border border-amber-100 rounded-lg overflow-hidden">
        <div class="bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 uppercase flex justify-between items-center">
          <span>Empleados que necesitan recordatorio</span>
          <span class="text-amber-600 font-semibold">{{ pending30.length }} en total</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-xs">
            <thead>
              <tr class="border-b border-amber-100 bg-amber-50/50">
                <th class="text-left px-3 py-2 text-amber-700 font-semibold uppercase">Empleado</th>
                <th class="text-left px-3 py-2 text-amber-700 font-semibold uppercase">Departamento</th>
                <th class="text-left px-3 py-2 text-amber-700 font-semibold uppercase">Correo</th>
                <th class="text-right px-3 py-2 text-amber-700 font-semibold uppercase">Días pendientes (Año)</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let p of paginatedPending()" class="border-b border-amber-50 hover:bg-amber-50/30">
                <td class="px-3 py-2 font-semibold text-gray-800">{{ p.EmployeeName }}</td>
                <td class="px-3 py-2 text-gray-600">{{ p.Department }}</td>
                <td class="px-3 py-2 text-gray-500">{{ p.Email || '—' }}</td>
                <td class="px-3 py-2 text-right">
                  <span class="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                    {{ (p.PendingByYear || 0) | number:'1.0-0' }} días
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="px-3 py-2 bg-amber-50/30 border-t border-amber-100">
          <app-pagination
            [totalItems]="pending30.length"
            [pageSize]="pendingPageSize"
            [currentPage]="pendingPage()"
            (pageChange)="pendingPage.set($event)" />
        </div>
      </div>
    </div>

    <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <h4 class="text-sm font-bold text-gray-800 mb-4">Historial de Envíos</h4>
      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead>
            <tr class="border-b border-gray-100">
              <th class="text-left px-3 py-2 text-gray-400 font-semibold uppercase">Fecha</th>
              <th class="text-left px-3 py-2 text-gray-400 font-semibold uppercase">Empleado</th>
              <th class="text-left px-3 py-2 text-gray-400 font-semibold uppercase">Correo</th>
              <th class="text-right px-3 py-2 text-gray-400 font-semibold uppercase">Días Pendientes (Año)</th>
              <th class="text-left px-3 py-2 text-gray-400 font-semibold uppercase">Tipo</th>
              <th class="text-left px-3 py-2 text-gray-400 font-semibold uppercase">Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let r of paginatedReminders()" class="border-b border-gray-50 hover:bg-gray-50">
              <td class="px-3 py-2 text-gray-600">{{ r.ReminderDate | date:'dd/MM/yyyy' }}</td>
              <td class="px-3 py-2 font-semibold text-gray-800">{{ r.EmployeeName }}</td>
              <td class="px-3 py-2 text-gray-500">{{ r.EmailTo }}</td>
              <td class="px-3 py-2 text-right">
                <span class="px-2 py-0.5 rounded-full text-xs font-bold"
                  [class.bg-red-100]="(r.PendingByYear || 0) >= 30"
                  [class.text-red-700]="(r.PendingByYear || 0) >= 30"
                  [class.bg-amber-100]="(r.PendingByYear || 0) > 0 && (r.PendingByYear || 0) < 30"
                  [class.text-amber-700]="(r.PendingByYear || 0) > 0 && (r.PendingByYear || 0) < 30"
                  [class.bg-gray-100]="(r.PendingByYear || 0) === 0"
                  [class.text-gray-500]="(r.PendingByYear || 0) === 0">
                  {{ (r.PendingByYear || 0) | number:'1.0-0' }} días
                </span>
              </td>
              <td class="px-3 py-2">
                <span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">Recordatorio</span>
              </td>
              <td class="px-3 py-2">
                <span class="px-2 py-0.5 rounded-full text-xs font-semibold"
                  [class.bg-emerald-100]="r.Status === 'sent'" [class.text-emerald-700]="r.Status === 'sent'"
                  [class.bg-gray-100]="r.Status === 'pending'" [class.text-gray-600]="r.Status === 'pending'"
                  [class.bg-red-100]="r.Status === 'failed'" [class.text-red-700]="r.Status === 'failed'">
                  {{ r.Status === 'sent' ? 'Enviado' : r.Status === 'pending' ? 'Pendiente' : 'Error' }}
                </span>
              </td>
            </tr>
            <tr *ngIf="reminders.length === 0">
              <td colspan="6" class="px-3 py-10 text-center text-gray-400">Sin recordatorios registrados</td>
            </tr>
          </tbody>
        </table>
      </div>

      <app-pagination
        [totalItems]="reminders.length"
        [pageSize]="pageSize"
        [currentPage]="currentPage()"
        (pageChange)="currentPage.set($event)" />
    </div>
  `,
})
export class RemindersComponent implements OnInit {
  reminders: Reminder[] = [];
  pending30: DashboardAlert[] = [];
  sending = false;
  lastResult = '';

  // Paginación — Historial de envíos
  readonly pageSize = 10;
  currentPage = signal(1);
  paginatedReminders(): Reminder[] {
    return paginate(this.reminders, this.currentPage(), this.pageSize);
  }

  // Paginación — Empleados que necesitan recordatorio
  readonly pendingPageSize = 10;
  pendingPage = signal(1);
  paginatedPending(): DashboardAlert[] {
    return paginate(this.pending30, this.pendingPage(), this.pendingPageSize);
  }

  totalPendingDays(): number {
    return this.pending30.reduce((sum, p) => sum + (p.PendingByYear || 0), 0);
  }

  avgPendingDays(): number {
    if (this.pending30.length === 0) return 0;
    return this.totalPendingDays() / this.pending30.length;
  }

  /** Orden: días pendientes (año) DESC, luego nombre ASC */
  private sortByPendingDesc<T extends { PendingByYear?: number; EmployeeName?: string }>(arr: T[]): T[] {
    return arr.slice().sort((a, b) => {
      const diff = (b.PendingByYear || 0) - (a.PendingByYear || 0);
      if (diff !== 0) return diff;  // DESC por días
      return (a.EmployeeName || '').toLocaleLowerCase()
        .localeCompare((b.EmployeeName || '').toLocaleLowerCase());
    });
  }

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadReminders();
    this.loadPendingEmployees();
  }

  loadReminders() {
    this.api.getReminders().subscribe(res => {
      this.reminders = this.sortByPendingDesc(res.items);
      this.currentPage.set(1);
    });
  }

  loadPendingEmployees() {
    this.api.getDashboard().subscribe(res => {
      this.pending30 = this.sortByPendingDesc(res.Pending30 || []);
      this.pendingPage.set(1);
    });
  }

  sendReminders() {
    this.sending = true;
    this.api.sendDailyReminders().subscribe({
      next: (res) => {
        this.lastResult = res.message;
        this.sending = false;
        this.loadReminders();
        this.loadPendingEmployees();
      },
      error: () => {
        this.lastResult = 'Error al enviar recordatorios';
        this.sending = false;
      },
    });
  }
}
