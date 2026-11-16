import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { formatearEntero } from '../../../core/utils/formato';

/** Una barra: etiqueta del eje, valor (define el largo) y un detalle opcional para el tooltip y la tabla. */
export interface BarraDato {
  etiqueta: string;
  valor: number;
  detalle?: string;
  /** Se pinta con un color más intenso (p. ej. el bucket donde cae el p50). */
  destacada?: boolean;
}

interface Barra extends BarraDato {
  x: number;
  y: number;
  ancho: number;
  alto: number;
  texto: string;
  /** Etiqueta del eje (las que no caben quedan en blanco; el texto completo va en el tooltip). */
  rotulo: string;
}

let secuencia = 0;

const ANCHO = 640;
const ALTO_VERTICAL = 260;
const MARGEN = { arriba: 12, derecha: 12, abajo: 36, izquierda: 64 };
const ALTO_FILA = 30;
const ANCHO_ETIQUETA = 150;
const MAX_ROTULOS = 12;

/**
 * Gráfico de barras en SVG hecho a mano (sin librerías: jsdom/Vitest lo pueden inspeccionar, a diferencia de un
 * canvas). Vertical u horizontal, responsive con viewBox, `<title>` por barra (tooltip nativo), estado vacío y
 * "Ver como tabla" como alternativa accesible.
 */
@Component({
  selector: 'app-bar-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (vacio()) {
      <p role="status" class="py-10 text-center text-sm text-gray-500">Sin datos en este rango</p>
    } @else {
      <div class="flex justify-end">
        <button type="button" (click)="verTabla.set(!verTabla())" [attr.aria-pressed]="verTabla()"
          class="text-xs font-medium text-indigo-700 px-2 py-1 rounded-lg hover:bg-indigo-50 cursor-pointer focus-visible:outline-2 focus-visible:outline-indigo-600">
          {{ verTabla() ? 'Ver como gráfico' : 'Ver como tabla' }}
        </button>
      </div>

      @if (verTabla()) {
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <caption class="sr-only">{{ titulo() }}</caption>
            <thead class="text-left text-gray-600">
              <tr>
                <th scope="col" class="py-1 pr-3 font-semibold">{{ etiquetaCategoria() }}</th>
                <th scope="col" class="py-1 pr-3 font-semibold text-right">{{ etiquetaValor() }}</th>
                @if (etiquetaDetalle(); as d) {
                  <th scope="col" class="py-1 font-semibold text-right">{{ d }}</th>
                }
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              @for (b of barras(); track $index) {
                <tr>
                  <td class="py-1 pr-3 text-gray-700">{{ b.etiqueta }}</td>
                  <td class="py-1 pr-3 text-right text-gray-900 tabular-nums">{{ b.texto }}</td>
                  @if (etiquetaDetalle()) {
                    <td class="py-1 text-right text-gray-700 tabular-nums">{{ b.detalle ?? '—' }}</td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <svg [attr.viewBox]="'0 0 ' + ancho + ' ' + alto()" class="w-full h-auto" role="img"
          [attr.aria-labelledby]="idTitulo" preserveAspectRatio="xMidYMid meet">
          <title [attr.id]="idTitulo">{{ titulo() }}</title>
          @if (orientacion() === 'vertical') {
            <!-- Eje Y: líneas guía y valores -->
            @for (t of marcas(); track $index) {
              <line class="guia" [attr.x1]="margen.izquierda" [attr.x2]="ancho - margen.derecha"
                [attr.y1]="t.y" [attr.y2]="t.y" stroke="#e5e7eb" stroke-width="1" />
              <text [attr.x]="margen.izquierda - 6" [attr.y]="t.y + 4" text-anchor="end" font-size="11" fill="#6b7280">{{ t.texto }}</text>
            }
            @for (b of barras(); track $index) {
              <rect class="barra" [attr.x]="b.x" [attr.y]="b.y" [attr.width]="b.ancho" [attr.height]="b.alto" rx="3"
                [attr.fill]="b.destacada ? '#4338ca' : '#818cf8'">
                <title>{{ tooltip(b) }}</title>
              </rect>
              @if (b.rotulo) {
                <text class="rotulo" [attr.x]="b.x + b.ancho / 2" [attr.y]="alto() - margen.abajo + 16" text-anchor="middle"
                  font-size="11" fill="#374151">{{ b.rotulo }}</text>
              }
            }
            <line [attr.x1]="margen.izquierda" [attr.x2]="ancho - margen.derecha" [attr.y1]="alto() - margen.abajo"
              [attr.y2]="alto() - margen.abajo" stroke="#9ca3af" stroke-width="1" />
          } @else {
            @for (b of barras(); track $index) {
              <text class="rotulo" [attr.x]="anchoEtiqueta - 8" [attr.y]="b.y + b.alto / 2 + 4" text-anchor="end"
                font-size="12" fill="#374151">{{ b.rotulo }}</text>
              <rect class="barra" [attr.x]="b.x" [attr.y]="b.y" [attr.width]="b.ancho" [attr.height]="b.alto" rx="3"
                [attr.fill]="b.destacada ? '#4338ca' : '#818cf8'">
                <title>{{ tooltip(b) }}</title>
              </rect>
              <text class="valor" [attr.x]="b.x + b.ancho + 6" [attr.y]="b.y + b.alto / 2 + 4" font-size="12" fill="#111827">{{ b.texto }}</text>
            }
          }
        </svg>
      }
    }
  `,
})
export class BarChart {
  readonly datos = input.required<readonly BarraDato[]>();
  /** Título accesible del gráfico (y caption de la tabla). */
  readonly titulo = input.required<string>();
  readonly orientacion = input<'vertical' | 'horizontal'>('vertical');
  readonly formatoValor = input<(valor: number) => string>((v) => formatearEntero(v));
  readonly etiquetaCategoria = input('Categoría');
  readonly etiquetaValor = input('Valor');
  /** Encabezado de la columna "detalle" en la tabla; null = sin columna. */
  readonly etiquetaDetalle = input<string | null>(null);

  protected readonly verTabla = signal(false);
  protected readonly ancho = ANCHO;
  protected readonly margen = MARGEN;
  protected readonly anchoEtiqueta = ANCHO_ETIQUETA;
  protected readonly idTitulo = `grafico-${++secuencia}`;

  protected readonly vacio = computed(() => this.datos().length === 0 || this.datos().every((d) => !d.valor));
  private readonly maximo = computed(() => Math.max(...this.datos().map((d) => d.valor), 0) || 1);

  protected readonly alto = computed(() =>
    this.orientacion() === 'vertical'
      ? ALTO_VERTICAL
      : MARGEN.arriba + this.datos().length * ALTO_FILA + MARGEN.arriba,
  );

  protected readonly barras = computed<Barra[]>(() => {
    const datos = this.datos();
    const max = this.maximo();
    const formato = this.formatoValor();
    if (this.orientacion() === 'vertical') {
      const altoUtil = ALTO_VERTICAL - MARGEN.arriba - MARGEN.abajo;
      const paso = (ANCHO - MARGEN.izquierda - MARGEN.derecha) / Math.max(datos.length, 1);
      const cadaCuanto = Math.ceil(datos.length / MAX_ROTULOS);
      return datos.map((d, i) => {
        const alto = (Math.max(d.valor, 0) / max) * altoUtil;
        return {
          ...d,
          x: MARGEN.izquierda + i * paso + paso * 0.15,
          y: MARGEN.arriba + altoUtil - alto,
          ancho: paso * 0.7,
          alto,
          texto: formato(d.valor),
          rotulo: i % cadaCuanto === 0 ? d.etiqueta : '',
        };
      });
    }
    const anchoUtil = ANCHO - ANCHO_ETIQUETA - 90;
    return datos.map((d, i) => ({
      ...d,
      x: ANCHO_ETIQUETA,
      y: MARGEN.arriba + i * ALTO_FILA + 4,
      ancho: (Math.max(d.valor, 0) / max) * anchoUtil,
      alto: ALTO_FILA - 8,
      texto: formato(d.valor),
      rotulo: d.etiqueta.length > 20 ? d.etiqueta.slice(0, 19) + '…' : d.etiqueta,
    }));
  });

  /** Líneas guía del eje Y: 0, mitad y máximo. */
  protected readonly marcas = computed(() => {
    const altoUtil = ALTO_VERTICAL - MARGEN.arriba - MARGEN.abajo;
    const max = this.maximo();
    const formato = this.formatoValor();
    return [0, 0.5, 1].map((f) => ({ y: MARGEN.arriba + altoUtil - f * altoUtil, texto: formato(max * f) }));
  });

  protected tooltip(b: Barra): string {
    return `${b.etiqueta}: ${b.texto}${b.detalle ? ' · ' + b.detalle : ''}`;
  }
}
