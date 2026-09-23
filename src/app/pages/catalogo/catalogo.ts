import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Pagination } from '../../shared/components/pagination/pagination';
import { CatalogoFiltros } from '../../shared/components/catalogo-filtros/catalogo-filtros';
import { ApiError, esApiError } from '../../core/models/api-error.model';
import { Producto } from '../../core/models/producto.model';
import { OrdenCatalogo } from '../../core/models/orden-catalogo.model';
import { CatalogoService } from '../../core/services/catalogo';
import { actualizarPaginaEnUrl, leerPaginaDeUrl } from '../../core/utils/pagina-url';
import { filtrarYOrdenarProductos } from '../../core/utils/catalogo-filtro.util';

const PRODUCTOS_POR_PAGINA = 15;

@Component({
  selector: 'app-catalogo',
  imports: [DecimalPipe, Pagination, CatalogoFiltros],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './catalogo.html',
  styleUrl: './catalogo.css',
})
export class Catalogo implements OnInit {
  private readonly catalogoService = inject(CatalogoService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly productos = signal<Producto[]>([]);
  /** El catálogo público solo muestra productos con stock disponible; sin stock, no se puede pedir. */
  protected readonly productosDisponibles = computed(() => this.productos().filter((p) => p.stock > 0));
  protected readonly busqueda = signal('');
  protected readonly orden = signal<OrdenCatalogo>('ninguno');
  protected readonly resultado = computed(() =>
    filtrarYOrdenarProductos(this.productosDisponibles(), this.busqueda(), this.orden()),
  );

  protected readonly pagina = signal(leerPaginaDeUrl(this.route));
  protected readonly tamanoPagina = PRODUCTOS_POR_PAGINA;
  protected readonly productosPagina = computed(() => {
    const inicio = (this.pagina() - 1) * PRODUCTOS_POR_PAGINA;
    return this.resultado().slice(inicio, inicio + PRODUCTOS_POR_PAGINA);
  });
  protected readonly cargando = signal(true);
  protected readonly error = signal<ApiError | null>(null);

  /** Tipo de error para la plantilla: sesión, permisos o servicio no disponible. */
  protected readonly tipoError = computed(() => {
    const status = this.error()?.status;
    if (status === undefined) return null;
    if (status === 401) return 'sesion';
    if (status === 403) return 'permisos';
    return 'servicio';
  });

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.catalogoService.obtenerProductos().subscribe({
      next: (productos) => {
        this.productos.set(productos);
        // Si la página pedida en la URL quedó fuera de rango (p. ej. un deep-link
        // viejo con más páginas de las que ahora hay productos), se ajusta a la última válida.
        const disponibles = productos.filter((p) => p.stock > 0).length;
        const totalPaginas = Math.max(1, Math.ceil(disponibles / PRODUCTOS_POR_PAGINA));
        if (this.pagina() > totalPaginas) {
          this.cambiarPagina(totalPaginas);
        }
        this.cargando.set(false);
      },
      error: (e: unknown) => {
        const apiError = esApiError(e) ? e : { status: 0, mensaje: 'El servicio no está disponible.' };
        this.cargando.set(false);
        if (apiError.status === 401) {
          // Sesión expirada: se vuelve a /login para reautenticar.
          void this.router.navigate(['/login']);
        }
        this.error.set(apiError);
      },
    });
  }

  protected cambiarPagina(pagina: number): void {
    this.pagina.set(pagina);
    actualizarPaginaEnUrl(this.router, this.route, pagina);
  }

  protected onBusquedaCambiada(valor: string): void {
    this.busqueda.set(valor);
    this.cambiarPagina(1);
  }

  protected onOrdenCambiada(valor: OrdenCatalogo): void {
    this.orden.set(valor);
    this.cambiarPagina(1);
  }

  protected limpiarFiltros(): void {
    this.busqueda.set('');
    this.orden.set('ninguno');
    this.cambiarPagina(1);
  }
}
