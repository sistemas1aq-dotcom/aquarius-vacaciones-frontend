import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import {
  EmployeeWithBalance, Vacation, VacationCreate, VacationUpdate,
  Department, EmailDraft
} from '../../models/interfaces';

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Search Bar -->
    <div class="flex flex-wrap gap-3 mb-5 items-center justify-between">
      <div class="flex gap-3 flex-1 flex-wrap">
        <input [(ngModel)]="search" (ngModelChange)="onSearch()" placeholder="Buscar nombre, DNI, cargo..."
          class="min-w-[200px] px-4 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
        <select [(ngModel)]="deptFilter" (ngModelChange)="loadEmployees()"
          class="px-4 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <option value="">Todos ({{ totalCount }})</option>
          <option *ngFor="let d of departments" [value]="d.Name">{{ d.Name }}</option>
        </select>
      </div>
      <span class="text-xs text-gray-400">{{ employees.length }} resultados</span>
    </div>

    <!-- Table -->
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100">
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">#</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Empleado</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">DNI</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Depto</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Ingreso</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Antigüedad</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Ganados</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Truncas</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Gozados</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Pendientes</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Estado</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let emp of employees" class="border-b border-gray-50 hover:bg-gray-50 transition cursor-pointer">
              <td class="px-4 py-3 text-gray-400">{{ emp.Num }}</td>
              <td class="px-4 py-3">
                <div class="font-semibold text-gray-800">{{ emp.FullName }}</div>
                <div class="text-xs text-gray-400">{{ emp.Position }}</div>
              </td>
              <td class="px-4 py-3 text-gray-600">{{ emp.Dni }}</td>
              <td class="px-4 py-3 text-xs text-gray-600">{{ emp.DepartmentName }}</td>
              <td class="px-4 py-3 text-xs text-gray-600">{{ emp.HireDate | date:'dd/MM/yyyy' }}</td>
              <td class="px-4 py-3 text-xs text-gray-600">{{ emp.YearsWorked }}a {{ emp.MonthsWorked }}m {{ emp.DaysWorked }}d</td>
              <td class="px-4 py-3 font-semibold text-emerald-600">{{ emp.EarnedDays }}d</td>
              <td class="px-4 py-3 text-xs text-violet-600">{{ emp.TruncatedDays }}d</td>
              <td class="px-4 py-3 text-gray-600">{{ emp.TakenDays }}d</td>
              <td class="px-4 py-3">
                <span class="font-bold" [class.text-red-600]="emp.TotalPending > 60"
                  [class.text-amber-600]="emp.TotalPending > 30 && emp.TotalPending <= 60"
                  [class.text-emerald-600]="emp.TotalPending >= 0 && emp.TotalPending <= 30"
                  [class.text-blue-600]="emp.TotalPending < 0">
                  {{ emp.TotalPending }}d
                </span>
              </td>
              <td class="px-4 py-3">
                <span *ngIf="emp.TotalPending > 60" class="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">Crítico</span>
                <span *ngIf="emp.TotalPending > 30 && emp.TotalPending <= 60" class="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">Pendiente</span>
                <span *ngIf="emp.TotalPending >= 0 && emp.TotalPending <= 30" class="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">Al día</span>
                <span *ngIf="emp.TotalPending < 0" class="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">Adelantado</span>
              </td>
              <td class="px-4 py-3">
                <div class="flex gap-1">
                  <button (click)="openDetail(emp)" class="px-2 py-1 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 rounded transition">Detalle</button>
                  <button (click)="openAddVacation(emp)" class="px-2 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-100 rounded border border-gray-200 transition">+Vac</button>
                </div>
              </td>
            </tr>
            <tr *ngIf="employees.length === 0">
              <td colspan="12" class="px-4 py-10 text-center text-gray-400">Sin resultados</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Detail Modal -->
    <div *ngIf="selectedEmp" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" (click)="closeDetail()">
      <div class="bg-white rounded-2xl border border-gray-200 shadow-xl w-[780px] max-w-[95vw] max-h-[90vh] overflow-auto p-6" (click)="$event.stopPropagation()">
        <div class="flex justify-between items-center mb-5">
          <h3 class="text-lg font-bold text-gray-800">{{ selectedEmp.FullName }}</h3>
          <button (click)="closeDetail()" class="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <!-- Balance Cards -->
        <div class="grid grid-cols-3 gap-3 mb-5">
          <div class="bg-emerald-50 rounded-xl p-4">
            <div class="text-xs text-gray-500 mb-1">Ganados (Año)</div>
            <div class="text-2xl font-bold text-emerald-700">{{ selectedEmp.EarnedDays }}d</div>
          </div>
          <div class="bg-blue-50 rounded-xl p-4">
            <div class="text-xs text-gray-500 mb-1">Total Gozados</div>
            <div class="text-2xl font-bold text-blue-700">{{ selectedEmp.TakenDays }}d</div>
          </div>
          <div class="rounded-xl p-4" [class.bg-red-50]="selectedEmp.PendingByYear > 30" [class.bg-amber-50]="selectedEmp.PendingByYear > 0 && selectedEmp.PendingByYear <= 30" [class.bg-emerald-50]="selectedEmp.PendingByYear <= 0">
            <div class="text-xs text-gray-500 mb-1">Total Pendientes (Año)</div>
            <div class="text-2xl font-bold" [class.text-red-700]="selectedEmp.PendingByYear > 30"
              [class.text-amber-700]="selectedEmp.PendingByYear > 0 && selectedEmp.PendingByYear <= 30"
              [class.text-emerald-700]="selectedEmp.PendingByYear <= 0">{{ selectedEmp.PendingByYear }}d</div>
          </div>
        </div>

        <!-- Employee Info -->
        <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-3">
          <span>DNI: <b class="text-gray-800">{{ selectedEmp.Dni }}</b></span>
          <span>Cargo: <b class="text-gray-800">{{ selectedEmp.Position }}</b></span>
          <span>Depto: <b class="text-gray-800">{{ selectedEmp.DepartmentName }}</b></span>
          <span>Ingreso: <b class="text-gray-800">{{ selectedEmp.HireDate | date:'dd/MM/yyyy' }}</b></span>
          <span>Antigüedad: <b class="text-emerald-700">{{ selectedEmp.YearsWorked }}a {{ selectedEmp.MonthsWorked }}m {{ selectedEmp.DaysWorked }}d</b></span>
        </div>
        <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-5">
          <span>Gozados 2026: <b class="text-gray-800">{{ selectedEmp.TakenDays2026 }}d</b></span>
          <span>Pend. Año: <b class="text-amber-600">{{ selectedEmp.PendingByYear }}d</b></span>
          <span>Pend. Truncas: <b class="text-violet-600">{{ selectedEmp.PendingTruncated }}d</b></span>
        </div>

        <!-- Vacation History -->
        <h4 class="text-sm font-bold text-gray-800 mb-3">Historial de Vacaciones</h4>
        <div class="overflow-x-auto mb-5">
          <table class="w-full text-xs">
            <thead>
              <tr class="border-b border-gray-100">
                <th class="text-left px-3 py-2 text-gray-400 font-semibold uppercase">Descripción</th>
                <th class="text-left px-3 py-2 text-gray-400 font-semibold uppercase">Fechas</th>
                <th class="text-left px-3 py-2 text-gray-400 font-semibold uppercase">Días</th>
                <th class="text-left px-3 py-2 text-gray-400 font-semibold uppercase">Estado</th>
                <th class="px-3 py-2 text-gray-400 font-semibold uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let v of selectedEmp.Vacations" class="border-b border-gray-50 hover:bg-gray-50">
                <td class="px-3 py-2 text-gray-700">{{ v.Label || (v.StartDate | date:'dd/MM/yy') + ' → ' + (v.EndDate | date:'dd/MM/yy') }}</td>
                <td class="px-3 py-2 text-gray-400">{{ v.StartDate | date:'dd/MM/yy' }} — {{ v.EndDate | date:'dd/MM/yy' }}</td>
                <td class="px-3 py-2 font-bold text-gray-800">{{ v.Days }}d</td>
                <td class="px-3 py-2">
                  <span class="px-2 py-0.5 rounded-full text-xs font-semibold"
                    [class.bg-emerald-100]="v.Status === 'completed'" [class.text-emerald-700]="v.Status === 'completed'"
                    [class.bg-cyan-100]="v.Status === 'in_progress'" [class.text-cyan-700]="v.Status === 'in_progress'"
                    [class.bg-blue-100]="v.Status === 'approved'" [class.text-blue-700]="v.Status === 'approved'">
                    {{ v.Status === 'completed' ? 'Completado' : v.Status === 'in_progress' ? 'En Curso' : 'Aprobado' }}
                  </span>
                </td>
                <td class="px-3 py-2">
                  <div class="flex gap-1">
                    <button (click)="openEditVacation(v)" class="px-2 py-1 text-xs text-emerald-600 hover:bg-emerald-50 rounded">✏️ Editar</button>
                    <button (click)="deleteVacation(v)" class="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded">🗑️</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-2">
          <button (click)="openAddVacation(selectedEmp)" class="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition">
            + Programar Vacación
          </button>
        </div>
      </div>
    </div>

    <!-- Add/Edit Vacation Modal -->
    <div *ngIf="showVacForm" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" (click)="closeVacForm()">
      <div class="bg-white rounded-2xl border border-gray-200 shadow-xl w-[520px] max-w-[95vw] p-6" (click)="$event.stopPropagation()">
        <div class="flex justify-between items-center mb-5">
          <h3 class="text-lg font-bold text-gray-800">{{ editingVac ? 'Modificar' : 'Programar' }} Vacación</h3>
          <button (click)="closeVacForm()" class="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <div class="bg-gray-50 rounded-lg p-3 mb-4 text-xs flex gap-3 flex-wrap">
          <span class="text-gray-500">Pendientes: <b class="text-amber-600">{{ vacFormEmp?.TotalPending }}d</b></span>
          <span class="text-gray-500">Truncas: <b class="text-violet-600">{{ vacFormEmp?.TruncatedDays }}d</b></span>
        </div>

        <div class="mb-3">
          <label class="block text-xs text-gray-500 font-medium mb-1">Descripción / Etiqueta</label>
          <input [(ngModel)]="vacForm.Label" placeholder="Ej: Vacaciones Julio 2026"
            class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div class="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label class="block text-xs text-gray-500 font-medium mb-1">Fecha Inicio</label>
            <input type="date" [(ngModel)]="vacForm.StartDate" (ngModelChange)="calcDays()"
              class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label class="block text-xs text-gray-500 font-medium mb-1">Fecha Fin</label>
            <input type="date" [(ngModel)]="vacForm.EndDate" (ngModelChange)="calcDays()"
              class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label class="block text-xs text-gray-500 font-medium mb-1">Días</label>
            <input type="number" [(ngModel)]="vacForm.Days"
              class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label class="block text-xs text-gray-500 font-medium mb-1">Estado</label>
            <select [(ngModel)]="vacForm.Status"
              class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="approved">Aprobado</option>
              <option value="in_progress">En Curso</option>
              <option value="completed">Completado</option>
            </select>
          </div>
        </div>

        <div class="flex justify-end gap-2">
          <button (click)="closeVacForm()" class="px-4 py-2 text-xs font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition">Cancelar</button>
          <button (click)="saveVacation()" [disabled]="!vacForm.StartDate || !vacForm.EndDate || vacForm.Days <= 0"
            class="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition disabled:opacity-40">
            {{ editingVac ? 'Guardar Cambios' : 'Programar' }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class EmployeesComponent implements OnInit {
  employees: EmployeeWithBalance[] = [];
  departments: Department[] = [];
  search = '';
  deptFilter = '';
  totalCount = 0;

  selectedEmp: EmployeeWithBalance | null = null;
  showVacForm = false;
  editingVac: Vacation | null = null;
  vacFormEmp: EmployeeWithBalance | null = null;
  vacForm = { StartDate: '', EndDate: '', Days: 0, Status: 'approved', Label: '' };

  private searchTimeout: any;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadEmployees();
    this.api.getDepartments().subscribe(d => this.departments = d);
  }

  loadEmployees() {
    this.api.getEmployees({
      department: this.deptFilter || undefined,
      search: this.search || undefined,
    }).subscribe(res => {
      this.employees = res.items;
      this.totalCount = res.total;
    });
  }

  onSearch() {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => this.loadEmployees(), 300);
  }

  openDetail(emp: EmployeeWithBalance) {
    this.api.getEmployee(emp.Id).subscribe(detail => {
      this.selectedEmp = detail;
    });
  }

  closeDetail() {
    this.selectedEmp = null;
  }

  openAddVacation(emp: EmployeeWithBalance) {
    this.vacFormEmp = emp;
    this.editingVac = null;
    this.vacForm = { StartDate: '', EndDate: '', Days: 0, Status: 'approved', Label: '' };
    this.showVacForm = true;
  }

  openEditVacation(vac: Vacation) {
    this.editingVac = vac;
    this.vacForm = {
      StartDate: vac.StartDate,
      EndDate: vac.EndDate,
      Days: vac.Days,
      Status: vac.Status,
      Label: vac.Label || '',
    };
    this.showVacForm = true;
  }

  closeVacForm() {
    this.showVacForm = false;
    this.editingVac = null;
  }

  calcDays() {
    if (this.vacForm.StartDate && this.vacForm.EndDate) {
      const start = new Date(this.vacForm.StartDate);
      const end = new Date(this.vacForm.EndDate);
      const diff = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
      this.vacForm.Days = Math.max(0, diff);
    }
  }

  saveVacation() {
    if (this.editingVac) {
      this.api.updateVacation(this.editingVac.Id, {
        StartDate: this.vacForm.StartDate,
        EndDate: this.vacForm.EndDate,
        Days: this.vacForm.Days,
        Status: this.vacForm.Status,
        Label: this.vacForm.Label,
      }).subscribe({
        next: () => { this.closeVacForm(); this.refreshDetail(); this.loadEmployees(); },
        error: () => alert('Error al actualizar'),
      });
    } else if (this.vacFormEmp) {
      this.api.createVacation({
        EmployeeId: this.vacFormEmp.Id,
        StartDate: this.vacForm.StartDate,
        EndDate: this.vacForm.EndDate,
        Days: this.vacForm.Days,
        Status: this.vacForm.Status,
        Label: this.vacForm.Label,
      }).subscribe({
        next: () => { this.closeVacForm(); this.refreshDetail(); this.loadEmployees(); },
        error: () => alert('Error al crear'),
      });
    }
  }

  deleteVacation(vac: Vacation) {
    if (!confirm(`¿Eliminar registro de ${vac.Days} días (${vac.Label || vac.StartDate})?`)) return;
    this.api.deleteVacation(vac.Id).subscribe({
      next: () => { this.refreshDetail(); this.loadEmployees(); },
      error: () => alert('Error al eliminar'),
    });
  }

  private refreshDetail() {
    if (this.selectedEmp) {
      this.api.getEmployee(this.selectedEmp.Id).subscribe(d => this.selectedEmp = d);
    }
  }
}
