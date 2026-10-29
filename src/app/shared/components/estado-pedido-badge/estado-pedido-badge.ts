import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { EstadoPedido } from '../../../core/models/pedido.model';
import { COLOR_ESTADO, ETIQUETA_ESTADO } from '../../../core/utils/estados-pedido';

/** Badge con la etiqueta legible y el color del estado del pedido; un pedido eliminado se muestra como "Eliminado". */
@Component({
  selector: 'app-estado-pedido-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset whitespace-nowrap"
      [class]="clases()">
      {{ etiqueta() }}
    </span>
  `,
})
export class EstadoPedidoBadge {
  readonly estado = input.required<EstadoPedido>();
  readonly eliminado = input(false);

  protected readonly etiqueta = computed(() =>
    this.eliminado() ? 'Eliminado' : (ETIQUETA_ESTADO[this.estado()] ?? this.estado()),
  );
  protected readonly clases = computed(() =>
    this.eliminado()
      ? 'bg-gray-800 text-white ring-gray-800'
      : (COLOR_ESTADO[this.estado()] ?? 'bg-gray-100 text-gray-800 ring-gray-300'),
  );
}
