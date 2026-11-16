import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { OrdenTopParam, TopProductos } from '../../../../core/models/report.model';
import { formatearCLP, formatearEntero } from '../../../../core/utils/formato';
import { BarChart, BarraDato } from '../../../../shared/components/bar-chart/bar-chart';

/** TopProductsChart del PDF: productos más vendidos (barras horizontales), por cantidad o por monto. */
@Component({
  selector: 'app-top-products-chart',
  imports: [BarChart],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="inline-flex rounded-lg border border-gray-200 p-0.5 mb-2" role="group" aria-label="Ordenar productos por">
      @for (o of opciones; track o.valor) {
        <button type="button" (click)="ordenCambio.emit(o.valor)" [attr.aria-pressed]="orden() === o.valor"
          class="px-3 py-1 text-sm rounded-md cursor-pointer focus-visible:outline-2 focus-visible:outline-indigo-600"
          [class]="orden() === o.valor ? 'bg-indigo-600 text-white font-semibold' : 'text-gray-700 hover:bg-gray-50'">
          {{ o.etiqueta }}
        </button>
      }
    </div>
    <app-bar-chart [datos]="barras()" orientacion="horizontal" [titulo]="titulo()" [formatoValor]="formato()"
      etiquetaCategoria="Producto" [etiquetaValor]="orden() === 'monto' ? 'Monto' : 'Unidades'"
      [etiquetaDetalle]="orden() === 'monto' ? 'Unidades' : 'Monto'" />
  `,
})
export class TopProductsChart {
  readonly datos = input.required<TopProductos>();
  readonly ordenCambio = output<OrdenTopParam>();

  protected readonly opciones: { valor: OrdenTopParam; etiqueta: string }[] = [
    { valor: 'cantidad', etiqueta: 'Cantidad' },
    { valor: 'monto', etiqueta: 'Monto' },
  ];
  protected readonly orden = computed<OrdenTopParam>(() => (this.datos().orden === 'MONTO' ? 'monto' : 'cantidad'));
  protected readonly titulo = computed(() =>
    this.orden() === 'monto' ? 'Productos más vendidos por monto' : 'Productos más vendidos por cantidad',
  );
  protected readonly formato = computed(() => (this.orden() === 'monto' ? formatearCLP : formatearEntero));
  protected readonly barras = computed<BarraDato[]>(() =>
    this.datos().productos.map((p) =>
      this.orden() === 'monto'
        ? { etiqueta: p.productoNombre, valor: p.monto, detalle: `${formatearEntero(p.cantidad)} u.` }
        : { etiqueta: p.productoNombre, valor: p.cantidad, detalle: formatearCLP(p.monto) },
    ),
  );
}
