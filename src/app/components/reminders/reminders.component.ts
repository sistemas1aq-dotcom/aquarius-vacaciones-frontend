import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { Reminder, DashboardAlert, EstadoEnvio } from '../../models/interfaces';
import { PaginationComponent, paginate } from '../shared/pagination.component';

@Component({
  selector: 'app-reminders',
  standalone: true,
  imports: [CommonModule, PaginationComponent],
  template: `
    <!-- Los interruptores viven en Configuraciones: un mismo control en dos
         pantallas es la vía rápida a que muestren estados distintos. Aquí solo
         se leen, para saber qué botones tienen sentido. -->
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-5">
      <div class="flex justify-between items-center mb-4 flex-wrap gap-3">
        <div>
          <h4 class="text-base font-bold text-gray-800">Recordatorios</h4>
          <p class="text-xs text-gray-400 mt-1">Empleados con +30d pendientes — se avisa cada {{ 15 }} días hasta que programen vacaciones</p>
        </div>
        <!-- Este botón es la OTRA vía de lote, la misma corrida que el
             programador. Por eso cuelga del interruptor de lote, no solo del
             general: si RRHH apagó los envíos masivos, apagados están, los
             dispare un reloj o una persona. -->
        <button (click)="sendReminders()"
          class="px-5 py-2.5 text-xs font-semibold rounded-lg text-white transition
                 disabled:opacity-50 disabled:cursor-not-allowed"
          [class.bg-amber-500]="puedeEnviarLote()"
          [class.hover:bg-amber-600]="puedeEnviarLote()"
          [class.bg-gray-400]="!puedeEnviarLote()"
          [title]="motivoLoteBloqueado() || 'Envía a todos los que tocan hoy'"
          [disabled]="sending || !puedeEnviarLote()">
          {{ sending ? 'Enviando...' : '📧 Enviar a todos los pendientes' }}
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

      <div *ngIf="lastResult" class="rounded-lg p-3 mb-4 text-sm border"
           [class.bg-emerald-50]="!lastResultError" [class.border-emerald-200]="!lastResultError" [class.text-emerald-700]="!lastResultError"
           [class.bg-red-50]="lastResultError" [class.border-red-200]="lastResultError" [class.text-red-700]="lastResultError">
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
                <th class="text-center px-3 py-2 text-amber-700 font-semibold uppercase whitespace-nowrap">Enviar</th>
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

                <!-- Acción por trabajador.
                     Dos pasos a propósito: el primer clic pide confirmación.
                     Es un correo a una persona real; un clic de más no debería
                     bastar para dispararlo. -->
                <td class="px-3 py-2 text-center whitespace-nowrap">
                  <ng-container *ngIf="resultado(p.EmployeeId) as res; else botonEnviar">
                    <span class="px-2 py-1 rounded-full text-xs font-semibold"
                          [class.bg-emerald-100]="res.ok" [class.text-emerald-700]="res.ok"
                          [class.bg-red-100]="!res.ok" [class.text-red-700]="!res.ok"
                          [title]="res.msg">
                      {{ res.ok ? '✓ Enviado' : '✗ Error' }}
                    </span>
                    <button (click)="limpiarResultado(p.EmployeeId)"
                      class="ml-1 text-gray-400 hover:text-gray-600" title="Volver a intentar">↻</button>
                  </ng-container>

                  <ng-template #botonEnviar>
                    <span *ngIf="enviandoA() === p.EmployeeId" class="text-xs text-gray-500">enviando…</span>

                    <ng-container *ngIf="enviandoA() !== p.EmployeeId">
                      <button *ngIf="confirmandoA() !== p.EmployeeId"
                        (click)="pedirConfirmacion(p)"
                        [disabled]="!envio()?.activo || !p.Email"
                        [title]="tituloBoton(p)"
                        class="px-2.5 py-1 rounded-md text-xs font-semibold border transition
                               border-amber-300 text-amber-700 hover:bg-amber-100
                               disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent">
                        Enviar
                      </button>

                      <span *ngIf="confirmandoA() === p.EmployeeId" class="inline-flex items-center gap-1">
                        <button (click)="enviarIndividual(p)"
                          class="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-500 text-white hover:bg-amber-600">
                          Confirmar
                        </button>
                        <button (click)="confirmandoA.set(null)"
                          class="px-2 py-1 rounded-md text-xs text-gray-500 hover:text-gray-700">
                          Cancelar
                        </button>
                      </span>
                    </ng-container>
                  </ng-template>
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
                  [class.bg-red-100]="r.Status === 'failed'" [class.text-red-700]="r.Status === 'failed'"
                  [title]="r.ErrorMessage || ''">
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
  private api = inject(ApiService);

  reminders: Reminder[] = [];
  pending30: DashboardAlert[] = [];
  sending = false;
  lastResult = '';
  lastResultError = false;

  // ─── Interruptores ───────────────────────────────────────────────
  envio = signal<EstadoEnvio | null>(null);

  /** El botón masivo necesita los DOS permisos: el general y el de lote. */
  puedeEnviarLote = computed(() => {
    const e = this.envio();
    return !!e && e.activo && e.masivo_activo;
  });

  motivoLoteBloqueado(): string {
    const e = this.envio();
    if (!e) return 'Cargando el estado del envío…';
    if (!e.activo) return 'El envío de correos está INACTIVO (interruptor general)';
    if (!e.masivo_activo) return 'Los envíos en lote están INACTIVOS — usa el botón «Enviar» de cada fila';
    return '';
  }

  // ─── Envío individual ────────────────────────────────────────────
  confirmandoA = signal<number | null>(null);
  enviandoA = signal<number | null>(null);
  private resultados = signal<Record<number, { ok: boolean; msg: string }>>({});

  resultado(employeeId: number): { ok: boolean; msg: string } | null {
    return this.resultados()[employeeId] ?? null;
  }

  limpiarResultado(employeeId: number) {
    const copia = { ...this.resultados() };
    delete copia[employeeId];
    this.resultados.set(copia);
  }

  tituloBoton(p: DashboardAlert): string {
    if (!this.envio()?.activo) return 'El envío de correos está INACTIVO';
    if (!p.Email) return 'El empleado no tiene correo registrado';
    return `Enviar el recordatorio a ${p.Email}`;
  }

  pedirConfirmacion(p: DashboardAlert) {
    this.confirmandoA.set(p.EmployeeId);
  }

  enviarIndividual(p: DashboardAlert) {
    this.confirmandoA.set(null);
    this.enviandoA.set(p.EmployeeId);
    this.api.enviarRecordatorioIndividual(p.EmployeeId).subscribe({
      next: (res) => {
        this.enviandoA.set(null);
        this.resultados.set({
          ...this.resultados(),
          [p.EmployeeId]: { ok: !!res.ok, msg: res.mensaje || res.error || '' },
        });
        // El historial cambia siempre: se registra tanto el envío como el fallo.
        this.loadReminders();
      },
      error: (err) => {
        this.enviandoA.set(null);
        this.resultados.set({
          ...this.resultados(),
          [p.EmployeeId]: { ok: false, msg: err?.error?.detail || 'Error de conexión con el servidor' },
        });
      },
    });
  }

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

  ngOnInit() {
    this.loadEstadoEnvio();
    this.loadReminders();
    this.loadPendingEmployees();
  }

  loadEstadoEnvio() {
    this.api.getEstadoEnvio().subscribe({
      next: (estado) => this.envio.set(estado),
      // Si no se puede leer, `envio()` queda en null y los botones de envío
      // salen deshabilitados: ante la duda, no se manda nada.
      error: () => this.envio.set(null),
    });
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
    this.lastResult = '';
    this.api.sendDailyReminders().subscribe({
      next: (res) => {
        // El backend devuelve `mensaje`; se deja `message` como respaldo por si
        // alguna versión antigua del API sigue respondiendo con ese nombre.
        this.lastResult = res.mensaje || (res as any).message || 'Corrida terminada.';
        this.lastResultError = !!(res.detalle?.error_conexion || res.detalle?.bloqueado_por);
        this.sending = false;
        this.loadReminders();
        this.loadPendingEmployees();
      },
      error: () => {
        this.lastResult = 'Error al enviar recordatorios';
        this.lastResultError = true;
        this.sending = false;
      },
    });
  }
}
