import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Injector, OnInit, afterNextRender, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Pagination } from '../../../shared/components/pagination/pagination';
import { CatalogoFiltros } from '../../../shared/components/catalogo-filtros/catalogo-filtros';
import { ApiError, esApiError } from '../../../core/models/api-error.model';
import { ActualizacionProducto, NuevoProducto, Producto } from '../../../core/models/producto.model';
import { OrdenCatalogo } from '../../../core/models/orden-catalogo.model';
import { CatalogoService } from '../../../core/services/catalogo';
import { actualizarPaginaEnUrl, leerPaginaDeUrl } from '../../../core/utils/pagina-url';
import { filtrarYOrdenarProductos } from '../../../core/utils/catalogo-filtro.util';
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

const PRECIO_VALIDATORS = [
  Validators.required,
  Validators.min(1),
  Validators.max(PRECIO_MAX),
  Validators.pattern(ENTERO_POSITIVO_PATTERN),
];
const STOCK_VALIDATORS = [
  Validators.required,
  Validators.min(0),
  Validators.max(STOCK_MAX),
  Validators.pattern(ENTERO_POSITIVO_PATTERN),
];

function mensajePrecio(c: AbstractControl): string | null {
  if (!c.touched || c.valid) return null;
  if (c.hasError('required')) return 'El precio es obligatorio.';
  if (c.hasError('min')) return 'El precio debe ser un monto entero mayor que 0.';
  if (c.hasError('max')) return `El precio no puede superar $${PRECIO_MAX.toLocaleString('es-CL')}.`;
  if (c.hasError('pattern')) return 'El precio debe ser un número entero, sin decimales ni letras.';
  return null;
}

function mensajeStock(c: AbstractControl): string | null {
  if (!c.touched || c.valid) return null;
  if (c.hasError('required')) return 'El stock es obligatorio.';
  if (c.hasError('min')) return 'El stock no puede ser negativo.';
  if (c.hasError('max')) return `El stock no puede superar ${STOCK_MAX.toLocaleString('es-CL')} unidades.`;
  if (c.hasError('pattern')) return 'El stock debe ser un número entero, sin decimales ni letras.';
  return null;
}

/** Traduce un error del back a un mensaje para el usuario (alta y edición comparten reglas). */
function mensajeErrorApi(apiError: ApiError, accion: string): string {
  if (apiError.status === 403) return `No tienes permisos para ${accion} productos`;
  if (apiError.status === 401) return 'Tu sesión expiró. Vuelve a iniciar sesión.';
  if (apiError.status === 0 || apiError.status >= 500) return 'El servicio no está disponible. Inténtalo de nuevo.';
  return apiError.mensaje || `No se pudo ${accion} el producto.`;
}

@Component({
  selector: 'app-catalogo-admin',
  imports: [ReactiveFormsModule, CurrencyPipe, Pagination, CatalogoFiltros],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './catalogo-admin.html',
})
export class CatalogoAdmin implements OnInit {
  private readonly catalogoService = inject(CatalogoService);
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly productos = signal<Producto[]>([]);
  protected readonly busqueda = signal('');
  protected readonly orden = signal<OrdenCatalogo>('ninguno');
  protected readonly resultado = computed(() =>
    filtrarYOrdenarProductos(this.productos(), this.busqueda(), this.orden()),
  );

  protected readonly pagina = signal(leerPaginaDeUrl(this.route));
  protected readonly tamanoPagina = PRODUCTOS_POR_PAGINA;
  protected readonly productosPagina = computed(() => {
    const inicio = (this.pagina() - 1) * PRODUCTOS_POR_PAGINA;
    return this.resultado().slice(inicio, inicio + PRODUCTOS_POR_PAGINA);
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
    precio: [null as number | null, PRECIO_VALIDATORS],
    stock: [null as number | null, STOCK_VALIDATORS],
  });

  // Edición en línea de precio/stock (PUT). Solo una fila a la vez.
  private readonly injector = inject(Injector);
  protected readonly editandoId = signal<number | null>(null);
  protected readonly guardandoEdicion = signal(false);
  protected readonly errorEdicion = signal('');
  protected readonly erroresEdicion = signal<Record<string, string>>({});
  protected readonly formEdicion = this.fb.group({
    precio: [null as number | null, PRECIO_VALIDATORS],
    stock: [null as number | null, STOCK_VALIDATORS],
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
    return mensajePrecio(this.form.controls.precio);
  }

  protected get errorStock(): string | null {
    return mensajeStock(this.form.controls.stock);
  }

  protected get errorPrecioEdicion(): string | null {
    return mensajePrecio(this.formEdicion.controls.precio);
  }

  protected get errorStockEdicion(): string | null {
    return mensajeStock(this.formEdicion.controls.stock);
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
        } else {
          this.errorGuardar.set(mensajeErrorApi(apiError, 'crear'));
        }
      },
    });
  }

  protected editar(producto: Producto): void {
    this.editandoId.set(producto.id);
    this.formEdicion.reset({ precio: producto.precio, stock: producto.stock });
    this.errorEdicion.set('');
    this.erroresEdicion.set({});
    this.enfocar(`precio-${producto.id}`);
  }

  protected cancelarEdicion(): void {
    const id = this.editandoId();
    this.editandoId.set(null);
    if (id !== null) this.enfocar(`editar-${id}`);
  }

  protected guardarEdicion(producto: Producto): void {
    if (this.guardandoEdicion()) return;
    if (this.formEdicion.invalid) {
      this.formEdicion.markAllAsTouched();
      return;
    }

    const { precio, stock } = this.formEdicion.getRawValue();
    const cambios: ActualizacionProducto = { precio: precio!, stock: stock! };

    this.guardandoEdicion.set(true);
    this.errorEdicion.set('');
    this.erroresEdicion.set({});
    this.catalogoService.actualizarProducto(producto.id, cambios).subscribe({
      next: (actualizado) => {
        this.productos.update((lista) => lista.map((p) => (p.id === actualizado.id ? actualizado : p)));
        this.guardandoEdicion.set(false);
        this.cancelarEdicion();
      },
      error: (e: unknown) => {
        const apiError: ApiError = esApiError(e) ? e : { status: 0, mensaje: '' };
        this.guardandoEdicion.set(false);
        if (apiError.status === 400 && apiError.detalles) {
          this.erroresEdicion.set(apiError.detalles);
          this.errorEdicion.set('Revisa los campos marcados.');
        } else if (apiError.status === 404) {
          this.errorEdicion.set('El producto ya no existe. Recarga la lista.');
        } else {
          this.errorEdicion.set(mensajeErrorApi(apiError, 'editar'));
        }
      },
    });
  }

  /** Mueve el foco tras el próximo render (el elemento destino puede no existir todavía). */
  private enfocar(id: string): void {
    afterNextRender(() => document.getElementById(id)?.focus(), { injector: this.injector });
  }
}
