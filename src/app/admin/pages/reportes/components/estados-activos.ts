import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { EstadoActivo, EstadosActivos } from '../../../../core/models/report.model';
import { formatearFechaHora, formatearMinutos } from '../../../../core/utils/formato';
import { EstadoPedidoBadge } from '../../../../shared/components/estado-pedido-badge/estado-pedido-badge';

/** Más de esto abierto = posible pedido atascado (se resalta en ámbar). */
export const MINUTOS_ATASCADO = 120;

const ORDEN: EstadoActivo[] = ['CREADO', 'ACEPTADO', 'EN_PREPARACION', 'DESPACHADO'];

/** Pedidos en curso ahora por estado y los más antiguos (no depende del rango). */
@Component({
  selector: 'app-estados-activos',
  imports: [EstadoPedidoBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul class="flex flex-wrap gap-3 mb-4" aria-label="Pedidos activos por estado">
      @for (e of conteos(); track e.estado) {
        <li class="flex items-center gap-2 rounded-xl border border-gray-100 px-3 py-2">
          <app-estado-pedido-badge [estado]="e.estado" />
          <span class="text-lg font-bold text-gray-900 tabular-nums">{{ e.cantidad }}</span>
        </li>
      }
      <li class="flex items-center gap-2 px-3 py-2 text-sm text-gray-600">Total: <strong class="text-gray-900">{{ datos().totalActivos }}</strong></li>
    </ul>

    @if (datos().masAntiguos.length === 0) {
      <p class="text-sm text-gray-500">No hay pedidos en curso.</p>
    } @else {
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <caption class="text-left text-sm font-semibold text-gray-700 pb-2">
            Pedidos activos más antiguos <span class="font-normal text-gray-500">(en ámbar: más de 2 h abiertos)</span>
          </caption>
          <thead class="bg-gray-50 text-left text-gray-700">
            <tr>
              <th scope="col" class="px-3 py-2 font-semibold">Pedido</th>
              <th scope="col" class="px-3 py-2 font-semibold">Estado</th>
              <th scope="col" class="px-3 py-2 font-semibold">Cliente</th>
              <th scope="col" class="px-3 py-2 font-semibold">Creado</th>
              <th scope="col" class="px-3 py-2 font-semibold text-right">Abierto hace</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            @for (p of datos().masAntiguos; track p.pedidoId) {
              <tr [class.bg-amber-50]="atascado(p.minutosAbierto)" [attr.data-atascado]="atascado(p.minutosAbierto)">
                <td class="px-3 py-2 font-medium text-gray-900">#{{ p.pedidoId }}</td>
                <td class="px-3 py-2"><app-estado-pedido-badge [estado]="p.estado" /></td>
                <td class="px-3 py-2 text-gray-700">{{ p.clienteNombre || '—' }}</td>
                <td class="px-3 py-2 text-gray-700 whitespace-nowrap">{{ fecha(p.creadoEn) }}</td>
                <td class="px-3 py-2 text-right whitespace-nowrap"
                  [class]="atascado(p.minutosAbierto) ? 'text-amber-800 font-semibold' : 'text-gray-700'">
                  {{ minutos(p.minutosAbierto) }}
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class EstadosActivosComponent {
  readonly datos = input.required<EstadosActivos>();

  protected readonly conteos = computed(() =>
    ORDEN.map((estado) => ({ estado, cantidad: this.datos().estadosActivos[estado] ?? 0 })),
  );
  protected readonly fecha = formatearFechaHora;
  protected readonly minutos = formatearMinutos;

  protected atascado(minutos: number | null): boolean {
    return minutos !== null && minutos > MINUTOS_ATASCADO;
  }
}
