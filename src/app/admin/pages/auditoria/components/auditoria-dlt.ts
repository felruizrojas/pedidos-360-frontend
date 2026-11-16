import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, map, of, switchMap } from 'rxjs';
import { ApiError } from '../../../../core/models/api-error.model';
import { MensajeFallido, MensajeFallidoDetalle, PaginaAuditoria } from '../../../../core/models/audit.model';
import { AuditoriaService } from '../../../../core/services/auditoria';
import { formatearFechaHora } from '../../../../core/utils/formato';
import { Pagination } from '../../../../shared/components/pagination/pagination';
import { TAMANO_PAGINA, aApiError, claseCorta, mensajeAuditoria } from '../auditoria-util';

/** Pestaña "Mensajes fallidos (DLT)": lo que los consumidores de Kafka no pudieron procesar. */
@Component({
  selector: 'app-auditoria-dlt',
  imports: [Pagination],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-5">
      <p class="text-sm text-gray-600 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        Una <strong>DLT</strong> (<em>dead letter topic</em>) es el tópico de Kafka donde un consumidor deja los mensajes que
        no pudo procesar: un JSON malformado o sin datos obligatorios va directo; un error pasajero, después de 3 reintentos.
        Así el resto de los mensajes sigue fluyendo y el fallido queda aquí, con el mensaje original y el error, para revisarlo.
      </p>

      @if (estado().error; as err) {
        <p role="alert" class="p-4 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">{{ mensaje(err) }}</p>
      } @else if (estado().datos; as pagina) {
        @if (pagina.contenido.length === 0) {
          <p class="text-center text-gray-600 py-6">No hay mensajes fallidos.</p>
        } @else {
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
            <table class="w-full text-sm">
              <caption class="sr-only">Mensajes fallidos: {{ pagina.totalElementos }}</caption>
              <thead class="bg-gray-50 text-left text-gray-700">
                <tr>
                  <th scope="col" class="px-4 py-3 font-semibold">Tópico original</th>
                  <th scope="col" class="px-4 py-3 font-semibold">Partición / offset</th>
                  <th scope="col" class="px-4 py-3 font-semibold">Excepción</th>
                  <th scope="col" class="px-4 py-3 font-semibold">Falló</th>
                  <th scope="col" class="px-4 py-3"><span class="sr-only">Detalle</span></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                @for (m of pagina.contenido; track m.id) {
                  <tr class="hover:bg-gray-50">
                    <td class="px-4 py-3 font-medium text-gray-900">{{ m.topicOriginal || '—' }}<span class="block text-xs font-normal text-gray-500">{{ m.consumerGroup }}</span></td>
                    <td class="px-4 py-3 text-gray-700 tabular-nums">{{ m.particionOriginal ?? '—' }} / {{ m.offsetOriginal ?? '—' }}</td>
                    <td class="px-4 py-3 text-gray-700" [attr.title]="m.excepcionClase">{{ clase(m.excepcionClase) }}</td>
                    <td class="px-4 py-3 text-gray-700 whitespace-nowrap">{{ fecha(m.fallidoEn) }}</td>
                    <td class="px-4 py-3 text-right">
                      <button type="button" (click)="alternar(m.id)" [attr.aria-expanded]="abierto() === m.id"
                        [attr.aria-controls]="'dlt-' + m.id"
                        class="font-medium text-indigo-700 px-3 py-1 rounded-lg hover:bg-indigo-50 cursor-pointer focus-visible:outline-2 focus-visible:outline-indigo-600">
                        {{ abierto() === m.id ? 'Ocultar' : 'Ver detalle' }}
                      </button>
                    </td>
                  </tr>
                  @if (abierto() === m.id) {
                    <tr [id]="'dlt-' + m.id" class="bg-gray-50">
                      <td colspan="5" class="px-4 py-4 space-y-3">
                        @if (detalle().error; as err) {
                          <p role="alert" class="text-sm text-red-700">{{ mensaje(err) }}</p>
                        } @else if (detalle().datos; as d) {
                          <p class="text-sm text-gray-700">{{ d.excepcionMensaje }}</p>
                          <p class="text-xs text-gray-500">DLT {{ d.dlt.topic }} · partición {{ d.dlt.particion }} · offset {{ d.dlt.offset }} · clave {{ d.clave || '—' }}</p>
                          <div>
                            <h3 class="text-sm font-semibold text-gray-700">Mensaje original</h3>
                            <pre class="mt-1 max-h-48 overflow-auto rounded-xl bg-gray-900 text-gray-100 text-xs p-3">{{ d.payload }}</pre>
                          </div>
                          <div>
                            <h3 class="text-sm font-semibold text-gray-700">Stacktrace</h3>
                            <pre class="mt-1 max-h-64 overflow-auto rounded-xl bg-gray-900 text-gray-100 text-xs p-3">{{ d.stacktrace }}</pre>
                          </div>
                        } @else {
                          <p class="text-sm text-gray-600" role="status">Cargando detalle…</p>
                        }
                      </td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>
          <app-pagination [paginaActual]="pagina.pagina + 1" [totalItems]="pagina.totalElementos" [tamanoPagina]="tamanoPagina"
            (paginaCambiada)="paginaCambio.emit($event)" />
        }
      } @else {
        <p class="text-center text-gray-600" role="status">Cargando mensajes fallidos…</p>
      }
    </div>
  `,
})
export class AuditoriaDlt {
  private readonly auditoria = inject(AuditoriaService);

  readonly pagina = input(1);
  readonly paginaCambio = output<number>();

  protected readonly estado = signal<{ datos: PaginaAuditoria<MensajeFallido> | null; error: ApiError | null }>({ datos: null, error: null });
  protected readonly abierto = signal<number | null>(null);
  protected readonly detalle = signal<{ datos: MensajeFallidoDetalle | null; error: ApiError | null }>({ datos: null, error: null });

  protected readonly tamanoPagina = TAMANO_PAGINA;
  protected readonly fecha = formatearFechaHora;
  protected readonly clase = claseCorta;
  protected readonly mensaje = mensajeAuditoria;

  constructor() {
    toObservable(this.pagina)
      .pipe(
        switchMap((pagina) =>
          this.auditoria.mensajesFallidos({ page: pagina - 1, size: TAMANO_PAGINA }).pipe(
            map((datos) => ({ datos, error: null })),
            catchError((e: unknown) => of({ datos: null, error: aApiError(e) })),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((r) => this.estado.set(r));
  }

  protected alternar(id: number): void {
    if (this.abierto() === id) {
      this.abierto.set(null);
      return;
    }
    this.abierto.set(id);
    this.detalle.set({ datos: null, error: null });
    this.auditoria.mensajeFallido(id).subscribe({
      next: (datos) => this.detalle.set({ datos, error: null }),
      error: (e: unknown) => this.detalle.set({ datos: null, error: aApiError(e) }),
    });
  }
}
