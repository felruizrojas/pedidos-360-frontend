import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiError, esApiError } from '../../../core/models/api-error.model';
import { NuevoProducto, Producto } from '../../../core/models/producto.model';
import { CatalogoService } from '../../../core/services/catalogo';

@Component({
  selector: 'app-catalogo-admin',
  imports: [ReactiveFormsModule, CurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './catalogo-admin.html',
})
export class CatalogoAdmin implements OnInit {
  private readonly catalogoService = inject(CatalogoService);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly productos = signal<Producto[]>([]);
  protected readonly cargando = signal(true);
  protected readonly errorCarga = signal('');
  protected readonly mostrarForm = signal(false);
  protected readonly guardando = signal(false);
  protected readonly errorGuardar = signal('');
  /** Errores de validación 400 del backend por campo. */
  protected readonly erroresCampo = signal<Record<string, string>>({});

  protected readonly form = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(255)]],
    descripcion: [''],
    precio: [null as number | null, [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]],
    stock: [null as number | null, [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)]],
  });

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set('');
    this.catalogoService.obtenerProductos().subscribe({
      next: (productos) => {
        this.productos.set(productos);
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
