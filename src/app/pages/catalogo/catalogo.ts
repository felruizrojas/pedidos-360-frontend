import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Pagination } from '../../shared/components/pagination/pagination';
import { ApiError, esApiError } from '../../core/models/api-error.model';
import { Producto } from '../../core/models/producto.model';
import { CatalogoService } from '../../core/services/catalogo';
import { actualizarPaginaEnUrl, leerPaginaDeUrl } from '../../core/utils/pagina-url';

const PRODUCTOS_POR_PAGINA = 15;

@Component({
  selector: 'app-catalogo',
  imports: [DecimalPipe, Pagination],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './catalogo.html',
  styleUrl: './catalogo.css',
})
export class Catalogo implements OnInit {
  private readonly catalogoService = inject(CatalogoService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly productos = signal<Producto[]>([]);
  protected readonly pagina = signal(leerPaginaDeUrl(this.route));
  protected readonly tamanoPagina = PRODUCTOS_POR_PAGINA;
  protected readonly productosPagina = computed(() => {
    const inicio = (this.pagina() - 1) * PRODUCTOS_POR_PAGINA;
    return this.productos().slice(inicio, inicio + PRODUCTOS_POR_PAGINA);
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
        const totalPaginas = Math.max(1, Math.ceil(productos.length / PRODUCTOS_POR_PAGINA));
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
}
