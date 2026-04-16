import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { DashboardResponse, DashboardAlert } from '../../models/interfaces';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6" *ngIf="data">
      <!-- Stats -->
      <div class="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div class="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div class="flex items-center gap-3 mb-2">
            <span class="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-lg">👥</span>
            <span class="text-xs text-gray-500 font-medium">Empleados</span>
          </div>
          <div class="text-3xl font-bold text-blue-600">{{ data.Stats.TotalEmployees }}</div>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div class="flex items-center gap-3 mb-2">
            <span class="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-lg">🏖️</span>
            <span class="text-xs text-gray-500 font-medium">En Vacaciones</span>
          </div>
          <div class="text-3xl font-bold text-emerald-600">{{ data.Stats.OnVacation }}</div>
          <div class="text-xs text-gray-400 mt-1">Actualmente</div>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div class="flex items-center gap-3 mb-2">
            <span class="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center text-lg">📅</span>
            <span class="text-xs text-gray-500 font-medium">Días Pendientes</span>
          </div>
          <div class="text-3xl font-bold text-amber-600">{{ data.Stats.TotalPendingDays | number:'1.0-0' }}</div>
          <div class="text-xs text-gray-400 mt-1">Total acumulado</div>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div class="flex items-center gap-3 mb-2">
            <span class="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center text-lg">⚠️</span>
            <span class="text-xs text-gray-500 font-medium">Alertas Críticas</span>
          </div>
          <div class="text-3xl font-bold text-red-600">{{ data.Stats.CriticalAlerts }}</div>
          <div class="text-xs text-gray-400 mt-1">+60 días pendientes</div>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div class="flex items-center gap-3 mb-2">
            <span class="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center text-lg">📋</span>
            <span class="text-xs text-gray-500 font-medium">Sin Programar</span>
          </div>
          <div class="text-3xl font-bold text-violet-600">{{ data.Stats.NoProgrammed }}</div>
          <div class="text-xs text-gray-400 mt-1">+15d sin fecha</div>
        </div>
      </div>

      <!-- Critical Alerts -->
      <div *ngIf="data.Critical.length > 0"
           class="bg-white rounded-xl border-l-4 border-l-red-500 border border-gray-200 p-5 shadow-sm">
        <div class="flex items-center gap-2 mb-4">
          <span class="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">⚠️ VACACIONES EXCESIVAS (+60d)</span>
          <span class="text-xs text-gray-400">{{ data.Critical.length }} empleados</span>
        </div>
        <div *ngFor="let alert of data.Critical.slice(0, 10)"
             class="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
          <div>
            <span class="font-semibold text-sm text-gray-800">{{ alert.EmployeeName }}</span>
            <span class="text-xs text-gray-400 ml-2">{{ alert.Department }}</span>
            <span class="text-xs text-red-600 font-bold ml-2">{{ alert.TotalPending }}d pendientes</span>
          </div>
          <div class="flex gap-2">
            <button class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 transition">
              Convocar RRHH
            </button>
          </div>
        </div>
      </div>

      <!-- Next Week -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <!-- Leaving -->
        <div class="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div class="flex items-center gap-2 mb-4">
            <span class="text-base">🚀</span>
            <span class="font-bold text-sm text-gray-800">Salen Próxima Semana</span>
            <span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
              {{ data.NextWeekOut.length }}
            </span>
          </div>
          <div *ngIf="data.NextWeekOut.length === 0" class="text-sm text-gray-400">
            Nadie sale la próxima semana
          </div>
          <div *ngFor="let alert of data.NextWeekOut" class="py-2 border-b border-gray-50 last:border-0">
            <div class="font-semibold text-sm text-gray-800">{{ alert.EmployeeName }}</div>
            <div class="text-xs text-gray-400">
              {{ alert.StartDate | date:'dd MMM' }} → {{ alert.EndDate | date:'dd MMM' }}
              ({{ alert.Days }}d)
            </div>
          </div>
        </div>

        <!-- Returning -->
        <div class="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div class="flex items-center gap-2 mb-4">
            <span class="text-base">🔙</span>
            <span class="font-bold text-sm text-gray-800">Regresan Próxima Semana</span>
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
            <button class="px-3 py-1 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 rounded-lg transition">
              Extender
            </button>
          </div>
        </div>
      </div>

      <!-- Pending 30+ -->
      <div *ngIf="data.Pending30.length > 0"
           class="bg-white rounded-xl border-l-4 border-l-amber-500 border border-gray-200 p-5 shadow-sm">
        <div class="flex justify-between items-center mb-4 flex-wrap gap-2">
          <div class="flex items-center gap-2">
            <span class="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
              📧 +30 DÍAS PENDIENTES
            </span>
            <span class="text-xs text-gray-400">{{ data.Pending30.length }} empleados</span>
          </div>
          <button (click)="sendReminders()"
                  class="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition">
            Enviar Recordatorios ({{ data.Pending30.length }})
          </button>
        </div>
        <div class="max-h-52 overflow-auto">
          <div *ngFor="let alert of data.Pending30"
               class="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
            <div>
              <span class="font-semibold text-xs text-gray-800">{{ alert.EmployeeName }}</span>
              <span class="text-xs text-amber-600 ml-2">{{ alert.TotalPending }}d</span>
              <span class="text-xs text-gray-400 ml-2">{{ alert.Department }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div *ngIf="loading" class="flex items-center justify-center py-20">
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  data: DashboardResponse | null = null;
  loading = true;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadDashboard();
  }

  loadDashboard() {
    this.loading = true;
    this.api.getDashboard().subscribe({
      next: (data) => { this.data = data; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  sendReminders() {
    this.api.sendDailyReminders().subscribe({
      next: (res) => alert(`${res.message}`),
      error: () => alert('Error al enviar recordatorios'),
    });
  }
}
