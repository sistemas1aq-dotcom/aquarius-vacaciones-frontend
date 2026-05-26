import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { MonthlyReportRow, DepartmentReportRow, EmployeeWithBalance } from '../../models/interfaces';
import { PaginationComponent, paginate } from '../shared/pagination.component';

interface VacationReportRow {
  N: number;
  Dni: string;
  FullName: string;
  Department: string;
  Detalle: string;
  Position: string;
  HireDate: string | null;
  Earned: number;
  TakenPrev: number;
  TakenYear: number;
  PendingByYear: number;
  Truncated: number;
}
interface VacationReportPreview {
  year: number;
  previousYearShort: string;
  rows: VacationReportRow[];
  totals: {
    Earned: number;
    TakenPrev: number;
    TakenYear: number;
    PendingByYear: number;
    Truncated: number;
  };
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  template: `
    <!-- ============ Reporte Corporativo de Vacaciones ============ -->
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-5">
      <div class="flex flex-wrap justify-between items-center gap-3 mb-4">
        <div>
          <h4 class="text-base font-bold text-gray-800">Reporte de Vacaciones (Modelo Corporativo)</h4>
          <p class="text-xs text-gray-400 mt-1">Reporte oficial replica exacta del formato corporativo en Excel</p>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <label class="text-xs text-gray-600 font-semibold">Año:</label>
          <select [(ngModel)]="reportYear" (ngModelChange)="loadVacationReport()"
            class="px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option *ngFor="let y of availableYears" [value]="y">{{ y }}</option>
          </select>
          <button (click)="downloadXlsx()" [disabled]="downloadingXlsx()"
            class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 flex items-center gap-1 transition">
            <span>📊</span> {{ downloadingXlsx() ? 'Generando...' : 'Descargar XLSX' }}
          </button>
          <button (click)="downloadPdf()" [disabled]="downloadingPdf()"
            class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-40 flex items-center gap-1 transition">
            <span>📄</span> {{ downloadingPdf() ? 'Generando...' : 'Descargar PDF' }}
          </button>
        </div>
      </div>

      <!-- Visor en pantalla — replica el estilo del modelo -->
      <div *ngIf="vacReport(); else loadingReport" class="border border-gray-200 rounded-lg overflow-hidden">
        <div class="text-center py-2 bg-white">
          <h5 class="font-bold text-sm text-gray-800">REPORTE DE VACACIONES — {{ vacReport()!.year }}</h5>
        </div>
        <div class="overflow-x-auto max-h-[500px]">
          <table class="w-full text-[11px] border-collapse">
            <thead class="sticky top-0 z-10">
              <tr>
                <th class="px-2 py-2 text-center font-bold text-white border border-gray-800"
                    style="background-color:#0000CC">Nº</th>
                <th class="px-2 py-2 text-center font-bold text-white border border-gray-800"
                    style="background-color:#0000CC">DNI</th>
                <th class="px-2 py-2 text-center font-bold text-white border border-gray-800"
                    style="background-color:#0000CC">APELLIDOS Y NOMBRES</th>
                <th class="px-2 py-2 text-center font-bold text-white border border-gray-800"
                    style="background-color:#0000CC">PLANILLA</th>
                <th class="px-2 py-2 text-center font-bold text-white border border-gray-800"
                    style="background-color:#0000CC">DETALLE</th>
                <th class="px-2 py-2 text-center font-bold text-white border border-gray-800"
                    style="background-color:#0000CC">CARGO</th>
                <th class="px-2 py-2 text-center font-bold text-white border border-gray-800"
                    style="background-color:#0000CC">FECHA DE INGRESO</th>
                <th class="px-2 py-2 text-center font-bold text-white border border-gray-800"
                    style="background-color:#3B618E">Vacaciones<br>Ganadas x Año</th>
                <th class="px-2 py-2 text-center font-bold text-white border border-gray-800"
                    style="background-color:#3B618E">Dias de Vac.<br>Gozadas - 31/12/{{ vacReport()!.previousYearShort }}</th>
                <th class="px-2 py-2 text-center font-bold text-white border border-gray-800"
                    style="background-color:#3B618E">Dias de Vac.<br>Gozadas - {{ vacReport()!.year }}</th>
                <th class="px-2 py-2 text-center font-bold border border-gray-800"
                    style="background-color:#B7DEE8;color:#FF0000">Vac.<br>Pendientes<br>x Año</th>
                <th class="px-2 py-2 text-center font-bold border border-gray-800"
                    style="background-color:#B7DEE8;color:#FF0000">Vac. Truncos<br>(Periodo actual)</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let r of paginatedVacReport()" class="hover:bg-gray-50">
                <td class="px-2 py-1 text-center border border-gray-300 font-semibold">{{ r.N }}</td>
                <td class="px-2 py-1 text-center border border-gray-300">{{ r.Dni }}</td>
                <td class="px-2 py-1 border border-gray-300">{{ r.FullName }}</td>
                <td class="px-2 py-1 text-center border border-gray-300">{{ r.Department }}</td>
                <td class="px-2 py-1 text-center border border-gray-300">{{ r.Detalle }}</td>
                <td class="px-2 py-1 border border-gray-300">{{ r.Position }}</td>
                <td class="px-2 py-1 text-center border border-gray-300">{{ r.HireDate | date:'dd/MM/yyyy' }}</td>
                <td class="px-2 py-1 text-center border border-gray-300 font-bold">{{ r.Earned | number:'1.0-0' }}</td>
                <td class="px-2 py-1 text-center border border-gray-300 font-bold">{{ r.TakenPrev | number:'1.0-0' }}</td>
                <td class="px-2 py-1 text-center border border-gray-300 font-bold">{{ r.TakenYear | number:'1.0-0' }}</td>
                <td class="px-2 py-1 text-center border border-gray-300 font-bold"
                    [class.text-red-600]="r.PendingByYear > 0">{{ r.PendingByYear | number:'1.0-0' }}</td>
                <td class="px-2 py-1 text-center border border-gray-300 font-bold">{{ r.Truncated | number:'1.2-2' }}</td>
              </tr>
              <tr *ngIf="vacReport()!.rows.length === 0">
                <td colspan="12" class="px-2 py-10 text-center text-gray-400">Sin datos</td>
              </tr>
            </tbody>
            <tfoot *ngIf="vacReport()!.rows.length > 0">
              <tr style="background-color:#FFF2CC" class="font-bold">
                <td colspan="6" class="px-2 py-2 border border-gray-800"></td>
                <td class="px-2 py-2 text-right border border-gray-800">TOTAL</td>
                <td class="px-2 py-2 text-center border border-gray-800">{{ vacReport()!.totals.Earned | number:'1.0-0' }}</td>
                <td class="px-2 py-2 text-center border border-gray-800">{{ vacReport()!.totals.TakenPrev | number:'1.0-0' }}</td>
                <td class="px-2 py-2 text-center border border-gray-800">{{ vacReport()!.totals.TakenYear | number:'1.0-0' }}</td>
                <td class="px-2 py-2 text-center border border-gray-800 text-red-700">{{ vacReport()!.totals.PendingByYear | number:'1.0-0' }}</td>
                <td class="px-2 py-2 text-center border border-gray-800">{{ vacReport()!.totals.Truncated | number:'1.2-2' }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div class="px-3 py-2 bg-gray-50 border-t border-gray-200">
          <app-pagination
            [totalItems]="vacReport()!.rows.length"
            [pageSize]="vacReportPageSize"
            [currentPage]="vacReportPage()"
            (pageChange)="vacReportPage.set($event)" />
        </div>
      </div>
      <ng-template #loadingReport>
        <div class="flex items-center justify-center py-10 text-gray-400">
          <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
          Cargando reporte...
        </div>
      </ng-template>
    </div>

    <!-- Monthly Chart -->
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-5">
      <h4 class="text-base font-bold text-gray-800 mb-5">Vacaciones Gozadas por Mes — 2026</h4>
      <div class="flex items-end gap-1 h-44 mb-2">
        <div *ngFor="let m of monthlyData; let i = index" class="flex-1 flex flex-col items-center gap-1">
          <span class="text-[10px] text-emerald-600 font-semibold">{{ m.TotalDays ? (m.TotalDays | number:'1.0-0') : '' }}</span>
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
            <tr *ngFor="let d of paginatedDept()" class="border-b border-gray-50 hover:bg-gray-50">
              <td class="px-3 py-2 font-semibold text-gray-800">{{ d.Department }}</td>
              <td class="px-3 py-2 text-gray-600">{{ d.EmployeeCount }}</td>
              <td class="px-3 py-2 font-bold" [class.text-red-600]="d.TotalPending > 100" [class.text-amber-600]="d.TotalPending <= 100">{{ d.TotalPending | number:'1.0-0' }}d</td>
              <td class="px-3 py-2 text-gray-500">{{ d.AveragePending | number:'1.0-0' }}d</td>
              <td class="px-3 py-2 text-emerald-600">{{ d.TakenDays2026 | number:'1.0-0' }}d</td>
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

      <app-pagination
        [totalItems]="deptData.length"
        [pageSize]="pageSize"
        [currentPage]="deptPage()"
        (pageChange)="deptPage.set($event)" />
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
            <tr *ngFor="let e of paginatedTop()" class="border-b border-gray-50 hover:bg-gray-50">
              <td class="px-3 py-2">
                <div class="font-semibold text-gray-800">{{ e.FullName }}</div>
                <div class="text-[10px] text-gray-400">{{ e.Position }}</div>
              </td>
              <td class="px-3 py-2 text-gray-600">{{ e.DepartmentName }}</td>
              <td class="px-3 py-2 text-gray-500">{{ e.HireDate | date:'dd/MM/yyyy' }}</td>
              <td class="px-3 py-2 text-red-600 font-bold text-sm">{{ e.TotalPending | number:'1.0-0' }}d</td>
              <td class="px-3 py-2 text-amber-600">{{ e.PendingByYear | number:'1.0-0' }}d</td>
              <td class="px-3 py-2 text-violet-600">{{ e.PendingTruncated | number:'1.0-0' }}d</td>
            </tr>
          </tbody>
        </table>
      </div>

      <app-pagination
        [totalItems]="topPending.length"
        [pageSize]="pageSize"
        [currentPage]="topPage()"
        (pageChange)="topPage.set($event)" />
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

  // Reporte corporativo
  reportYear = new Date().getFullYear();
  availableYears = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);
  vacReport = signal<VacationReportPreview | null>(null);
  vacReportPage = signal(1);
  readonly vacReportPageSize = 15;
  downloadingXlsx = signal(false);
  downloadingPdf = signal(false);

  paginatedVacReport(): VacationReportRow[] {
    const r = this.vacReport();
    return r ? paginate(r.rows, this.vacReportPage(), this.vacReportPageSize) : [];
  }

  // Paginación
  readonly pageSize = 7;
  deptPage = signal(1);
  topPage  = signal(1);
  paginatedDept(): DepartmentReportRow[] { return paginate(this.deptData, this.deptPage(), this.pageSize); }
  paginatedTop():  EmployeeWithBalance[] { return paginate(this.topPending, this.topPage(),  this.pageSize); }

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

    this.loadVacationReport();
  }

  loadVacationReport() {
    this.vacReport.set(null);
    this.api.getVacationReportPreview(this.reportYear).subscribe({
      next: (data) => {
        this.vacReport.set(data);
        this.vacReportPage.set(1);
      },
      error: () => this.vacReport.set({
        year: this.reportYear, previousYearShort: '00',
        rows: [], totals: { Earned: 0, TakenPrev: 0, TakenYear: 0, PendingByYear: 0, Truncated: 0 },
      }),
    });
  }

  downloadXlsx() {
    this.downloadingXlsx.set(true);
    this.api.downloadVacationReportXlsx(this.reportYear).subscribe({
      next: (blob) => {
        this.saveBlob(blob, `reporte_vacaciones_${this.reportYear}.xlsx`);
        this.downloadingXlsx.set(false);
      },
      error: () => this.downloadingXlsx.set(false),
    });
  }

  downloadPdf() {
    this.downloadingPdf.set(true);
    this.api.downloadVacationReportPdf(this.reportYear).subscribe({
      next: (blob) => {
        this.saveBlob(blob, `reporte_vacaciones_${this.reportYear}.pdf`);
        this.downloadingPdf.set(false);
      },
      error: () => this.downloadingPdf.set(false),
    });
  }

  private saveBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
