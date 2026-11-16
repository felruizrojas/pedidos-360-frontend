import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Pedido } from '../../core/models/pedido.model';
import { PedidosService } from '../../core/services/pedidos';
import { formatearCLP, formatearFechaHora } from '../../core/utils/formato';
import { EstadoPedidoBadge } from '../../shared/components/estado-pedido-badge/estado-pedido-badge';

/**
 * "Tus últimos pedidos" del Cliente en /inicio (PDF: "Customer: últimos pedidos y estado actual"). Se carga con
 * @defer solo cuando hay un Cliente con sesión: los demás no descargan este código ni llaman al backend.
 */
@Component({
  selector: 'app-ultimos-pedidos',
  imports: [RouterLink, EstadoPedidoBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section aria-labelledby="titulo-ultimos" class="max-w-3xl mx-auto px-4 py-10 space-y-4">
      <div class="flex items-center justify-between gap-3">
        <h2 id="titulo-ultimos" class="text-2xl font-extrabold tracking-tight text-gray-900">Tus últimos pedidos</h2>
        @if (pedidos()?.length) {
          <a routerLink="/pedidos" class="text-sm font-medium text-indigo-700 hover:underline focus-visible:outline-2 focus-visible:outline-indigo-600">Ver todos</a>
        }
      </div>

      @if (fallo()) {
        <p class="text-sm text-gray-600" role="status">No pudimos cargar tus pedidos en este momento.</p>
      } @else if (pedidos(); as lista) {
        @if (lista.length === 0) {
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center space-y-3">
            <p class="text-gray-600">Todavía no has hecho pedidos.</p>
            <a routerLink="/catalogo"
              class="inline-block px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
              Ir al catálogo
            </a>
          </div>
        } @else {
          <ul class="space-y-3">
            @for (p of lista; track p.id) {
              <li>
                <a [routerLink]="['/pedidos', p.id]"
                  class="flex flex-wrap items-center justify-between gap-3 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow focus-visible:outline-2 focus-visible:outline-indigo-600">
                  <span>
                    <span class="font-bold text-gray-900">Pedido #{{ p.id }}</span>
                    <span class="block text-sm text-gray-600">{{ fecha(p.creadoEn) }}</span>
                  </span>
                  <span class="flex items-center gap-3">
                    <span class="font-semibold text-gray-900 tabular-nums">{{ clp(p.total) }}</span>
                    <app-estado-pedido-badge [estado]="p.estado" [eliminado]="!!p.eliminado" />
                  </span>
                </a>
              </li>
            }
          </ul>
        }
      } @else {
        <p class="text-sm text-gray-600" role="status">Cargando tus pedidos…</p>
      }
    </section>
  `,
})
export class UltimosPedidos implements OnInit {
  private readonly pedidosService = inject(PedidosService);

  protected readonly pedidos = signal<Pedido[] | null>(null);
  protected readonly fallo = signal(false);
  protected readonly fecha = formatearFechaHora;
  protected readonly clp = formatearCLP;

  ngOnInit(): void {
    // orders devuelve al Cliente solo sus pedidos, más recientes primero.
    this.pedidosService.listarPedidos({ size: 3 }).subscribe({
      next: (pagina) => this.pedidos.set(pagina.contenido),
      error: () => this.fallo.set(true),
    });
  }
}
