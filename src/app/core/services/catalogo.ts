import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ActualizacionProducto, NuevoProducto, Producto } from '../models/producto.model';

@Injectable({
  providedIn: 'root'
})
export class CatalogoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/api/catalog/products`;

  obtenerProductos(): Observable<Producto[]> {
    return this.http.get<Producto[]>(this.apiUrl);
  }

  obtenerProductoPorId(id: number): Observable<Producto> {
    return this.http.get<Producto>(`${this.apiUrl}/${id}`);
  }

  crearProducto(producto: NuevoProducto): Observable<Producto> {
    return this.http.post<Producto>(this.apiUrl, producto);
  }

  actualizarProducto(id: number, cambios: ActualizacionProducto): Observable<Producto> {
    return this.http.put<Producto>(`${this.apiUrl}/${id}`, cambios);
  }

  /** Borrado lógico en el back: el producto deja de listarse y de poder pedirse. */
  eliminarProducto(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /** Productos eliminados (solo Admin), para poder deshacer la eliminación. */
  obtenerEliminados(): Observable<Producto[]> {
    return this.http.get<Producto[]>(`${this.apiUrl}/eliminados`);
  }

  /** Deshace el borrado lógico: el producto vuelve al catálogo. */
  restaurarProducto(id: number): Observable<Producto> {
    return this.http.put<Producto>(`${this.apiUrl}/${id}/restaurar`, null);
  }
}
