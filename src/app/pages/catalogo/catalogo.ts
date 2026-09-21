import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiError, esApiError } from '../../core/models/api-error.model';
import { Producto } from '../../core/models/producto.model';
import { CatalogoService } from '../../core/services/catalogo';

@Component({
  selector: 'app-catalogo',
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './catalogo.html',
  styleUrl: './catalogo.css',
})
export class Catalogo implements OnInit {
  private readonly catalogoService = inject(CatalogoService);
  private readonly router = inject(Router);

  protected readonly productos = signal<Producto[]>([]);
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
}
