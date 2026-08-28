import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import {
  EmployeeWithBalance, Vacation, VacationCreate, VacationUpdate,
  Department, EmailDraft, EmployeeCreate, EmployeeUpdate
} from '../../models/interfaces';
import { PaginationComponent, paginate } from '../shared/pagination.component';
import { SyncIndicatorComponent } from '../shared/sync-indicator.component';

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent, SyncIndicatorComponent],
  template: `
    <!-- Search Bar -->
    <div class="flex flex-wrap gap-3 mb-5 items-center justify-between">
      <div class="flex gap-3 flex-1 flex-wrap">
        <div class="relative min-w-[260px] flex-1 max-w-md">
          <input [(ngModel)]="filtro" (ngModelChange)="aplicarFiltro()"
            placeholder="Filtrar en todas las columnas…"
            title="Busca en nombre, cargo, DNI, departamento, fechas, días y estado. Varias palabras = todas deben coincidir."
            class="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <button *ngIf="filtro" (click)="limpiarFiltro()" title="Limpiar filtro"
            class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
        </div>
        <!-- «T. Planilla» y no «Departamento»: es como se llama en Planillas
             (PLA_TIPO_PLANILLA) y en la columna PLANILLA del reporte
             corporativo. Un mismo concepto con tres nombres obliga a
             traducir mentalmente en cada pantalla. -->
        <select [(ngModel)]="deptFilter" (ngModelChange)="loadEmployees()"
          title="Tipo de planilla"
          class="pl-4 pr-9 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <option value="">T. Planilla: todas</option>
          <option *ngFor="let d of departments" [value]="d.Name">{{ d.Name }}</option>
        </select>
        <!-- Botón de dos estados: el color dice si está activo, y el conteo
             de inactivos aparece a la derecha cuando lo está. -->
        <button (click)="toggleInactive()"
          [attr.aria-pressed]="showInactive()"
          [title]="showInactive() ? 'Dejar de incluir a los inactivos' : 'Incluir también a los empleados inactivos'"
          class="px-4 py-2 text-sm font-semibold rounded-lg border transition flex items-center gap-2"
          [class.bg-gray-100]="!showInactive()"
          [class.text-gray-600]="!showInactive()"
          [class.border-gray-200]="!showInactive()"
          [class.hover:bg-gray-200]="!showInactive()"
          [class.bg-amber-100]="showInactive()"
          [class.text-amber-800]="showInactive()"
          [class.border-amber-300]="showInactive()"
          [class.hover:bg-amber-200]="showInactive()">
          Inc. inactivos
        </button>
      </div>
      <div class="flex items-center gap-3">
        <app-sync-indicator></app-sync-indicator>
        <span class="text-xs text-gray-400">
          {{ employeesFiltrados.length }}
          <span *ngIf="filtro">de {{ employees.length }}</span> resultados
          <span *ngIf="showInactive() && inactiveCount() > 0" class="ml-1 text-amber-600 font-semibold">
            ({{ inactiveCount() }} inactivos)
          </span>
        </span>
        <button (click)="openCreateEmployee()"
                class="bg-gradient-to-r from-[#16589e] to-[#3b93d0] hover:from-[#114777] hover:to-[#2876b7] text-white px-4 py-2 rounded-lg shadow-sm font-semibold text-sm transition">
          + Nuevo empleado
        </button>
      </div>
    </div>

    <!-- Table -->
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100">
              <th class="text-left px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">#</th>
              <th class="text-left px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Empleado</th>
              <th class="text-left px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">DNI</th>
              <th class="text-left px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Depto</th>
              <th class="text-left px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Ingreso</th>
              <th class="text-left px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Antigüedad</th>
              <th class="text-left px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Ganados</th>
              <th class="text-left px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Gozados</th>
              <th class="text-left px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Pendientes</th>
              <th class="text-left px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Truncas</th>
              <th class="text-left px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Estado</th>
              <!-- Acciones: sticky para que nunca queden ocultas tras el scroll horizontal -->
              <th class="sticky right-0 z-10 bg-white px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right
                         shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.12)]">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let emp of paginatedEmployees()"
                class="border-b border-gray-50 hover:bg-gray-50 transition cursor-pointer"
                [class.bg-gray-50]="!emp.IsActive"
                [class.opacity-60]="!emp.IsActive">
              <td class="px-3 py-3 text-gray-400">{{ emp.Num }}</td>
              <td class="px-3 py-3">
                <div class="font-semibold text-gray-800 flex items-center gap-2">
                  {{ emp.FullName }}
                  <span *ngIf="!emp.IsActive"
                        class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-200 text-gray-600 uppercase tracking-wider">
                    Inactivo
                  </span>
                </div>
                <div class="text-xs text-gray-400">{{ emp.Position }}</div>
              </td>
              <td class="px-3 py-3 text-gray-600 whitespace-nowrap">{{ emp.Dni }}</td>
              <td class="px-3 py-3 text-xs text-gray-600">{{ emp.DepartmentName }}</td>
              <td class="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">{{ emp.HireDate | date:'dd/MM/yyyy' }}</td>
              <td class="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">{{ emp.YearsWorked }}a {{ emp.MonthsWorked }}m {{ emp.DaysWorked }}d</td>
              <td class="px-3 py-3 font-semibold text-emerald-600">{{ emp.EarnedDays | number:'1.0-0' }}d</td>
              <td class="px-3 py-3 text-gray-600">{{ emp.TakenDays | number:'1.0-0' }}d</td>
              <td class="px-3 py-3">
                <span class="font-bold" [class.text-red-600]="emp.TotalPending > 60"
                  [class.text-amber-600]="emp.TotalPending > 30 && emp.TotalPending <= 60"
                  [class.text-emerald-600]="emp.TotalPending >= 0 && emp.TotalPending <= 30"
                  [class.text-blue-600]="emp.TotalPending < 0">
                  {{ emp.TotalPending | number:'1.0-0' }}d
                </span>
              </td>
              <td class="px-3 py-3 text-xs text-violet-600">{{ emp.TruncatedDays | number:'1.0-0' }}d</td>
              <td class="px-3 py-3">
                <ng-container *ngIf="emp.IsActive; else inactiveBadge">
                  <span *ngIf="emp.TotalPending > 60" class="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">Crítico</span>
                  <span *ngIf="emp.TotalPending > 30 && emp.TotalPending <= 60" class="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">Pendiente</span>
                  <span *ngIf="emp.TotalPending >= 0 && emp.TotalPending <= 30" class="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">Al día</span>
                  <span *ngIf="emp.TotalPending < 0" class="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">Adelantado</span>
                </ng-container>
                <ng-template #inactiveBadge>
                  <span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-200 text-gray-600">Cesado</span>
                </ng-template>
              </td>
              <!-- Columna fija: se mantiene visible aunque la tabla se desplace -->
              <td class="sticky right-0 z-10 px-3 py-3 shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.12)]"
                  [class.bg-white]="emp.IsActive"
                  [class.bg-gray-50]="!emp.IsActive">
                <div class="flex gap-1 justify-end">
                  <button (click)="openDetail(emp)" title="Ver detalle"
                          class="px-2 py-1 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 rounded transition whitespace-nowrap">👁</button>
                  <button (click)="openEditEmployee(emp)" title="Editar empleado"
                          class="px-2 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded transition whitespace-nowrap">✏️</button>
                  <button (click)="openAddVacation(emp)" title="Registrar vacaciones"
                          class="px-2 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-100 rounded border border-gray-200 transition whitespace-nowrap">+ Vac</button>
                </div>
              </td>
            </tr>
            <tr *ngIf="employeesFiltrados.length === 0">
              <td colspan="12" class="px-4 py-10 text-center text-gray-400">
                <span *ngIf="!filtro">Sin resultados</span>
                <span *ngIf="filtro">Ningún empleado coincide con «{{ filtro }}»</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Paginación -->
      <app-pagination
        [totalItems]="employeesFiltrados.length"
        [pageSize]="pageSize"
        [currentPage]="currentPage()"
        (pageChange)="currentPage.set($event)" />
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
            <div class="text-2xl font-bold text-emerald-700">{{ selectedEmp.EarnedDays | number:'1.0-0' }}d</div>
          </div>
          <div class="bg-blue-50 rounded-xl p-4">
            <div class="text-xs text-gray-500 mb-1">Total Gozados</div>
            <div class="text-2xl font-bold text-blue-700">{{ selectedEmp.TakenDays | number:'1.0-0' }}d</div>
          </div>
          <div class="rounded-xl p-4" [class.bg-red-50]="selectedEmp.PendingByYear > 30" [class.bg-amber-50]="selectedEmp.PendingByYear > 0 && selectedEmp.PendingByYear <= 30" [class.bg-emerald-50]="selectedEmp.PendingByYear <= 0">
            <div class="text-xs text-gray-500 mb-1">Total Pendientes (Año)</div>
            <div class="text-2xl font-bold" [class.text-red-700]="selectedEmp.PendingByYear > 30"
              [class.text-amber-700]="selectedEmp.PendingByYear > 0 && selectedEmp.PendingByYear <= 30"
              [class.text-emerald-700]="selectedEmp.PendingByYear <= 0">{{ selectedEmp.PendingByYear | number:'1.0-0' }}d</div>
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
          <span>Gozados 2026: <b class="text-gray-800">{{ selectedEmp.TakenDays2026 | number:'1.0-0' }}d</b></span>
          <span>Pend. Año: <b class="text-amber-600">{{ selectedEmp.PendingByYear | number:'1.0-0' }}d</b></span>
          <span>Pend. Truncas: <b class="text-violet-600">{{ selectedEmp.PendingTruncated | number:'1.0-0' }}d</b></span>
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
                <td class="px-3 py-2 font-bold text-gray-800">{{ v.Days | number:'1.0-0' }}d</td>
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
          <span class="text-gray-500">Pendientes (Año): <b class="text-amber-600">{{ vacFormEmp?.PendingByYear | number:'1.0-0' }}d</b></span>
          <span class="text-gray-500">Truncas: <b class="text-violet-600">{{ vacFormEmp?.TruncatedDays | number:'1.0-0' }}d</b></span>
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
              class="w-full pl-3 pr-9 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500">
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

    <!-- ============ Modal: Crear / Editar Empleado ============ -->
    <div *ngIf="showEmpForm" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" (click)="closeEmpForm()">
      <div class="bg-white rounded-2xl border border-gray-200 shadow-xl w-[600px] max-w-[95vw] max-h-[90vh] overflow-auto p-6" (click)="$event.stopPropagation()">
        <div class="flex justify-between items-center mb-5">
          <h3 class="text-lg font-bold text-gray-800">{{ editingEmpId ? 'Editar empleado' : 'Nuevo empleado' }}</h3>
          <button (click)="closeEmpForm()" class="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <div class="grid grid-cols-2 gap-3 mb-3">
          <div class="col-span-2 sm:col-span-1">
            <label class="block text-xs text-gray-500 font-semibold uppercase mb-1">DNI *</label>
            <input [(ngModel)]="empForm.Dni" name="dni" [disabled]="!!editingEmpId" maxlength="20"
              class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500" />
          </div>
          <div class="col-span-2 sm:col-span-1">
            <label class="block text-xs text-gray-500 font-semibold uppercase mb-1">Nombre completo *</label>
            <input [(ngModel)]="empForm.FullName" name="fullName"
              class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div class="col-span-2 sm:col-span-1">
            <label class="block text-xs text-gray-500 font-semibold uppercase mb-1">Email</label>
            <input [(ngModel)]="empForm.Email" name="email" type="email"
              class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div class="col-span-2 sm:col-span-1">
            <label class="block text-xs text-gray-500 font-semibold uppercase mb-1">Cargo</label>
            <input [(ngModel)]="empForm.Position" name="position"
              class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div class="col-span-2 sm:col-span-1">
            <label class="block text-xs text-gray-500 font-semibold uppercase mb-1">Departamento *</label>
            <select [(ngModel)]="empForm.DepartmentId" name="dept"
              class="w-full pl-3 pr-9 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option [ngValue]="0">— Seleccionar —</option>
              <option *ngFor="let d of departments" [ngValue]="d.Id">{{ d.Name }}</option>
            </select>
          </div>
          <div class="col-span-2 sm:col-span-1">
            <label class="block text-xs text-gray-500 font-semibold uppercase mb-1">Días por año</label>
            <input [(ngModel)]="empForm.DaysPerYear" name="dpy" type="number" min="1" max="60"
              class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div class="col-span-2 sm:col-span-1">
            <label class="block text-xs text-gray-500 font-semibold uppercase mb-1">Fecha ingreso *</label>
            <input [(ngModel)]="empForm.HireDate" name="hire" type="date"
              class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div class="col-span-2 sm:col-span-1">
            <label class="block text-xs text-gray-500 font-semibold uppercase mb-1">Fecha cese</label>
            <input [(ngModel)]="empForm.CeaseDate" name="cease" type="date"
              class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <label *ngIf="editingEmpId" class="flex items-center gap-2 text-sm text-gray-700 mb-3">
          <input type="checkbox" [(ngModel)]="empForm.IsActive" name="active" class="w-4 h-4 rounded text-blue-600"/>
          Empleado activo
        </label>

        <div *ngIf="empFormError" class="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg mb-3">{{ empFormError }}</div>

        <div class="flex justify-end gap-2">
          <button (click)="closeEmpForm()" class="px-4 py-2 text-xs font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button (click)="saveEmployee()" [disabled]="empSaving"
            class="px-5 py-2 text-xs font-semibold rounded-lg bg-gradient-to-r from-[#16589e] to-[#3b93d0] hover:from-[#114777] hover:to-[#2876b7] text-white disabled:opacity-40 transition">
            {{ empSaving ? 'Guardando...' : (editingEmpId ? 'Guardar cambios' : 'Crear empleado') }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class EmployeesComponent implements OnInit {
  employees: EmployeeWithBalance[] = [];
  /** Resultado de aplicar `filtro` sobre `employees`. Es lo que se pagina y se pinta. */
  employeesFiltrados: EmployeeWithBalance[] = [];
  departments: Department[] = [];
  /** Filtro general: busca en TODAS las columnas de la tabla. */
  filtro = '';
  deptFilter = '';

  /** Texto buscable precalculado por empleado (Id -> cadena normalizada).
   *  Se calcula una vez al cargar, no en cada pulsación de tecla. */
  private indice = new Map<number, string>();

  // Toggle mostrar/ocultar empleados inactivos
  showInactive = signal(false);

  // Paginación
  readonly pageSize = 7;
  currentPage = signal(1);
  paginatedEmployees(): EmployeeWithBalance[] {
    return paginate(this.employeesFiltrados, this.currentPage(), this.pageSize);
  }

  inactiveCount(): number {
    return this.employees.filter(e => !e.IsActive).length;
  }

  toggleInactive() {
    this.showInactive.set(!this.showInactive());
    this.loadEmployees();
  }

  selectedEmp: EmployeeWithBalance | null = null;
  showVacForm = false;
  editingVac: Vacation | null = null;
  vacFormEmp: EmployeeWithBalance | null = null;
  vacForm = { StartDate: '', EndDate: '', Days: 0, Status: 'approved', Label: '' };

  // Crear / editar empleado
  showEmpForm = false;
  editingEmpId: number | null = null;
  empSaving = false;
  empFormError = '';
  empForm: EmployeeCreate & { CeaseDate?: string; IsActive?: boolean } = {
    Dni: '', FullName: '', Email: '', DepartmentId: 0, Position: '',
    HireDate: '', CeaseDate: '', DaysPerYear: 30, IsActive: true,
  };



  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadEmployees();
    this.api.getDepartments().subscribe(d => this.departments = d);
  }

  loadEmployees() {
    // Se traen todos de una vez (el tope del backend es 500) y el filtrado
    // se hace en el navegador: así puede cubrir columnas calculadas
    // -- antigüedad, días, estado -- que la API no sabe buscar, y responde
    // sin viaje al servidor en cada tecla.
    this.api.getEmployees({
      department: this.deptFilter || undefined,
      includeInactive: this.showInactive(),
      pageSize: 500,
    }).subscribe(res => {
      this.employees = res.items;
      this.construirIndice();
      this.aplicarFiltro();
    });
  }

  /** Quita tildes y pasa a minúsculas, para que "valuacion" encuentre "VALUACIÓN". */
  private normalizar(v: unknown): string {
    return String(v ?? '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  private construirIndice() {
    this.indice.clear();
    for (const e of this.employees) {
      const estado = !e.IsActive ? 'cesado inactivo'
        : e.TotalPending > 60 ? 'critico'
        : e.TotalPending > 30 ? 'pendiente'
        : e.TotalPending >= 0 ? 'al dia' : 'adelantado';

      // La fecha se indexa en los dos formatos: así "2020-03" y "15/03/2020"
      // encuentran lo mismo.
      const iso = String(e.HireDate ?? '').slice(0, 10);
      const [a, m, d] = iso.split('-');
      const fecha = d ? `${iso} ${d}/${m}/${a}` : iso;

      this.indice.set(e.Id, this.normalizar([
        e.Num, e.FullName, e.Position, e.Dni, e.DepartmentName, fecha,
        `${e.YearsWorked}a ${e.MonthsWorked}m ${e.DaysWorked}d`,
        Math.round(e.EarnedDays), Math.round(e.TruncatedDays),
        Math.round(e.TakenDays), Math.round(e.TotalPending),
        estado,
      ].join(' ')));
    }
  }

  aplicarFiltro() {
    const terminos = this.normalizar(this.filtro).split(/\s+/).filter(Boolean);
    this.employeesFiltrados = terminos.length === 0
      ? this.employees
      // Varias palabras = todas deben aparecer. Permite acotar combinando
      // criterios de columnas distintas: "sistemas critico".
      : this.employees.filter(e => {
          const texto = this.indice.get(e.Id) ?? '';
          return terminos.every(t => texto.includes(t));
        });
    this.currentPage.set(1);
  }

  limpiarFiltro() {
    this.filtro = '';
    this.aplicarFiltro();
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

  // ─── Crear / Editar empleado ───────────────────────────────────
  openCreateEmployee() {
    this.editingEmpId = null;
    this.empFormError = '';
    this.empForm = {
      Dni: '', FullName: '', Email: '', DepartmentId: 0, Position: '',
      HireDate: '', CeaseDate: '', DaysPerYear: 30, IsActive: true,
    };
    this.showEmpForm = true;
  }

  openEditEmployee(emp: EmployeeWithBalance) {
    this.editingEmpId = emp.Id;
    this.empFormError = '';
    this.empForm = {
      Dni: emp.Dni,
      FullName: emp.FullName,
      Email: emp.Email || '',
      DepartmentId: emp.DepartmentId,
      Position: emp.Position || '',
      HireDate: emp.HireDate ? emp.HireDate.substring(0, 10) : '',
      CeaseDate: emp.CeaseDate ? emp.CeaseDate.substring(0, 10) : '',
      DaysPerYear: emp.DaysPerYear || 30,
      IsActive: emp.IsActive,
    };
    this.showEmpForm = true;
  }

  closeEmpForm() {
    this.showEmpForm = false;
    this.editingEmpId = null;
    this.empFormError = '';
  }

  saveEmployee() {
    this.empFormError = '';
    if (!this.empForm.Dni?.trim())      { this.empFormError = 'El DNI es obligatorio'; return; }
    if (!this.empForm.FullName?.trim()) { this.empFormError = 'El nombre es obligatorio'; return; }
    if (!this.empForm.DepartmentId)     { this.empFormError = 'Seleccione un departamento'; return; }
    if (!this.empForm.HireDate)         { this.empFormError = 'La fecha de ingreso es obligatoria'; return; }

    this.empSaving = true;
    const id = this.editingEmpId;

    if (id) {
      // Update
      const upd: EmployeeUpdate = {
        FullName: this.empForm.FullName,
        Email: this.empForm.Email || undefined,
        DepartmentId: this.empForm.DepartmentId,
        Position: this.empForm.Position || undefined,
        HireDate: this.empForm.HireDate,
        CeaseDate: this.empForm.CeaseDate || undefined,
        DaysPerYear: this.empForm.DaysPerYear,
        IsActive: this.empForm.IsActive,
      };
      this.api.updateEmployee(id, upd).subscribe({
        next: () => { this.empSaving = false; this.closeEmpForm(); this.loadEmployees(); },
        error: (err) => { this.empSaving = false; this.empFormError = err?.error?.detail || 'Error al actualizar'; },
      });
    } else {
      // Create
      const create: EmployeeCreate = {
        Dni: this.empForm.Dni,
        FullName: this.empForm.FullName,
        Email: this.empForm.Email || undefined,
        DepartmentId: this.empForm.DepartmentId,
        Position: this.empForm.Position || undefined,
        HireDate: this.empForm.HireDate,
        CeaseDate: this.empForm.CeaseDate || undefined,
        DaysPerYear: this.empForm.DaysPerYear,
      };
      this.api.createEmployee(create).subscribe({
        next: () => { this.empSaving = false; this.closeEmpForm(); this.loadEmployees(); },
        error: (err) => { this.empSaving = false; this.empFormError = err?.error?.detail || 'Error al crear'; },
      });
    }
  }
}
