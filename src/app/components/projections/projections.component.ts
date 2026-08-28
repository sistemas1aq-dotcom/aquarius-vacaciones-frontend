import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { ProjectionRow, EmployeeWithBalance } from '../../models/interfaces';
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
  imports: [CommonModule, FormsModule, PaginationComponent],
  template: `
    <!-- Cabecera igual que en Empleados: los controles sueltos sobre el fondo,
         sin tarjeta y sin repetir el título. La barra superior de la
         aplicación ya dice «Proyecciones»; volver a escribirlo dentro solo
         gasta una línea de pantalla. -->
    <div class="flex flex-wrap gap-3 mb-5 items-center justify-between">
      <div class="flex gap-3 flex-1 flex-wrap">
        <div class="relative min-w-[260px] flex-1 max-w-md">
          <input [(ngModel)]="filtro" (ngModelChange)="aplicarFiltro()"
            placeholder="Buscar empleado…"
            title="Busca por nombre, departamento, cargo o días pendientes."
            class="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <button *ngIf="filtro" (click)="limpiarFiltro()" title="Limpiar filtro"
            class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
        </div>

        <!-- Las planillas salen de las propias filas, no del catálogo: así el
             desplegable nunca ofrece una opción que deje la tabla vacía. -->
        <select [(ngModel)]="planillaFiltro" (ngModelChange)="aplicarFiltro()"
          title="Tipo de planilla"
          class="pl-4 pr-9 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <option value="">T. Planilla: todas</option>
          <option *ngFor="let pl of planillas()" [value]="pl">{{ pl }}</option>
        </select>
      </div>

      <div class="flex items-center gap-3">
        <span class="text-xs text-gray-400">
          {{ projeccionesFiltradas.length }}
          <span *ngIf="filtro || planillaFiltro">de {{ projections.length }}</span> resultados
        </span>
        <button (click)="abrirRegistro()"
          class="bg-gradient-to-r from-[#16589e] to-[#3b93d0] hover:from-[#114777] hover:to-[#2876b7] text-white px-4 py-2 rounded-lg shadow-sm font-semibold text-sm transition whitespace-nowrap">
          + Registrar Vacaciones
        </button>
      </div>
    </div>

    <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-5">
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
            <tr *ngIf="!loading && projeccionesFiltradas.length === 0">
              <td [attr.colspan]="months.length + 2" class="px-3 py-10 text-center text-gray-400">
                Ningún empleado coincide con «{{ filtro }}»
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <app-pagination
        [totalItems]="projeccionesFiltradas.length"
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

    <!-- Registrar vacaciones: primero se elige el empleado, luego las fechas.
         La lista de Proyecciones es general y no tiene selección de fila, así que
         el propio modal resuelve a quién se le programa. -->
    <div *ngIf="modalAbierto" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
         (click)="cerrarRegistro()">
      <div class="bg-white rounded-2xl border border-gray-200 shadow-xl w-[560px] max-w-[95vw] p-6"
           (click)="$event.stopPropagation()">

        <div class="flex justify-between items-center mb-5">
          <h3 class="text-lg font-bold text-gray-800">Registrar Vacaciones</h3>
          <button (click)="cerrarRegistro()" class="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <!-- Paso 1: elegir empleado -->
        <ng-container *ngIf="!empSeleccionado">
          <label class="block text-xs text-gray-500 font-medium mb-1">¿A quién se le programa?</label>
          <input [(ngModel)]="filtroEmp" (ngModelChange)="filtrarEmpleados()"
            placeholder="Escribe nombre, DNI, cargo o departamento…"
            class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 mb-3 focus:outline-none focus:ring-2 focus:ring-emerald-500" />

          <div class="border border-gray-200 rounded-lg max-h-72 overflow-y-auto divide-y divide-gray-50">
            <button *ngFor="let e of empleadosFiltrados.slice(0, 50)" (click)="seleccionarEmpleado(e)"
              class="w-full text-left px-3 py-2 hover:bg-emerald-50 transition flex items-center justify-between gap-3">
              <span class="min-w-0">
                <span class="block font-semibold text-sm text-gray-800 truncate">{{ e.FullName }}</span>
                <span class="block text-[11px] text-gray-400 truncate">{{ e.DepartmentName }} · {{ e.Position }} · {{ e.Dni }}</span>
              </span>
              <span class="text-xs font-bold whitespace-nowrap"
                [class.text-red-600]="e.TotalPending > 60"
                [class.text-amber-600]="e.TotalPending > 30 && e.TotalPending <= 60"
                [class.text-emerald-600]="e.TotalPending <= 30">{{ e.TotalPending | number:'1.0-0' }}d</span>
            </button>
            <div *ngIf="empleadosFiltrados.length === 0" class="px-3 py-6 text-center text-sm text-gray-400">
              Sin coincidencias
            </div>
          </div>
          <p *ngIf="empleadosFiltrados.length > 50" class="text-[11px] text-gray-400 mt-2">
            Mostrando 50 de {{ empleadosFiltrados.length }}. Afina la búsqueda.
          </p>
        </ng-container>

        <!-- Paso 2: fechas -->
        <ng-container *ngIf="empSeleccionado as emp">
          <div class="flex items-center justify-between gap-3 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 mb-4">
            <span class="min-w-0">
              <span class="block font-semibold text-sm text-gray-800 truncate">{{ emp.FullName }}</span>
              <span class="block text-[11px] text-gray-500 truncate">{{ emp.DepartmentName }} · {{ emp.Position }}</span>
            </span>
            <button (click)="cambiarEmpleado()"
              class="text-xs font-semibold text-[#16589e] hover:underline whitespace-nowrap">Cambiar</button>
          </div>

          <div class="bg-gray-50 rounded-lg p-3 mb-4 text-xs flex gap-3 flex-wrap">
            <span class="text-gray-500">Pendientes (Año): <b class="text-amber-600">{{ emp.PendingByYear | number:'1.0-0' }}d</b></span>
            <span class="text-gray-500">Truncas: <b class="text-violet-600">{{ emp.TruncatedDays | number:'1.0-0' }}d</b></span>
            <span class="text-gray-500">Total pendiente: <b class="text-gray-700">{{ emp.TotalPending | number:'1.0-0' }}d</b></span>
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
          <div class="grid grid-cols-2 gap-3 mb-2">
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

          <!-- Aviso, no bloqueo: la decisión de exceder el saldo es de RRHH. -->
          <p *ngIf="vacForm.Days > 0 && vacForm.Days > emp.TotalPending"
             class="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
            Se programan {{ vacForm.Days }}d y el saldo pendiente es {{ emp.TotalPending | number:'1.0-0' }}d.
          </p>
          <p *ngIf="error" class="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{{ error }}</p>

          <div class="flex justify-end gap-2">
            <button (click)="cerrarRegistro()"
              class="px-4 py-2 text-xs font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition">Cancelar</button>
            <button (click)="guardar()"
              [disabled]="guardando || !vacForm.StartDate || !vacForm.EndDate || vacForm.Days <= 0"
              class="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition disabled:opacity-40">
              {{ guardando ? 'Guardando…' : 'Programar' }}
            </button>
          </div>
        </ng-container>
      </div>
    </div>
  `,
})
export class ProjectionsComponent implements OnInit {
  projections: ProjectionRow[] = [];
  /** Resultado de aplicar `filtro`. Es lo que se pagina y se pinta. */
  projeccionesFiltradas: ProjectionRow[] = [];
  noProgrammed: ProjectionRow[] = [];
  loading = true;

  // ── Buscador de la tabla ──────────────────────────────────────
  filtro = '';
  planillaFiltro = '';

  /** Planillas presentes en los datos, ordenadas. */
  planillas(): string[] {
    return [...new Set(this.projections.map(p => p.Department).filter(Boolean))].sort();
  }

  // ── Registrar vacaciones ──────────────────────────────────────
  modalAbierto = false;
  empleados: EmployeeWithBalance[] = [];
  empleadosFiltrados: EmployeeWithBalance[] = [];
  empSeleccionado: EmployeeWithBalance | null = null;
  filtroEmp = '';
  guardando = false;
  error = '';
  vacForm = { StartDate: '', EndDate: '', Days: 0, Status: 'approved', Label: '' };
  months = [1,2,3,4,5,6,7,8,9,10,11,12];
  monthNames = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

  // Paginación
  readonly pageSize = 7;
  projPage = signal(1);
  noProgPage = signal(1);
  paginatedProjections(): ProjectionRow[]   { return paginate(this.projeccionesFiltradas, this.projPage(), this.pageSize); }
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
    this.cargarProyeccion();
    // Padrón completo para el selector del modal: la proyección solo trae a
    // quienes tienen saldo o programación, y se puede querer registrar
    // vacaciones a cualquiera.
    this.api.getEmployees({ pageSize: 500 }).subscribe(res => {
      this.empleados = res.items;
      this.empleadosFiltrados = res.items;
    });
  }

  private cargarProyeccion() {
    this.loading = true;
    this.api.getProjection(2026).subscribe({
      next: (data) => {
        this.projections = data.filter(r =>
          r.TotalPending > 0 || Object.keys(r.MonthlySchedule).length > 0
        );
        this.noProgrammed = data.filter(r =>
          r.TotalPending > 15 && Object.keys(r.MonthlySchedule).every(k => parseInt(k) <= 3)
        );
        this.aplicarFiltro();
        this.loading = false;
      },
      error: () => this.loading = false,
    });
  }

  /** Quita tildes y pasa a minúsculas: "valuacion" encuentra "VALUACIÓN". */
  private normalizar(v: unknown): string {
    return String(v ?? '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  // ── Buscador de la tabla ──────────────────────────────────────
  aplicarFiltro() {
    // Dos filtros en cadena: primero la planilla, luego el texto. El
    // desplegable acota el conjunto; el buscador afina dentro.
    const base = this.planillaFiltro
      ? this.projections.filter(r => r.Department === this.planillaFiltro)
      : this.projections;

    const terminos = this.normalizar(this.filtro).split(/\s+/).filter(Boolean);
    this.projeccionesFiltradas = terminos.length === 0
      ? base
      : base.filter(r => {
          const texto = this.normalizar(
            [r.EmployeeName, r.Department, r.Position, Math.round(r.TotalPending)].join(' ')
          );
          return terminos.every(x => texto.includes(x));
        });
    this.projPage.set(1);
  }

  limpiarFiltro() {
    // Limpia SOLO el texto: la planilla elegida es una decisión aparte y
    // borrarla de paso obligaría a volver a seleccionarla.
    this.filtro = '';
    this.aplicarFiltro();
  }

  // ── Registrar vacaciones ──────────────────────────────────────
  abrirRegistro() {
    this.modalAbierto = true;
    this.empSeleccionado = null;
    this.filtroEmp = '';
    this.error = '';
    this.empleadosFiltrados = this.empleados;
    this.vacForm = { StartDate: '', EndDate: '', Days: 0, Status: 'approved', Label: '' };
  }

  cerrarRegistro() {
    this.modalAbierto = false;
    this.empSeleccionado = null;
    this.error = '';
  }

  filtrarEmpleados() {
    const terminos = this.normalizar(this.filtroEmp).split(/\s+/).filter(Boolean);
    this.empleadosFiltrados = terminos.length === 0
      ? this.empleados
      : this.empleados.filter(e => {
          const texto = this.normalizar(
            [e.FullName, e.Dni, e.Position, e.DepartmentName].join(' ')
          );
          return terminos.every(x => texto.includes(x));
        });
  }

  seleccionarEmpleado(e: EmployeeWithBalance) {
    this.empSeleccionado = e;
    this.error = '';
  }

  cambiarEmpleado() {
    this.empSeleccionado = null;
    this.filtroEmp = '';
    this.empleadosFiltrados = this.empleados;
  }

  calcDays() {
    if (this.vacForm.StartDate && this.vacForm.EndDate) {
      const inicio = new Date(this.vacForm.StartDate);
      const fin = new Date(this.vacForm.EndDate);
      const dias = Math.round((fin.getTime() - inicio.getTime()) / 86400000) + 1;
      this.vacForm.Days = Math.max(0, dias);
    }
  }

  guardar() {
    if (!this.empSeleccionado) return;
    if (this.vacForm.EndDate < this.vacForm.StartDate) {
      this.error = 'La fecha de fin no puede ser anterior a la de inicio.';
      return;
    }
    this.guardando = true;
    this.error = '';
    this.api.createVacation({
      EmployeeId: this.empSeleccionado.Id,
      StartDate: this.vacForm.StartDate,
      EndDate: this.vacForm.EndDate,
      Days: this.vacForm.Days,
      Status: this.vacForm.Status,
      Label: this.vacForm.Label,
    }).subscribe({
      next: () => {
        this.guardando = false;
        this.cerrarRegistro();
        // Recargar: el mapa de calor y los saldos cambian con la nueva vacación.
        this.cargarProyeccion();
        this.api.getEmployees({ pageSize: 500 }).subscribe(res => this.empleados = res.items);
      },
      error: (e) => {
        this.guardando = false;
        this.error = e?.error?.detail || 'No se pudo registrar la vacación.';
      },
    });
  }
}
