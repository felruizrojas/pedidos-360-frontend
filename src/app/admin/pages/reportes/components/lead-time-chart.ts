import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { LeadTime } from '../../../../core/models/report.model';
import { formatearMinutos } from '../../../../core/utils/formato';
import { BarChart, BarraDato } from '../../../../shared/components/bar-chart/bar-chart';

/** Límite superior (min) de cada bucket de report, para destacar dónde cae el p50. */
const HASTA_MIN: Record<string, number> = { '<30m': 30, '30-60m': 60, '1-2h': 120, '2-4h': 240, '4-8h': 480, '>8h': Infinity };

/** LeadTimeChart del PDF: distribución del tiempo creado → entregado, con promedio, p50 y p90 destacados. */
@Component({
  selector: 'app-lead-time-chart',
  imports: [BarChart],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dl class="grid grid-cols-3 gap-2 mb-3 text-center">
      @for (m of metricas(); track m.nombre) {
        <div class="rounded-xl bg-indigo-50 px-2 py-2">
          <dt class="text-xs font-medium text-indigo-700">{{ m.nombre }}</dt>
          <dd class="text-base font-bold text-gray-900">{{ m.valor }}</dd>
        </div>
      }
    </dl>
    <p class="text-xs text-gray-500 mb-1">{{ datos().leadTime.muestras }} {{ datos().leadTime.muestras === 1 ? 'pedido entregado' : 'pedidos entregados' }}</p>
    <app-bar-chart [datos]="barras()" titulo="Distribución del lead time" etiquetaCategoria="Lead time" etiquetaValor="Pedidos" />
  `,
})
export class LeadTimeChart {
  readonly datos = input.required<LeadTime>();

  protected readonly metricas = computed(() => {
    const lt = this.datos().leadTime;
    return [
      { nombre: 'Promedio', valor: formatearMinutos(lt.promedioMin) },
      { nombre: 'p50', valor: formatearMinutos(lt.p50Min) },
      { nombre: 'p90', valor: formatearMinutos(lt.p90Min) },
    ];
  });

  protected readonly barras = computed<BarraDato[]>(() => {
    const p50 = this.datos().leadTime.p50Min;
    const bucketP50 = p50 === null ? null : this.datos().distribucion.find((b) => p50 < (HASTA_MIN[b.bucket] ?? Infinity));
    return this.datos().distribucion.map((b) => ({
      etiqueta: b.bucket,
      valor: b.cantidad,
      destacada: b === bucketP50,
      detalle: b === bucketP50 ? 'aquí cae el p50' : undefined,
    }));
  });
}
