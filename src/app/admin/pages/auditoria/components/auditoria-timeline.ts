import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { catchError, map, of, switchMap } from 'rxjs';
import { ApiError } from '../../../../core/models/api-error.model';
import { EventoAuditoria } from '../../../../core/models/audit.model';
import { EstadoPedido } from '../../../../core/models/pedido.model';
import { AuditoriaService } from '../../../../core/services/auditoria';
import { etiquetaAccion } from '../../../../core/utils/acciones-auditoria';
import { ESTADOS_PEDIDO } from '../../../../core/utils/estados-pedido';
import { formatearFechaHora, formatearMinutos } from '../../../../core/utils/formato';
import { EstadoPedidoBadge } from '../../../../shared/components/estado-pedido-badge/estado-pedido-badge';
import { aApiError, mensajeAuditoria } from '../auditoria-util';

interface Hito {
  evento: EventoAuditoria;
  /** Minutos desde el hito anterior (null en el primero). */
  desdeAnterior: number | null;
}

/** Pestaña "Timeline de pedido": línea de tiempo vertical, más antiguo primero, con la duración entre hitos. */
@Component({
  selector: 'app-auditoria-timeline',
  imports: [ReactiveFormsModule, EstadoPedidoBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-5">
      <form (ngSubmit)="buscar()" aria-label="Buscar timeline de un pedido"
        class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-wrap items-end gap-3">
        <div>
          <label for="timeline-pedido" class="block text-sm font-medium text-gray-700">Nº de pedido</label>
          <input id="timeline-pedido" type="text" inputmode="numeric" [formControl]="numero"
            class="mt-1 w-40 rounded-lg border border-gray-300 px-3 py-2 focus-visible:outline-2 focus-visible:outline-indigo-600" />
        </div>
        <button type="submit"
          class="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
          Ver timeline
        </button>
      </form>

      @if (!pedido()) {
        <p class="text-gray-600">Ingresa un número de pedido para ver su historial completo (quién, qué, cuándo y desde dónde).</p>
      } @else if (estado().error; as err) {
        <p role="alert" class="p-4 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
          {{ err.status === 404 ? 'No hay eventos de auditoría para el pedido #' + pedido() : mensaje(err) }}
        </p>
      } @else if (estado().datos) {
        <section class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5" aria-labelledby="titulo-timeline">
          <h2 id="titulo-timeline" class="text-lg font-bold text-gray-900 mb-4">Pedido #{{ pedido() }}</h2>
          <ol class="relative border-s-2 border-indigo-100 ms-3 space-y-6">
            @for (h of hitos(); track h.evento.eventId) {
              <li class="ms-6" data-hito>
                <span class="absolute -start-[9px] mt-1.5 size-4 rounded-full border-2 border-white bg-indigo-600" aria-hidden="true"></span>
                <div class="flex flex-wrap items-center gap-2">
                  <span class="font-semibold text-gray-900">{{ etiqueta(h.evento.accion) }}</span>
                  @if (h.evento.que.estadoAnterior && h.evento.que.estadoAnterior !== h.evento.que.estadoNuevo) {
                    @if (esEstado(h.evento.que.estadoAnterior)) {
                      <app-estado-pedido-badge [estado]="$any(h.evento.que.estadoAnterior)" />
                    } @else {
                      <span class="text-sm text-gray-700">{{ h.evento.que.estadoAnterior }}</span>
                    }
                    <span aria-hidden="true" class="text-gray-500">→</span><span class="sr-only">pasa a</span>
                  }
                  @if (h.evento.que.estadoNuevo) {
                    @if (esEstado(h.evento.que.estadoNuevo)) {
                      <app-estado-pedido-badge [estado]="$any(h.evento.que.estadoNuevo)" />
                    } @else {
                      <span class="text-sm text-gray-700">{{ h.evento.que.estadoNuevo }}</span>
                    }
                  }
                </div>
                <p class="mt-1 text-sm text-gray-700">
                  <time [attr.datetime]="h.evento.cuando.ocurridoEn">{{ fecha(h.evento.cuando.ocurridoEn) }}</time>
                  · por
                  @if (h.evento.quien.id) {
                    <button type="button" (click)="verActor.emit(h.evento.quien.id!)"
                      [attr.aria-label]="'Ver los eventos de ' + (h.evento.quien.nombre || h.evento.quien.id)"
                      class="font-medium text-indigo-700 underline-offset-2 hover:underline cursor-pointer focus-visible:outline-2 focus-visible:outline-indigo-600">
                      {{ h.evento.quien.nombre || h.evento.quien.id }}
                    </button>
                  } @else {
                    <span>—</span>
                  }
                  @if (h.evento.quien.rol) { <span class="text-gray-500">({{ h.evento.quien.rol }})</span> }
                  · {{ h.evento.donde.ip || 'IP desconocida' }}
                </p>
                @if (h.evento.que.comentario) {
                  <p class="mt-1 text-sm text-gray-600 italic">“{{ h.evento.que.comentario }}”</p>
                }
                @if (h.desdeAnterior !== null) {
                  <p class="mt-1 text-xs text-gray-500" data-duracion>+{{ minutos(h.desdeAnterior) }} desde el hito anterior</p>
                }
              </li>
            }
          </ol>
          @if (leadTime() !== null) {
            <p class="mt-6 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800" data-lead-time>
              Lead time total (creado → entregado): <strong>{{ minutos(leadTime()) }}</strong>
            </p>
          }
        </section>
      } @else {
        <p class="text-gray-600" role="status">Cargando timeline…</p>
      }
    </div>
  `,
})
export class AuditoriaTimeline {
  private readonly auditoria = inject(AuditoriaService);

  readonly pedido = input<string | null>(null);
  readonly pedidoCambio = output<string>();
  readonly verActor = output<string>();

  protected readonly numero = new FormControl('', { nonNullable: true });
  protected readonly estado = signal<{ datos: EventoAuditoria[] | null; error: ApiError | null }>({ datos: null, error: null });

  protected readonly fecha = formatearFechaHora;
  protected readonly minutos = formatearMinutos;
  protected readonly etiqueta = etiquetaAccion;
  protected readonly mensaje = mensajeAuditoria;

  protected readonly hitos = computed<Hito[]>(() => {
    const eventos = this.estado().datos ?? [];
    return eventos.map((evento, i) => ({
      evento,
      desdeAnterior:
        i === 0 ? null : (Date.parse(evento.cuando.ocurridoEn) - Date.parse(eventos[i - 1].cuando.ocurridoEn)) / 60_000,
    }));
  });

  /** Creado → entregado, si el pedido llegó a ENTREGADO y se conoce su creación. */
  protected readonly leadTime = computed<number | null>(() => {
    const eventos = this.estado().datos ?? [];
    const creado = eventos.find((e) => e.accion === 'ORDER_CREATED');
    const entregado = eventos.find((e) => e.que.estadoNuevo === 'ENTREGADO');
    return creado && entregado
      ? (Date.parse(entregado.cuando.ocurridoEn) - Date.parse(creado.cuando.ocurridoEn)) / 60_000
      : null;
  });

  constructor() {
    effect(() => this.numero.setValue(this.pedido() ?? ''));
    toObservable(this.pedido)
      .pipe(
        switchMap((pedido) => {
          this.estado.set({ datos: null, error: null });
          return pedido
            ? this.auditoria.timelinePedido(pedido).pipe(
                map((datos) => ({ datos, error: null })),
                catchError((e: unknown) => of({ datos: null, error: aApiError(e) })),
              )
            : of({ datos: null, error: null });
        }),
        takeUntilDestroyed(),
      )
      .subscribe((r) => this.estado.set(r));
  }

  protected buscar(): void {
    const numero = this.numero.value.trim();
    if (numero) {
      this.pedidoCambio.emit(numero);
    }
  }

  protected esEstado(estado: string): estado is EstadoPedido {
    return (ESTADOS_PEDIDO as string[]).includes(estado);
  }
}
