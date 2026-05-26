import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { ProjectionRow } from '../../models/interfaces';
import { PaginationComponent, paginate } from '../shared/pagination.component';

// Celda del heatmap: o es vacación (puede ocupar varios meses) o está vacía (1 mes).
interface ProjectionCell {
  type: 'vacation' | 'empty';
  span: number;
  startMonth: number;
  endMonth: number;
  days?: number;
  label?: string | null;
}

@Component({
  selector: 'app-projections',
  standalone: true,
  imports: [CommonModule, PaginationComponent],
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
            <tr *ngFor="let row of paginatedProjections()" class="border-b border-gray-50 hover:bg-gray-50">
              <td class="px-3 py-2 sticky left-0 bg-white z-[1]">
                <div class="font-medium text-gray-800">{{ row.EmployeeName }}</div>
                <div class="text-[10px] text-gray-400">{{ row.Department }} · {{ row.Position }}</div>
              </td>
              <td class="px-2 py-2 text-center">
                <span class="font-bold" [class.text-red-600]="row.TotalPending > 30"
                  [class.text-amber-600]="row.TotalPending > 0 && row.TotalPending <= 30"
                  [class.text-emerald-600]="row.TotalPending <= 0">{{ row.TotalPending | number:'1.0-0' }}</span>
              </td>
              <ng-container *ngFor="let cell of buildCells(row)">
                <td class="px-1 py-1 text-center" [attr.colspan]="cell.span">
                  <ng-container *ngIf="cell.type === 'vacation'; else emptyCell">
                    <div class="rounded-md py-1 px-1"
                      [title]="cell.label || ''"
                      [class.bg-emerald-100]="cell.endMonth <= 3"
                      [class.bg-cyan-100]="cell.startMonth <= 4 && cell.endMonth >= 4 && cell.endMonth <= 4"
                      [class.bg-blue-100]="cell.startMonth > 4 || (cell.span > 1 && cell.endMonth > 4)">
                      <div class="font-bold text-sm"
                        [class.text-emerald-700]="cell.endMonth <= 3"
                        [class.text-cyan-700]="cell.startMonth <= 4 && cell.endMonth >= 4 && cell.endMonth <= 4"
                        [class.text-blue-700]="cell.startMonth > 4 || (cell.span > 1 && cell.endMonth > 4)">
                        {{ cell.days | number:'1.0-0' }}
                      </div>
                      <div class="text-[8px] text-gray-400">
                        {{ cell.endMonth <= 3 ? 'Goz.' : cell.startMonth === 4 && cell.span === 1 ? 'Hoy' : 'Prog.' }}
                        <span *ngIf="cell.span > 1" class="ml-0.5 font-semibold">({{ cell.span }} meses)</span>
                      </div>
                    </div>
                  </ng-container>
                  <ng-template #emptyCell>
                    <span class="text-gray-300">—</span>
                  </ng-template>
                </td>
              </ng-container>
            </tr>
          </tbody>
        </table>
      </div>

      <app-pagination
        [totalItems]="projections.length"
        [pageSize]="pageSize"
        [currentPage]="projPage()"
        (pageChange)="projPage.set($event)" />
    </div>

    <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <h4 class="text-sm font-bold text-gray-800 mb-4">Empleados sin programación (+15d pendientes)</h4>
      <div class="overflow-auto">
        <div *ngFor="let row of paginatedNoProgrammed()"
          class="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
          <div>
            <span class="font-semibold text-sm text-gray-800">{{ row.EmployeeName }}</span>
            <span class="text-xs text-amber-600 ml-2">{{ row.TotalPending | number:'1.0-0' }}d pend.</span>
            <span class="text-xs text-gray-400 ml-2">{{ row.Department }}</span>
          </div>
        </div>
        <div *ngIf="noProgrammed.length === 0" class="text-sm text-gray-400 py-4 text-center">
          Todos los empleados con +15d tienen vacaciones programadas
        </div>
      </div>

      <app-pagination
        [totalItems]="noProgrammed.length"
        [pageSize]="pageSize"
        [currentPage]="noProgPage()"
        (pageChange)="noProgPage.set($event)" />
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

  // Paginación
  readonly pageSize = 7;
  projPage = signal(1);
  noProgPage = signal(1);
  paginatedProjections(): ProjectionRow[]   { return paginate(this.projections,  this.projPage(),   this.pageSize); }
  paginatedNoProgrammed(): ProjectionRow[]  { return paginate(this.noProgrammed, this.noProgPage(), this.pageSize); }

  /**
   * Construye las celdas del heatmap:
   *  - Una vacación que cruza meses se renderiza como UNA celda con colspan.
   *  - Vacaciones distintas en meses consecutivos se mantienen en celdas separadas.
   *  - Múltiples vacaciones que empiezan en el mismo mes (todas single-month) se suman.
   *  - Las multi-mes tienen prioridad: si claman meses 2-3, las single-month en 2 ó 3 se ignoran
   *    (no debería pasar con datos reales pero evita crashes).
   */
  buildCells(row: ProjectionRow): ProjectionCell[] {
    const cells: ProjectionCell[] = [];
    const vacs = (row.Vacations || []).slice().sort((a, b) => a.StartMonth - b.StartMonth);
    const claimed = new Set<number>();
    const segments = new Map<number, { span: number; days: number; label: string | null }>();

    // 1) Multi-mes primero (cada vacación es UNA celda con colspan)
    for (const v of vacs) {
      if (v.EndMonth > v.StartMonth) {
        let canClaim = true;
        for (let m = v.StartMonth; m <= v.EndMonth; m++) {
          if (claimed.has(m)) { canClaim = false; break; }
        }
        if (canClaim) {
          for (let m = v.StartMonth; m <= v.EndMonth; m++) claimed.add(m);
          segments.set(v.StartMonth, {
            span: v.EndMonth - v.StartMonth + 1,
            days: Number(v.Days) || 0,
            label: v.Label,
          });
        }
      }
    }

    // 2) Single-mes: sumar todas las que empiezan en el mismo mes
    for (const v of vacs) {
      if (v.EndMonth === v.StartMonth && !claimed.has(v.StartMonth)) {
        const existing = segments.get(v.StartMonth);
        if (existing) {
          existing.days += Number(v.Days) || 0;
        } else {
          segments.set(v.StartMonth, {
            span: 1,
            days: Number(v.Days) || 0,
            label: v.Label,
          });
        }
        claimed.add(v.StartMonth);
      }
    }

    // 3) Recorrer meses 1-12 generando celdas
    let m = 1;
    while (m <= 12) {
      const seg = segments.get(m);
      if (seg) {
        cells.push({
          type: 'vacation',
          span: seg.span,
          startMonth: m,
          endMonth: m + seg.span - 1,
          days: seg.days,
          label: seg.label,
        });
        m += seg.span;
      } else if (claimed.has(m)) {
        m++;  // ya cubierto por una multi-mes que arrancó antes
      } else {
        cells.push({ type: 'empty', span: 1, startMonth: m, endMonth: m });
        m++;
      }
    }
    return cells;
  }

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
