import { HttpParams } from '@angular/common/http';

type Valor = string | number | boolean | null | undefined;

/**
 * HttpParams sin los valores vacíos (null, undefined o ''), como hace PedidosService. Un arreglo se envía como
 * parámetro repetido (?accion=A&accion=B), que es lo que esperan audit y el BFF.
 */
export function paramsSinVacios(filtros: Record<string, Valor | readonly Valor[]>): HttpParams {
  let params = new HttpParams();
  for (const [clave, valor] of Object.entries(filtros)) {
    const valores = Array.isArray(valor) ? valor : [valor];
    for (const v of valores) {
      if (v !== null && v !== undefined && v !== '') {
        params = params.append(clave, String(v));
      }
    }
  }
  return params;
}
