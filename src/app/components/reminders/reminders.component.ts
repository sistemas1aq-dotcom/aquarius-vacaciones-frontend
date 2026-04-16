import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { Reminder } from '../../models/interfaces';

@Component({
  selector: 'app-reminders',
  standalone: true,
  imports: [CommonModule],
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

      <div *ngIf="lastResult" class="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-4 text-sm text-emerald-700">
        {{ lastResult }}
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
              <th class="text-left px-3 py-2 text-gray-400 font-semibold uppercase">Tipo</th>
              <th class="text-left px-3 py-2 text-gray-400 font-semibold uppercase">Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let r of reminders" class="border-b border-gray-50 hover:bg-gray-50">
              <td class="px-3 py-2 text-gray-600">{{ r.ReminderDate | date:'dd/MM/yyyy' }}</td>
              <td class="px-3 py-2 font-semibold text-gray-800">{{ r.EmployeeName }}</td>
              <td class="px-3 py-2 text-gray-500">{{ r.EmailTo }}</td>
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
              <td colspan="5" class="px-3 py-10 text-center text-gray-400">Sin recordatorios registrados</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class RemindersComponent implements OnInit {
  reminders: Reminder[] = [];
  sending = false;
  lastResult = '';

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadReminders();
  }

  loadReminders() {
    this.api.getReminders().subscribe(res => this.reminders = res.items);
  }

  sendReminders() {
    this.sending = true;
    this.api.sendDailyReminders().subscribe({
      next: (res) => {
        this.lastResult = res.message;
        this.sending = false;
        this.loadReminders();
      },
      error: () => {
        this.lastResult = 'Error al enviar recordatorios';
        this.sending = false;
      },
    });
  }
}
