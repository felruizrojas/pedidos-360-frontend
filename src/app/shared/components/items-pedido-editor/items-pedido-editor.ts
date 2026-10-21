import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { Producto } from '../../../core/models/producto.model';
import { CANTIDAD_MAXIMA } from '../../../core/services/carrito';

/** Línea editable: precio referencial (orders lo recalcula desde catalog). */
export interface ItemEditable {
  productoId: number;
  nombre: string;
  precio: number;
  cantidad: number;
  /** Tope de cantidad en la UI; 0 = sin dato (se usa CANTIDAD_MAXIMA). */
  stock: number;
}

/**
 * Lista editable de ítems de un pedido (cantidad y quitar) y, si recibe `productos`, un selector para
 * agregar otro. No guarda estado: emite los cambios y el padre decide (carrito o edición de un pedido).
 * `errores` son los 400 del back por campo, con claves como "items[0].cantidad".
 */
@Component({
  selector: 'app-items-pedido-editor',
  imports: [CurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (items().length === 0) {
      <p class="text-sm text-gray-600">No hay productos en el pedido.</p>
    } @else {
      <ul class="divide-y divide-gray-100" aria-label="Productos del pedido">
        @for (item of items(); track item.productoId; let i = $index) {
          <li class="py-3 flex flex-wrap items-center gap-3">
            <div class="flex-1 min-w-40">
              <p class="font-medium text-gray-900">{{ item.nombre }}</p>
              <p class="text-xs text-gray-500">{{ item.precio | currency: 'CLP' : 'symbol-narrow' : '1.0-0' }} c/u (referencial)</p>
            </div>
            <label class="text-sm text-gray-700 flex items-center gap-2">
              <span>Cantidad</span>
              <input type="number" min="1" step="1" [attr.max]="tope(item)" [value]="item.cantidad"
                [attr.aria-label]="'Cantidad de ' + item.nombre"
                [attr.aria-invalid]="!!errores()['items[' + i + '].cantidad']"
                (change)="onCantidad(item, $any($event.target))"
                class="w-20 rounded-lg border border-gray-300 px-2 py-1 focus-visible:outline-2 focus-visible:outline-indigo-600" />
            </label>
            <span class="w-24 text-right text-sm font-semibold text-gray-900">
              {{ item.precio * item.cantidad | currency: 'CLP' : 'symbol-narrow' : '1.0-0' }}
            </span>
            <button type="button" (click)="quitar.emit(item.productoId)" [attr.aria-label]="'Quitar ' + item.nombre + ' del pedido'"
              class="text-sm font-medium text-red-700 hover:underline cursor-pointer focus-visible:outline-2 focus-visible:outline-indigo-600">
              Quitar
            </button>
            @for (clave of ['items[' + i + '].cantidad', 'items[' + i + '].productoId']; track clave) {
              @if (errores()[clave]; as mensaje) {
                <p role="alert" class="basis-full text-sm text-red-700">{{ mensaje }}</p>
              }
            }
          </li>
        }
      </ul>
    }

    @if (productos(); as lista) {
      @if (productosParaAgregar().length > 0) {
        <div class="mt-3 flex flex-wrap items-end gap-2">
          <label class="text-sm text-gray-700 flex-1 min-w-48">
            <span class="block font-medium">Agregar producto</span>
            <select [value]="seleccionado()" (change)="seleccionado.set($any($event.target).value)"
              class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 bg-white focus-visible:outline-2 focus-visible:outline-indigo-600">
              <option value="">Selecciona un producto…</option>
              @for (p of productosParaAgregar(); track p.id) {
                <option [value]="p.id">{{ p.nombre }} ({{ p.precio | currency: 'CLP' : 'symbol-narrow' : '1.0-0' }})</option>
              }
            </select>
          </label>
          <button type="button" (click)="onAgregar(lista)" [disabled]="!seleccionado()"
            class="px-4 py-2 rounded-lg border border-indigo-600 text-indigo-700 font-medium hover:bg-indigo-50 disabled:opacity-40 cursor-pointer focus-visible:outline-2 focus-visible:outline-indigo-600">
            Agregar al pedido
          </button>
        </div>
      }
    }
  `,
})
export class ItemsPedidoEditor {
  readonly items = input.required<ItemEditable[]>();
  /** Si viene, se muestra el selector para agregar productos que aún no están en la lista. */
  readonly productos = input<Producto[] | null>(null);
  readonly errores = input<Record<string, string>>({});

  readonly cantidadCambiada = output<{ productoId: number; cantidad: number }>();
  readonly quitar = output<number>();
  readonly agregar = output<Producto>();

  protected readonly seleccionado = signal('');

  protected readonly productosParaAgregar = computed(() => {
    const enLista = new Set(this.items().map((i) => i.productoId));
    return (this.productos() ?? []).filter((p) => p.stock > 0 && !enLista.has(p.id));
  });

  protected tope(item: ItemEditable): number {
    return item.stock > 0 ? Math.min(item.stock, CANTIDAD_MAXIMA) : CANTIDAD_MAXIMA;
  }

  protected onCantidad(item: ItemEditable, campo: HTMLInputElement): void {
    const valor = campo.valueAsNumber;
    if (Number.isInteger(valor) && valor > 0) {
      const cantidad = Math.min(valor, this.tope(item));
      campo.value = String(cantidad);
      this.cantidadCambiada.emit({ productoId: item.productoId, cantidad });
    } else {
      // Vacío, 0 o decimal: se repone la cantidad vigente (el binding no repinta si el valor no cambió).
      campo.value = String(item.cantidad);
    }
  }

  protected onAgregar(lista: Producto[]): void {
    const producto = lista.find((p) => String(p.id) === this.seleccionado());
    if (producto) {
      this.agregar.emit(producto);
      this.seleccionado.set('');
    }
  }
}
