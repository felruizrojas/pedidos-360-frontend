import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { EstadoMensaje, MensajeComando } from '../../../core/models/pedido.model';
import { PedidosService } from '../../../core/services/pedidos';
import { aApiError, mensajeErrorPedido } from '../pedidos-errores';

const ETIQUETA_COMANDO: Record<string, string> = {
  email: 'Correo al cliente',
  kitchen: 'Ticket de cocina',
  invoice: 'Boleta',
};

const ETIQUETA_ESTADO: Record<EstadoMensaje, string> = {
  ENVIADO: 'Enviado, esperando a notify',
  PROCESADO: 'Procesado',
  FALLIDO: 'Falló',
  EN_DLQ: 'En la DLQ',
};

const COLOR_ESTADO: Record<EstadoMensaje, string> = {
  ENVIADO: 'bg-gray-100 text-gray-800 ring-gray-300',
  PROCESADO: 'bg-green-100 text-green-800 ring-green-300',
  FALLIDO: 'bg-amber-100 text-amber-800 ring-amber-300',
  EN_DLQ: 'bg-red-100 text-red-800 ring-red-300',
};

/** Un comando con su último estado conocido (los pasos llegan en orden de fecha). */
interface Resumen {
  clave: string;
  comando: string;
  type: string | null;
  estado: EstadoMensaje;
  motivo: string | null;
  usuario: string | null;
  fecha: string;
}

/**
 * Dashboard del operador: cada mensaje que orders publicó en RabbitMQ para este pedido y lo que respondió
 * notify por la cola de resultados (procesado, falló o quedó en la DLQ), con quién hizo la acción.
 */
@Component({
  selector: 'app-mensajeria-pedido',
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section aria-labelledby="titulo-mensajeria" class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
      <div class="flex items-center justify-between gap-2">
        <h2 id="titulo-mensajeria" class="text-lg font-bold text-gray-900">Mensajería (RabbitMQ)</h2>
        <button type="button" (click)="cargar()"
          class="text-sm font-semibold text-indigo-700 underline cursor-pointer focus-visible:outline-2 focus-visible:outline-indigo-600">
          Actualizar
        </button>
      </div>
      @if (error()) {
        <p role="alert" class="text-sm text-red-700">{{ error() }}</p>
      } @else if (cargando()) {
        <p class="text-sm text-gray-600" role="status">Cargando mensajería…</p>
      } @else if (resumen().length === 0) {
        <p class="text-sm text-gray-600">Este pedido aún no tiene mensajes registrados.</p>
      } @else {
        <ul class="divide-y divide-gray-100">
          @for (m of resumen(); track m.clave) {
            <li class="py-3 space-y-1">
              <div class="flex flex-wrap items-center gap-2 text-sm">
                <span class="font-semibold text-gray-900">{{ etiquetaComando(m.comando) }}</span>
                @if (m.type) {
                  <span class="text-gray-600">({{ m.type }})</span>
                }
                <span class="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset" [class]="color[m.estado]">
                  {{ etiquetaEstado[m.estado] }}
                </span>
              </div>
              @if (m.usuario) {
                <p class="text-sm text-gray-700">Acción de {{ m.usuario }}</p>
              }
              @if (m.motivo) {
                <p class="text-sm text-red-700 break-words">Motivo: {{ m.motivo }}</p>
              }
              <p class="text-xs text-gray-500"><time [attr.datetime]="m.fecha">{{ m.fecha | date: 'dd-MM-yyyy HH:mm:ss' }}</time></p>
            </li>
          }
        </ul>
      }
    </section>
  `,
})
export class MensajeriaPedido implements OnInit {
  private readonly pedidosService = inject(PedidosService);

  readonly pedidoId = input.required<number>();

  protected readonly etiquetaEstado = ETIQUETA_ESTADO;
  protected readonly color = COLOR_ESTADO;
  protected readonly mensajes = signal<MensajeComando[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal('');

  /** Agrupa los pasos por comandoEventId y deja el último estado, con el motivo y el actor que se conozcan. */
  protected readonly resumen = computed<Resumen[]>(() => {
    const porComando = new Map<string, Resumen>();
    this.mensajes().forEach((m, i) => {
      const clave = m.comandoEventId ?? `sin-id-${i}`;
      const previo = porComando.get(clave);
      const usuario = m.usuarioNombre ? `${m.usuarioNombre}${m.usuarioRol ? ` (${m.usuarioRol})` : ''}` : null;
      porComando.set(clave, {
        clave,
        comando: m.comando,
        type: m.type ?? previo?.type ?? null,
        estado: m.estado,
        motivo: m.motivo ?? previo?.motivo ?? null,
        usuario: previo?.usuario ?? usuario,
        fecha: m.fecha,
      });
    });
    return [...porComando.values()];
  });

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.pedidosService.obtenerMensajes(this.pedidoId()).subscribe({
      next: (m) => {
        this.mensajes.set(m);
        this.cargando.set(false);
      },
      error: (e: unknown) => {
        this.cargando.set(false);
        this.error.set(mensajeErrorPedido(aApiError(e), 'ver la mensajería'));
      },
    });
  }

  protected etiquetaComando(comando: string): string {
    return ETIQUETA_COMANDO[comando] ?? comando;
  }
}
