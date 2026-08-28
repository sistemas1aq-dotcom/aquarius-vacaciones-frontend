import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { SyncEstado, SyncCorrida } from '../../models/interfaces';

/**
 * Indicador de la sincronización con Planillas.
 *
 * Chip con semáforo que abre el historial de corridas. Se puso como componente
 * aparte —y no dentro de Empleados— para poder colocarlo también en el
 * Dashboard sin duplicar código.
 *
 *   verde  → última corrida correcta y reciente
 *   ámbar  → hace demasiado que no corre (el scheduler está parado)
 *   rojo   → la última corrida abortó o falló
 */
@Component({
  selector: 'app-sync-indicator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Chip -->
    <button (click)="abrir()"
            [title]="titulo()"
            class="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-full border transition"
            [ngClass]="{
              'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100': color() === 'verde',
              'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100': color() === 'ambar',
              'bg-red-50 border-red-200 text-red-700 hover:bg-red-100': color() === 'rojo',
              'bg-gray-50 border-gray-200 text-gray-500': color() === 'gris'
            }">
      <span class="w-2 h-2 rounded-full"
            [ngClass]="{
              'bg-emerald-500': color() === 'verde',
              'bg-amber-500': color() === 'ambar',
              'bg-red-500': color() === 'rojo',
              'bg-gray-400': color() === 'gris'
            }"></span>
      Sincronización
    </button>

    <!-- Modal -->
    <div *ngIf="abierto()"
         class="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto"
         (click)="cerrar()">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-4xl mt-12" (click)="$event.stopPropagation()">

        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 class="text-lg font-bold text-gray-800">Sincronización de personal (Planillas)</h3>
          <button (click)="cerrar()" class="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <div class="p-6">
          <!-- Estado -->
          <div class="rounded-lg border px-4 py-3 mb-5"
               [ngClass]="{
                 'bg-emerald-50 border-emerald-200': color() === 'verde',
                 'bg-amber-50 border-amber-200': color() === 'ambar',
                 'bg-red-50 border-red-200': color() === 'rojo',
                 'bg-gray-50 border-gray-200': color() === 'gris'
               }">
            <div class="flex items-center gap-2 font-semibold"
                 [ngClass]="{
                   'text-emerald-700': color() === 'verde',
                   'text-amber-700': color() === 'ambar',
                   'text-red-700': color() === 'rojo',
                   'text-gray-600': color() === 'gris'
                 }">
              <span class="w-2 h-2 rounded-full"
                    [ngClass]="{
                      'bg-emerald-500': color() === 'verde',
                      'bg-amber-500': color() === 'ambar',
                      'bg-red-500': color() === 'rojo',
                      'bg-gray-400': color() === 'gris'
                    }"></span>
              {{ etiqueta() }}
            </div>
            <p class="text-sm text-gray-600 mt-1">{{ titulo() }}</p>
            <p *ngIf="estado()?.ultima?.mensaje" class="text-sm mt-2 text-gray-700 bg-white/60 rounded px-2 py-1">
              {{ estado()!.ultima!.mensaje }}
            </p>
          </div>

          <!-- Historial -->
          <div class="flex items-center justify-between mb-2">
            <h4 class="text-sm font-semibold text-gray-700">Últimas corridas</h4>
            <button (click)="recargar()" [disabled]="cargando()"
                    class="text-xs text-[#16589e] hover:underline disabled:text-gray-400">
              {{ cargando() ? 'Actualizando…' : 'Actualizar' }}
            </button>
          </div>

          <div class="border border-gray-200 rounded-lg overflow-hidden">
            <div class="overflow-x-auto max-h-[24rem] overflow-y-auto">
              <table class="w-full text-sm">
                <thead class="bg-[#16589e] text-white sticky top-0">
                  <tr>
                    <th class="text-left  px-3 py-2 font-semibold">Inicio</th>
                    <th class="text-left  px-3 py-2 font-semibold">Empresa</th>
                    <th class="text-right px-3 py-2 font-semibold">Altas</th>
                    <th class="text-right px-3 py-2 font-semibold">Actual.</th>
                    <th class="text-right px-3 py-2 font-semibold">Ceses</th>
                    <th class="text-right px-3 py-2 font-semibold">Reactiv.</th>
                    <th class="text-right px-3 py-2 font-semibold">Ignorados</th>
                    <th class="text-right px-3 py-2 font-semibold">Errores</th>
                    <th class="text-left  px-3 py-2 font-semibold">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let c of corridas()" class="border-b border-gray-100 hover:bg-gray-50">
                    <td class="px-3 py-2 whitespace-nowrap">{{ c.inicio | date:'dd/MM/yyyy HH:mm' }}</td>
                    <td class="px-3 py-2">{{ c.cod_empresa }}</td>
                    <td class="px-3 py-2 text-right">{{ c.altas }}</td>
                    <td class="px-3 py-2 text-right">{{ c.actualizaciones }}</td>
                    <td class="px-3 py-2 text-right" [class.font-bold]="c.ceses > 0"
                        [class.text-amber-700]="c.ceses > 0">{{ c.ceses }}</td>
                    <td class="px-3 py-2 text-right">{{ c.reactivaciones }}</td>
                    <td class="px-3 py-2 text-right text-gray-500">{{ c.ignorados }}</td>
                    <td class="px-3 py-2 text-right" [class.font-bold]="c.errores > 0"
                        [class.text-red-700]="c.errores > 0">{{ c.errores }}</td>
                    <td class="px-3 py-2">
                      <span class="px-2 py-0.5 rounded-full text-xs font-semibold"
                            [ngClass]="{
                              'bg-emerald-100 text-emerald-700': c.estado === 'ok' && !c.dry_run,
                              'bg-blue-100 text-blue-700': c.estado === 'ok' && c.dry_run,
                              'bg-amber-100 text-amber-800': c.estado === 'abortado',
                              'bg-red-100 text-red-700': c.estado === 'error'
                            }">
                        {{ c.dry_run && c.estado === 'ok' ? 'previsualización' : c.estado }}
                      </span>
                    </td>
                  </tr>
                  <tr *ngIf="!cargando() && corridas().length === 0">
                    <td colspan="9" class="px-3 py-6 text-center text-gray-400">
                      Todavía no se ha ejecutado ninguna sincronización.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <p class="text-xs text-gray-400 mt-3">
            «Ignorados» son trabajadores cuyo tipo de planilla no está registrado como
            departamento y por tanto quedan fuera de la sincronización.
          </p>
        </div>
      </div>
    </div>
  `,
})
export class SyncIndicatorComponent implements OnInit, OnDestroy {
  estado = signal<SyncEstado | null>(null);
  corridas = signal<SyncCorrida[]>([]);
  abierto = signal(false);
  cargando = signal(false);

  private temporizador?: ReturnType<typeof setInterval>;

  color = computed<'verde' | 'ambar' | 'rojo' | 'gris'>(() => {
    const e = this.estado();
    if (!e) return 'gris';
    if (e.semaforo === 'verde' || e.semaforo === 'ambar' || e.semaforo === 'rojo') {
      return e.semaforo;
    }
    return 'gris';
  });

  etiqueta = computed(() => {
    switch (this.color()) {
      case 'verde': return 'Ok';
      case 'ambar': return 'Atrasada';
      case 'rojo':  return 'Con problemas';
      default:      return 'Sin datos';
    }
  });

  titulo = computed(() => {
    const e = this.estado();
    if (!e) return 'Consultando el estado de la sincronización…';
    if (!e.ultima) return e.mensaje || 'Nunca se ha ejecutado una sincronización.';

    const min = e.minutos_desde_ultima ?? 0;
    const cuando = min < 1 ? 'hace menos de un minuto'
                 : min < 60 ? `hace ${Math.round(min)} min`
                 : `hace ${Math.round(min / 60)} h`;

    if (this.color() === 'verde') return `Sincronización al día — última ${cuando}.`;
    if (this.color() === 'ambar') return `Sin corridas recientes: la última fue ${cuando}.`;
    return `La última corrida (${cuando}) terminó en «${e.ultima.estado}».`;
  });

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.cargarEstado();
    // El sync corre cada 15 min; refrescar el chip cada 2 min basta para que
    // el semáforo no se quede obsoleto sin cargar la API sin necesidad.
    this.temporizador = setInterval(() => this.cargarEstado(), 120_000);
  }

  ngOnDestroy(): void {
    if (this.temporizador) clearInterval(this.temporizador);
  }

  private cargarEstado(): void {
    this.api.getSyncEstado().subscribe({
      next: (e) => this.estado.set(e),
      error: () => this.estado.set(null),
    });
  }

  abrir(): void {
    this.abierto.set(true);
    this.recargar();
  }

  cerrar(): void {
    this.abierto.set(false);
  }

  recargar(): void {
    this.cargando.set(true);
    this.cargarEstado();
    this.api.getSyncCorridas(20).subscribe({
      next: (c) => { this.corridas.set(c); this.cargando.set(false); },
      error: () => { this.corridas.set([]); this.cargando.set(false); },
    });
  }
}
