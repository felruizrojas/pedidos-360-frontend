import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DIRECCION_MAX_LENGTH } from '../../../core/models/pedido.model';
import { CarritoService } from '../../../core/services/carrito';
import { PedidosService } from '../../../core/services/pedidos';
import { ItemEditable, ItemsPedidoEditor } from '../../../shared/components/items-pedido-editor/items-pedido-editor';
import { aApiError, mensajeErrorPedido } from '../pedidos-errores';

/** /pedidos/nuevo: revisa el carrito, pide la dirección y crea el pedido (queda en CREADO). */
@Component({
  selector: 'app-nuevo-pedido',
  imports: [CurrencyPipe, ReactiveFormsModule, RouterLink, ItemsPedidoEditor],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './nuevo-pedido.html',
})
export class NuevoPedido {
  protected readonly carrito = inject(CarritoService);
  private readonly pedidosService = inject(PedidosService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly DIRECCION_MAX_LENGTH = DIRECCION_MAX_LENGTH;

  protected readonly items = computed<ItemEditable[]>(() => this.carrito.items());
  protected readonly enviando = signal(false);
  protected readonly errorEnvio = signal('');
  /** Errores 400 del back por campo (direccionEntrega, items, items[0].cantidad…). */
  protected readonly erroresCampo = signal<Record<string, string>>({});

  protected readonly form = this.fb.group({
    direccionEntrega: ['', [Validators.required, Validators.maxLength(DIRECCION_MAX_LENGTH)]],
  });

  protected get errorDireccion(): string | null {
    const c = this.form.controls.direccionEntrega;
    if (!c.touched || c.valid) return null;
    if (c.hasError('required')) return 'La dirección de entrega es obligatoria.';
    if (c.hasError('maxlength')) return `La dirección de entrega no puede superar los ${DIRECCION_MAX_LENGTH} caracteres.`;
    return null;
  }

  protected crear(): void {
    this.form.markAllAsTouched();
    const direccion = this.form.controls.direccionEntrega.value.trim();
    if (!direccion) this.form.controls.direccionEntrega.setValue('');
    if (this.form.invalid || this.carrito.vacio()) return;

    this.enviando.set(true);
    this.errorEnvio.set('');
    this.erroresCampo.set({});
    const items = this.carrito.items().map((i) => ({ productoId: i.productoId, cantidad: i.cantidad }));
    this.pedidosService.crearPedido({ direccionEntrega: direccion, items }).subscribe({
      next: (pedido) => {
        this.enviando.set(false);
        this.carrito.vaciar();
        void this.router.navigate(['/pedidos', pedido.id]);
      },
      error: (e: unknown) => {
        const apiError = aApiError(e);
        this.enviando.set(false);
        if (apiError.status === 400 && apiError.detalles) {
          this.erroresCampo.set(apiError.detalles);
        }
        this.errorEnvio.set(mensajeErrorPedido(apiError, 'crear el pedido'));
      },
    });
  }
}
