import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { sanearSoloLetras } from '../../../core/utils/producto-validators';
import { ORDEN_CATALOGO_OPCIONES, OrdenCatalogo, esOrdenCatalogo } from '../../../core/models/orden-catalogo.model';

/**
 * Barra de filtros del catálogo (buscador por nombre + orden por precio + limpiar),
 * en una sola fila a lo ancho de la página. Reutilizada por el catálogo público y
 * por el catálogo del dashboard: es "tonta" (controlada por el padre vía input/output),
 * así ambos mantienen su propia lógica de filtrado/paginación.
 */
@Component({
  selector: 'app-catalogo-filtros',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './catalogo-filtros.html',
})
export class CatalogoFiltros {
  readonly busqueda = input.required<string>();
  readonly orden = input.required<OrdenCatalogo>();

  readonly busquedaCambiada = output<string>();
  readonly ordenCambiada = output<OrdenCatalogo>();
  readonly limpiar = output<void>();

  protected readonly opciones = ORDEN_CATALOGO_OPCIONES;
  protected readonly hayFiltrosActivos = computed(() => this.busqueda().length > 0 || this.orden() !== 'ninguno');

  protected onBusqueda(event: Event): void {
    const valor = sanearSoloLetras((event.target as HTMLInputElement).value);
    this.busquedaCambiada.emit(valor);
  }

  protected onOrden(event: Event): void {
    const valor = (event.target as HTMLSelectElement).value;
    if (esOrdenCatalogo(valor)) {
      this.ordenCambiada.emit(valor);
    }
  }
}
