import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { NuevoProducto, Producto } from '../models/producto.model';

@Injectable({
  providedIn: 'root'
})
export class CatalogoService {
  private readonly apiUrl = 'http://localhost:8081/api/catalog/products';

  constructor(private http: HttpClient) {}

  obtenerProductos(): Observable<Producto[]> {
    return this.http.get<Producto[]>(this.apiUrl);
  }

  crearProducto(producto: NuevoProducto): Observable<Producto> {
    return this.http.post<Producto>(this.apiUrl, producto);
  }
}