import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { EstadoEnvio, TextosCorreo, BloqueCorreo } from '../../models/interfaces';

@Component({
  selector: 'app-configuraciones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- ════════════════════════════════════════════════════════════
         INTERRUPTORES DE ENVÍO

         Dos, con alcances distintos a propósito:

           GENERAL  — manda sobre CUALQUIER vía. En Inactivo no sale nada.
           EN LOTE  — solo los envíos que alcanzan a mucha gente de una vez:
                      la corrida programada diaria y el botón "Enviar a todos
                      los pendientes". No toca el envío por trabajador.

         La combinación útil para validar es General=Activo, Lote=Inactivo:
         correo permitido, pero solo a quien se señale uno a uno.

         Se guardan en base de datos, así que surten efecto al instante, sin
         reiniciar el servicio.
         ════════════════════════════════════════════════════════════ -->
    <div class="rounded-xl border shadow-sm p-5 mb-5 transition"
         [class.bg-white]="envio()?.activo"
         [class.border-gray-200]="envio()?.activo"
         [class.bg-red-50]="envio() && !envio()!.activo"
         [class.border-red-200]="envio() && !envio()!.activo">

      <div class="flex justify-between items-center flex-wrap gap-4">
        <div class="flex items-center gap-4">
          <button type="button" (click)="alternarEnvio()"
            [disabled]="!puedeCambiar() || cambiandoSwitch()"
            [title]="puedeCambiar() ? 'Activar o cancelar el envío de correos' : 'Solo un administrador puede cambiarlo'"
            class="relative inline-flex h-7 w-14 shrink-0 rounded-full border-2 border-transparent transition
                   focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-400
                   disabled:opacity-50 disabled:cursor-not-allowed"
            [class.bg-emerald-500]="envio()?.activo"
            [class.bg-gray-300]="!envio()?.activo">
            <span class="inline-block h-6 w-6 transform rounded-full bg-white shadow transition"
                  [class.translate-x-7]="envio()?.activo"
                  [class.translate-x-0]="!envio()?.activo"></span>
          </button>

          <div>
            <div class="flex items-center gap-2">
              <h4 class="text-base font-bold"
                  [class.text-emerald-700]="envio()?.activo"
                  [class.text-red-700]="envio() && !envio()!.activo">
                Envío de correos: {{ envio()?.activo ? 'ACTIVO' : 'INACTIVO' }}
              </h4>
              <span *ngIf="cambiandoSwitch()" class="text-xs text-gray-400">guardando…</span>
            </div>
            <p class="text-xs mt-1"
               [class.text-gray-500]="envio()?.activo"
               [class.text-red-600]="envio() && !envio()!.activo">
              {{ envio()?.activo
                  ? 'Se envían correos por cualquier vía: automática, masiva e individual.'
                  : 'Ningún correo sale del sistema, ni automático ni manual.' }}
            </p>
            <p *ngIf="envio()?.actualizado_por" class="text-xs text-gray-400 mt-0.5">
              Último cambio: {{ envio()!.actualizado_por }} · {{ envio()!.actualizado_en | date:'dd/MM/yyyy HH:mm' }}
            </p>
            <p *ngIf="!puedeCambiar()" class="text-xs text-gray-400 mt-0.5">
              Solo un administrador puede cambiar estos interruptores.
            </p>
          </div>
        </div>

        <div class="flex flex-col gap-1.5 text-xs">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full"
                  [class.bg-emerald-500]="envio()?.smtp_configurado"
                  [class.bg-gray-300]="!envio()?.smtp_configurado"></span>
            <span class="text-gray-600">
              Servidor de correo:
              <span class="font-semibold">{{ envio()?.smtp_configurado ? (envio()?.servidor || 'configurado') : 'sin configurar' }}</span>
            </span>
          </div>
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full"
                  [class.bg-emerald-500]="envio()?.scheduler_activo"
                  [class.bg-gray-300]="!envio()?.scheduler_activo"></span>
            <span class="text-gray-600">
              Corrida programada:
              <span class="font-semibold">{{ envio()?.scheduler_activo ? (envio()?.hora_corrida || '') + ' cada día' : 'programador apagado' }}</span>
            </span>
          </div>
        </div>
      </div>

      <!-- ── Segundo interruptor: envíos EN LOTE ──────────────────── -->
      <div class="mt-4 pt-4 border-t flex justify-between items-center flex-wrap gap-4"
           [class.border-gray-200]="envio()?.activo"
           [class.border-red-200]="envio() && !envio()!.activo">
        <div class="flex items-center gap-4">
          <button type="button" (click)="alternarMasivo()"
            [disabled]="!puedeCambiar() || cambiandoMasivo()"
            [title]="puedeCambiar() ? 'Permitir o cancelar los envíos en lote' : 'Solo un administrador puede cambiarlo'"
            class="relative inline-flex h-7 w-14 shrink-0 rounded-full border-2 border-transparent transition
                   focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-400
                   disabled:opacity-50 disabled:cursor-not-allowed"
            [class.bg-emerald-500]="envio()?.masivo_activo"
            [class.bg-gray-300]="!envio()?.masivo_activo">
            <span class="inline-block h-6 w-6 transform rounded-full bg-white shadow transition"
                  [class.translate-x-7]="envio()?.masivo_activo"
                  [class.translate-x-0]="!envio()?.masivo_activo"></span>
          </button>

          <div>
            <div class="flex items-center gap-2">
              <h4 class="text-sm font-bold"
                  [class.text-emerald-700]="envio()?.masivo_activo"
                  [class.text-gray-700]="!envio()?.masivo_activo">
                Envíos en lote: {{ envio()?.masivo_activo ? 'ACTIVO' : 'INACTIVO' }}
              </h4>
              <span *ngIf="cambiandoMasivo()" class="text-xs text-gray-400">guardando…</span>
            </div>
            <p class="text-xs text-gray-500 mt-1">
              {{ envio()?.masivo_activo
                  ? 'Corre el aviso diario programado y está habilitado el botón «Enviar a todos los pendientes».'
                  : 'Sin corrida programada ni envío masivo. Solo se envía uno a uno, con el botón de cada fila.' }}
            </p>
            <p *ngIf="envio()?.masivo_actualizado_por" class="text-xs text-gray-400 mt-0.5">
              Último cambio: {{ envio()!.masivo_actualizado_por }} · {{ envio()!.masivo_actualizado_en | date:'dd/MM/yyyy HH:mm' }}
            </p>
          </div>
        </div>

        <div *ngIf="envio()?.masivo_activo && !envio()?.activo"
             class="text-xs text-red-600 max-w-xs">
          En lote está en Activo, pero el interruptor general está apagado:
          no saldrá nada hasta que se encienda arriba.
        </div>
      </div>

      <div *ngIf="envio()?.activo && !envio()?.smtp_configurado"
           class="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-800">
        El interruptor está en <strong>Activo</strong>, pero no hay servidor de correo configurado
        (<code>SMTP_ENABLED</code> / <code>SMTP_HOST</code> en el <code>.env</code>). Los envíos se
        registrarán como fallidos hasta que se complete ese dato.
      </div>

      <div *ngIf="errorSwitch()" class="mt-3 bg-red-50 border border-red-200 rounded-lg p-2.5 text-xs text-red-700">
        {{ errorSwitch() }}
      </div>
    </div>

    <!-- ════════════════════════════════════════════════════════════
         TEXTOS DE LOS CORREOS

         El correo se muestra POR POSICIÓN, en el orden en que se lee. Los
         bloques fijos aparecen en gris con candado; los editables, en caja
         blanca. La estructura la envía el backend, así que lo que aquí se ve
         editable es exactamente lo que el backend deja editar.
         ════════════════════════════════════════════════════════════ -->
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div class="flex justify-between items-start flex-wrap gap-3 mb-4">
        <div>
          <h4 class="text-base font-bold text-gray-800">Textos de los correos</h4>
          <p class="text-xs text-gray-400 mt-1">
            Los párrafos con fondo blanco se editan. Los grises llevan datos calculados y no se tocan.
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button (click)="cargar()" [disabled]="guardando()"
                  class="px-3 py-2 text-xs font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
            Descartar cambios
          </button>
          <button (click)="guardar()"
                  [disabled]="!puedeCambiar() || guardando() || !haCambiado()"
                  [title]="puedeCambiar() ? '' : 'Solo un administrador puede cambiar los textos'"
                  class="px-5 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700
                         disabled:opacity-50 disabled:cursor-not-allowed">
            {{ guardando() ? 'Guardando…' : 'Guardar textos' }}
          </button>
        </div>
      </div>

      <!-- Selector de correo -->
      <div class="flex gap-2 mb-4 border-b border-gray-100">
        <button (click)="correo.set('recordatorio')"
                class="px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition"
                [class.border-blue-600]="correo() === 'recordatorio'"
                [class.text-blue-700]="correo() === 'recordatorio'"
                [class.border-transparent]="correo() !== 'recordatorio'"
                [class.text-gray-500]="correo() !== 'recordatorio'">
          Recordatorio
        </button>
        <button (click)="correo.set('convocatoria')"
                class="px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition"
                [class.border-blue-600]="correo() === 'convocatoria'"
                [class.text-blue-700]="correo() === 'convocatoria'"
                [class.border-transparent]="correo() !== 'convocatoria'"
                [class.text-gray-500]="correo() !== 'convocatoria'">
          Convocatoria
        </button>
      </div>

      <div *ngIf="!datos()" class="py-10 text-center text-gray-400 text-sm">Cargando…</div>

      <div *ngIf="datos() as d" class="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <!-- ── Columna izquierda: el correo por posición ──────────── -->
        <div>
          <div class="text-xs font-bold text-gray-500 uppercase mb-2">
            {{ correoActual(d).titulo }}
          </div>
          <p class="text-xs text-gray-400 mb-3">{{ correoActual(d).descripcion }}</p>

          <!-- Asunto -->
          <ng-container *ngIf="correoActual(d).asunto as asunto">
            <div class="mb-3">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-xs font-semibold text-gray-600 uppercase">{{ asunto.etiqueta }}</span>
                <span *ngIf="asunto.tipo === 'fijo'"
                      class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-500"
                      [title]="asunto.motivo || ''">🔒 FIJO</span>
                <span *ngIf="asunto.tipo === 'editable'"
                      class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-600">EDITABLE</span>
              </div>
              <div *ngIf="asunto.tipo === 'fijo'"
                   class="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-500 font-mono">
                {{ asunto.texto }}
              </div>
              <input *ngIf="asunto.tipo === 'editable' && asunto.clave"
                     [ngModel]="borrador()[asunto.clave!]"
                     (ngModelChange)="editar(asunto.clave!, $event)"
                     [disabled]="!puedeCambiar()"
                     class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm
                            focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-50" />
              <p *ngIf="asunto.tipo === 'fijo' && asunto.motivo" class="text-xs text-gray-400 mt-1">
                {{ asunto.motivo }}
              </p>
            </div>
          </ng-container>

          <!-- Cuerpo, bloque a bloque -->
          <div class="space-y-3">
            <div *ngFor="let b of correoActual(d).bloques">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-xs font-semibold text-gray-600 uppercase">{{ b.etiqueta }}</span>
                <span *ngIf="b.tipo === 'fijo'"
                      class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-500">🔒 FIJO</span>
                <span *ngIf="b.tipo === 'editable'"
                      class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-600">EDITABLE</span>
              </div>

              <div *ngIf="b.tipo === 'fijo'"
                   class="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-500
                          whitespace-pre-wrap font-mono">{{ b.texto }}</div>
              <p *ngIf="b.tipo === 'fijo' && b.motivo" class="text-xs text-gray-400 mt-1">{{ b.motivo }}</p>

              <ng-container *ngIf="b.tipo === 'editable' && b.clave">
                <textarea [ngModel]="borrador()[b.clave!]"
                          (ngModelChange)="editar(b.clave!, $event)"
                          [disabled]="!puedeCambiar()"
                          rows="4"
                          class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono
                                 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-50"></textarea>
                <p *ngIf="b.ayuda" class="text-xs text-gray-400 mt-1">{{ b.ayuda }}</p>
              </ng-container>
            </div>
          </div>

          <!-- Marcadores -->
          <div class="mt-4 bg-blue-50/50 border border-blue-100 rounded-lg p-3">
            <div class="text-xs font-semibold text-blue-800 mb-1.5">Marcadores disponibles</div>
            <div class="flex flex-wrap gap-1.5">
              <code *ngFor="let m of d.marcadores"
                    class="px-2 py-0.5 rounded bg-white border border-blue-200 text-xs text-blue-700">
                {{ '{' + m + '}' }}
              </code>
            </div>
            <p class="text-xs text-blue-700/70 mt-2">
              Uno mal escrito no rompe el envío: sale tal cual en el correo. Al guardar se avisa.
            </p>
          </div>

          <!-- Avisos del guardado -->
          <div *ngIf="avisos().length > 0"
               class="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
            <div class="font-semibold mb-1">Revisa esto:</div>
            <ul class="list-disc list-inside space-y-0.5">
              <li *ngFor="let a of avisos()">{{ a }}</li>
            </ul>
          </div>

          <div *ngIf="mensaje()" class="mt-3 rounded-lg p-3 text-xs border"
               [class.bg-emerald-50]="!mensajeError()" [class.border-emerald-200]="!mensajeError()" [class.text-emerald-700]="!mensajeError()"
               [class.bg-red-50]="mensajeError()" [class.border-red-200]="mensajeError()" [class.text-red-700]="mensajeError()">
            {{ mensaje() }}
          </div>
        </div>

        <!-- ── Columna derecha: vista previa ────────────────────────
             El sticky va en la COLUMNA ENTERA, no solo en el recuadro:
             si no, el título se queda quieto, el recuadro sube y se montan
             uno encima del otro. -->
        <div>
          <div class="sticky top-20">
          <div class="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
            <span>Vista previa <span class="font-normal normal-case text-gray-400">— con datos de ejemplo</span></span>
            <span *ngIf="previsualizando()" class="font-normal normal-case text-gray-400">actualizando…</span>
          </div>
          <div class="border border-gray-200 rounded-lg overflow-hidden bg-white">
            <div class="bg-gray-50 border-b border-gray-200 px-3 py-2">
              <div class="text-[10px] uppercase text-gray-400 font-semibold">Asunto</div>
              <div class="text-sm font-semibold text-gray-800">{{ vistaPrevia(d).subject }}</div>
            </div>
            <div class="px-4 py-3 text-sm text-gray-700 whitespace-pre-wrap max-h-[28rem] overflow-y-auto">{{ vistaPrevia(d).body }}</div>
          </div>
          <p class="text-xs text-gray-400 mt-2">
            Se actualiza mientras escribes. La arma el mismo código que envía el correo,
            así que es lo que va a llegar de verdad.
          </p>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ConfiguracionesComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  puedeCambiar = computed(() => this.auth.isAdmin());

  // ─── Interruptores ───────────────────────────────────────────────
  envio = signal<EstadoEnvio | null>(null);
  cambiandoSwitch = signal(false);
  cambiandoMasivo = signal(false);
  errorSwitch = signal('');

  // ─── Textos ──────────────────────────────────────────────────────
  datos = signal<TextosCorreo | null>(null);
  correo = signal<'recordatorio' | 'convocatoria'>('recordatorio');
  borrador = signal<Record<string, string>>({});
  private original = signal<Record<string, string>>({});
  guardando = signal(false);
  avisos = signal<string[]>([]);
  mensaje = signal('');
  mensajeError = signal(false);

  haCambiado = computed(() => {
    const b = this.borrador(), o = this.original();
    return Object.keys(b).some(k => b[k] !== o[k]);
  });

  correoActual(d: TextosCorreo) {
    return d.estructura[this.correo()];
  }

  vistaPrevia(d: TextosCorreo) {
    return d.vista_previa[this.correo()];
  }

  previsualizando = signal(false);
  private temporizador: any = null;

  editar(clave: string, valor: string) {
    this.borrador.set({ ...this.borrador(), [clave]: valor });
    this.refrescarVistaPrevia();
  }

  /** Vista previa del borrador SIN guardar.
   *
   * La monta el backend, el mismo código que envía el correo: componerla
   * aquí significaría tener dos montajes de la misma carta, y acabarían
   * diciendo cosas distintas.
   *
   * Con freno de medio segundo: una llamada por tecla pulsada no aporta
   * nada y castiga al servidor sin motivo.
   */
  private refrescarVistaPrevia() {
    if (this.temporizador) clearTimeout(this.temporizador);
    this.temporizador = setTimeout(() => {
      this.previsualizando.set(true);
      this.api.vistaPreviaTextos(this.borrador()).subscribe({
        next: (res) => {
          this.previsualizando.set(false);
          const d = this.datos();
          if (d) this.datos.set({ ...d, vista_previa: res.vista_previa });
          this.avisos.set(res.avisos || []);
        },
        // Si falla, se deja la última vista previa buena en pantalla: es
        // preferible a vaciarla y dejar al usuario sin referencia.
        error: () => this.previsualizando.set(false),
      });
    }, 500);
  }

  ngOnInit() {
    this.loadEstadoEnvio();
    this.cargar();
  }

  loadEstadoEnvio() {
    this.api.getEstadoEnvio().subscribe({
      next: (estado) => this.envio.set(estado),
      error: () => this.errorSwitch.set('No se pudo leer el estado del envío de correos.'),
    });
  }

  cargar() {
    this.avisos.set([]);
    this.mensaje.set('');
    this.api.getTextosCorreo().subscribe({
      next: (d) => {
        this.datos.set(d);
        this.borrador.set({ ...d.textos });
        this.original.set({ ...d.textos });
      },
      error: () => {
        this.mensaje.set('No se pudieron cargar los textos.');
        this.mensajeError.set(true);
      },
    });
  }

  guardar() {
    this.guardando.set(true);
    this.avisos.set([]);
    this.mensaje.set('');
    // Solo se mandan los bloques que cambiaron: si dos personas editan correos
    // distintos, ninguna pisa el trabajo de la otra.
    const o = this.original();
    const cambios: Record<string, string> = {};
    for (const [k, v] of Object.entries(this.borrador())) {
      if (v !== o[k]) cambios[k] = v;
    }
    this.api.guardarTextosCorreo(cambios).subscribe({
      next: (res) => {
        this.guardando.set(false);
        this.avisos.set(res.avisos || []);
        this.borrador.set({ ...res.textos });
        this.original.set({ ...res.textos });
        const d = this.datos();
        if (d) this.datos.set({ ...d, textos: res.textos, estructura: res.estructura, vista_previa: res.vista_previa });
        this.mensajeError.set(false);
        this.mensaje.set(`Guardado. ${Object.keys(cambios).length} bloque(s) actualizado(s).`);
      },
      error: (err) => {
        this.guardando.set(false);
        this.mensajeError.set(true);
        this.mensaje.set(
          err?.status === 403
            ? 'No tienes permisos para cambiar los textos (se requiere rol administrador).'
            : (err?.error?.detail || 'No se pudieron guardar los textos.')
        );
      },
    });
  }

  // ─── Interruptores ───────────────────────────────────────────────
  alternarEnvio() {
    const actual = this.envio();
    if (!actual) return;
    this.errorSwitch.set('');
    this.cambiandoSwitch.set(true);
    this.api.cambiarEnvio(!actual.activo).subscribe({
      next: (estado) => { this.envio.set(estado); this.cambiandoSwitch.set(false); },
      error: (err) => {
        this.cambiandoSwitch.set(false);
        this.errorSwitch.set(this.motivoError(err));
      },
    });
  }

  alternarMasivo() {
    const actual = this.envio();
    if (!actual) return;
    this.errorSwitch.set('');
    this.cambiandoMasivo.set(true);
    this.api.cambiarEnvioMasivo(!actual.masivo_activo).subscribe({
      next: (estado) => { this.envio.set(estado); this.cambiandoMasivo.set(false); },
      error: (err) => {
        this.cambiandoMasivo.set(false);
        this.errorSwitch.set(this.motivoError(err));
      },
    });
  }

  private motivoError(err: any): string {
    return err?.status === 403
      ? 'No tienes permisos para cambiar el interruptor (se requiere rol administrador).'
      : (err?.error?.detail || 'No se pudo guardar el cambio.');
  }
}
