import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { MonthlyReportRow, DepartmentReportRow, EmployeeWithBalance } from '../../models/interfaces';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Monthly Chart -->
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-5">
      <h4 class="text-base font-bold text-gray-800 mb-5">Vacaciones Gozadas por Mes — 2026</h4>
      <div class="flex items-end gap-1 h-44 mb-2">
        <div *ngFor="let m of monthlyData; let i = index" class="flex-1 flex flex-col items-center gap-1">
          <span class="text-[10px] text-emerald-600 font-semibold">{{ m.TotalDays || '' }}</span>
          <div class="w-full rounded-md transition-all duration-300"
            [class.bg-emerald-500]="m.TotalDays > 0"
            [class.bg-gray-100]="m.TotalDays === 0"
            [style.height.px]="m.TotalDays > 0 ? Math.max((m.TotalDays / maxDays) * 120, 4) : 4">
          </div>
          <span class="text-[10px] text-gray-400">{{ monthNames[i] }}</span>
          <span *ngIf="m.EmployeeCount > 0" class="text-[9px] text-gray-300">{{ m.EmployeeCount }}p</span>
        </div>
      </div>
    </div>

    <!-- Department Report -->
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-5">
      <h4 class="text-sm font-bold text-gray-800 mb-4">Resumen por Departamento</h4>
      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead>
            <tr class="border-b border-gray-100">
              <th class="text-left px-3 py-2 text-gray-400 font-semibold uppercase">Departamento</th>
              <th class="text-left px-3 py-2 text-gray-400 font-semibold uppercase">Empleados</th>
              <th class="text-left px-3 py-2 text-gray-400 font-semibold uppercase">Total Pend.</th>
              <th class="text-left px-3 py-2 text-gray-400 font-semibold uppercase">Promedio</th>
              <th class="text-left px-3 py-2 text-gray-400 font-semibold uppercase">Gozados 2026</th>
              <th class="text-left px-3 py-2 text-gray-400 font-semibold uppercase">Cumplimiento</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let d of deptData" class="border-b border-gray-50 hover:bg-gray-50">
              <td class="px-3 py-2 font-semibold text-gray-800">{{ d.Department }}</td>
              <td class="px-3 py-2 text-gray-600">{{ d.EmployeeCount }}</td>
              <td class="px-3 py-2 font-bold" [class.text-red-600]="d.TotalPending > 100" [class.text-amber-600]="d.TotalPending <= 100">{{ d.TotalPending }}d</td>
              <td class="px-3 py-2 text-gray-500">{{ d.AveragePending }}d</td>
              <td class="px-3 py-2 text-emerald-600">{{ d.TakenDays2026 }}d</td>
              <td class="px-3 py-2">
                <div class="flex items-center gap-2">
                  <div class="flex-1 h-1.5 bg-gray-100 rounded-full max-w-[60px]">
                    <div class="h-full rounded-full transition-all" [style.width.%]="Math.min(d.CompliancePercent, 100)"
                      [class.bg-emerald-500]="d.CompliancePercent >= 60"
                      [class.bg-amber-500]="d.CompliancePercent >= 30 && d.CompliancePercent < 60"
                      [class.bg-red-500]="d.CompliancePercent < 30"></div>
                  </div>
                  <span class="font-semibold" [class.text-emerald-600]="d.CompliancePercent >= 60"
                    [class.text-amber-600]="d.CompliancePercent >= 30 && d.CompliancePercent < 60"
                    [class.text-red-600]="d.CompliancePercent < 30">{{ d.CompliancePercent }}%</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Top Pending -->
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <h4 class="text-sm font-bold text-gray-800 mb-4">Vacaciones Pendientes — Top 20</h4>
      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead>
            <tr class="border-b border-gray-100">
              <th class="text-left px-3 py-2 text-gray-400 font-semibold uppercase">Empleado</th>
              <th class="text-left px-3 py-2 text-gray-400 font-semibold uppercase">Depto</th>
              <th class="text-left px-3 py-2 text-gray-400 font-semibold uppercase">Ingreso</th>
              <th class="text-left px-3 py-2 text-gray-400 font-semibold uppercase">Total Pend.</th>
              <th class="text-left px-3 py-2 text-gray-400 font-semibold uppercase">Pend. Año</th>
              <th class="text-left px-3 py-2 text-gray-400 font-semibold uppercase">Truncas</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let e of topPending" class="border-b border-gray-50 hover:bg-gray-50">
              <td class="px-3 py-2">
                <div class="font-semibold text-gray-800">{{ e.FullName }}</div>
                <div class="text-[10px] text-gray-400">{{ e.Position }}</div>
              </td>
              <td class="px-3 py-2 text-gray-600">{{ e.DepartmentName }}</td>
              <td class="px-3 py-2 text-gray-500">{{ e.HireDate | date:'dd/MM/yyyy' }}</td>
              <td class="px-3 py-2 text-red-600 font-bold text-sm">{{ e.TotalPending }}d</td>
              <td class="px-3 py-2 text-amber-600">{{ e.PendingByYear }}d</td>
              <td class="px-3 py-2 text-violet-600">{{ e.PendingTruncated }}d</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class ReportsComponent implements OnInit {
  monthlyData: MonthlyReportRow[] = [];
  deptData: DepartmentReportRow[] = [];
  topPending: EmployeeWithBalance[] = [];
  maxDays = 1;
  monthNames = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  Math = Math;

  constructor(private api: ApiService) {}

  ngOnInit() {
    // Fill all 12 months
    this.monthlyData = Array.from({length: 12}, (_, i) => ({
      Month: i + 1, MonthName: this.monthNames[i], EmployeeCount: 0, TotalDays: 0
    }));

    this.api.getMonthlyReport(2026).subscribe(data => {
      data.forEach(d => {
        const idx = d.Month - 1;
        if (idx >= 0 && idx < 12) {
          this.monthlyData[idx] = d;
        }
      });
      this.maxDays = Math.max(...this.monthlyData.map(d => d.TotalDays), 1);
    });

    this.api.getDepartmentReport().subscribe(data => this.deptData = data);
    this.api.getTopPending(20).subscribe(data => this.topPending = data);
  }
}
