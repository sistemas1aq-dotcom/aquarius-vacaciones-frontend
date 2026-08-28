import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { DashboardResponse, DashboardAlert, EmailDraft, EstadoEnvio } from '../../models/interfaces';
import { ROLE_LABELS, UserRole } from '../../models/auth';

/**
 * Un indicador del tablero: la tarjeta de arriba y la lista de abajo son
 * lo mismo visto de dos maneras, así que se declaran juntos. Añadir un
 * indicador nuevo es añadir una entrada a la lista, no tocar la plantilla.
 */
interface Tarjeta {
  clave: string;
  etiqueta: string;      // lo que se lee en la tarjeta
  titulo: string;        // encabezado del panel
  ayuda: string;         // qué es exactamente este número
  campo: keyof DashboardResponse | 'peak';  // de dónde sale la lista
  /** Qué número enseña la tarjeta: el largo de la lista o una suma. */
  suma?: 'pendientes' | 'truncos';
  /** Cómo se pinta cada fila. */
  forma: 'saldo' | 'vacacion' | 'correo';
  /** Qué cifra se destaca a la derecha, en las de forma «saldo». */
  cifra?: 'TotalPending' | 'PendingTruncated';
  accion?: 'convocar' | 'extender' | 'enviar';
  /**
   * Muestra el correo pegado al botón. Va a la derecha y no en la línea
   * gris del nombre porque es el dato sobre el que se actúa — y porque en
   * una línea con departamento y cargo, lo primero que se corta por la
   * derecha sería justo el correo.
   */
  correo?: boolean;
  fondo: string; borde: string; bordeIzq: string;
  texto: string; textoSuave: string;
}


@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Header de bienvenida -->
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-800">Bienvenido, {{ firstName() }}</h1>
      <p class="text-sm text-gray-500 mt-1">
        {{ roleLabel() }} | {{ today | date:'dd/MM/yyyy HH:mm' }}
      </p>
    </div>

    <div class="space-y-6" *ngIf="data">
      <!-- ============ Indicadores ============
           TODAS las tarjetas son un selector y comparten UN SOLO panel abajo.

           La alternativa era ventana emergente para la fila de arriba y panel
           para la de abajo, y eso son dos comportamientos para el mismo gesto
           en la misma pantalla. Además una ventana emergente tapa los números
           justo cuando estás comparando la lista contra ellos, y con trece
           tarjetas serían trece ventanas que mantener.

           Antes «Alertas Críticas» y «Críticas (+60d)» eran el mismo número
           repetido a diez centímetros. Ahora hay una sola tarjeta por
           indicador. -->
      <section class="bg-white rounded-2xl shadow-sm p-5">
        <!-- Siete por fila. Se quitaron los encabezados de grupo: con siete
             columnas, grupos de cinco y tres dejaban huecos a la derecha y la
             rejilla se leía rota. El orden mantiene juntos los que se
             parecen. -->
        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <button *ngFor="let c of tarjetas" type="button"
            (click)="elegir(c)"
            [title]="c.ayuda"
            class="rounded-xl p-4 text-left border-2 transition hover:brightness-95"
            [ngClass]="[c.fondo, tab() === c.clave ? c.borde : 'border-transparent']">
            <div class="text-2xl font-extrabold" [ngClass]="c.texto">{{ valor(c) }}</div>
            <div class="text-[11px] font-medium mt-0.5 leading-tight" [ngClass]="c.textoSuave">{{ c.etiqueta }}</div>
          </button>
        </div>
      </section>

      <!-- ============ Panel del indicador elegido ============
           Un solo panel, con el borde del color de su tarjeta. El estado vacío
           es el mismo para todos: antes unas categorías desaparecían al
           quedarse sin filas y otras mostraban un texto distinto, así que un
           cero significaba cosas diferentes según dónde mirases. -->
      <section class="bg-white rounded-2xl shadow-sm p-6 border-l-4" [ngClass]="tarjetaActual().bordeIzq">

        <div class="flex items-center justify-between mb-1 flex-wrap gap-2">
          <h3 class="text-base font-bold text-gray-800">{{ tarjetaActual().titulo }}</h3>
          <div class="flex items-center gap-3">
            <span class="text-xs text-gray-500">{{ listaPanel().length }} registros</span>

            <!-- El envío masivo del dashboard es la MISMA corrida que la de
                 Recordatorios, así que obedece a los mismos dos interruptores.
                 Antes el botón parecía pulsable siempre y el motivo llegaba en
                 un aviso, después de pulsar. -->
            <button *ngIf="tab() === 'pending30'" (click)="sendReminders()"
                    class="px-4 py-2 text-xs font-semibold rounded-lg text-white transition
                           disabled:opacity-50 disabled:cursor-not-allowed"
                    [class.bg-amber-500]="puedeEnviarLote()"
                    [class.hover:bg-amber-600]="puedeEnviarLote()"
                    [class.bg-gray-400]="!puedeEnviarLote()"
                    [title]="motivoLoteBloqueado() || 'Envía a todos los que tocan hoy'"
                    [disabled]="enviando || !puedeEnviarLote()">
              {{ enviando ? 'Enviando...' : '📧 Enviar Recordatorios' }}
            </button>
          </div>
        </div>
        <p class="text-xs text-gray-400 mb-4">{{ tarjetaActual().ayuda }}</p>

        <!-- Estado vacío, igual para todas las categorías -->
        <div *ngIf="listaPanel().length === 0" class="py-12 text-center">
          <div class="text-3xl text-gray-300">✓</div>
          <div class="text-sm text-gray-400 mt-2">Sin registros en esta categoría</div>
        </div>

        <!-- La lista COMPLETA, con scroll propio. Antes los críticos se
             cortaban en 10 con un slice y nada lo advertía: la tarjeta podía
             decir 12 y abajo había 10. -->
        <div *ngIf="listaPanel().length > 0" class="max-h-96 overflow-y-auto divide-y divide-gray-100 pr-1">
          <div *ngFor="let alert of listaPanel()" class="flex justify-between items-center py-2.5 gap-3">

            <!-- Izquierda: quién. Igual en todas las listas. -->
            <div class="min-w-0">
              <div class="font-semibold text-sm text-gray-800 truncate">{{ alert.EmployeeName }}</div>
              <div class="text-xs text-gray-400 truncate">
                {{ alert.Department }}<span *ngIf="alert.Position"> · {{ alert.Position }}</span>
                <ng-container *ngIf="tarjetaActual().forma === 'vacacion'">
                  · {{ alert.StartDate | date:'dd MMM' }} → {{ alert.EndDate | date:'dd MMM' }}
                  ({{ alert.Days | number:'1.0-0' }}d)
                </ng-container>
                <ng-container *ngIf="tarjetaActual().forma === 'correo'">
                  · {{ alert.Email || 'sin correo' }}
                  <span *ngIf="alert.StartDate"> · {{ alert.StartDate | date:'dd/MM/yyyy' }}</span>
                </ng-container>
              </div>
              <div *ngIf="tarjetaActual().forma === 'correo' && alert.ErrorMessage"
                   class="text-xs text-red-600 truncate" [title]="alert.ErrorMessage">
                {{ alert.ErrorMessage }}
              </div>
            </div>

            <!-- Derecha: la cifra que da sentido a esta lista, y la acción. -->
            <div class="flex items-center gap-3 flex-shrink-0">
              <!-- El correo, pegado a la acción: «esta dirección, ese botón».
                   Cuando falta, en rojo, que es cuando importa. -->
              <span *ngIf="tarjetaActual().correo" class="text-xs hidden md:inline max-w-[220px] truncate"
                    [class.text-gray-500]="alert.Email"
                    [class.text-red-600]="!alert.Email"
                    [class.font-semibold]="!alert.Email"
                    [title]="alert.Email || 'Sin correo registrado: a esta persona no se le puede avisar'">
                {{ alert.Email || 'sin correo' }}
              </span>

              <span *ngIf="tarjetaActual().forma === 'saldo'" class="text-sm font-bold"
                    [ngClass]="tarjetaActual().texto">
                {{ cifra(alert) | number:'1.0-0' }}d
              </span>

              <button *ngIf="tarjetaActual().accion === 'convocar'" (click)="openConvocar(alert)"
                      class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700">
                Convocar
              </button>

              <button *ngIf="tarjetaActual().accion === 'extender'" (click)="openExtender(alert)"
                      class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">
                Extender
              </button>

              <!-- Envío a UNA persona: no pasa por la corrida masiva, así que no
                   depende del interruptor de lote ni de la ventana de 15 días.
                   Dos pasos a propósito — es un correo a alguien real. -->
              <ng-container *ngIf="tarjetaActual().accion === 'enviar'">
                <ng-container *ngIf="resultadoFila(alert.EmployeeId) as res; else botonFila">
                  <span class="px-2 py-1 rounded-full text-xs font-semibold"
                        [class.bg-emerald-100]="res.ok" [class.text-emerald-700]="res.ok"
                        [class.bg-red-100]="!res.ok" [class.text-red-700]="!res.ok"
                        [title]="res.msg">
                    {{ res.ok ? '✓ Enviado' : '✗ Error' }}
                  </span>
                  <button (click)="limpiarResultadoFila(alert.EmployeeId)"
                          class="text-gray-400 hover:text-gray-600" title="Volver a intentar">↻</button>
                </ng-container>

                <ng-template #botonFila>
                  <span *ngIf="enviandoA() === alert.EmployeeId" class="text-xs text-gray-500">enviando…</span>
                  <ng-container *ngIf="enviandoA() !== alert.EmployeeId">
                    <button *ngIf="confirmandoA() !== alert.EmployeeId"
                            (click)="confirmandoA.set(alert.EmployeeId)"
                            [disabled]="!envio()?.activo || !alert.Email"
                            [title]="tituloBotonFila(alert)"
                            class="px-2.5 py-1 rounded-md text-xs font-semibold border transition
                                   border-amber-300 text-amber-700 hover:bg-amber-100
                                   disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent">
                      Enviar
                    </button>
                    <span *ngIf="confirmandoA() === alert.EmployeeId" class="inline-flex items-center gap-1">
                      <button (click)="enviarIndividual(alert)"
                              class="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-500 text-white hover:bg-amber-600">
                        Confirmar
                      </button>
                      <button (click)="confirmandoA.set(null)"
                              class="px-2 py-1 rounded-md text-xs text-gray-500 hover:text-gray-700">
                        Cancelar
                      </button>
                    </span>
                  </ng-container>
                </ng-template>
              </ng-container>
            </div>
          </div>
        </div>

        <div *ngIf="resultadoEnvio" class="mt-4 rounded-lg p-3 text-sm border"
             [class.bg-emerald-50]="!resultadoEnvioError" [class.border-emerald-200]="!resultadoEnvioError" [class.text-emerald-700]="!resultadoEnvioError"
             [class.bg-red-50]="resultadoEnvioError" [class.border-red-200]="resultadoEnvioError" [class.text-red-700]="resultadoEnvioError">
          {{ resultadoEnvio }}
        </div>
      </section>
    </div>

    <div *ngIf="loading" class="flex items-center justify-center py-20">
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
    </div>

    <!-- ============ Modal: Convocar a RRHH ============ -->
    <div *ngIf="showConvocar()" class="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
         (click)="closeConvocar()">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg" (click)="$event.stopPropagation()">
        <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 class="text-lg font-bold text-gray-800">Convocar a Reunión RRHH</h2>
            <p class="text-xs text-gray-500 mt-0.5">{{ convocarTarget()?.EmployeeName }}</p>
          </div>
          <button (click)="closeConvocar()" class="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div class="p-6 space-y-3">
          <div>
            <label class="text-xs font-semibold text-gray-600 uppercase">Para</label>
            <input [(ngModel)]="convocarEmail.To" type="email"
                   class="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none" />
          </div>
          <div>
            <label class="text-xs font-semibold text-gray-600 uppercase">Asunto</label>
            <input [(ngModel)]="convocarEmail.Subject"
                   class="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none" />
          </div>
          <div>
            <label class="text-xs font-semibold text-gray-600 uppercase">Mensaje</label>
            <textarea [(ngModel)]="convocarEmail.Body" rows="9"
                      class="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none font-mono text-sm"></textarea>
          </div>
          <div *ngIf="formError()" class="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{{ formError() }}</div>
          <div *ngIf="formOk()"    class="bg-emerald-50 text-emerald-700 text-sm px-3 py-2 rounded-lg">{{ formOk() }}</div>
        </div>
        <div class="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button (click)="closeConvocar()" class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm">Cancelar</button>
          <!-- La convocatoria también es un correo: si el interruptor general
               está apagado, el botón lo dice antes de pulsarlo. -->
          <button (click)="enviarConvocar()" [disabled]="sending() || !envio()?.activo"
                  [title]="envio()?.activo ? '' : 'El envío de correos está INACTIVO (interruptor general)'"
                  class="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-lg font-semibold text-sm">
            {{ sending() ? 'Enviando...' : 'Enviar convocatoria' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ============ Modal: Extender vacación ============ -->
    <div *ngIf="showExtender()" class="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
         (click)="closeExtender()">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md" (click)="$event.stopPropagation()">
        <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 class="text-lg font-bold text-gray-800">Extender Vacación</h2>
            <p class="text-xs text-gray-500 mt-0.5">{{ extenderTarget()?.EmployeeName }}</p>
          </div>
          <button (click)="closeExtender()" class="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div class="p-6 space-y-4">
          <div class="bg-gray-50 rounded-lg p-3 text-xs flex flex-wrap gap-3">
            <span class="text-gray-500">Inicio: <b class="text-gray-800">{{ extenderTarget()?.StartDate | date:'dd/MM/yyyy' }}</b></span>
            <span class="text-gray-500">Fin actual: <b class="text-gray-800">{{ extenderTarget()?.EndDate | date:'dd/MM/yyyy' }}</b></span>
            <span class="text-gray-500">Días actuales: <b class="text-gray-800">{{ extenderTarget()?.Days | number:'1.0-0' }}</b></span>
          </div>
          <div>
            <label class="text-xs font-semibold text-gray-600 uppercase">Días adicionales</label>
            <input [(ngModel)]="extenderForm.ExtraDays" type="number" min="1" max="60"
                   class="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
          </div>
          <div>
            <label class="text-xs font-semibold text-gray-600 uppercase">Notas (opcional)</label>
            <textarea [(ngModel)]="extenderForm.Notes" rows="2"
                      class="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"></textarea>
          </div>
          <div *ngIf="formError()" class="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{{ formError() }}</div>
          <div *ngIf="formOk()"    class="bg-emerald-50 text-emerald-700 text-sm px-3 py-2 rounded-lg">{{ formOk() }}</div>
        </div>
        <div class="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button (click)="closeExtender()" class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm">Cancelar</button>
          <button (click)="confirmarExtender()" [disabled]="sending() || !extenderForm.ExtraDays || extenderForm.ExtraDays <= 0"
                  class="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded-lg font-semibold text-sm">
            {{ sending() ? 'Procesando...' : 'Extender' }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  data: DashboardResponse | null = null;
  loading = true;
  today = new Date();

  // ─── Indicadores ─────────────────────────────────────────────────
  // Cada tarjeta declara su lista, su forma de fila y su acción. La
  // plantilla no sabe de categorías: recorre esto.
  // Cada tarjeta declara su lista, su forma de fila y su acción. La
  // plantilla no sabe de categorías: recorre esto. Añadir un indicador
  // es añadir una entrada aquí.
  tarjetas: Tarjeta[] = [
    { clave: 'empleados', etiqueta: 'Empleados activos', titulo: '👥 Empleados activos',
      ayuda: 'Todos los que están de alta hoy, ordenados por nombre, con su saldo.',
      campo: 'Employees', forma: 'saldo', cifra: 'TotalPending',
      fondo: 'bg-blue-50', borde: 'border-blue-500', bordeIzq: 'border-blue-500',
      texto: 'text-blue-700', textoSuave: 'text-blue-700/70' },

    { clave: 'enVacaciones', etiqueta: 'En vacaciones hoy', titulo: '🏖️ De vacaciones hoy',
      ayuda: 'Quienes están fuera en este momento.',
      campo: 'InProgress', forma: 'vacacion',
      fondo: 'bg-emerald-50', borde: 'border-emerald-500', bordeIzq: 'border-emerald-500',
      texto: 'text-emerald-700', textoSuave: 'text-emerald-700/70' },

    { clave: 'pendientes', etiqueta: 'Días pendientes', titulo: '📅 Días pendientes de programar',
      ayuda: 'Suma de los saldos generados por años cumplidos. No incluye truncos.',
      campo: 'AllPending', suma: 'pendientes', forma: 'saldo', cifra: 'TotalPending',
      fondo: 'bg-cyan-50', borde: 'border-cyan-500', bordeIzq: 'border-cyan-500',
      texto: 'text-cyan-700', textoSuave: 'text-cyan-700/70' },

    { clave: 'truncos', etiqueta: 'Días truncos', titulo: '🧾 Días truncos acumulados',
      ayuda: 'Derecho en formación del período en curso. No se programan, pero se pagan al cesar: es dinero que se debe.',
      campo: 'Truncated', suma: 'truncos', forma: 'saldo', cifra: 'PendingTruncated',
      fondo: 'bg-violet-50', borde: 'border-violet-500', bordeIzq: 'border-violet-500',
      texto: 'text-violet-700', textoSuave: 'text-violet-700/70' },

    { clave: 'adelantos', etiqueta: 'Adelantos', titulo: '↩️ Vacaciones adelantadas',
      ayuda: 'Saldo negativo: gozaron más días de los generados. Es legítimo, pero conviene tenerlo a la vista.',
      campo: 'Advanced', forma: 'saldo', cifra: 'TotalPending',
      fondo: 'bg-slate-100', borde: 'border-slate-500', bordeIzq: 'border-slate-500',
      texto: 'text-slate-700', textoSuave: 'text-slate-700/70' },
    { clave: 'critical', etiqueta: 'Críticas (+60d)', titulo: '⚠️ Vacaciones excesivas (+60 días)',
      ayuda: 'Más de 60 días pendientes: dos períodos completos sin gozar.',
      campo: 'Critical', forma: 'saldo', cifra: 'TotalPending', correo: true, accion: 'convocar',
      fondo: 'bg-red-50', borde: 'border-red-500', bordeIzq: 'border-red-500',
      texto: 'text-red-700', textoSuave: 'text-red-700/80' },

    { clave: 'pending30', etiqueta: '+30d pendientes', titulo: '📧 +30 días pendientes',
      ayuda: 'Más de 30 días pendientes, tengan o no vacaciones programadas. Son los candidatos del recordatorio.',
      campo: 'Pending30', forma: 'saldo', cifra: 'TotalPending', correo: true, accion: 'enviar',
      fondo: 'bg-amber-50', borde: 'border-amber-500', bordeIzq: 'border-amber-500',
      texto: 'text-amber-700', textoSuave: 'text-amber-700/80' },

    { clave: 'sinProgramar', etiqueta: 'Sin programar (+15d)', titulo: '📋 Sin programar (+15 días)',
      ayuda: 'Más de 15 días pendientes y NINGUNA vacación futura aprobada. Distinto de «+30d»: aquí manda el no tener plan, no el tamaño del saldo.',
      campo: 'NoProgrammed', forma: 'saldo', cifra: 'TotalPending', correo: true, accion: 'convocar',
      fondo: 'bg-orange-50', borde: 'border-orange-500', bordeIzq: 'border-orange-500',
      texto: 'text-orange-700', textoSuave: 'text-orange-700/80' },

    { clave: 'sinCorreo', etiqueta: 'Sin correo', titulo: '✉️ Sin correo registrado',
      ayuda: 'A esta gente no se le puede avisar por ninguna vía, ni automática ni manual, hasta que alguien complete el dato.',
      campo: 'NoEmail', forma: 'correo',
      fondo: 'bg-rose-50', borde: 'border-rose-500', bordeIzq: 'border-rose-500',
      texto: 'text-rose-700', textoSuave: 'text-rose-700/80' },

    { clave: 'correosFallidos', etiqueta: 'Correos fallidos (30d)', titulo: '📮 Correos fallidos — últimos 30 días',
      ayuda: 'Envíos que no llegaron, con su motivo. Si el relay se cae o un buzón deja de existir, se ve aquí.',
      campo: 'FailedEmails', forma: 'correo',
      fondo: 'bg-pink-50', borde: 'border-pink-500', bordeIzq: 'border-pink-500',
      texto: 'text-pink-700', textoSuave: 'text-pink-700/80' },
    { clave: 'out', etiqueta: 'Salen próx. semana', titulo: '🚀 Salen la próxima semana',
      ayuda: 'Vacaciones aprobadas que empiezan en los próximos siete días.',
      campo: 'NextWeekOut', forma: 'vacacion',
      fondo: 'bg-teal-50', borde: 'border-teal-500', bordeIzq: 'border-teal-500',
      texto: 'text-teal-700', textoSuave: 'text-teal-700/80' },

    { clave: 'return', etiqueta: 'Regresan próx. semana', titulo: '🔙 Regresan la próxima semana',
      ayuda: 'Vuelven al trabajo en los próximos siete días.',
      campo: 'NextWeekReturn', forma: 'vacacion', accion: 'extender',
      fondo: 'bg-indigo-50', borde: 'border-indigo-500', bordeIzq: 'border-indigo-500',
      texto: 'text-indigo-700', textoSuave: 'text-indigo-700/80' },

    { clave: 'peak', etiqueta: 'Pico próximo mes', titulo: '📈 Pico de ausencias del próximo mes',
      ayuda: 'El día del mes que viene con más gente fuera a la vez. Es la pregunta de planificación que ninguna otra pantalla responde.',
      campo: 'peak', forma: 'vacacion',
      fondo: 'bg-fuchsia-50', borde: 'border-fuchsia-500', bordeIzq: 'border-fuchsia-500',
      texto: 'text-fuchsia-700', textoSuave: 'text-fuchsia-700/80' },


  ];
  tab = signal<string>('critical');

  elegir(c: Tarjeta) { this.tab.set(c.clave); }

  tarjetaActual(): Tarjeta {
    return this.tarjetas.find(c => c.clave === this.tab()) ?? this.tarjetas[0];
  }

  /** La lista que hay detrás de una tarjeta. */
  private lista(c: Tarjeta): DashboardAlert[] {
    const d = this.data;
    if (!d) return [];
    if (c.campo === 'peak') return d.Peak?.Items ?? [];
    const v = d[c.campo as keyof DashboardResponse];
    return Array.isArray(v) ? (v as DashboardAlert[]) : [];
  }

  listaPanel(): DashboardAlert[] { return this.lista(this.tarjetaActual()); }

  /** El número de la tarjeta: una suma, o cuántos hay en la lista. */
  valor(c: Tarjeta): string {
    const d = this.data;
    if (!d) return '—';
    if (c.clave === 'empleados') return String(d.Stats.TotalEmployees);
    if (c.suma === 'pendientes') return this.miles(d.Stats.TotalPendingDays);
    if (c.suma === 'truncos')    return this.miles(d.Stats.TruncatedDays ?? 0);
    return String(this.lista(c).length);
  }

  private miles(v: number | string): string {
    return Math.round(Number(v) || 0).toLocaleString('es-PE');
  }

  /** La cifra que se destaca a la derecha de cada fila. */
  cifra(alert: DashboardAlert): number {
    const c = this.tarjetaActual();
    return (c.cifra === 'PendingTruncated' ? alert.PendingTruncated : alert.TotalPending) ?? 0;
  }

  // ─── Envío de recordatorios ──────────────────────────────────────
  // Este botón dispara la MISMA corrida que la vista de Recordatorios, así
  // que depende de los mismos dos interruptores.
  envio = signal<EstadoEnvio | null>(null);
  enviando = false;
  resultadoEnvio = '';
  resultadoEnvioError = false;

  puedeEnviarLote = computed(() => {
    const e = this.envio();
    return !!e && e.activo && e.masivo_activo;
  });

  // ─── Envío por trabajador (pestaña +30 días) ─────────────────────
  confirmandoA = signal<number | null>(null);
  enviandoA = signal<number | null>(null);
  private resultadosFila = signal<Record<number, { ok: boolean; msg: string }>>({});

  resultadoFila(employeeId: number): { ok: boolean; msg: string } | null {
    return this.resultadosFila()[employeeId] ?? null;
  }

  limpiarResultadoFila(employeeId: number) {
    const copia = { ...this.resultadosFila() };
    delete copia[employeeId];
    this.resultadosFila.set(copia);
  }

  tituloBotonFila(alert: DashboardAlert): string {
    if (!this.envio()?.activo) return 'El envío de correos está INACTIVO (interruptor general)';
    if (!alert.Email) return 'El empleado no tiene correo registrado';
    return `Enviar el recordatorio a ${alert.Email}`;
  }

  enviarIndividual(alert: DashboardAlert) {
    this.confirmandoA.set(null);
    this.enviandoA.set(alert.EmployeeId);
    this.api.enviarRecordatorioIndividual(alert.EmployeeId).subscribe({
      next: (res) => {
        this.enviandoA.set(null);
        this.resultadosFila.set({
          ...this.resultadosFila(),
          [alert.EmployeeId]: { ok: !!res.ok, msg: res.mensaje || res.error || '' },
        });
      },
      error: (err) => {
        this.enviandoA.set(null);
        this.resultadosFila.set({
          ...this.resultadosFila(),
          [alert.EmployeeId]: { ok: false, msg: err?.error?.detail || 'Error de conexión con el servidor' },
        });
      },
    });
  }

  motivoLoteBloqueado(): string {
    const e = this.envio();
    if (!e) return 'Cargando el estado del envío…';
    if (!e.activo) return 'El envío de correos está INACTIVO (interruptor general)';
    if (!e.masivo_activo) return 'Los envíos en lote están INACTIVOS — actívalos en Recordatorios';
    return '';
  }

  // Modales
  showConvocar = signal(false);
  showExtender = signal(false);
  convocarTarget = signal<DashboardAlert | null>(null);
  extenderTarget = signal<DashboardAlert | null>(null);
  sending = signal(false);
  formError = signal<string | null>(null);
  formOk = signal<string | null>(null);

  convocarEmail: EmailDraft = { To: '', Subject: '', Body: '', SendNow: true };
  extenderForm: { ExtraDays: number; Notes: string } = { ExtraDays: 1, Notes: '' };

  firstName(): string {
    const name = this.auth.currentUser()?.FullName || '';
    return name.split(' ')[0] || 'Usuario';
  }
  roleLabel(): string {
    const r = this.auth.currentUser()?.Role as UserRole | undefined;
    return r ? ROLE_LABELS[r] : '';
  }

  ngOnInit() {
    this.loadDashboard();
    this.loadEstadoEnvio();
  }

  /** Estado de los interruptores, para saber si el botón masivo va habilitado. */
  loadEstadoEnvio() {
    this.api.getEstadoEnvio().subscribe({
      next: (estado) => this.envio.set(estado),
      error: () => this.envio.set(null),
    });
  }

  loadDashboard() {
    this.loading = true;
    this.api.getDashboard().subscribe({
      next: (data) => { this.data = data; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  sendReminders() {
    this.enviando = true;
    this.resultadoEnvio = '';
    this.api.sendDailyReminders().subscribe({
      next: (res) => {
        // El backend devuelve `mensaje`; antes se leía `message`, que no
        // existe, y el aviso salía vacío. Y va a la pantalla, no a un
        // alert(): el resumen de una corrida se lee, no se descarta.
        this.resultadoEnvio = res.mensaje || 'Corrida terminada.';
        this.resultadoEnvioError = !!(res.detalle?.error_conexion || res.detalle?.bloqueado_por);
        this.enviando = false;
        this.loadDashboard();
      },
      error: () => {
        this.resultadoEnvio = 'Error al enviar recordatorios';
        this.resultadoEnvioError = true;
        this.enviando = false;
      },
    });
  }

  // ─── Convocar ─────────────────────────────────────────────────
  openConvocar(alert: DashboardAlert) {
    this.convocarTarget.set(alert);
    this.formError.set(null);
    this.formOk.set(null);
    // El borrador lo redacta el BACKEND desde la plantilla editable. Antes se
    // componía aquí, así que existían dos redacciones de la misma carta -- una
    // en Angular y otra en Python, sin usar -- y editar la plantilla no habría
    // cambiado la que de verdad salía.
    this.convocarEmail = { To: alert.Email || '', Subject: '', Body: 'Cargando…', SendNow: true };
    this.showConvocar.set(true);
    this.api.getBorradorConvocatoria(alert.EmployeeId).subscribe({
      next: (b) => {
        this.convocarEmail = {
          To: b.To || alert.Email || '',
          Subject: b.Subject,
          Body: b.Body,
          EmployeeId: b.EmployeeId,
          ReminderType: b.ReminderType,
          SendNow: true,
        };
      },
      error: (err) => {
        this.convocarEmail.Body = '';
        this.formError.set(err?.error?.detail || 'No se pudo preparar la convocatoria.');
      },
    });
  }
  closeConvocar() {
    this.showConvocar.set(false);
    this.convocarTarget.set(null);
    this.formError.set(null);
    this.formOk.set(null);
  }
  enviarConvocar() {
    if (!this.convocarEmail.To) {
      this.formError.set('El email destinatario es obligatorio');
      return;
    }
    this.sending.set(true);
    this.formError.set(null);
    this.api.sendEmail(this.convocarEmail).subscribe({
      next: (res) => {
        this.sending.set(false);
        if (res.success === false) {
          this.formError.set(res.message || 'No se pudo enviar el correo (¿SMTP configurado?)');
        } else {
          this.formOk.set('Convocatoria enviada correctamente');
          setTimeout(() => this.closeConvocar(), 1500);
        }
      },
      error: (err) => {
        this.sending.set(false);
        this.formError.set(err?.error?.detail || 'Error al enviar el correo');
      },
    });
  }

  // ─── Extender ─────────────────────────────────────────────────
  openExtender(alert: DashboardAlert) {
    if (!alert.VacationId) {
      alert?.VacationId === undefined && console.warn('Alert sin VacationId');
      return;
    }
    this.extenderTarget.set(alert);
    this.extenderForm = { ExtraDays: 1, Notes: '' };
    this.formError.set(null);
    this.formOk.set(null);
    this.showExtender.set(true);
  }
  closeExtender() {
    this.showExtender.set(false);
    this.extenderTarget.set(null);
    this.formError.set(null);
    this.formOk.set(null);
  }
  confirmarExtender() {
    const t = this.extenderTarget();
    if (!t || !t.VacationId) return;
    if (this.extenderForm.ExtraDays <= 0) {
      this.formError.set('Debe ser un número positivo');
      return;
    }
    this.sending.set(true);
    this.api.extendVacation(t.VacationId, {
      ExtraDays: this.extenderForm.ExtraDays,
      Notes: this.extenderForm.Notes || undefined,
    }).subscribe({
      next: (res) => {
        this.sending.set(false);
        this.formOk.set(res.message || 'Vacación extendida');
        this.loadDashboard();   // refresca
        setTimeout(() => this.closeExtender(), 1500);
      },
      error: (err) => {
        this.sending.set(false);
        this.formError.set(err?.error?.detail || 'Error al extender');
      },
    });
  }
}
