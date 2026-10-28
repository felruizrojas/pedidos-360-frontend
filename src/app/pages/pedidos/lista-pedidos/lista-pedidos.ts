import { CurrencyPipe, DatePipe, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiError } from '../../../core/models/api-error.model';
import { EstadoPedido, Pagina, Pedido } from '../../../core/models/pedido.model';
import { AuthState } from '../../../core/services/auth-state';
import { PedidosService } from '../../../core/services/pedidos';
import { ESTADOS_PEDIDO, ETIQUETA_ESTADO, esEstadoPedido, esSoloCliente, puedeCrearPedidos } from '../../../core/utils/estados-pedido';
import { actualizarPaginaEnUrl, leerPaginaDeUrl } from '../../../core/utils/pagina-url';
import { EstadoPedidoBadge } from '../../../shared/components/estado-pedido-badge/estado-pedido-badge';
import { Pagination } from '../../../shared/components/pagination/pagination';
import { aApiError, mensajeErrorPedido } from '../pedidos-errores';

const PEDIDOS_POR_PAGINA = 10;

/**
 * /pedidos (Cliente) y /dashboard/pedidos (Operador): listado paginado en el servidor.
 * Un Cliente solo recibe los suyos: lo filtra orders.
 */
@Component({
  selector: 'app-lista-pedidos',
  imports: [CurrencyPipe, DatePipe, NgTemplateOutlet, ReactiveFormsModule, RouterLink, EstadoPedidoBadge, Pagination],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './lista-pedidos.html',
})
export class ListaPedidos implements OnInit {
  private readonly pedidosService = inject(PedidosService);
  private readonly authState = inject(AuthState);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder).nonNullable;

  /** Sin CANCELADO: orders nunca lista pedidos cancelados (ni eliminados). */
  protected readonly ESTADOS = ESTADOS_PEDIDO.filter((e) => e !== 'CANCELADO');
  protected readonly ETIQUETA_ESTADO = ETIQUETA_ESTADO;
  protected readonly tamanoPagina = PEDIDOS_POR_PAGINA;

  /** data.dashboard de la ruta: dentro del layout de administración (ver admin.routes.ts). */
  protected readonly enDashboard = this.route.snapshot?.data['dashboard'] === true;
  protected readonly basePedidos = this.enDashboard ? '/dashboard/pedidos' : '/pedidos';

  protected readonly soloCliente = computed(() => esSoloCliente(this.authState.roles()));
  protected readonly puedeCrear = computed(() => puedeCrearPedidos(this.authState.roles()));
  protected readonly titulo = computed(() => (this.soloCliente() ? 'Mis pedidos' : 'Pedidos'));

  /** Formulario de filtros; se aplican al enviar (no en cada tecla) para no pedir una página por cambio. */
  protected readonly filtrosForm = this.fb.group({ estado: '', desde: '', hasta: '' });

  // Filtros aplicados.
  protected readonly estado = signal<EstadoPedido | ''>('');
  protected readonly desde = signal('');
  protected readonly hasta = signal('');
  protected readonly errorFiltros = signal('');

  /** 1-based en la UI (paginador y ?pagina=); orders usa page 0-based. */
  protected readonly pagina = signal(leerPaginaDeUrl(this.route));
  protected readonly resultado = signal<Pagina<Pedido> | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<ApiError | null>(null);
  protected readonly mensajeError = computed(() => {
    const e = this.error();
    return e ? mensajeErrorPedido(e, 'ver los pedidos') : '';
  });

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.pedidosService
      .listarPedidos({
        estado: this.estado() || null,
        desde: this.desde() || null,
        hasta: this.hasta() || null,
        page: this.pagina() - 1,
        size: PEDIDOS_POR_PAGINA,
      })
      .subscribe({
        next: (pagina) => {
          // Deep-link a una página que ya no existe: se ajusta a la última válida.
          if (pagina.totalPaginas > 0 && this.pagina() > pagina.totalPaginas) {
            this.cambiarPagina(pagina.totalPaginas);
            return;
          }
          this.resultado.set(pagina);
          this.cargando.set(false);
        },
        error: (e: unknown) => {
          const apiError = aApiError(e);
          this.cargando.set(false);
          if (apiError.status === 401) {
            void this.router.navigate(['/login']);
          }
          this.error.set(apiError);
        },
      });
  }

  protected aplicarFiltros(): void {
    const { estado, desde, hasta } = this.filtrosForm.getRawValue();
    if (desde && hasta && desde > hasta) {
      this.errorFiltros.set('La fecha "desde" no puede ser posterior a la fecha "hasta".');
      return;
    }
    this.errorFiltros.set('');
    this.estado.set(esEstadoPedido(estado) ? estado : '');
    this.desde.set(desde);
    this.hasta.set(hasta);
    this.cambiarPagina(1);
  }

  protected limpiarFiltros(): void {
    this.filtrosForm.reset();
    this.errorFiltros.set('');
    this.estado.set('');
    this.desde.set('');
    this.hasta.set('');
    this.cambiarPagina(1);
  }

  protected cambiarPagina(pagina: number): void {
    this.pagina.set(pagina);
    actualizarPaginaEnUrl(this.router, this.route, pagina);
    this.cargar();
  }
}
