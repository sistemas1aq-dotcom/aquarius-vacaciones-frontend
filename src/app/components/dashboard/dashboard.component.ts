import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { DashboardResponse, DashboardAlert, EmailDraft } from '../../models/interfaces';
import { ROLE_LABELS, UserRole } from '../../models/auth';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Header de bienvenida -->
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-800">Bienvenido, {{ firstName() }}</h1>
      <p class="text-sm text-gray-500 mt-1">
        {{ roleLabel() }} | {{ today | date:'dd/MM/yyyy HH:mm' }}
      </p>
    </div>

    <div class="space-y-6" *ngIf="data">
      <!-- ============ KPI Cards ============ -->
      <div class="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div class="rounded-2xl p-5 bg-blue-50">
          <div class="text-2xl mb-2">👥</div>
          <div class="text-3xl font-extrabold text-blue-700">{{ data.Stats.TotalEmployees }}</div>
          <div class="text-xs text-blue-700/70 font-medium mt-1">Empleados Totales</div>
        </div>
        <div class="rounded-2xl p-5 bg-emerald-50">
          <div class="text-2xl mb-2">🏖️</div>
          <div class="text-3xl font-extrabold text-emerald-700">{{ data.Stats.OnVacation }}</div>
          <div class="text-xs text-emerald-700/70 font-medium mt-1">En Vacaciones</div>
        </div>
        <div class="rounded-2xl p-5 bg-cyan-50">
          <div class="text-2xl mb-2">📅</div>
          <div class="text-3xl font-extrabold text-cyan-700">{{ data.Stats.TotalPendingDays | number:'1.0-0' }}</div>
          <div class="text-xs text-cyan-700/70 font-medium mt-1">Días Pendientes</div>
        </div>
        <div class="rounded-2xl p-5 bg-orange-50">
          <div class="text-2xl mb-2">⚠️</div>
          <div class="text-3xl font-extrabold text-orange-700">{{ data.Stats.CriticalAlerts }}</div>
          <div class="text-xs text-orange-700/70 font-medium mt-1">Alertas Críticas</div>
        </div>
        <div class="rounded-2xl p-5 bg-violet-50">
          <div class="text-2xl mb-2">📋</div>
          <div class="text-3xl font-extrabold text-violet-700">{{ data.Stats.NoProgrammed }}</div>
          <div class="text-xs text-violet-700/70 font-medium mt-1">Sin Programar</div>
        </div>
      </div>

      <!-- ============ Alertas del Sistema ============ -->
      <section class="bg-white rounded-2xl shadow-sm p-6">
        <h3 class="text-base font-bold text-gray-800 mb-4">Alertas del Sistema</h3>
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="rounded-xl p-5 bg-red-50 text-center">
            <div class="text-3xl font-extrabold text-red-700">{{ data.Critical.length }}</div>
            <div class="text-xs text-red-700/80 font-medium mt-1">Críticas (+60d)</div>
          </div>
          <div class="rounded-xl p-5 bg-amber-50 text-center">
            <div class="text-3xl font-extrabold text-amber-700">{{ data.Pending30.length }}</div>
            <div class="text-xs text-amber-700/80 font-medium mt-1">+30 días pendientes</div>
          </div>
          <div class="rounded-xl p-5 bg-orange-50 text-center">
            <div class="text-3xl font-extrabold text-orange-700">{{ data.NextWeekOut.length }}</div>
            <div class="text-xs text-orange-700/80 font-medium mt-1">Salen próx. semana</div>
          </div>
          <div class="rounded-xl p-5 bg-slate-100 text-center">
            <div class="text-3xl font-extrabold text-slate-700">{{ data.NextWeekReturn.length }}</div>
            <div class="text-xs text-slate-700/80 font-medium mt-1">Regresan próx. semana</div>
          </div>
        </div>
      </section>

      <!-- ============ Críticos detallado ============ -->
      <section *ngIf="data.Critical.length > 0"
               class="bg-white rounded-2xl shadow-sm p-6 border-l-4 border-red-500">
        <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 class="text-base font-bold text-gray-800">⚠️ Vacaciones excesivas (+60 días)</h3>
          <span class="text-xs text-gray-500">{{ data.Critical.length }} empleados</span>
        </div>
        <div class="divide-y divide-gray-100">
          <div *ngFor="let alert of data.Critical.slice(0, 10)"
               class="flex justify-between items-center py-2.5">
            <div class="min-w-0">
              <div class="font-semibold text-sm text-gray-800 truncate">{{ alert.EmployeeName }}</div>
              <div class="text-xs text-gray-400">{{ alert.Department }}</div>
            </div>
            <div class="flex items-center gap-3 flex-shrink-0">
              <span class="text-sm font-bold text-red-600">{{ alert.TotalPending | number:'1.0-0' }}d</span>
              <button (click)="openConvocar(alert)"
                      class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700">
                Convocar
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- ============ Próxima semana ============ -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section class="bg-white rounded-2xl shadow-sm p-6">
          <div class="flex items-center gap-2 mb-4">
            <span class="text-base">🚀</span>
            <h3 class="font-bold text-sm text-gray-800">Salen Próxima Semana</h3>
            <span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
              {{ data.NextWeekOut.length }}
            </span>
          </div>
          <div *ngIf="data.NextWeekOut.length === 0" class="text-sm text-gray-400">
            Nadie sale la próxima semana
          </div>
          <div *ngFor="let alert of data.NextWeekOut"
               class="py-2 border-b border-gray-50 last:border-0">
            <div class="font-semibold text-sm text-gray-800">{{ alert.EmployeeName }}</div>
            <div class="text-xs text-gray-400">
              {{ alert.StartDate | date:'dd MMM' }} → {{ alert.EndDate | date:'dd MMM' }} ({{ alert.Days | number:'1.0-0' }}d)
            </div>
          </div>
        </section>

        <section class="bg-white rounded-2xl shadow-sm p-6">
          <div class="flex items-center gap-2 mb-4">
            <span class="text-base">🔙</span>
            <h3 class="font-bold text-sm text-gray-800">Regresan Próxima Semana</h3>
            <span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
              {{ data.NextWeekReturn.length }}
            </span>
          </div>
          <div *ngIf="data.NextWeekReturn.length === 0" class="text-sm text-gray-400">
            Nadie regresa la próxima semana
          </div>
          <div *ngFor="let alert of data.NextWeekReturn"
               class="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
            <div>
              <div class="font-semibold text-sm text-gray-800">{{ alert.EmployeeName }}</div>
              <div class="text-xs text-gray-400">Regresa: {{ alert.EndDate | date:'dd MMM yyyy' }}</div>
            </div>
            <button (click)="openExtender(alert)"
                    class="px-3 py-1 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 rounded-lg">
              Extender
            </button>
          </div>
        </section>
      </div>

      <!-- ============ +30 días pendientes ============ -->
      <section *ngIf="data.Pending30.length > 0"
               class="bg-white rounded-2xl shadow-sm p-6 border-l-4 border-amber-500">
        <div class="flex justify-between items-center mb-4 flex-wrap gap-2">
          <h3 class="font-bold text-sm text-gray-800">📧 +30 Días Pendientes ({{ data.Pending30.length }})</h3>
          <button (click)="sendReminders()"
                  class="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-500 text-white hover:bg-amber-600">
            Enviar Recordatorios
          </button>
        </div>
        <div class="max-h-52 overflow-auto divide-y divide-gray-50">
          <div *ngFor="let alert of data.Pending30"
               class="flex justify-between items-center py-1.5">
            <div class="min-w-0">
              <span class="font-semibold text-xs text-gray-800">{{ alert.EmployeeName }}</span>
              <span class="text-xs text-gray-400 ml-2">{{ alert.Department }}</span>
            </div>
            <span class="text-xs font-bold text-amber-600 flex-shrink-0">{{ alert.TotalPending | number:'1.0-0' }}d</span>
          </div>
        </div>
      </section>
    </div>

    <div *ngIf="loading" class="flex items-center justify-center py-20">
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
    </div>

    <!-- ============ Modal: Convocar a RRHH ============ -->
    <div *ngIf="showConvocar()" class="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
         (click)="closeConvocar()">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg" (click)="$event.stopPropagation()">
        <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 class="text-lg font-bold text-gray-800">Convocar a Reunión RRHH</h2>
            <p class="text-xs text-gray-500 mt-0.5">{{ convocarTarget()?.EmployeeName }}</p>
          </div>
          <button (click)="closeConvocar()" class="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div class="p-6 space-y-3">
          <div>
            <label class="text-xs font-semibold text-gray-600 uppercase">Para</label>
            <input [(ngModel)]="convocarEmail.To" type="email"
                   class="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none" />
          </div>
          <div>
            <label class="text-xs font-semibold text-gray-600 uppercase">Asunto</label>
            <input [(ngModel)]="convocarEmail.Subject"
                   class="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none" />
          </div>
          <div>
            <label class="text-xs font-semibold text-gray-600 uppercase">Mensaje</label>
            <textarea [(ngModel)]="convocarEmail.Body" rows="9"
                      class="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none font-mono text-sm"></textarea>
          </div>
          <div *ngIf="formError()" class="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{{ formError() }}</div>
          <div *ngIf="formOk()"    class="bg-emerald-50 text-emerald-700 text-sm px-3 py-2 rounded-lg">{{ formOk() }}</div>
        </div>
        <div class="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button (click)="closeConvocar()" class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm">Cancelar</button>
          <button (click)="enviarConvocar()" [disabled]="sending()"
                  class="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-lg font-semibold text-sm">
            {{ sending() ? 'Enviando...' : 'Enviar convocatoria' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ============ Modal: Extender vacación ============ -->
    <div *ngIf="showExtender()" class="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
         (click)="closeExtender()">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md" (click)="$event.stopPropagation()">
        <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 class="text-lg font-bold text-gray-800">Extender Vacación</h2>
            <p class="text-xs text-gray-500 mt-0.5">{{ extenderTarget()?.EmployeeName }}</p>
          </div>
          <button (click)="closeExtender()" class="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div class="p-6 space-y-4">
          <div class="bg-gray-50 rounded-lg p-3 text-xs flex flex-wrap gap-3">
            <span class="text-gray-500">Inicio: <b class="text-gray-800">{{ extenderTarget()?.StartDate | date:'dd/MM/yyyy' }}</b></span>
            <span class="text-gray-500">Fin actual: <b class="text-gray-800">{{ extenderTarget()?.EndDate | date:'dd/MM/yyyy' }}</b></span>
            <span class="text-gray-500">Días actuales: <b class="text-gray-800">{{ extenderTarget()?.Days | number:'1.0-0' }}</b></span>
          </div>
          <div>
            <label class="text-xs font-semibold text-gray-600 uppercase">Días adicionales</label>
            <input [(ngModel)]="extenderForm.ExtraDays" type="number" min="1" max="60"
                   class="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
          </div>
          <div>
            <label class="text-xs font-semibold text-gray-600 uppercase">Notas (opcional)</label>
            <textarea [(ngModel)]="extenderForm.Notes" rows="2"
                      class="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"></textarea>
          </div>
          <div *ngIf="formError()" class="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{{ formError() }}</div>
          <div *ngIf="formOk()"    class="bg-emerald-50 text-emerald-700 text-sm px-3 py-2 rounded-lg">{{ formOk() }}</div>
        </div>
        <div class="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button (click)="closeExtender()" class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm">Cancelar</button>
          <button (click)="confirmarExtender()" [disabled]="sending() || !extenderForm.ExtraDays || extenderForm.ExtraDays <= 0"
                  class="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded-lg font-semibold text-sm">
            {{ sending() ? 'Procesando...' : 'Extender' }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  data: DashboardResponse | null = null;
  loading = true;
  today = new Date();

  // Modales
  showConvocar = signal(false);
  showExtender = signal(false);
  convocarTarget = signal<DashboardAlert | null>(null);
  extenderTarget = signal<DashboardAlert | null>(null);
  sending = signal(false);
  formError = signal<string | null>(null);
  formOk = signal<string | null>(null);

  convocarEmail: EmailDraft = { To: '', Subject: '', Body: '', SendNow: true };
  extenderForm: { ExtraDays: number; Notes: string } = { ExtraDays: 1, Notes: '' };

  firstName(): string {
    const name = this.auth.currentUser()?.FullName || '';
    return name.split(' ')[0] || 'Usuario';
  }
  roleLabel(): string {
    const r = this.auth.currentUser()?.Role as UserRole | undefined;
    return r ? ROLE_LABELS[r] : '';
  }

  ngOnInit() { this.loadDashboard(); }

  loadDashboard() {
    this.loading = true;
    this.api.getDashboard().subscribe({
      next: (data) => { this.data = data; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  sendReminders() {
    this.api.sendDailyReminders().subscribe({
      next: (res) => alert(res.message),
      error: () => alert('Error al enviar recordatorios'),
    });
  }

  // ─── Convocar ─────────────────────────────────────────────────
  openConvocar(alert: DashboardAlert) {
    this.convocarTarget.set(alert);
    this.formError.set(null);
    this.formOk.set(null);
    const dept = alert.Department || '—';
    this.convocarEmail = {
      To: alert.Email || '',
      Subject: 'Convocatoria a Reunión - Recursos Humanos',
      Body:
        `Estimado(a) ${alert.EmployeeName},\n\n` +
        `Le convocamos a una reunión con el área de Recursos Humanos para conversar ` +
        `sobre la planificación de sus vacaciones pendientes.\n\n` +
        `Datos del colaborador:\n` +
        `  • Departamento: ${dept}\n` +
        `  • Días pendientes totales: ${alert.TotalPending ?? 0}\n` +
        `  • Pendientes por año: ${alert.PendingByYear ?? 0}\n` +
        `  • Vacaciones truncas: ${alert.PendingTruncated ?? 0}\n\n` +
        `Le agradecemos confirmar su disponibilidad respondiendo a este correo.\n\n` +
        `Atentamente,\n` +
        `Recursos Humanos - AQUARIUS`,
      SendNow: true,
    };
    this.showConvocar.set(true);
  }
  closeConvocar() {
    this.showConvocar.set(false);
    this.convocarTarget.set(null);
    this.formError.set(null);
    this.formOk.set(null);
  }
  enviarConvocar() {
    if (!this.convocarEmail.To) {
      this.formError.set('El email destinatario es obligatorio');
      return;
    }
    this.sending.set(true);
    this.formError.set(null);
    this.api.sendEmail(this.convocarEmail).subscribe({
      next: (res) => {
        this.sending.set(false);
        if (res.success === false) {
          this.formError.set(res.message || 'No se pudo enviar el correo (¿SMTP configurado?)');
        } else {
          this.formOk.set('Convocatoria enviada correctamente');
          setTimeout(() => this.closeConvocar(), 1500);
        }
      },
      error: (err) => {
        this.sending.set(false);
        this.formError.set(err?.error?.detail || 'Error al enviar el correo');
      },
    });
  }

  // ─── Extender ─────────────────────────────────────────────────
  openExtender(alert: DashboardAlert) {
    if (!alert.VacationId) {
      alert?.VacationId === undefined && console.warn('Alert sin VacationId');
      return;
    }
    this.extenderTarget.set(alert);
    this.extenderForm = { ExtraDays: 1, Notes: '' };
    this.formError.set(null);
    this.formOk.set(null);
    this.showExtender.set(true);
  }
  closeExtender() {
    this.showExtender.set(false);
    this.extenderTarget.set(null);
    this.formError.set(null);
    this.formOk.set(null);
  }
  confirmarExtender() {
    const t = this.extenderTarget();
    if (!t || !t.VacationId) return;
    if (this.extenderForm.ExtraDays <= 0) {
      this.formError.set('Debe ser un número positivo');
      return;
    }
    this.sending.set(true);
    this.api.extendVacation(t.VacationId, {
      ExtraDays: this.extenderForm.ExtraDays,
      Notes: this.extenderForm.Notes || undefined,
    }).subscribe({
      next: (res) => {
        this.sending.set(false);
        this.formOk.set(res.message || 'Vacación extendida');
        this.loadDashboard();   // refresca
        setTimeout(() => this.closeExtender(), 1500);
      },
      error: (err) => {
        this.sending.set(false);
        this.formError.set(err?.error?.detail || 'Error al extender');
      },
    });
  }
}
