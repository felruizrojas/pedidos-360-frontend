import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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
      error: (error) => {
        console.error('Error al obtener los productos:', error);
        this.errorCarga.set('No se pudieron cargar los productos.');
        this.cargando.set(false);
      },
    });
  }

  protected alternarForm(): void {
    this.mostrarForm.update((abierto) => !abierto);
    this.errorGuardar.set('');
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
    this.catalogoService.crearProducto(nuevo).subscribe({
      next: (creado) => {
        this.productos.update((lista) => [...lista, creado]);
        this.form.reset();
        this.mostrarForm.set(false);
        this.guardando.set(false);
      },
      error: (error) => {
        console.error('Error al crear el producto:', error);
        this.errorGuardar.set('No se pudo crear el producto. Revisa los datos e inténtalo de nuevo.');
        this.guardando.set(false);
      },
    });
  }
}
