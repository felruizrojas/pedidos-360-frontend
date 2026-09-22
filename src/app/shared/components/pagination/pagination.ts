import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

/**
 * Paginador numerado y reutilizable.
 *
 * El padre es dueño del estado (página actual): este componente solo
 * muestra los controles y emite `paginaCambiada` cuando el usuario navega.
 *
 * Uso típico:
 * ```html
 * <app-pagination
 *   [paginaActual]="pagina()"
 *   [totalItems]="productos().length"
 *   [tamanoPagina]="15"
 *   (paginaCambiada)="pagina.set($event)" />
 * ```
 */
@Component({
  selector: 'app-pagination',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pagination.html',
})
export class Pagination {
  /** Página actualmente seleccionada (1-based). */
  readonly paginaActual = input.required<number>();
  /** Cantidad total de elementos a paginar (sin paginar). */
  readonly totalItems = input.required<number>();
  /** Elementos a mostrar por página. */
  readonly tamanoPagina = input<number>(15);

  readonly paginaCambiada = output<number>();

  protected readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.totalItems() / this.tamanoPagina())),
  );

  /**
   * Genera la lista de "botones" a mostrar: números de página y separadores
   * ('…') cuando hay demasiadas páginas para mostrarlas todas.
   * Siempre incluye la primera, la última, la actual y sus vecinas inmediatas.
   */
  protected readonly paginas = computed<Array<number | '…'>>(() => {
    const total = this.totalPaginas();
    const actual = this.paginaActual();
    const ventana = 1;

    const paginasVisibles = new Set<number>([
      1,
      total,
      ...Array.from({ length: ventana * 2 + 1 }, (_, i) => actual - ventana + i).filter(
        (p) => p >= 1 && p <= total,
      ),
    ]);

    const ordenadas = [...paginasVisibles].sort((a, b) => a - b);

    const resultado: Array<number | '…'> = [];
    let anterior = 0;
    for (const pagina of ordenadas) {
      if (anterior !== 0 && pagina - anterior > 1) {
        resultado.push('…');
      }
      resultado.push(pagina);
      anterior = pagina;
    }
    return resultado;
  });

  protected irA(pagina: number): void {
    const total = this.totalPaginas();
    const destino = Math.min(Math.max(pagina, 1), total);
    if (destino !== this.paginaActual()) {
      this.paginaCambiada.emit(destino);
    }
  }
}
