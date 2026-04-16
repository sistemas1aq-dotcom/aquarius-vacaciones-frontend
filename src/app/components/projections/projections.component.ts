import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { ProjectionRow } from '../../models/interfaces';

@Component({
  selector: 'app-projections',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-5">
      <h4 class="text-base font-bold text-gray-800 mb-1">Proyección de Vacaciones 2026</h4>
      <p class="text-xs text-gray-400 mb-5">Mapa de calor: días programados por empleado y mes</p>

      <div class="overflow-x-auto max-h-[600px]">
        <table class="w-full text-xs border-collapse">
          <thead class="sticky top-0 z-10 bg-white">
            <tr>
              <th class="text-left px-3 py-2 text-gray-400 font-semibold uppercase sticky left-0 bg-white z-20 min-w-[200px]">Empleado</th>
              <th class="text-center px-2 py-2 text-gray-400 font-semibold uppercase min-w-[40px]">Pend.</th>
              <th *ngFor="let m of months" class="text-center px-2 py-2 text-gray-400 font-semibold uppercase min-w-[56px]"
                [class.text-gray-300]="m <= 3">{{ monthNames[m-1] }}</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let row of projections" class="border-b border-gray-50 hover:bg-gray-50">
              <td class="px-3 py-2 sticky left-0 bg-white z-[1]">
                <div class="font-medium text-gray-800">{{ row.EmployeeName }}</div>
                <div class="text-[10px] text-gray-400">{{ row.Department }} · {{ row.Position }}</div>
              </td>
              <td class="px-2 py-2 text-center">
                <span class="font-bold" [class.text-red-600]="row.TotalPending > 30"
                  [class.text-amber-600]="row.TotalPending > 0 && row.TotalPending <= 30"
                  [class.text-emerald-600]="row.TotalPending <= 0">{{ row.TotalPending }}</span>
              </td>
              <td *ngFor="let m of months" class="px-1 py-1 text-center">
                <div *ngIf="row.MonthlySchedule[m]"
                  class="rounded-md py-1 px-1"
                  [class.bg-emerald-100]="m <= 3"
                  [class.bg-cyan-100]="m === 4"
                  [class.bg-blue-100]="m > 4">
                  <div class="font-bold text-sm"
                    [class.text-emerald-700]="m <= 3"
                    [class.text-cyan-700]="m === 4"
                    [class.text-blue-700]="m > 4">{{ row.MonthlySchedule[m] }}</div>
                  <div class="text-[8px] text-gray-400">{{ m <= 3 ? 'Goz.' : m === 4 ? 'Hoy' : 'Prog.' }}</div>
                </div>
                <span *ngIf="!row.MonthlySchedule[m]" class="text-gray-300">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <h4 class="text-sm font-bold text-gray-800 mb-4">Empleados sin programación (+15d pendientes)</h4>
      <div class="max-h-72 overflow-auto">
        <div *ngFor="let row of noProgrammed"
          class="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
          <div>
            <span class="font-semibold text-sm text-gray-800">{{ row.EmployeeName }}</span>
            <span class="text-xs text-amber-600 ml-2">{{ row.TotalPending }}d pend.</span>
            <span class="text-xs text-gray-400 ml-2">{{ row.Department }}</span>
          </div>
        </div>
        <div *ngIf="noProgrammed.length === 0" class="text-sm text-gray-400 py-4 text-center">
          Todos los empleados con +15d tienen vacaciones programadas
        </div>
      </div>
    </div>

    <div *ngIf="loading" class="flex items-center justify-center py-20">
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
    </div>
  `,
})
export class ProjectionsComponent implements OnInit {
  projections: ProjectionRow[] = [];
  noProgrammed: ProjectionRow[] = [];
  loading = true;
  months = [1,2,3,4,5,6,7,8,9,10,11,12];
  monthNames = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getProjection(2026).subscribe({
      next: (data) => {
        this.projections = data.filter(r =>
          r.TotalPending > 0 || Object.keys(r.MonthlySchedule).length > 0
        );
        this.noProgrammed = data.filter(r =>
          r.TotalPending > 15 && Object.keys(r.MonthlySchedule).every(k => parseInt(k) <= 3)
        );
        this.loading = false;
      },
      error: () => this.loading = false,
    });
  }
}
