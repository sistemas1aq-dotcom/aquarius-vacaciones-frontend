/**
 * Reporte Corporativo — réplica exacta del formato en Excel que usa la
 * empresa, con descarga en XLSX y PDF.
 *
 * Antes vivía junto a los gráficos en una sola pantalla de «Reportes». Son
 * dos usos distintos: este es el documento que se imprime y se manda; el
 * otro es para mirar cómo va la cosa. Separarlos evita bajar media página
 * para llegar a lo que buscas.
 */
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
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
  selector: 'app-reporte-corporativo',
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
            class="pl-3 pr-9 py-1.5 text-xs border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
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
  `,
})
export class ReporteCorporativoComponent implements OnInit {
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

  constructor(private api: ApiService) {}

  ngOnInit() { this.loadVacationReport(); }

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
