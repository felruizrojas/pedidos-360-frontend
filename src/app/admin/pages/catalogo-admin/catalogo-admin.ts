import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Pagination } from '../../../shared/components/pagination/pagination';
import { ApiError, esApiError } from '../../../core/models/api-error.model';
import { NuevoProducto, Producto } from '../../../core/models/producto.model';
import { CatalogoService } from '../../../core/services/catalogo';
import { actualizarPaginaEnUrl, leerPaginaDeUrl } from '../../../core/utils/pagina-url';
import {
  DESCRIPCION_MAX_LENGTH,
  DESCRIPCION_PATTERN,
  ENTERO_POSITIVO_PATTERN,
  NOMBRE_MAX_LENGTH,
  NOMBRE_PATTERN,
  PRECIO_MAX,
  STOCK_MAX,
  nombreDuplicadoValidator,
  normalizarNombreProducto,
} from '../../../core/utils/producto-validators';

const PRODUCTOS_POR_PAGINA = 15;

@Component({
  selector: 'app-catalogo-admin',
  imports: [ReactiveFormsModule, CurrencyPipe, Pagination],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './catalogo-admin.html',
})
export class CatalogoAdmin implements OnInit {
  private readonly catalogoService = inject(CatalogoService);
  private readonly fb = inject(FormBuilder).nonNullable;
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
  protected readonly errorCarga = signal('');
  protected readonly mostrarForm = signal(false);
  protected readonly guardando = signal(false);
  protected readonly errorGuardar = signal('');
  /** Errores de validación 400 del backend por campo. */
  protected readonly erroresCampo = signal<Record<string, string>>({});

  // Límites expuestos a la plantilla (atributos nativos maxlength/max de los inputs).
  protected readonly NOMBRE_MAX_LENGTH = NOMBRE_MAX_LENGTH;
  protected readonly DESCRIPCION_MAX_LENGTH = DESCRIPCION_MAX_LENGTH;
  protected readonly PRECIO_MAX = PRECIO_MAX;
  protected readonly STOCK_MAX = STOCK_MAX;

  protected readonly form = this.fb.group({
    nombre: [
      '',
      [
        Validators.required,
        Validators.maxLength(NOMBRE_MAX_LENGTH),
        Validators.pattern(NOMBRE_PATTERN),
        nombreDuplicadoValidator(() => this.productos().map((p) => normalizarNombreProducto(p.nombre))),
      ],
    ],
    descripcion: ['', [Validators.maxLength(DESCRIPCION_MAX_LENGTH), Validators.pattern(DESCRIPCION_PATTERN)]],
    precio: [
      null as number | null,
      [Validators.required, Validators.min(1), Validators.max(PRECIO_MAX), Validators.pattern(ENTERO_POSITIVO_PATTERN)],
    ],
    stock: [
      null as number | null,
      [Validators.required, Validators.min(0), Validators.max(STOCK_MAX), Validators.pattern(ENTERO_POSITIVO_PATTERN)],
    ],
  });

  /** Un solo mensaje claro por campo (el primero que aplique), en vez de apilar todos los errores. */
  protected get errorNombre(): string | null {
    const c = this.form.controls.nombre;
    if (!c.touched || c.valid) return null;
    if (c.hasError('required')) return 'El nombre es obligatorio.';
    if (c.hasError('maxlength')) return `El nombre no puede superar los ${NOMBRE_MAX_LENGTH} caracteres.`;
    if (c.hasError('pattern')) return 'El nombre solo admite letras y espacios (sin números ni símbolos).';
    if (c.hasError('duplicado')) return 'Ya existe un producto con este nombre en el catálogo.';
    return null;
  }

  protected get errorDescripcion(): string | null {
    const c = this.form.controls.descripcion;
    if (!c.touched || c.valid) return null;
    if (c.hasError('maxlength')) return `La descripción no puede superar los ${DESCRIPCION_MAX_LENGTH} caracteres.`;
    if (c.hasError('pattern')) return 'La descripción solo admite letras y números (sin símbolos especiales).';
    return null;
  }

  protected get errorPrecio(): string | null {
    const c = this.form.controls.precio;
    if (!c.touched || c.valid) return null;
    if (c.hasError('required')) return 'El precio es obligatorio.';
    if (c.hasError('min')) return 'El precio debe ser un monto entero mayor que 0.';
    if (c.hasError('max')) return `El precio no puede superar $${PRECIO_MAX.toLocaleString('es-CL')}.`;
    if (c.hasError('pattern')) return 'El precio debe ser un número entero, sin decimales ni letras.';
    return null;
  }

  protected get errorStock(): string | null {
    const c = this.form.controls.stock;
    if (!c.touched || c.valid) return null;
    if (c.hasError('required')) return 'El stock es obligatorio.';
    if (c.hasError('min')) return 'El stock no puede ser negativo.';
    if (c.hasError('max')) return `El stock no puede superar ${STOCK_MAX.toLocaleString('es-CL')} unidades.`;
    if (c.hasError('pattern')) return 'El stock debe ser un número entero, sin decimales ni letras.';
    return null;
  }

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set('');
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
        const status = esApiError(e) ? e.status : 0;
        this.errorCarga.set(
          status === 403
            ? 'No tienes permisos para ver los productos.'
            : 'No se pudieron cargar los productos. El servicio podría no estar disponible.',
        );
        this.cargando.set(false);
      },
    });
  }

  protected cambiarPagina(pagina: number): void {
    this.pagina.set(pagina);
    actualizarPaginaEnUrl(this.router, this.route, pagina);
  }

  protected alternarForm(): void {
    this.mostrarForm.update((abierto) => !abierto);
    this.errorGuardar.set('');
    this.erroresCampo.set({});
  }

  protected guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { nombre, descripcion, precio, stock } = this.form.getRawValue();
    const nuevo: NuevoProducto = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      precio: precio!,
      stock: stock!,
    };

    this.guardando.set(true);
    this.errorGuardar.set('');
    this.erroresCampo.set({});
    this.catalogoService.crearProducto(nuevo).subscribe({
      next: (creado) => {
        this.productos.update((lista) => [...lista, creado]);
        this.form.reset();
        this.mostrarForm.set(false);
        this.guardando.set(false);
      },
      error: (e: unknown) => {
        const apiError: ApiError = esApiError(e) ? e : { status: 0, mensaje: '' };
        this.guardando.set(false);
        if (apiError.status === 400 && apiError.detalles) {
          this.erroresCampo.set(apiError.detalles);
          this.errorGuardar.set('Revisa los campos marcados.');
        } else if (apiError.status === 403) {
          this.errorGuardar.set('No tienes permisos para crear productos');
        } else if (apiError.status === 401) {
          this.errorGuardar.set('Tu sesión expiró. Vuelve a iniciar sesión.');
        } else if (apiError.status === 0 || apiError.status >= 500) {
          this.errorGuardar.set('El servicio no está disponible. Inténtalo de nuevo.');
        } else {
          this.errorGuardar.set(apiError.mensaje || 'No se pudo crear el producto.');
        }
      },
    });
  }
}
