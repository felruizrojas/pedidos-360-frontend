import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { VentasPorHora } from '../../../../core/models/report.model';
import { formatearCLP } from '../../../../core/utils/formato';
import { BarChart, BarraDato } from '../../../../shared/components/bar-chart/bar-chart';

/** SalesChart del PDF: ventas (monto) por hora, o por día si el rango supera 48 h (lo decide report). */
@Component({
  selector: 'app-sales-chart',
  imports: [BarChart],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="text-sm text-gray-600 mb-2">
      {{ datos().granularidad === 'DIA' ? 'Por día' : 'Por hora' }} · total {{ total() }} en {{ pedidos() }}
      {{ pedidos() === 1 ? 'pedido' : 'pedidos' }}
    </p>
    <app-bar-chart [datos]="barras()" [titulo]="titulo()" [formatoValor]="clp"
      [etiquetaCategoria]="datos().granularidad === 'DIA' ? 'Día' : 'Hora'" etiquetaValor="Ventas" etiquetaDetalle="Pedidos" />
  `,
})
export class SalesChart {
  readonly datos = input.required<VentasPorHora>();

  protected readonly clp = formatearCLP;
  protected readonly titulo = computed(() =>
    this.datos().granularidad === 'DIA' ? 'Ventas por día' : 'Ventas por hora',
  );
  protected readonly barras = computed<BarraDato[]>(() =>
    this.datos().serie.map((p) => ({
      etiqueta: this.rotulo(p.etiqueta),
      valor: p.monto,
      detalle: `${p.pedidos} ${p.pedidos === 1 ? 'pedido' : 'pedidos'}`,
    })),
  );
  protected readonly total = computed(() => formatearCLP(this.datos().serie.reduce((s, p) => s + p.monto, 0)));
  protected readonly pedidos = computed(() => this.datos().serie.reduce((s, p) => s + p.pedidos, 0));

  /** HORA: "13-11 13:00" → "13:00". DIA: "2026-11-13" → "13-11". */
  private rotulo(etiqueta: string): string {
    if (this.datos().granularidad === 'DIA') {
      const [, mes, dia] = etiqueta.split('-');
      return dia && mes ? `${dia}-${mes}` : etiqueta;
    }
    return etiqueta.split(' ')[1] ?? etiqueta;
  }
}
