import { ActivatedRoute, Params, Router } from '@angular/router';

/** Nombre del query param usado para reflejar la página actual del listado. */
const QUERY_PARAM_PAGINA = 'pagina';

/**
 * Lee la página inicial desde el query param `?pagina=` de la URL actual
 * (por ejemplo al hacer F5 en `/dashboard/catalogo?pagina=2`).
 * Devuelve 1 si el param no existe o no es un entero positivo válido.
 */
export function leerPaginaDeUrl(route: ActivatedRoute): number {
  const raw = Number(route.snapshot.queryParamMap.get(QUERY_PARAM_PAGINA));
  return Number.isInteger(raw) && raw > 0 ? raw : 1;
}

/**
 * Actualiza el query param `?pagina=` para que quede en sync con la página
 * mostrada, sin apilar una entrada de historial por cada click (replaceUrl)
 * y sin ensuciar la URL cuando se está en la página 1 (se omite el param).
 */
export function actualizarPaginaEnUrl(router: Router, route: ActivatedRoute, pagina: number): void {
  const queryParams: Params = { [QUERY_PARAM_PAGINA]: pagina > 1 ? pagina : null };
  void router.navigate([], {
    relativeTo: route,
    queryParams,
    queryParamsHandling: 'merge',
    replaceUrl: true,
  });
}
