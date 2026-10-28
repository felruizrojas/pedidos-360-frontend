import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ActualizarPedidoRequest,
  CambiarEstadoRequest,
  CrearPedidoRequest,
  FiltrosPedidos,
  HistorialEstado,
  MensajeComando,
  Pagina,
  Pedido,
} from '../models/pedido.model';

/** Pedidos a través del BFF (/api/orders). Las reglas de negocio y de autorización las aplica orders. */
@Injectable({
  providedIn: 'root'
})
export class PedidosService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/api/orders`;

  crearPedido(request: CrearPedidoRequest): Observable<Pedido> {
    return this.http.post<Pedido>(this.apiUrl, request);
  }

  obtenerPedido(id: number): Observable<Pedido> {
    return this.http.get<Pedido>(`${this.apiUrl}/${id}`);
  }

  /** Solo envía los filtros con valor; un Cliente recibe solo sus pedidos (lo filtra el back). */
  listarPedidos(filtros: FiltrosPedidos = {}): Observable<Pagina<Pedido>> {
    let params = new HttpParams();
    for (const [clave, valor] of Object.entries(filtros)) {
      if (valor !== null && valor !== undefined && valor !== '') {
        params = params.set(clave, String(valor));
      }
    }
    return this.http.get<Pagina<Pedido>>(this.apiUrl, { params });
  }

  actualizarPedido(id: number, cambios: ActualizarPedidoRequest): Observable<Pedido> {
    return this.http.put<Pedido>(`${this.apiUrl}/${id}`, cambios);
  }

  cambiarEstado(id: number, request: CambiarEstadoRequest): Observable<Pedido> {
    return this.http.put<Pedido>(`${this.apiUrl}/${id}/status`, request);
  }

  obtenerHistorial(id: number): Observable<HistorialEstado[]> {
    return this.http.get<HistorialEstado[]>(`${this.apiUrl}/${id}/history`);
  }

  /** Mensajería del pedido por RabbitMQ (solo Operador). */
  obtenerMensajes(id: number): Observable<MensajeComando[]> {
    return this.http.get<MensajeComando[]>(`${this.apiUrl}/${id}/messages`);
  }

  /** Borrado lógico en el back (solo Operador, solo en CREADO o CANCELADO). */
  eliminarPedido(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
