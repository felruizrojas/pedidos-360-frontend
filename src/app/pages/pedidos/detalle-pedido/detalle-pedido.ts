import { CurrencyPipe, DatePipe, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiError } from '../../../core/models/api-error.model';
import {
  ActualizarPedidoRequest,
  COMENTARIO_MAX_LENGTH,
  DIRECCION_MAX_LENGTH,
  EstadoPedido,
  HistorialEstado,
  Pedido,
} from '../../../core/models/pedido.model';
import { Producto } from '../../../core/models/producto.model';
import { AuthState } from '../../../core/services/auth-state';
import { CatalogoService } from '../../../core/services/catalogo';
import { PedidosService } from '../../../core/services/pedidos';
import {
  ACCION_ESTADO,
  ETIQUETA_ESTADO,
  esSoloCliente,
  puedeEditar,
  puedeEliminar,
  transicionesPermitidas,
} from '../../../core/utils/estados-pedido';
import { EstadoPedidoBadge } from '../../../shared/components/estado-pedido-badge/estado-pedido-badge';
import { ItemEditable, ItemsPedidoEditor } from '../../../shared/components/items-pedido-editor/items-pedido-editor';
import { aApiError, mensajeErrorPedido } from '../pedidos-errores';

/**
 * /pedidos/:id y /dashboard/pedidos/:id: detalle, historial, transiciones según rol y estado, edición en CREADO y borrado (Operador).
 * Los botones son una ayuda: orders es la autoridad y, si responde 409/403, se muestra su mensaje.
 */
@Component({
  selector: 'app-detalle-pedido',
  imports: [CurrencyPipe, DatePipe, NgTemplateOutlet, RouterLink, ReactiveFormsModule, EstadoPedidoBadge, ItemsPedidoEditor],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './detalle-pedido.html',
})
export class DetallePedido implements OnInit {
  private readonly pedidosService = inject(PedidosService);
  private readonly catalogoService = inject(CatalogoService);
  private readonly authState = inject(AuthState);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly ETIQUETA_ESTADO = ETIQUETA_ESTADO;
  protected readonly ACCION_ESTADO = ACCION_ESTADO;
  protected readonly DIRECCION_MAX_LENGTH = DIRECCION_MAX_LENGTH;
  protected readonly COMENTARIO_MAX_LENGTH = COMENTARIO_MAX_LENGTH;

  /** data.dashboard de la ruta: dentro del layout de administración (ver admin.routes.ts). */
  protected readonly enDashboard = this.route.snapshot?.data['dashboard'] === true;
  protected readonly basePedidos = this.enDashboard ? '/dashboard/pedidos' : '/pedidos';

  private id = 0;
  protected readonly pedido = signal<Pedido | null>(null);
  protected readonly cargando = signal(true);
  protected readonly errorCarga = signal<ApiError | null>(null);
  protected readonly mensajeErrorCarga = computed(() => {
    const e = this.errorCarga();
    if (!e) return '';
    return e.status === 404 ? 'El pedido no existe o no tienes acceso a él.' : mensajeErrorPedido(e, 'ver este pedido');
  });

  protected readonly historial = signal<HistorialEstado[]>([]);
  protected readonly errorHistorial = signal('');

  /** Resultado de la última acción (transición, edición): uno de los dos a la vez. */
  protected readonly errorAccion = signal('');
  protected readonly mensajeExito = signal('');

  private readonly roles = computed(() => this.authState.roles());
  protected readonly soloCliente = computed(() => esSoloCliente(this.roles()));
  protected readonly transiciones = computed(() => {
    const p = this.pedido();
    return p ? transicionesPermitidas(p.estado, this.roles()) : [];
  });
  protected readonly editable = computed(() => {
    const p = this.pedido();
    return !!p && puedeEditar(p.estado, this.roles());
  });
  protected readonly eliminable = computed(() => {
    const p = this.pedido();
    return !!p && puedeEliminar(p.estado, this.roles());
  });

  // --- Cambio de estado (confirmación en línea con comentario) ---
  protected readonly destino = signal<EstadoPedido | null>(null);
  protected readonly enviandoEstado = signal(false);
  protected readonly formEstado = this.fb.group({
    comentario: ['', [Validators.maxLength(COMENTARIO_MAX_LENGTH)]],
  });
  private get comentario() {
    return this.formEstado.controls.comentario;
  }
  protected readonly comentarioEnviado = signal(false);

  protected get errorComentario(): string | null {
    const c = this.comentario;
    if (!this.comentarioEnviado() && !c.touched) return null;
    if (this.destino() === 'CANCELADO' && !c.value.trim()) return 'Indica el motivo de la cancelación.';
    if (c.hasError('maxlength')) return `El comentario no puede superar los ${COMENTARIO_MAX_LENGTH} caracteres.`;
    return null;
  }

  // --- Edición (solo CREADO) ---
  protected readonly editando = signal(false);
  protected readonly guardandoEdicion = signal(false);
  protected readonly itemsEdicion = signal<ItemEditable[]>([]);
  protected readonly productosCatalogo = signal<Producto[] | null>(null);
  protected readonly erroresCampo = signal<Record<string, string>>({});
  protected readonly formEdicion = this.fb.group({
    direccionEntrega: ['', [Validators.required, Validators.maxLength(DIRECCION_MAX_LENGTH)]],
  });
  private get direccion() {
    return this.formEdicion.controls.direccionEntrega;
  }

  protected get errorDireccion(): string | null {
    const c = this.direccion;
    if (!c.touched || c.valid) return null;
    if (c.hasError('required')) return 'La dirección de entrega es obligatoria.';
    if (c.hasError('maxlength')) return `La dirección de entrega no puede superar los ${DIRECCION_MAX_LENGTH} caracteres.`;
    return null;
  }

  // --- Eliminación (Operador) ---
  protected readonly confirmandoEliminar = signal(false);
  protected readonly eliminando = signal(false);

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.id = Number(params.get('id'));
      this.reiniciarAcciones();
      this.cargar();
    });
  }

  protected cargar(): void {
    if (!Number.isInteger(this.id) || this.id <= 0) {
      this.cargando.set(false);
      this.errorCarga.set({ status: 404, mensaje: '' });
      return;
    }
    this.cargando.set(true);
    this.errorCarga.set(null);
    this.pedidosService.obtenerPedido(this.id).subscribe({
      next: (pedido) => {
        this.pedido.set(pedido);
        this.cargando.set(false);
        this.cargarHistorial();
      },
      error: (e: unknown) => {
        const apiError = aApiError(e);
        this.cargando.set(false);
        if (apiError.status === 401) {
          void this.router.navigate(['/login']);
        }
        this.errorCarga.set(apiError);
      },
    });
  }

  /** El historial se pide aparte: si falla, el detalle se sigue mostrando. */
  protected cargarHistorial(): void {
    this.errorHistorial.set('');
    this.pedidosService.obtenerHistorial(this.id).subscribe({
      next: (h) => this.historial.set(h),
      error: (e: unknown) => this.errorHistorial.set(mensajeErrorPedido(aApiError(e), 'ver el historial')),
    });
  }

  private reiniciarAcciones(): void {
    this.errorAccion.set('');
    this.mensajeExito.set('');
    this.destino.set(null);
    this.editando.set(false);
    this.confirmandoEliminar.set(false);
  }

  // --- Cambio de estado ---

  protected elegirDestino(estado: EstadoPedido): void {
    this.reiniciarAcciones();
    this.comentario.reset('');
    this.comentarioEnviado.set(false);
    this.destino.set(estado);
  }

  protected cancelarCambioEstado(): void {
    this.destino.set(null);
  }

  protected confirmarCambioEstado(): void {
    const destino = this.destino();
    if (!destino) return;
    this.comentarioEnviado.set(true);
    if (this.errorComentario) return;

    const comentario = this.comentario.value.trim();
    this.enviandoEstado.set(true);
    this.errorAccion.set('');
    this.pedidosService
      .cambiarEstado(this.id, comentario ? { status: destino, comentario } : { status: destino })
      .subscribe({
        next: (pedido) => {
          this.pedido.set(pedido);
          this.enviandoEstado.set(false);
          this.destino.set(null);
          this.mensajeExito.set(
            pedido.estado === 'CANCELADO'
              ? 'El pedido fue cancelado y ya no aparecerá en la lista de pedidos.'
              : `El pedido pasó a "${ETIQUETA_ESTADO[pedido.estado]}".`,
          );
          this.cargarHistorial();
        },
        error: (e: unknown) => {
          this.enviandoEstado.set(false);
          this.errorAccion.set(mensajeErrorPedido(aApiError(e), 'cambiar el estado de este pedido'));
        },
      });
  }

  // --- Edición ---

  protected iniciarEdicion(): void {
    const p = this.pedido();
    if (!p) return;
    this.reiniciarAcciones();
    this.erroresCampo.set({});
    this.direccion.reset(p.direccionEntrega);
    this.itemsEdicion.set(
      p.items.map((i) => ({ productoId: i.productoId, nombre: i.productoNombre, precio: i.precioUnitario, cantidad: i.cantidad, stock: 0 })),
    );
    this.editando.set(true);
    // Productos para agregar y stock como tope de cantidad. Si catalog falla, se edita igual sin agregar.
    this.catalogoService.obtenerProductos().subscribe({
      next: (productos) => {
        this.productosCatalogo.set(productos);
        const stock = new Map(productos.map((x) => [x.id, x.stock]));
        this.itemsEdicion.update((items) => items.map((i) => ({ ...i, stock: stock.get(i.productoId) ?? 0 })));
      },
      error: () => this.productosCatalogo.set(null),
    });
  }

  protected cancelarEdicion(): void {
    this.editando.set(false);
  }

  protected cambiarCantidad(cambio: { productoId: number; cantidad: number }): void {
    this.itemsEdicion.update((items) =>
      items.map((i) => (i.productoId === cambio.productoId ? { ...i, cantidad: cambio.cantidad } : i)),
    );
  }

  protected quitarItem(productoId: number): void {
    this.itemsEdicion.update((items) => items.filter((i) => i.productoId !== productoId));
  }

  protected agregarItem(producto: Producto): void {
    this.itemsEdicion.update((items) => [
      ...items,
      { productoId: producto.id, nombre: producto.nombre, precio: producto.precio, cantidad: 1, stock: producto.stock },
    ]);
  }

  protected guardarEdicion(): void {
    const p = this.pedido();
    if (!p) return;
    this.direccion.markAsTouched();
    if (this.direccion.invalid) return;
    if (this.itemsEdicion().length === 0) {
      this.errorAccion.set('El pedido debe tener al menos un producto.');
      return;
    }

    const cambios: ActualizarPedidoRequest = {};
    const direccion = this.direccion.value.trim();
    if (direccion !== p.direccionEntrega) cambios.direccionEntrega = direccion;
    const items = this.itemsEdicion().map((i) => ({ productoId: i.productoId, cantidad: i.cantidad }));
    const itemsOriginales = p.items.map((i) => ({ productoId: i.productoId, cantidad: i.cantidad }));
    if (JSON.stringify(items) !== JSON.stringify(itemsOriginales)) cambios.items = items;
    if (!cambios.direccionEntrega && !cambios.items) {
      this.editando.set(false);
      this.mensajeExito.set('No hubo cambios que guardar.');
      return;
    }

    this.guardandoEdicion.set(true);
    this.errorAccion.set('');
    this.erroresCampo.set({});
    this.pedidosService.actualizarPedido(this.id, cambios).subscribe({
      next: (pedido) => {
        this.pedido.set(pedido);
        this.guardandoEdicion.set(false);
        this.editando.set(false);
        this.mensajeExito.set('Pedido actualizado. Los precios se recalcularon con el catálogo.');
      },
      error: (e: unknown) => {
        const apiError = aApiError(e);
        this.guardandoEdicion.set(false);
        if (apiError.status === 400 && apiError.detalles) {
          this.erroresCampo.set(apiError.detalles);
        }
        this.errorAccion.set(mensajeErrorPedido(apiError, 'editar este pedido'));
      },
    });
  }

  // --- Eliminación ---

  protected pedirConfirmacionEliminar(): void {
    this.reiniciarAcciones();
    this.confirmandoEliminar.set(true);
  }

  protected eliminar(): void {
    this.eliminando.set(true);
    this.errorAccion.set('');
    this.pedidosService.eliminarPedido(this.id).subscribe({
      next: () => {
        this.eliminando.set(false);
        void this.router.navigate([this.basePedidos]);
      },
      error: (e: unknown) => {
        this.eliminando.set(false);
        this.confirmandoEliminar.set(false);
        this.errorAccion.set(mensajeErrorPedido(aApiError(e), 'eliminar este pedido'));
      },
    });
  }
}
